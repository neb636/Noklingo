import assert from "node:assert/strict";
import test from "node:test";

import { curriculum as referenceCurriculum } from "../src/content/curriculum";
import {
  CurriculumSchema,
  PersistedAppDataSchema,
} from "../src/domain/schemas";
import type {
  Curriculum,
  DailyStudySession,
  ExerciseAnswer,
  PersistedAppDataV3,
  QuizItem,
} from "../src/domain/types";
import {
  MASTERY_QUESTION_COUNT,
  addLocalDays,
  advanceSessionCard,
  answerSessionQuiz,
  completeStudySession,
  createInitialAppData,
  createIntroductionSession,
  createMasterySession,
  createReplaySession,
  createReviewSession,
  daysBetweenDateKeys,
  deriveTodayState,
  finishSessionVideo,
  localDateKey,
  reconcilePersistedAppData,
  scheduleItemReview,
  updateStudyStreak,
} from "../src/engine/study";
import { importAppData, normalizeStoredAppData } from "../src/lib/db";
import { publicAssetPath } from "../src/lib/assets";
import { useAppStore } from "../src/store/useAppStore";

const atNoon = (year: number, monthIndex: number, day: number) =>
  new Date(year, monthIndex, day, 12, 0, 0, 0);

const incorrectAnswer = (quiz: QuizItem): ExerciseAnswer => {
  if (quiz.choices?.length) {
    return (
      quiz.choices.find(({ id }) => id !== quiz.correctAnswer)?.id ??
      "choice.intentionally-wrong"
    );
  }
  if (Array.isArray(quiz.correctAnswer)) {
    return [...quiz.correctAnswer].reverse();
  }
  if (quiz.pairs?.length) {
    const rights = quiz.pairs.map(({ right }) => right);
    return Object.fromEntries(
      quiz.pairs.map((pair, index) => [
        pair.left,
        rights[(index + 1) % rights.length],
      ]),
    );
  }
  return "intentionally wrong";
};

function advanceToQuiz(session: DailyStudySession) {
  let current = session;
  if (current.stage === "video") current = finishSessionVideo(current);
  while (current.stage === "cue-cards" || current.stage === "retrieval-cards") {
    current = advanceSessionCard(current);
  }
  assert.equal(current.stage, "quiz");
  return current;
}

function answerSession(
  session: DailyStudySession,
  options: { wrongActive?: number; wrongReview?: number } = {},
) {
  let current = advanceToQuiz(session);
  let wrongActive = options.wrongActive ?? 0;
  let wrongReview = options.wrongReview ?? 0;
  while (current.stage === "quiz") {
    const entry = current.quizQueue[current.quizIndex];
    assert.ok(entry);
    const shouldMiss =
      entry.scope === "active" ? wrongActive-- > 0 : wrongReview-- > 0;
    const answer = shouldMiss
      ? incorrectAnswer(entry.quizItem)
      : entry.quizItem.correctAnswer;
    current = answerSessionQuiz(current, answer).session;
  }
  assert.equal(current.stage, "complete");
  assert.equal(current.answers.length, current.quizQueue.length);
  return current;
}

function completeIntroduction(
  curriculum: Curriculum,
  data: PersistedAppDataV3,
  lessonId: string,
  date: Date,
  wrongActive = 0,
) {
  const session = answerSession(
    createIntroductionSession(curriculum, data, lessonId, date, "intro-seed"),
    { wrongActive },
  );
  return completeStudySession(curriculum, data, session, date);
}

function completeMastery(
  curriculum: Curriculum,
  data: PersistedAppDataV3,
  lessonId: string,
  date: Date,
  wrongActive = 0,
  wrongReview = 0,
) {
  const session = answerSession(
    createMasterySession(
      curriculum,
      data,
      lessonId,
      date,
      `mastery-${localDateKey(date)}`,
    ),
    { wrongActive, wrongReview },
  );
  return completeStudySession(curriculum, data, session, date);
}

