import assert from "node:assert/strict";
import test from "node:test";

import { course } from "../src/content/course";
import { audioManifest } from "../src/content/audioManifest";
import { createDevelopmentProgress } from "../src/content/developmentProgress";
import {
  CourseAuthoringError,
  parseCourse,
  validateCourseAuthoring,
} from "../src/domain/courseValidation";
import { PersistedAppDataSchema } from "../src/domain/schemas";
import type {
  Course,
  Exercise,
  ExerciseAttempt,
  ExerciseType,
} from "../src/domain/types";
import {
  calculateAttemptXp,
  createMistakeCorrectionExercise,
  gradeAnswer,
} from "../src/engine/grading";
import {
  defaultProgress,
  isLessonUnlocked,
  isUnitUnlocked,
  localDateKey,
  updateStreak,
} from "../src/engine/progression";
import {
  applyAttemptToLearningState,
  generateReviewSession,
  scheduleReview,
} from "../src/engine/review";
import { migratePersistedAppData } from "../src/lib/db";
import {
  defaultProfile,
  defaultSettings,
  useAppStore,
} from "../src/store/useAppStore";

const exercises = () => course.lessons.flatMap((lesson) => lesson.exercises);

function exerciseByType(type: ExerciseType) {
  const exercise = exercises().find((candidate) => candidate.type === type);
  assert.ok(exercise, `Expected demonstration content for ${type}`);
  return exercise;
}

function expectAuthoringError(
  mutate: (draft: Course) => void,
  pathPattern: RegExp,
  messagePattern: RegExp,
) {
  const draft = structuredClone(course);
  mutate(draft);
  assert.throws(
    () => parseCourse(draft),
    (error: unknown) => {
      assert.ok(error instanceof CourseAuthoringError);
      assert.ok(
        error.issues.length > 0,
        "Expected at least one authoring issue",
      );
      assert.ok(
        error.issues.some(
          (issue) =>
            pathPattern.test(issue.path) && messagePattern.test(issue.message),
        ),
        `Expected ${String(pathPattern)} / ${String(messagePattern)} in:\n${error.message}`,
      );
      return true;
    },
  );
}

let attemptSequence = 0;
function attemptFor(
  exercise: Exercise,
  overrides: Partial<ExerciseAttempt> = {},
): ExerciseAttempt {
  attemptSequence += 1;
  return {
    id: `attempt.test-${attemptSequence}`,
    sessionId: "session.test",
    lessonId: "lesson.first-hellos",
    exerciseId: exercise.id,
    sourceExerciseId: exercise.id,
    sourceItemIds: exercise.sourceItemIds,
    answer: exercise.correctAnswer,
    correct: true,
    firstAttempt: true,
    hintUsed: false,
    retryCount: 0,
    elapsedMs: 1_000,
    xpEarned: 2,
    answeredAt: new Date(2026, 0, 10, 12).toISOString(),
    ...overrides,
  };
}

const localNoon = (year: number, monthIndex: number, day: number) =>
  new Date(year, monthIndex, day, 12, 0, 0, 0);

test("the normalized demonstration course passes shape and semantic validation", () => {
  const parsed = parseCourse(structuredClone(course));
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.id, course.id);
  assert.equal(
    validateCourseAuthoring(parsed).filter(
      (issue) => issue.severity === "error",
    ).length,
    0,
  );
});

test("Course 1 ships a substantial progressive path and complete recording manifest", () => {
  assert.equal(course.units.length, 14);
  assert.equal(
    course.lessons.filter(({ kind }) => kind === "lesson").length,
    41,
  );
  assert.equal(course.checkpoints.length, 5);
  assert.equal(course.dialogues.length, 41);
  assert.equal(
    course.lessons.reduce((sum, lesson) => sum + lesson.exercises.length, 0),
    450,
  );
  assert.equal(audioManifest.length, course.audioAssets.length * 2);
  assert.ok(
    audioManifest.every(
      ({ lessonIds, recordingStatus }) =>
        lessonIds.length > 0 && recordingStatus === "needs-recording",
    ),
  );
});

