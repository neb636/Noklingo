import type {
  Curriculum,
  DailyStudySession,
  ExerciseAnswer,
  ItemReviewState,
  LessonProgress,
  PersistedAppDataV3,
  QuizItem,
  QuizQueueEntry,
  SessionAnswer,
  Settings,
  StreakState,
  StudyAttempt,
  StudyCompletionSummary,
  TodayState,
  VideoLesson,
} from "@/src/domain/types";
import { isAnswerCorrect } from "@/src/engine/grading";

export const MASTERY_QUESTION_COUNT = 10;
export const MAX_INTERLEAVED_REVIEW_QUESTIONS = 3;
export const MASTERY_PASS_PERCENT = 90;
export const REVIEW_INTERVAL_DAYS = [2, 5, 12, 30] as const;

export const DEFAULT_SETTINGS: Settings = {
  audioEnabled: true,
  volume: 0.8,
  romanization: "learning",
  showThaiScript: true,
  reducedMotion: false,
  darkMode: false,
  politeParticle: "khrap",
};

export const localDateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const addLocalDays = (dateKey: string, days: number) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
};

export const daysBetweenDateKeys = (from: string, to: string) => {
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  return Math.round(
    (Date.UTC(toYear, toMonth - 1, toDay) -
      Date.UTC(fromYear, fromMonth - 1, fromDay)) /
      86_400_000,
  );
};