function twoLessonCurriculum(): Curriculum {
  const raw = structuredClone(referenceCurriculum);
  const first = raw.lessons[0];
  const itemIds = new Map(
    first.cueCardItemIds.map((id) => [
      id,
      `item.second.${id.slice("item.".length)}`,
    ]),
  );
  const lineIds = new Map(
    first.transcript.map(({ id }) => [
      id,
      `line.second.${id.slice("line.".length)}`,
    ]),
  );
  const secondItems = raw.knowledgeItems.map((item) => ({
    ...item,
    id: itemIds.get(item.id)!,
    lessonId: "lesson.second",
    transcriptLineIds: item.transcriptLineIds.map((id) => lineIds.get(id)!),
  }));
  raw.knowledgeItems.push(...secondItems);
  raw.lessons.push({
    ...structuredClone(first),
    id: "lesson.second",
    order: 2,
    title: "Second reference lesson",
    transcript: first.transcript.map((line) => ({
      ...line,
      id: lineIds.get(line.id)!,
    })),
    cueCardItemIds: first.cueCardItemIds.map((id) => itemIds.get(id)!),
    quizBank: first.quizBank.map((quiz) => ({
      ...quiz,
      id: `${quiz.id}.second`,
      lessonId: "lesson.second",
      variantOf: `${quiz.variantOf}.second`,
      sourceItemIds: quiz.sourceItemIds.map((id) => itemIds.get(id)!),
    })),
  });
  return CurriculumSchema.parse(raw);
}

test("the v3 reference curriculum is structurally valid and explicitly draft", () => {
  const parsed = CurriculumSchema.parse(structuredClone(referenceCurriculum));
  assert.equal(parsed.schemaVersion, 3);
  assert.equal(parsed.lessons.length, 1);
  assert.equal(parsed.lessons[0].cueCardItemIds.length, 5);
  assert.equal(parsed.lessons[0].quizBank.length, 10);
  assert.equal(parsed.lessons[0].transcriptStatus, "draft");
  assert.equal(parsed.lessons[0].media.availability, "expected-local");
  assert.ok(parsed.knowledgeItems.every(({ audioRef }) => audioRef));
  assert.ok(
    parsed.lessons[0].transcript.every(
      ({ sourceStatus }) => sourceStatus === "draft-placeholder",
    ),
  );
});

test("verified lessons require a complete local media package", () => {
  const raw = structuredClone(referenceCurriculum);
  raw.lessons[0].transcriptStatus = "verified";
  raw.lessons[0].media.posterSrc = undefined;
  raw.lessons[0].transcript.forEach((line) => {
    line.sourceStatus = "verified";
  });
  const result = CurriculumSchema.safeParse(raw);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some(({ path }) =>
        path.join(".").includes("media.availability"),
      ),
    );
    assert.ok(
      result.error.issues.some(({ path }) =>
        path.join(".").includes("media.captionsSrc"),
      ),
    );
    assert.ok(
      result.error.issues.some(({ path }) =>
        path.join(".").includes("media.posterSrc"),
      ),
    );
    assert.ok(
      result.error.issues.some(({ path }) =>
        path.join(".").includes("media.durationSeconds"),
      ),
    );
    assert.ok(
      result.error.issues.some(({ message }) =>
        message.includes("bundled same-origin audio"),
      ),
    );
  }
});

test("a perfect first-day quiz still waits for delayed mastery", () => {
  const dayOne = atNoon(2026, 0, 10);
  const data = createInitialAppData(referenceCurriculum);
  const result = completeIntroduction(
    referenceCurriculum,
    data,
    referenceCurriculum.lessons[0].id,
    dayOne,
  );

  assert.equal(result.summary.accuracy, 100);
  assert.equal(result.summary.attempt.mode, "introduction");
  assert.equal(result.summary.lessonProgress.status, "awaiting-mastery");
  assert.equal(result.summary.nextEligibleMasteryDate, "2026-01-11");
  assert.equal(
    deriveTodayState(referenceCurriculum, result.data, dayOne).kind,
    "waiting",
  );
  assert.throws(
    () =>
      createMasterySession(
        referenceCurriculum,
        result.data,
        referenceCurriculum.lessons[0].id,
        dayOne,
      ),
    /not eligible for mastery/u,
  );
});

test("Today derives every primary learning state", () => {
  const lessonId = referenceCurriculum.lessons[0].id;
  const dayOne = atNoon(2026, 0, 10);
  const dayTwo = atNoon(2026, 0, 11);
  const reviewDay = atNoon(2026, 0, 13);
  const initial = createInitialAppData(referenceCurriculum);
  assert.equal(
    deriveTodayState(referenceCurriculum, initial, dayOne).kind,
    "new-lesson-ready",
  );

  const resumable = structuredClone(initial);
  resumable.activeSession = createIntroductionSession(
    referenceCurriculum,
    resumable,
    lessonId,
    dayOne,
    "today-state",
  );
  assert.equal(
    deriveTodayState(referenceCurriculum, resumable, dayOne).kind,
    "resume-session",
  );

  const introduced = completeIntroduction(
    referenceCurriculum,
    initial,
    lessonId,
    dayOne,
  ).data;
  assert.equal(
    deriveTodayState(referenceCurriculum, introduced, dayOne).kind,
    "waiting",
  );
  assert.equal(
    deriveTodayState(referenceCurriculum, introduced, dayTwo).kind,
    "mastery-review-due",
  );

  const mastered = completeMastery(
    referenceCurriculum,
    introduced,
    lessonId,
    dayTwo,
  ).data;
  assert.equal(
    deriveTodayState(referenceCurriculum, mastered, dayTwo).kind,
    "curriculum-complete",
  );
  assert.equal(
    deriveTodayState(referenceCurriculum, mastered, reviewDay).kind,
    "spaced-review-due",
  );
});