test("development progress fixtures expose checkpoint, unlock, and review states", () => {
  const checkpointReady = createDevelopmentProgress(
    "welcome-checkpoint-ready",
    localNoon(2026, 6, 20),
  );
  assert.equal(
    isLessonUnlocked(course, "lesson.welcome-checkpoint", checkpointReady),
    true,
  );
  const unlocked = createDevelopmentProgress(
    "after-welcome-checkpoint",
    localNoon(2026, 6, 20),
  );
  assert.equal(isUnitUnlocked(course, "unit.introductions", unlocked), true);
  const reviewReady = createDevelopmentProgress(
    "review-ready",
    localNoon(2026, 6, 20),
  );
  assert.ok(Object.keys(reviewReady.reviewStates).length > 0);
});

test("version 1 progress migrates to a validated version 2 snapshot", () => {
  const today = localDateKey();
  const completedAt = new Date(2026, 0, 9, 12).toISOString();
  const migrated = migratePersistedAppData({
    version: 1,
    profile: {
      name: "Nina",
      onboarded: true,
      dailyGoal: 30,
      motivation: "Talk with family",
      familiarity: "some",
    },
    settings: {
      audioEnabled: false,
      volume: 0.4,
      romanization: "always",
      reducedMotion: true,
      darkMode: true,
    },
    progress: {
      totalXp: 87,
      todayXp: 12,
      todayDate: today,
      currentStreak: 4,
      longestStreak: 6,
      lastPracticeDate: today,
      completedLessonIds: ["lesson.first-hellos"],
      lessonAttempts: { "lesson.first-hellos": 3 },
      activities: [
        {
          lessonId: "lesson.first-hellos",
          title: "Hello without the homework",
          xp: 9,
          accuracy: 88,
          completedAt,
        },
      ],
      mistakeExerciseIds: ["ex.hello.listen-meaning"],
    },
    activeSession: {
      lessonId: "legacy-session-is-not-resumable",
    },
  });

  assert.equal(migrated.version, 2);
  assert.deepEqual(
    {
      name: migrated.profile.name,
      onboarded: migrated.profile.onboarded,
      dailyGoal: migrated.profile.dailyGoal,
      motivation: migrated.profile.motivation,
      familiarity: migrated.profile.familiarity,
      politeParticle: migrated.profile.politeParticle,
    },
    {
      name: "Nina",
      onboarded: true,
      dailyGoal: 30,
      motivation: "Talk with family",
      familiarity: "some",
      politeParticle: "khrap",
    },
  );
  assert.deepEqual(
    {
      audioEnabled: migrated.settings.audioEnabled,
      volume: migrated.settings.volume,
      romanization: migrated.settings.romanization,
      showThaiScript: migrated.settings.showThaiScript,
      reducedMotion: migrated.settings.reducedMotion,
      darkMode: migrated.settings.darkMode,
    },
    {
      audioEnabled: false,
      volume: 0.4,
      romanization: "always",
      showThaiScript: false,
      reducedMotion: true,
      darkMode: true,
    },
  );
  assert.equal(migrated.progress.totalXp, 87);
  assert.equal(migrated.progress.todayXp, 12);
  assert.equal(migrated.progress.currentStreak, 4);
  assert.equal(migrated.progress.longestStreak, 6);
  assert.deepEqual(migrated.progress.completedLessonIds, [
    "lesson.first-hellos",
  ]);
  assert.equal(migrated.progress.lessonAttempts["lesson.first-hellos"], 3);
  assert.equal(
    migrated.progress.lessonStates["lesson.first-hellos"]?.status,
    "completed",
  );
  assert.equal(migrated.progress.activities[0]?.completedAt, completedAt);
  assert.equal(
    migrated.progress.mistakes[0]?.exerciseId,
    "ex.hello.listen-meaning",
  );
  assert.equal(migrated.progress.mistakes[0]?.resolved, false);
  assert.equal(migrated.activeSession, null);
  assert.equal(PersistedAppDataSchema.safeParse(migrated).success, true);

  assert.throws(
    () => migratePersistedAppData({ version: 7 }),
    /not a valid Noklingo progress export/u,
  );
});