const stableHash = (value: string) => {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const orderedLessons = (curriculum: Curriculum) =>
  [...curriculum.lessons].sort(
    (left, right) =>
      left.order - right.order || left.id.localeCompare(right.id),
  );

const requireLesson = (curriculum: Curriculum, lessonId: string) => {
  const lesson = curriculum.lessons.find(({ id }) => id === lessonId);
  if (!lesson) throw new Error(`Unknown video lesson “${lessonId}”`);
  return lesson;
};

export function createInitialLessonProgress(
  curriculum: Curriculum,
): PersistedAppDataV3["lessonProgress"] {
  return Object.fromEntries(
    curriculum.lessons.map((lesson) => [
      lesson.id,
      {
        lessonId: lesson.id,
        status: "unseen" as const,
        bestDelayedAccuracy: 0,
        attemptHistory: [],
      },
    ]),
  );
}

export function createInitialAppData(
  curriculum: Curriculum,
  settings: Partial<Settings> = {},
): PersistedAppDataV3 {
  return {
    version: 3,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    streak: { current: 0, longest: 0, lastStudyDate: null },
    lessonProgress: createInitialLessonProgress(curriculum),
    itemReviewStates: {},
    attempts: [],
    activeSession: null,
    redesignNoticeSeen: false,
  };
}

export function updateStudyStreak(
  streak: StreakState,
  completedOn = localDateKey(),
): StreakState {
  if (streak.lastStudyDate === completedOn) return streak;
  if (
    streak.lastStudyDate &&
    daysBetweenDateKeys(streak.lastStudyDate, completedOn) < 0
  ) {
    // Traveling west or correcting a device clock should not erase a streak.
    return streak;
  }
  const consecutive =
    streak.lastStudyDate !== null &&
    daysBetweenDateKeys(streak.lastStudyDate, completedOn) === 1;
  const current = consecutive ? streak.current + 1 : 1;
  return {
    current,
    longest: Math.max(streak.longest, current),
    lastStudyDate: completedOn,
  };
}

const progressFor = (
  curriculum: Curriculum,
  data: PersistedAppDataV3,
  lessonId: string,
): LessonProgress =>
  data.lessonProgress[lessonId] ??
  createInitialLessonProgress(curriculum)[lessonId];

export function findNextLessonId(
  curriculum: Curriculum,
  data: PersistedAppDataV3,
) {
  return (
    orderedLessons(curriculum).find(
      (lesson) =>
        progressFor(curriculum, data, lesson.id).status !== "mastered",
    )?.id ?? null
  );
}

const canonicalQuiz = (quiz: QuizItem) =>
  JSON.stringify({
    ...quiz,
    choices: quiz.choices
      ? [...quiz.choices].sort((left, right) => left.id.localeCompare(right.id))
      : undefined,
  });

const sessionMatchesCurriculum = (
  curriculum: Curriculum,
  data: PersistedAppDataV3,
  session: DailyStudySession,
) => {
  if (session.mode === "replay") return false;
  const lesson = curriculum.lessons.find(({ id }) => id === session.lessonId);
  const progress = lesson ? data.lessonProgress[lesson.id] : undefined;
  if (!lesson || !progress) return false;
  if (
    session.mode !== "review" &&
    findNextLessonId(curriculum, data) !== session.lessonId
  ) {
    return false;
  }

  if (
    session.mode === "introduction" &&
    progress.status !== "unseen" &&
    progress.status !== "introduced"
  ) {
    return false;
  }
  if (session.mode === "mastery" && progress.status !== "awaiting-mastery") {
    return false;
  }
  if (
    session.mode === "review" &&
    orderedLessons(curriculum).some(
      (candidate) => data.lessonProgress[candidate.id]?.status !== "mastered",
    )
  ) {
    return false;
  }

  const itemById = new Map(
    curriculum.knowledgeItems.map((item) => [item.id, item]),
  );
  if (session.cardItemIds.some((itemId) => !itemById.has(itemId))) return false;
  if (
    session.mode !== "review" &&
    (session.cardItemIds.length !== lesson.cueCardItemIds.length ||
      session.cardItemIds.some(
        (itemId, index) => itemId !== lesson.cueCardItemIds[index],
      ))
  ) {
    return false;
  }

  return session.quizQueue.every((entry) => {
    if (
      entry.sourceLessonId !== entry.quizItem.lessonId ||
      entry.knowledgeItemIds.length !== entry.quizItem.sourceItemIds.length ||
      entry.knowledgeItemIds.some(
        (itemId, index) => itemId !== entry.quizItem.sourceItemIds[index],
      )
    ) {
      return false;
    }
    const sourceLesson = curriculum.lessons.find(
      ({ id }) => id === entry.sourceLessonId,
    );
    const currentQuiz = sourceLesson?.quizBank.find(
      ({ id }) => id === entry.quizItem.id,
    );
    if (!sourceLesson || !currentQuiz) return false;
    if (
      (session.mode === "introduction" &&
        (entry.scope !== "active" || sourceLesson.id !== session.lessonId)) ||
      (session.mode === "mastery" &&
        ((entry.scope === "active" && sourceLesson.id !== session.lessonId) ||
          (entry.scope === "review" &&
            (sourceLesson.id === session.lessonId ||
              data.lessonProgress[sourceLesson.id]?.status !== "mastered")))) ||
      (session.mode === "review" &&
        (entry.scope !== "review" ||
          data.lessonProgress[sourceLesson.id]?.status !== "mastered"))
    ) {
      return false;
    }
    if (
      entry.knowledgeItemIds.some(
        (itemId) => itemById.get(itemId)?.lessonId !== sourceLesson.id,
      )
    ) {
      return false;
    }
    return canonicalQuiz(entry.quizItem) === canonicalQuiz(currentQuiz);
  });
};

/**
 * Reconcile a structurally valid v3 snapshot with the currently bundled
 * curriculum. Exact resumable queues survive; references to removed or changed
 * content are discarded instead of stranding the learner in an invalid route.
 */
export function reconcilePersistedAppData(
  curriculum: Curriculum,
  data: PersistedAppDataV3,
): PersistedAppDataV3 {
  const initialProgress = createInitialLessonProgress(curriculum);
  const lessonProgress: PersistedAppDataV3["lessonProgress"] = {};
  let sequenceBlocked = false;
  for (const lesson of orderedLessons(curriculum)) {
    const existing = data.lessonProgress[lesson.id];
    if (!existing || existing.lessonId !== lesson.id || sequenceBlocked) {
      lessonProgress[lesson.id] = initialProgress[lesson.id];
    } else {
      lessonProgress[lesson.id] = {
        ...existing,
        attemptHistory: existing.attemptHistory.filter(
          (attempt) =>
            attempt.lessonId === lesson.id && attempt.mode !== "review",
        ),
      };
    }
    if (lessonProgress[lesson.id].status !== "mastered") {
      sequenceBlocked = true;
    }
  }

  const itemReviewStates: PersistedAppDataV3["itemReviewStates"] = {};
  for (const item of curriculum.knowledgeItems) {
    const existing = data.itemReviewStates[item.id];
    const lessonStatus = lessonProgress[item.lessonId]?.status;
    if (
      existing?.itemId === item.id &&
      existing.lessonId === item.lessonId &&
      (lessonStatus === "awaiting-mastery" || lessonStatus === "mastered")
    ) {
      itemReviewStates[item.id] = existing;
    }
  }

  const attempts = data.attempts.filter((attempt) => {
    const status = lessonProgress[attempt.lessonId]?.status;
    return Boolean(status && status !== "unseen" && status !== "introduced");
  });
  const reconciled: PersistedAppDataV3 = {
    ...data,
    lessonProgress,
    itemReviewStates,
    attempts,
    activeSession: null,
  };
  if (
    data.activeSession &&
    sessionMatchesCurriculum(curriculum, reconciled, data.activeSession)
  ) {
    reconciled.activeSession = data.activeSession;
  }
  return reconciled;
}

const dueReviewStates = (
  curriculum: Curriculum,
  data: PersistedAppDataV3,
  today: string,
  activeLessonId?: string,
) => {
  const lessons = new Set(curriculum.lessons.map(({ id }) => id));
  return Object.values(data.itemReviewStates).filter(
    (state) =>
      lessons.has(state.lessonId) &&
      state.lessonId !== activeLessonId &&
      state.dueDate <= today &&
      progressFor(curriculum, data, state.lessonId).status === "mastered",
  );
};

export function deriveTodayState(
  curriculum: Curriculum,
  data: PersistedAppDataV3,
  now = new Date(),
): TodayState {
  const today = localDateKey(now);
  const dueReviewCount = dueReviewStates(curriculum, data, today).length;
  if (data.activeSession) {
    return {
      kind: "resume-session",
      lesson: requireLesson(curriculum, data.activeSession.lessonId),
      session: data.activeSession,
      dueReviewCount,
    };
  }
  const nextId = findNextLessonId(curriculum, data);
  if (!nextId) {
    return dueReviewCount
      ? { kind: "spaced-review-due", dueReviewCount }
      : { kind: "curriculum-complete", dueReviewCount };
  }
  const lesson = requireLesson(curriculum, nextId);
  const progress = progressFor(curriculum, data, nextId);
  if (progress.status === "unseen" || progress.status === "introduced") {
    return { kind: "new-lesson-ready", lesson, dueReviewCount };
  }
  const nextEligibleDate = progress.nextEligibleMasteryDate;
  if (!nextEligibleDate || nextEligibleDate <= today) {
    return { kind: "mastery-review-due", lesson, dueReviewCount };
  }
  return {
    kind: "waiting",
    lesson,
    nextEligibleDate,
    dueReviewCount,
  };
}

const bySeed = <T extends { id: string }>(values: readonly T[], seed: string) =>
  [...values].sort(
    (left, right) =>
      stableHash(`${seed}:${left.id}`) - stableHash(`${seed}:${right.id}`) ||
      left.id.localeCompare(right.id),
  );

const rotateChoices = (quizItem: QuizItem, seed: string): QuizItem => {
  if (!quizItem.choices?.length) return { ...quizItem };
  const offset =
    stableHash(`${seed}:${quizItem.id}:choices`) % quizItem.choices.length;
  return {
    ...quizItem,
    choices: [
      ...quizItem.choices.slice(offset),
      ...quizItem.choices.slice(0, offset),
    ].map((choice) => ({ ...choice })),
  };
};

const selectActiveQuestions = (
  lesson: VideoLesson,
  targetSize: number,
  seed: string,
) => {
  if (lesson.quizBank.length < targetSize) {
    throw new Error(
      `Lesson “${lesson.id}” needs ${targetSize} active questions (found ${lesson.quizBank.length})`,
    );
  }
  const groups = new Map(
    lesson.cueCardItemIds.map((itemId) => [
      itemId,
      bySeed(
        lesson.quizBank.filter(({ sourceItemIds }) =>
          sourceItemIds.includes(itemId),
        ),
        `${seed}:${itemId}`,
      ),
    ]),
  );
  const selected: QuizItem[] = [];
  const selectedIds = new Set<string>();
  let round = 0;
  while (selected.length < targetSize) {
    let added = false;
    for (const itemId of lesson.cueCardItemIds) {
      const group = groups.get(itemId) ?? [];
      const candidate = group[round];
      if (candidate && !selectedIds.has(candidate.id)) {
        selected.push(rotateChoices(candidate, seed));
        selectedIds.add(candidate.id);
        added = true;
        if (selected.length === targetSize) break;
      }
    }
    if (!added) break;
    round += 1;
  }
  if (selected.length !== targetSize) {
    throw new Error(
      `Lesson “${lesson.id}” cannot produce ${targetSize} unique, cue-card-covered questions`,
    );
  }
  return selected;
};

const makeQueueEntry = (
  quizItem: QuizItem,
  scope: QuizQueueEntry["scope"],
  index: number,
): QuizQueueEntry => ({
  id: `queue.${scope}-${index + 1}`,
  scope,
  sourceLessonId: quizItem.lessonId,
  knowledgeItemIds: quizItem.sourceItemIds,
  quizItem,
});

const overdueDays = (state: ItemReviewState, today: string) =>
  Math.max(0, daysBetweenDateKeys(state.dueDate, today));

const selectDueReviewQuestions = (
  curriculum: Curriculum,
  data: PersistedAppDataV3,
  activeLessonId: string,
  today: string,
  seed: string,
  targetSize = MAX_INTERLEAVED_REVIEW_QUESTIONS,
) => {
  const states = dueReviewStates(curriculum, data, today, activeLessonId).sort(
    (left, right) =>
      overdueDays(right, today) - overdueDays(left, today) ||
      stableHash(`${seed}:${left.itemId}`) -
        stableHash(`${seed}:${right.itemId}`),
  );
  const selected: QuizItem[] = [];
  for (const state of states) {
    if (selected.length >= targetSize) break;
    const lesson = curriculum.lessons.find(({ id }) => id === state.lessonId);
    if (!lesson) continue;
    const candidates = bySeed(
      lesson.quizBank.filter(({ sourceItemIds }) =>
        sourceItemIds.includes(state.itemId),
      ),
      `${seed}:review:${state.itemId}`,
    );
    if (candidates[0]) selected.push(rotateChoices(candidates[0], seed));
  }
  return selected;
};

const interleaveReviews = (
  active: QuizQueueEntry[],
  review: QuizQueueEntry[],
) => {
  const queue: QuizQueueEntry[] = [];
  let reviewIndex = 0;
  active.forEach((entry, index) => {
    queue.push(entry);
    if ((index + 1) % 3 === 0 && review[reviewIndex]) {
      queue.push(review[reviewIndex]);
      reviewIndex += 1;
    }
  });
  return [...queue, ...review.slice(reviewIndex)];
};

const sessionSeed = (
  lessonId: string,
  mode: DailyStudySession["mode"],
  now: Date,
  requested?: string,
) => requested ?? `${localDateKey(now)}:${lessonId}:${mode}`;

const sessionId = (
  lessonId: string,
  mode: DailyStudySession["mode"],
  seed: string,
) => `session.${mode}.${lessonId.slice("lesson.".length)}-${stableHash(seed)}`;

const assertLessonIsNext = (
  curriculum: Curriculum,
  data: PersistedAppDataV3,
  lessonId: string,
) => {
  if (findNextLessonId(curriculum, data) !== lessonId) {
    throw new Error(`Lesson “${lessonId}” is locked by the ordered curriculum`);
  }
};

export function createIntroductionSession(
  curriculum: Curriculum,
  data: PersistedAppDataV3,
  lessonId: string,
  now = new Date(),
  requestedSeed?: string,
): DailyStudySession {
  assertLessonIsNext(curriculum, data, lessonId);
  const lesson = requireLesson(curriculum, lessonId);
  const progress = progressFor(curriculum, data, lessonId);
  if (!["unseen", "introduced"].includes(progress.status)) {
    throw new Error(
      `Lesson “${lessonId}” has already completed its introduction`,
    );
  }
  const seed = sessionSeed(lessonId, "introduction", now, requestedSeed);
  const questions = selectActiveQuestions(
    lesson,
    lesson.cueCardItemIds.length,
    seed,
  );
  return {
    id: sessionId(lessonId, "introduction", seed),
    lessonId,
    mode: "introduction",
    stage: "video",
    videoCompleted: false,
    videoSkipped: false,
    cardItemIds: [...lesson.cueCardItemIds],
    cardIndex: 0,
    quizQueue: questions.map((quiz, index) =>
      makeQueueEntry(quiz, "active", index),
    ),
    quizIndex: 0,
    answers: [],
    seed,
    startedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function canStartMastery(progress: LessonProgress, today: string) {
  return (
    progress.status === "awaiting-mastery" &&
    Boolean(
      progress.nextEligibleMasteryDate &&
      progress.nextEligibleMasteryDate <= today,
    )
  );
}

export function createMasterySession(
  curriculum: Curriculum,
  data: PersistedAppDataV3,
  lessonId: string,
  now = new Date(),
  requestedSeed?: string,
): DailyStudySession {
  assertLessonIsNext(curriculum, data, lessonId);
  const lesson = requireLesson(curriculum, lessonId);
  const today = localDateKey(now);
  const progress = progressFor(curriculum, data, lessonId);
  if (!canStartMastery(progress, today)) {
    throw new Error(
      `Lesson “${lessonId}” is not eligible for mastery on ${today}`,
    );
  }
  const seed = sessionSeed(lessonId, "mastery", now, requestedSeed);
  const active = selectActiveQuestions(
    lesson,
    MASTERY_QUESTION_COUNT,
    seed,
  ).map((quiz, index) => makeQueueEntry(quiz, "active", index));
  const review = selectDueReviewQuestions(
    curriculum,
    data,
    lessonId,
    today,
    seed,
  ).map((quiz, index) => makeQueueEntry(quiz, "review", index));
  return {
    id: sessionId(lessonId, "mastery", seed),
    lessonId,
    mode: "mastery",
    stage: "retrieval-cards",
    videoCompleted: true,
    videoSkipped: false,
    cardItemIds: [...lesson.cueCardItemIds],
    cardIndex: 0,
    quizQueue: interleaveReviews(active, review),
    quizIndex: 0,
    answers: [],
    seed,
    startedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function createReplaySession(
  curriculum: Curriculum,
  lessonId: string,
  now = new Date(),
): DailyStudySession {
  const lesson = requireLesson(curriculum, lessonId);
  const seed = sessionSeed(lessonId, "replay", now);
  return {
    id: sessionId(lessonId, "replay", seed),
    lessonId,
    mode: "replay",
    stage: "video",
    videoCompleted: false,
    videoSkipped: false,
    cardItemIds: [...lesson.cueCardItemIds],
    cardIndex: 0,
    quizQueue: [],
    quizIndex: 0,
    answers: [],
    seed,
    startedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function createReviewSession(
  curriculum: Curriculum,
  data: PersistedAppDataV3,
  now = new Date(),
  requestedSeed?: string,
): DailyStudySession {
  const today = localDateKey(now);
  const seed = requestedSeed ?? `${today}:standalone-review`;
  const questions = selectDueReviewQuestions(
    curriculum,
    data,
    "lesson.standalone-review",
    today,
    seed,
    MASTERY_QUESTION_COUNT,
  );
  if (!questions.length)
    throw new Error(`No spaced-review items are due on ${today}`);
  const anchorLessonId = questions[0].lessonId;
  const queue = questions.map((quiz, index) =>
    makeQueueEntry(quiz, "review", index),
  );
  return {
    id: sessionId(anchorLessonId, "review", seed),
    lessonId: anchorLessonId,
    mode: "review",
    stage: "retrieval-cards",
    videoCompleted: true,
    videoSkipped: false,
    cardItemIds: Array.from(
      new Set(queue.flatMap(({ knowledgeItemIds }) => knowledgeItemIds)),
    ),
    cardIndex: 0,
    quizQueue: queue,
    quizIndex: 0,
    answers: [],
    seed,
    startedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function finishSessionVideo(
  session: DailyStudySession,
  { skipped = false, now = new Date() } = {},
): DailyStudySession {
  if (session.stage !== "video") return session;
  return {
    ...session,
    stage: "cue-cards",
    videoCompleted: !skipped,
    videoSkipped: skipped,
    updatedAt: now.toISOString(),
  };
}

export function advanceSessionCard(
  session: DailyStudySession,
  now = new Date(),
): DailyStudySession {
  if (!["cue-cards", "retrieval-cards"].includes(session.stage)) return session;
  const nextIndex = session.cardIndex + 1;
  const finished = nextIndex >= session.cardItemIds.length;
  return {
    ...session,
    cardIndex: Math.min(nextIndex, session.cardItemIds.length),
    stage: finished
      ? session.mode === "replay"
        ? "complete"
        : "quiz"
      : session.stage,
    updatedAt: now.toISOString(),
  };
}

export function answerSessionQuiz(
  session: DailyStudySession,
  answer: ExerciseAnswer,
  now = new Date(),
): { session: DailyStudySession; answer: SessionAnswer } {
  if (session.mode === "replay" || session.stage !== "quiz") {
    throw new Error("The session is not accepting quiz answers");
  }
  const entry = session.quizQueue[session.quizIndex];
  if (!entry) throw new Error("The session quiz is already complete");
  const record: SessionAnswer = {
    queueEntryId: entry.id,
    quizItemId: entry.quizItem.id,
    scope: entry.scope,
    sourceLessonId: entry.sourceLessonId,
    knowledgeItemIds: entry.knowledgeItemIds,
    answer,
    correct: isAnswerCorrect(entry.quizItem, answer),
    answeredAt: now.toISOString(),
  };
  const answers = [...session.answers, record];
  const quizIndex = session.quizIndex + 1;
  return {
    answer: record,
    session: {
      ...session,
      answers,
      quizIndex,
      stage: quizIndex >= session.quizQueue.length ? "complete" : "quiz",
      updatedAt: now.toISOString(),
    },
  };
}

/** Mastery and spaced-review feedback stays hidden until the fixed queue ends. */
export const canRevealSessionFeedback = (session: DailyStudySession) =>
  session.mode === "introduction" || session.stage === "complete";

export function scheduleItemReview(
  current: ItemReviewState | undefined,
  itemId: string,
  lessonId: string,
  correct: boolean,
  reviewedOn: string,
): ItemReviewState {
  const previous: ItemReviewState = current ?? {
    itemId,
    lessonId,
    dueDate: reviewedOn,
    intervalDays: 1,
    nextIntervalIndex: 0,
    successfulReviews: 0,
    totalReviews: 0,
    lapses: 0,
  };
  if (!correct) {
    return {
      ...previous,
      lessonId,
      dueDate: addLocalDays(reviewedOn, 1),
      intervalDays: 1,
      nextIntervalIndex: 0,
      totalReviews: previous.totalReviews + 1,
      lapses: previous.lapses + 1,
      lastReviewedOn: reviewedOn,
      lastOutcome: "incorrect",
    };
  }

  const firstThirtyDayReview =
    previous.nextIntervalIndex === 3 && previous.intervalDays < 30;
  const intervalDays =
    previous.nextIntervalIndex < 3 || firstThirtyDayReview
      ? REVIEW_INTERVAL_DAYS[previous.nextIntervalIndex]
      : Math.min(365, Math.max(31, Math.round(previous.intervalDays * 1.7)));
  const nextIntervalIndex = Math.min(
    3,
    previous.nextIntervalIndex + 1,
  ) as ItemReviewState["nextIntervalIndex"];
  return {
    ...previous,
    lessonId,
    dueDate: addLocalDays(reviewedOn, intervalDays),
    intervalDays,
    nextIntervalIndex,
    successfulReviews: previous.successfulReviews + 1,
    totalReviews: previous.totalReviews + 1,
    lastReviewedOn: reviewedOn,
    lastOutcome: "correct",
  };
}

const answerByQueueId = (session: DailyStudySession) =>
  new Map(session.answers.map((answer) => [answer.queueEntryId, answer]));

const aggregateItemOutcomes = (
  entries: QuizQueueEntry[],
  answers: Map<string, SessionAnswer>,
) => {
  const outcomes = new Map<string, boolean>();
  for (const entry of entries) {
    const correct = answers.get(entry.id)?.correct === true;
    for (const itemId of entry.knowledgeItemIds) {
      outcomes.set(itemId, (outcomes.get(itemId) ?? true) && correct);
    }
  }
  return outcomes;
};

const roundedAccuracy = (correct: number, total: number) =>
  total ? Math.round((correct / total) * 100) : 0;

export function completeStudySession(
  curriculum: Curriculum,
  data: PersistedAppDataV3,
  session: DailyStudySession,
  now = new Date(),
): { data: PersistedAppDataV3; summary: StudyCompletionSummary } {
  if (session.mode === "replay") {
    throw new Error("Replay sessions never update progress or streaks");
  }
  if (session.stage !== "complete") {
    throw new Error(
      "A study session must finish its fixed queue before completion",
    );
  }
  if (data.activeSession && data.activeSession.id !== session.id) {
    throw new Error(
      "The completed session does not match the persisted session",
    );
  }
  const lesson = requireLesson(curriculum, session.lessonId);
  const today = localDateKey(now);
  const progress = progressFor(curriculum, data, lesson.id);
  if (session.mode === "mastery" && !canStartMastery(progress, today)) {
    throw new Error(
      `Mastery cannot be completed for “${lesson.id}” on ${today}`,
    );
  }
  const submittedAnswers = answerByQueueId(session);
  if (
    submittedAnswers.size !== session.quizQueue.length ||
    session.quizQueue.some(({ id }) => !submittedAnswers.has(id))
  ) {
    throw new Error(
      "Every fixed quiz-queue item must be answered before completion",
    );
  }
  // Imported/resumed data cannot self-report correctness; always re-grade the
  // persisted answer against the fixed queue before applying the mastery gate.
  const answers = new Map(
    session.quizQueue.map((entry) => {
      const submitted = submittedAnswers.get(entry.id)!;
      return [
        entry.id,
        {
          ...submitted,
          correct: isAnswerCorrect(entry.quizItem, submitted.answer),
        },
      ];
    }),
  );
  const activeEntries = session.quizQueue.filter(
    ({ scope }) => scope === "active",
  );
  const reviewEntries = session.quizQueue.filter(
    ({ scope }) => scope === "review",
  );
  if (
    session.mode === "introduction" &&
    (activeEntries.length !== lesson.cueCardItemIds.length ||
      reviewEntries.length ||
      activeEntries.some(({ sourceLessonId }) => sourceLessonId !== lesson.id))
  ) {
    throw new Error(
      "An introduction must score one active question per lesson cue card",
    );
  }
  if (
    session.mode === "mastery" &&
    (activeEntries.length !== MASTERY_QUESTION_COUNT ||
      reviewEntries.length > MAX_INTERLEAVED_REVIEW_QUESTIONS ||
      activeEntries.some(
        ({ sourceLessonId }) => sourceLessonId !== lesson.id,
      ) ||
      reviewEntries.some(({ sourceLessonId }) => sourceLessonId === lesson.id))
  ) {
    throw new Error(
      `A mastery attempt requires exactly ${MASTERY_QUESTION_COUNT} active questions plus at most ${MAX_INTERLEAVED_REVIEW_QUESTIONS} older questions`,
    );
  }
  if (
    session.mode === "review" &&
    (activeEntries.length ||
      reviewEntries.length < 1 ||
      reviewEntries.length > MASTERY_QUESTION_COUNT)
  ) {
    throw new Error("A standalone review requires 1–10 review questions");
  }
  const activeCorrect = activeEntries.filter(
    ({ id }) => answers.get(id)?.correct,
  ).length;
  const reviewCorrect = reviewEntries.filter(
    ({ id }) => answers.get(id)?.correct,
  ).length;
  const activeAccuracy = roundedAccuracy(activeCorrect, activeEntries.length);
  // Introduction is completion-based; only a delayed mastery attempt uses the gate.
  const passed =
    session.mode !== "mastery" || activeAccuracy >= MASTERY_PASS_PERCENT;
  const allOutcomes = aggregateItemOutcomes(session.quizQueue, answers);
  const missedItemIds = Array.from(allOutcomes)
    .filter(([, correct]) => !correct)
    .map(([itemId]) => itemId);
  const attempt: StudyAttempt = {
    id: `attempt.${session.mode}.${stableHash(`${session.id}:${now.toISOString()}`)}`,
    sessionId: session.id,
    lessonId: lesson.id,
    mode: session.mode,
    startedAt: session.startedAt,
    completedAt: now.toISOString(),
    activeCorrect,
    activeTotal: activeEntries.length,
    activeAccuracy,
    reviewCorrect,
    reviewTotal: reviewEntries.length,
    passed,
    missedItemIds,
  };

  let nextProgress: LessonProgress;
  if (session.mode === "introduction") {
    nextProgress = {
      ...progress,
      status: "awaiting-mastery",
      introducedOn: progress.introducedOn ?? today,
      nextEligibleMasteryDate: addLocalDays(today, 1),
      attemptHistory: [...progress.attemptHistory, attempt].slice(-50),
    };
  } else if (session.mode === "mastery") {
    nextProgress = {
      ...progress,
      status: passed ? "mastered" : "awaiting-mastery",
      nextEligibleMasteryDate: passed ? undefined : addLocalDays(today, 1),
      masteredOn: passed ? today : progress.masteredOn,
      bestDelayedAccuracy: Math.max(
        progress.bestDelayedAccuracy,
        activeAccuracy,
      ),
      attemptHistory: [...progress.attemptHistory, attempt].slice(-50),
    };
  } else {
    // Standalone review changes item scheduling, not lesson mastery/history.
    nextProgress = progress;
  }

  const itemReviewStates = { ...data.itemReviewStates };
  if (session.mode === "introduction") {
    for (const itemId of lesson.cueCardItemIds) {
      const previous = itemReviewStates[itemId];
      itemReviewStates[itemId] = {
        itemId,
        lessonId: lesson.id,
        dueDate: addLocalDays(today, 1),
        intervalDays: 1,
        nextIntervalIndex: 0,
        successfulReviews: previous?.successfulReviews ?? 0,
        totalReviews: previous?.totalReviews ?? 0,
        lapses: previous?.lapses ?? 0,
        lastReviewedOn: previous?.lastReviewedOn,
        lastOutcome: previous?.lastOutcome,
      };
    }
  } else {
    for (const [itemId, correct] of allOutcomes) {
      const sourceLessonId =
        curriculum.knowledgeItems.find(({ id }) => id === itemId)?.lessonId ??
        lesson.id;
      itemReviewStates[itemId] = scheduleItemReview(
        itemReviewStates[itemId],
        itemId,
        sourceLessonId,
        correct,
        today,
      );
    }
  }

  const nextData: PersistedAppDataV3 = {
    ...data,
    streak:
      session.mode === "review"
        ? data.streak
        : updateStudyStreak(data.streak, today),
    lessonProgress: {
      ...data.lessonProgress,
      [lesson.id]: nextProgress,
    },
    itemReviewStates,
    attempts: [...data.attempts, attempt].slice(-200),
    activeSession: null,
  };
  const nextLessonId =
    passed && session.mode === "mastery"
      ? (findNextLessonId(curriculum, nextData) ?? undefined)
      : undefined;
  return {
    data: nextData,
    summary: {
      attempt,
      lessonProgress: nextProgress,
      passed,
      accuracy:
        session.mode === "review"
          ? roundedAccuracy(reviewCorrect, reviewEntries.length)
          : activeAccuracy,
      activeCorrect,
      activeTotal: activeEntries.length,
      reviewCorrect,
      reviewTotal: reviewEntries.length,
      missedItemIds,
      nextEligibleMasteryDate: nextProgress.nextEligibleMasteryDate,
      nextLessonId,
    },
  };
}