test("9 of 10 delayed answers passes and 8 of 10 waits another day", () => {
  const lessonId = referenceCurriculum.lessons[0].id;
  const dayOne = atNoon(2026, 0, 10);
  const dayTwo = atNoon(2026, 0, 11);
  const dayThree = atNoon(2026, 0, 12);
  const introduced = completeIntroduction(
    referenceCurriculum,
    createInitialAppData(referenceCurriculum),
    lessonId,
    dayOne,
  ).data;

  const passed = completeMastery(
    referenceCurriculum,
    structuredClone(introduced),
    lessonId,
    dayTwo,
    1,
  );
  assert.equal(passed.summary.activeCorrect, 9);
  assert.equal(passed.summary.activeTotal, MASTERY_QUESTION_COUNT);
  assert.equal(passed.summary.passed, true);
  assert.equal(passed.data.lessonProgress[lessonId].status, "mastered");

  const failed = completeMastery(
    referenceCurriculum,
    structuredClone(introduced),
    lessonId,
    dayTwo,
    2,
  );
  assert.equal(failed.summary.accuracy, 80);
  assert.equal(failed.summary.passed, false);
  assert.equal(failed.summary.nextEligibleMasteryDate, "2026-01-12");
  assert.throws(
    () =>
      createMasterySession(referenceCurriculum, failed.data, lessonId, dayTwo),
    /not eligible for mastery/u,
  );
  assert.doesNotThrow(() =>
    createMasterySession(referenceCurriculum, failed.data, lessonId, dayThree),
  );
});

test("mastery interleaves at most three old questions without letting them block the gate", () => {
  const curriculum = twoLessonCurriculum();
  const firstId = curriculum.lessons[0].id;
  const secondId = curriculum.lessons[1].id;
  const dayOne = atNoon(2026, 0, 10);
  const dayTwo = atNoon(2026, 0, 11);
  const dayThree = atNoon(2026, 0, 12);

  let data = createInitialAppData(curriculum);
  data = completeIntroduction(curriculum, data, firstId, dayOne).data;
  data = completeMastery(curriculum, data, firstId, dayTwo).data;
  data = completeIntroduction(curriculum, data, secondId, dayTwo).data;
  for (const itemId of curriculum.lessons[0].cueCardItemIds) {
    data.itemReviewStates[itemId].dueDate = "2026-01-12";
  }

  const session = createMasterySession(
    curriculum,
    data,
    secondId,
    dayThree,
    "mixed-seed",
  );
  assert.equal(
    session.quizQueue.filter(({ scope }) => scope === "active").length,
    10,
  );
  assert.equal(
    session.quizQueue.filter(({ scope }) => scope === "review").length,
    3,
  );
  const completed = completeStudySession(
    curriculum,
    data,
    answerSession(session, { wrongActive: 1, wrongReview: 3 }),
    dayThree,
  );
  assert.equal(completed.summary.activeCorrect, 9);
  assert.equal(completed.summary.reviewCorrect, 0);
  assert.equal(completed.summary.passed, true);
  assert.equal(completed.data.lessonProgress[firstId].status, "mastered");
  assert.equal(completed.data.lessonProgress[secondId].status, "mastered");
  for (const itemId of session.quizQueue
    .filter(({ scope }) => scope === "review")
    .flatMap(({ knowledgeItemIds }) => knowledgeItemIds)) {
    assert.equal(completed.data.itemReviewStates[itemId].dueDate, "2026-01-13");
    assert.equal(
      completed.data.itemReviewStates[itemId].lastOutcome,
      "incorrect",
    );
  }
});