test("course validation reports a useful duplicate-ID error", () => {
  expectAuthoringError(
    (draft) => {
      draft.phrases.push(structuredClone(draft.phrases[0]));
    },
    /phrases\[\d+\]\.id/u,
    /Duplicate ID/u,
  );
});

test("course validation reports a useful broken-reference error", () => {
  expectAuthoringError(
    (draft) => {
      draft.lessons[0].skillIds[0] = "skill.does-not-exist";
    },
    /lessons\[0\]\.skillIds\[0\]/u,
    /Unknown skill reference/u,
  );
});

test("course validation rejects testing an item before its introduction", () => {
  expectAuthoringError(
    (draft) => {
      draft.lessons[0].exercises[0].sourceItemIds = ["phrase.where-hospital"];
    },
    /lessons\[0\]\.exercises\[0\]\.sourceItemIds\[0\]/u,
    /must be introduced in this lesson or an earlier path lesson/u,
  );
});

test("course validation rejects Thai script in a Romanization field", () => {
  expectAuthoringError(
    (draft) => {
      draft.phrases[0].romanization = "สวัสดี";
    },
    /phrases.*romanization/u,
    /Romanization.*Latin characters/u,
  );
});

test("course validation explains poor lesson composition", () => {
  expectAuthoringError(
    (draft) => {
      const lesson = draft.lessons.find(
        ({ id }) => id === "lesson.first-hellos",
      );
      assert.ok(lesson);
      lesson.exercises = lesson.exercises.filter(
        ({ type }) =>
          type !== "conversation-response" &&
          type !== "personalized-translation" &&
          type !== "dialogue-comprehension",
      );
      assert.ok(lesson.exercises.length >= 6);
    },
    /lessons\.lesson\.first-hellos\.exercises/u,
    /needs at least one conversation or dialogue exercise/u,
  );
});

test("grading handles accepted variants, ordered phrases, and matching maps", () => {
  const speaking = exercises().find(
    (exercise) =>
      exercise.type === "speaking-practice" &&
      exercise.acceptedAnswers.includes("mâi phèt khrap"),
  );
  assert.ok(speaking);
  assert.equal(gradeAnswer(speaking, "  MÂI PHÈT KHRAP!!! ").correct, true);

  const ordering = exerciseByType("phrase-order");
  assert.ok(Array.isArray(ordering.correctAnswer));
  assert.equal(gradeAnswer(ordering, ordering.correctAnswer).correct, true);
  assert.equal(
    gradeAnswer(ordering, [...ordering.correctAnswer].reverse()).correct,
    false,
  );

  const matching = exerciseByType("matching-pairs");
  const correctMap = Object.fromEntries(
    (matching.pairs ?? []).map((pair) => [pair.left, pair.right]),
  );
  assert.equal(gradeAnswer(matching, correctMap).correct, true);
  const firstPair = matching.pairs?.[0];
  assert.ok(firstPair);
  assert.equal(
    gradeAnswer(matching, { ...correctMap, [firstPair.left]: "not-a-match" })
      .correct,
    false,
  );
});

test("speaking self-assessment never charges a heart", () => {
  const speaking = exerciseByType("speaking-practice");
  assert.deepEqual(gradeAnswer(speaking, "confident"), {
    correct: true,
    heartCost: 0,
    needsReview: false,
    selfAssessment: "confident",
  });
  assert.deepEqual(gradeAnswer(speaking, "needs-practice"), {
    correct: false,
    heartCost: 0,
    needsReview: true,
    selfAssessment: "needs-practice",
  });
});

test("XP distinguishes first recall, hints, retries, and misses", () => {
  const hardExercise = exercises().find(
    (exercise) =>
      exercise.difficulty >= 4 && exercise.type !== "mistake-correction",
  );
  assert.ok(hardExercise);

  assert.equal(
    calculateAttemptXp({
      exercise: hardExercise,
      correct: true,
      firstAttempt: true,
      hintUsed: false,
    }),
    3,
  );
  assert.equal(
    calculateAttemptXp({
      exercise: hardExercise,
      correct: true,
      firstAttempt: true,
      hintUsed: true,
    }),
    2,
  );
  assert.equal(
    calculateAttemptXp({
      exercise: hardExercise,
      correct: true,
      firstAttempt: false,
      hintUsed: false,
    }),
    1,
  );
  assert.equal(
    calculateAttemptXp({
      exercise: hardExercise,
      correct: false,
      firstAttempt: true,
      hintUsed: false,
    }),
    0,
  );
  assert.equal(
    calculateAttemptXp({
      exercise: exerciseByType("speaking-practice"),
      correct: false,
      firstAttempt: true,
      hintUsed: false,
      selfAssessment: "needs-practice",
    }),
    0,
  );
});

test("the lesson store enters recovery and appends an altered correction", () => {
  const originalState = useAppStore.getState();
  try {
    useAppStore.setState({
      hydrated: true,
      route: "home",
      profile: { ...defaultProfile, onboarded: true },
      settings: { ...defaultSettings },
      progress: defaultProgress(localNoon(2026, 0, 10)),
      activeSession: null,
      completion: null,
      notice: null,
    });
    useAppStore.getState().startLesson("lesson.first-hellos");

    const started = useAppStore.getState().activeSession;
    assert.ok(started);
    const source = started.exerciseQueue[started.exerciseIndex];
    assert.ok(source);
    assert.ok(source.choices);
    const wrongChoice = source.choices.find(
      ({ id }) => id !== source.correctAnswer,
    );
    assert.ok(wrongChoice);
    const originalQueueLength = started.exerciseQueue.length;

    useAppStore.setState({
      activeSession: {
        ...started,
        hearts: 1,
        currentAnswer: wrongChoice.id,
        currentResult: null,
      },
    });
    useAppStore.getState().checkAnswer();

    const recovered = useAppStore.getState();
    const session = recovered.activeSession;
    assert.ok(session);
    assert.equal(session.currentResult, false);
    assert.equal(session.hearts, 2);
    assert.equal(session.recoveryCount, 1);
    assert.equal(session.answers.length, 1);
    assert.equal(session.answers[0].correct, false);
    assert.equal(session.exerciseQueue.length, originalQueueLength + 1);

    const correction = session.exerciseQueue.at(-1);
    assert.ok(correction);
    assert.equal(correction.type, "mistake-correction");
    assert.match(correction.id, /\.repair-1$/u);
    assert.notEqual(correction.id, source.id);
    assert.notEqual(correction.prompt, source.prompt);
    assert.equal(recovered.progress.mistakes.length, 1);
    assert.equal(recovered.progress.mistakes[0].resolved, false);
  } finally {
    useAppStore.setState(originalState, true);
  }
});