test("review intervals follow 2, 5, 12, 30 days and then grow adaptively", () => {
  let state = scheduleItemReview(
    undefined,
    "item.test",
    "lesson.test",
    true,
    "2026-01-01",
  );
  assert.equal(state.intervalDays, 2);
  state = scheduleItemReview(
    state,
    state.itemId,
    state.lessonId,
    true,
    state.dueDate,
  );
  assert.equal(state.intervalDays, 5);
  state = scheduleItemReview(
    state,
    state.itemId,
    state.lessonId,
    true,
    state.dueDate,
  );
  assert.equal(state.intervalDays, 12);
  state = scheduleItemReview(
    state,
    state.itemId,
    state.lessonId,
    true,
    state.dueDate,
  );
  assert.equal(state.intervalDays, 30);
  state = scheduleItemReview(
    state,
    state.itemId,
    state.lessonId,
    true,
    state.dueDate,
  );
  assert.equal(state.intervalDays, 51);
  const failed = scheduleItemReview(
    state,
    state.itemId,
    state.lessonId,
    false,
    state.dueDate,
  );
  assert.equal(failed.intervalDays, 1);
  assert.equal(failed.lapses, 1);
});

test("standalone review remains available after the curriculum is mastered", () => {
  const lessonId = referenceCurriculum.lessons[0].id;
  const dayOne = atNoon(2026, 0, 10);
  const dayTwo = atNoon(2026, 0, 11);
  const reviewDay = atNoon(2026, 0, 13);
  let data = completeIntroduction(
    referenceCurriculum,
    createInitialAppData(referenceCurriculum),
    lessonId,
    dayOne,
  ).data;
  data = completeMastery(referenceCurriculum, data, lessonId, dayTwo).data;
  assert.equal(
    deriveTodayState(referenceCurriculum, data, reviewDay).kind,
    "spaced-review-due",
  );

  const session = createReviewSession(
    referenceCurriculum,
    data,
    reviewDay,
    "review-seed",
  );
  assert.equal(session.mode, "review");
  assert.equal(
    session.quizQueue.every(({ scope }) => scope === "review"),
    true,
  );
  const completed = completeStudySession(
    referenceCurriculum,
    data,
    answerSession(session),
    reviewDay,
  );
  assert.equal(completed.summary.attempt.mode, "review");
  assert.equal(completed.summary.activeTotal, 0);
  assert.equal(completed.summary.accuracy, 100);
  assert.equal(completed.data.lessonProgress[lessonId].status, "mastered");
  assert.deepEqual(completed.data.streak, data.streak);
});

test("fixed queues are deterministic for a seed and cover every cue card", () => {
  const lessonId = referenceCurriculum.lessons[0].id;
  const dayOne = atNoon(2026, 0, 10);
  const dayTwo = atNoon(2026, 0, 11);
  const introduced = completeIntroduction(
    referenceCurriculum,
    createInitialAppData(referenceCurriculum),
    lessonId,
    dayOne,
  ).data;
  const first = createMasterySession(
    referenceCurriculum,
    introduced,
    lessonId,
    dayTwo,
    "stable-seed",
  );
  const second = createMasterySession(
    referenceCurriculum,
    introduced,
    lessonId,
    dayTwo,
    "stable-seed",
  );
  const varied = createMasterySession(
    referenceCurriculum,
    introduced,
    lessonId,
    dayTwo,
    "different-seed",
  );
  assert.deepEqual(first.quizQueue, second.quizQueue);
  assert.notDeepEqual(first.quizQueue, varied.quizQueue);
  assert.ok(
    first.quizQueue.some((entry) => {
      const alternate = varied.quizQueue.find(
        ({ quizItem }) => quizItem.id === entry.quizItem.id,
      );
      return (
        alternate &&
        JSON.stringify(entry.quizItem.choices) !==
          JSON.stringify(alternate.quizItem.choices)
      );
    }),
  );
  assert.deepEqual(
    new Set(
      first.quizQueue.flatMap(({ knowledgeItemIds }) => knowledgeItemIds),
    ),
    new Set(referenceCurriculum.lessons[0].cueCardItemIds),
  );
});

test("replays end after cards and can never mutate learning data", () => {
  const replay = createReplaySession(
    referenceCurriculum,
    referenceCurriculum.lessons[0].id,
    atNoon(2026, 0, 10),
  );
  let current = finishSessionVideo(replay);
  while (current.stage === "cue-cards") current = advanceSessionCard(current);
  assert.equal(current.stage, "complete");
  assert.equal(current.quizQueue.length, 0);
  assert.throws(
    () =>
      completeStudySession(
        referenceCurriculum,
        createInitialAppData(referenceCurriculum),
        current,
      ),
    /never update progress/u,
  );
});