test("streaks use local calendar days and tolerate backward dates", () => {
  const dayOne = localNoon(2026, 0, 10);
  let progress = updateStreak(defaultProgress(dayOne), dayOne);
  assert.equal(progress.currentStreak, 1);
  assert.equal(progress.longestStreak, 1);
  assert.equal(progress.lastPracticeDate, "2026-01-10");

  const sameDay = updateStreak(progress, localNoon(2026, 0, 10));
  assert.strictEqual(sameDay, progress);

  progress = updateStreak(progress, localNoon(2026, 0, 11));
  assert.equal(progress.currentStreak, 2);
  assert.equal(progress.longestStreak, 2);
  assert.equal(progress.lastPracticeDate, "2026-01-11");

  progress = updateStreak(progress, localNoon(2026, 0, 14));
  assert.equal(progress.currentStreak, 1);
  assert.equal(progress.longestStreak, 2);
  assert.equal(progress.lastPracticeDate, "2026-01-14");

  const backward = updateStreak(progress, localNoon(2026, 0, 13));
  assert.strictEqual(backward, progress);
  assert.equal(backward.lastPracticeDate, "2026-01-14");
});

test("lesson prerequisites and checkpoint gates are both explicit", () => {
  const now = localNoon(2026, 0, 10);
  let progress = defaultProgress(now);

  assert.equal(isUnitUnlocked(course, "unit.warm-welcome", progress), true);
  assert.equal(isUnitUnlocked(course, "unit.restaurant", progress), false);
  assert.equal(isLessonUnlocked(course, "lesson.first-hellos", progress), true);
  assert.equal(
    isLessonUnlocked(course, "lesson.welcome-checkpoint", progress),
    false,
  );

  progress = {
    ...progress,
    completedLessonIds: [
      "lesson.first-hellos",
      "lesson.survival-repairs",
      "lesson.yes-no-okay",
    ],
  };
  assert.equal(
    isLessonUnlocked(course, "lesson.welcome-checkpoint", progress),
    true,
  );

  progress = {
    ...progress,
    checkpointResults: {
      "checkpoint.welcome": {
        checkpointId: "checkpoint.welcome",
        attempts: 1,
        bestAccuracy: 79,
        passed: false,
        lastAttemptAt: now.toISOString(),
      },
    },
  };
  assert.equal(isUnitUnlocked(course, "unit.restaurant", progress), false);

  progress = {
    ...progress,
    checkpointResults: {
      "checkpoint.welcome": {
        checkpointId: "checkpoint.welcome",
        attempts: 2,
        bestAccuracy: 80,
        passed: true,
        lastAttemptAt: now.toISOString(),
      },
    },
  };
  assert.equal(course.checkpoints[0].passingAccuracy, 80);
  assert.equal(isUnitUnlocked(course, "unit.restaurant", progress), true);
  assert.equal(
    isLessonUnlocked(course, "lesson.restaurant-basics", progress),
    false,
    "the unit gate does not bypass the lesson prerequisite",
  );

  progress = {
    ...progress,
    completedLessonIds: [
      "lesson.first-hellos",
      "lesson.survival-repairs",
      "lesson.yes-no-okay",
      "lesson.welcome-checkpoint",
      "lesson.names-first",
      "lesson.where-you-fit",
      "lesson.what-and-where",
      "lesson.ask-again",
    ],
  };
  assert.equal(
    isLessonUnlocked(course, "lesson.restaurant-basics", progress),
    true,
  );
  assert.equal(
    isLessonUnlocked(course, "lesson.family-food-check", progress),
    false,
  );
});

test("checkpoint completion rejects 79% and passes at the 80% threshold", () => {
  const originalState = useAppStore.getState();
  const now = localNoon(2026, 0, 10);

  const runCheckpoint = (correctCount: number) => {
    useAppStore.setState({
      hydrated: true,
      route: "home",
      profile: { ...defaultProfile, onboarded: true },
      settings: { ...defaultSettings },
      progress: {
        ...defaultProgress(now),
        completedLessonIds: [
          "lesson.first-hellos",
          "lesson.survival-repairs",
          "lesson.yes-no-okay",
        ],
      },
      activeSession: null,
      completion: null,
      notice: null,
    });
    useAppStore.getState().startLesson("lesson.welcome-checkpoint");
    const started = useAppStore.getState().activeSession;
    assert.ok(started);

    const answers = Array.from({ length: 100 }, (_, index) => {
      const exercise =
        started.exerciseQueue[index % started.exerciseQueue.length];
      const correct = index < correctCount;
      return {
        exerciseId: exercise.id,
        sourceExerciseId: exercise.id,
        correct,
        firstAttempt: true,
        answer: correct ? exercise.correctAnswer : "wrong-answer",
        hintUsed: false,
        xpEarned: correct ? 2 : 0,
      };
    });
    useAppStore.setState({
      activeSession: {
        ...started,
        exerciseIndex: started.exerciseQueue.length - 1,
        currentResult: true,
        answers,
        earnedXp: 0,
      },
    });
    useAppStore.getState().continueLesson();
    return useAppStore.getState();
  };

  try {
    const failed = runCheckpoint(79);
    assert.equal(failed.completion?.accuracy, 79);
    assert.equal(failed.completion?.requiredAccuracy, 80);
    assert.equal(failed.completion?.passed, false);
    assert.equal(
      failed.progress.completedLessonIds.includes("lesson.welcome-checkpoint"),
      false,
    );
    assert.equal(
      failed.progress.checkpointResults["checkpoint.welcome"]?.passed,
      false,
    );
    assert.equal(
      isUnitUnlocked(course, "unit.restaurant", failed.progress),
      false,
    );

    const passed = runCheckpoint(80);
    assert.equal(passed.completion?.accuracy, 80);
    assert.equal(passed.completion?.requiredAccuracy, 80);
    assert.equal(passed.completion?.passed, true);
    assert.equal(
      passed.progress.completedLessonIds.includes("lesson.welcome-checkpoint"),
      true,
    );
    assert.equal(
      passed.progress.checkpointResults["checkpoint.welcome"]?.passed,
      true,
    );
    assert.equal(
      isUnitUnlocked(course, "unit.restaurant", passed.progress),
      true,
    );
    assert.equal(
      isLessonUnlocked(course, "lesson.restaurant-basics", passed.progress),
      false,
    );
    assert.equal(
      isLessonUnlocked(course, "lesson.names-first", passed.progress),
      true,
    );
  } finally {
    useAppStore.setState(originalState, true);
  }
});

test("scheduler returns failures soon and expands repeated-success intervals", () => {
  const exercise = exerciseByType("listen-meaning");
  const itemId = exercise.sourceItemIds[0];
  const firstDay = localNoon(2026, 0, 10);

  const failed = scheduleReview(
    undefined,
    attemptFor(exercise, {
      answer: "wrong-choice",
      correct: false,
      answeredAt: firstDay.toISOString(),
      xpEarned: 0,
    }),
    exercise,
    itemId,
    firstDay,
  );
  assert.equal(failed.intervalDays, 1);
  assert.equal(failed.status, "learning");
  assert.equal(failed.lapses, 1);
  assert.equal(failed.recentFailures, 1);

  const firstSuccess = scheduleReview(
    undefined,
    attemptFor(exercise, { answeredAt: firstDay.toISOString() }),
    exercise,
    itemId,
    firstDay,
  );
  const secondDay = localNoon(2026, 0, 11);
  const secondSuccess = scheduleReview(
    firstSuccess,
    attemptFor(exercise, { answeredAt: secondDay.toISOString() }),
    exercise,
    itemId,
    secondDay,
  );
  const thirdDay = localNoon(2026, 0, 14);
  const thirdSuccess = scheduleReview(
    secondSuccess,
    attemptFor(exercise, { answeredAt: thirdDay.toISOString() }),
    exercise,
    itemId,
    thirdDay,
  );

  assert.equal(firstSuccess.intervalDays, 1);
  assert.equal(secondSuccess.intervalDays, 3);
  assert.equal(secondSuccess.status, "review");
  assert.ok(thirdSuccess.intervalDays > secondSuccess.intervalDays);
  assert.ok(thirdSuccess.strength > secondSuccess.strength);
  assert.ok(firstSuccess.strength > failed.strength);
  assert.equal(thirdSuccess.successfulReviews, 3);
});