test("streaks increment once per local day and reset after a missed day", () => {
  const empty = { current: 0, longest: 0, lastStudyDate: null };
  const first = updateStudyStreak(empty, "2026-03-07");
  const duplicate = updateStudyStreak(first, "2026-03-07");
  const next = updateStudyStreak(duplicate, "2026-03-08");
  const missed = updateStudyStreak(next, "2026-03-10");
  assert.deepEqual(first, duplicate);
  assert.equal(next.current, 2);
  assert.equal(missed.current, 1);
  assert.equal(missed.longest, 2);
});

test("local date helpers survive calendar boundaries without UTC drift", () => {
  const beforeDst = localDateKey(atNoon(2026, 2, 7));
  assert.equal(addLocalDays(beforeDst, 1), "2026-03-08");
  assert.equal(daysBetweenDateKeys("2026-03-07", "2026-03-08"), 1);
  assert.equal(addLocalDays("2026-12-31", 1), "2027-01-01");
});

test("public lesson assets honor a GitHub Pages path prefix", () => {
  const previous = process.env.NEXT_PUBLIC_ASSET_PREFIX;
  process.env.NEXT_PUBLIC_ASSET_PREFIX = "/Noklingo/";
  try {
    assert.equal(
      publicAssetPath("/lessons/everyday-thai/intro.mp4"),
      "/Noklingo/lessons/everyday-thai/intro.mp4",
    );
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_ASSET_PREFIX;
    else process.env.NEXT_PUBLIC_ASSET_PREFIX = previous;
  }
});

test("v3 sessions round-trip while v2 progress is rejected", () => {
  const data = createInitialAppData(referenceCurriculum);
  data.activeSession = createIntroductionSession(
    referenceCurriculum,
    data,
    referenceCurriculum.lessons[0].id,
    atNoon(2026, 0, 10),
    "resume-seed",
  );
  const roundTrip = PersistedAppDataSchema.parse(
    JSON.parse(JSON.stringify(data)),
  );
  assert.deepEqual(
    roundTrip.activeSession,
    JSON.parse(JSON.stringify(data.activeSession)),
  );
  assert.equal(PersistedAppDataSchema.safeParse({ version: 2 }).success, false);
});

test("resumable queues reconcile exactly and stale content is discarded", () => {
  const lessonId = referenceCurriculum.lessons[0].id;
  const data = createInitialAppData(referenceCurriculum);
  let session = advanceToQuiz(
    createIntroductionSession(
      referenceCurriculum,
      data,
      lessonId,
      atNoon(2026, 0, 10),
      "resume-exactly",
    ),
  );
  session = answerSessionQuiz(
    session,
    session.quizQueue[0].quizItem.correctAnswer,
  ).session;
  data.activeSession = session;

  const parsed = PersistedAppDataSchema.parse(JSON.parse(JSON.stringify(data)));
  assert.deepEqual(
    reconcilePersistedAppData(referenceCurriculum, parsed).activeSession,
    JSON.parse(JSON.stringify(session)),
  );

  const stale = structuredClone(parsed);
  assert.ok(stale.activeSession);
  stale.activeSession.quizQueue[0].quizItem.prompt =
    "A removed content revision";
  assert.equal(
    reconcilePersistedAppData(referenceCurriculum, stale).activeSession,
    null,
  );

  const malformed = structuredClone(parsed);
  assert.ok(malformed.activeSession);
  malformed.activeSession.quizIndex += 1;
  assert.equal(PersistedAppDataSchema.safeParse(malformed).success, false);
});

test("replay sessions are never persistable and v2 imports are rejected", async () => {
  const data = createInitialAppData(referenceCurriculum);
  data.activeSession = createReplaySession(
    referenceCurriculum,
    referenceCurriculum.lessons[0].id,
  );
  assert.equal(PersistedAppDataSchema.safeParse(data).success, false);
  await assert.rejects(
    importAppData(JSON.stringify({ version: 2 })),
    /previous learning system/u,
  );
  const reset = normalizeStoredAppData({
    version: 2,
    settings: { darkMode: true },
    progress: { xp: 9999 },
  });
  assert.ok(reset);
  assert.equal(reset.resetLegacyData, true);
  assert.equal(reset.data.version, 3);
  assert.equal(reset.data.settings.darkMode, false);
  assert.equal(reset.data.attempts.length, 0);
});

test("leaving Results through navigation clears its transient summary", () => {
  const result = completeIntroduction(
    referenceCurriculum,
    createInitialAppData(referenceCurriculum),
    referenceCurriculum.lessons[0].id,
    atNoon(2026, 0, 10),
  );
  useAppStore.setState({
    route: "results",
    completion: result.summary,
  });
  useAppStore.getState().navigate("library");
  assert.equal(useAppStore.getState().route, "library");
  assert.equal(useAppStore.getState().completion, null);
});