test("generated review is deterministic and mixes listening, recall, and conversation", () => {
  const now = localNoon(2026, 0, 20);
  const progress = {
    ...defaultProgress(now),
    completedLessonIds: ["lesson.first-hellos"],
  };
  const first = generateReviewSession(course, progress, now, 7);
  const second = generateReviewSession(course, progress, now, 7);
  assert.deepEqual(second, first);
  assert.equal(first.exercises.length, 7);

  const families = new Set(
    first.exercises.map((exercise) => {
      if (exercise.type.startsWith("listen-")) return "listening";
      if (
        [
          "conversation-response",
          "dialogue-comprehension",
          "personalized-translation",
        ].includes(exercise.type)
      )
        return "conversation";
      return "recall";
    }),
  );
  assert.deepEqual([...families].sort(), [
    "conversation",
    "listening",
    "recall",
  ]);
  assert.equal(
    new Set(first.exercises.map(({ id }) => id)).size,
    first.exercises.length,
  );
});

test("a mistake produces an altered correction and resolves after recovery", () => {
  const now = localNoon(2026, 0, 20);
  const source = exercises().find(({ id }) => id === "ex.hello.listen-meaning");
  assert.ok(source);
  const initial = {
    ...defaultProgress(now),
    completedLessonIds: ["lesson.first-hellos"],
  };
  const failedAttempt = attemptFor(source, {
    answer: "wrong-choice",
    correct: false,
    xpEarned: 0,
    answeredAt: now.toISOString(),
  });
  const afterFailure = applyAttemptToLearningState(
    course,
    initial,
    failedAttempt,
    source,
  );
  assert.equal(afterFailure.mistakes.length, 1);
  assert.equal(afterFailure.mistakes[0].resolved, false);

  const generated = generateReviewSession(course, afterFailure, now, 7);
  const correction = generated.exercises.find(
    ({ type }) => type === "mistake-correction",
  );
  assert.ok(correction);
  assert.notEqual(correction.id, source.id);
  assert.notEqual(correction.prompt, source.prompt);
  assert.notDeepEqual(
    correction.choices?.map(({ id }) => id),
    source.choices?.map(({ id }) => id),
  );
  assert.equal(gradeAnswer(correction, correction.correctAnswer).correct, true);

  const recoveredAttempt = attemptFor(correction, {
    lessonId: failedAttempt.lessonId,
    exerciseId: correction.id,
    sourceExerciseId: source.id,
    sourceItemIds: correction.sourceItemIds,
    answer: correction.correctAnswer,
    correct: true,
    firstAttempt: false,
    retryCount: 1,
    xpEarned: 1,
    answeredAt: localNoon(2026, 0, 21).toISOString(),
  });
  const recovered = applyAttemptToLearningState(
    course,
    afterFailure,
    recoveredAttempt,
    correction,
  );
  assert.equal(recovered.mistakes[0].successfulCorrections, 1);
  assert.equal(recovered.mistakes[0].resolved, true);

  const directCorrection = createMistakeCorrectionExercise(source, 2);
  assert.equal(directCorrection.type, "mistake-correction");
  assert.match(directCorrection.id, /\.repair-2$/u);
  assert.notEqual(directCorrection.prompt, source.prompt);
});

test("demonstration content covers every registered exercise type", () => {
  const expected: ExerciseType[] = [
    "listen-meaning",
    "listen-phrase",
    "english-to-phrase",
    "phrase-order",
    "missing-word",
    "matching-pairs",
    "conversation-response",
    "dialogue-comprehension",
    "speaking-practice",
    "mistake-correction",
    "personalized-translation",
  ];
  const actual = new Set(exercises().map(({ type }) => type));
  assert.deepEqual([...actual].sort(), [...expected].sort());
});
