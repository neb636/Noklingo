import type {
  Course,
  Exercise,
  ExerciseAttempt,
  MistakeRecord,
  Progress,
  ReviewSchedulingState,
  ReviewSession,
} from "@/src/domain/types";
import {
  createMistakeCorrectionExercise,
  sourceExerciseId,
} from "@/src/engine/grading";
import {
  addLocalDays,
  daysBetweenDateKeys,
  localDateKey,
  recalculateMastery,
} from "@/src/engine/progression";

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const responseQuality = (attempt: ExerciseAttempt, exercise: Exercise) => {
  if (!attempt.correct)
    return attempt.selfAssessment === "needs-practice" ? 2 : 1;
  if (!attempt.firstAttempt || attempt.hintUsed) return 3;
  if (attempt.elapsedMs > exercise.estimatedSeconds * 1_700) return 4;
  return 5;
};

export function scheduleReview(
  current: ReviewSchedulingState | undefined,
  attempt: ExerciseAttempt,
  exercise: Exercise,
  itemId: string,
  now = new Date(attempt.answeredAt),
  itemDifficulty = exercise.difficulty,
): ReviewSchedulingState {
  const today = localDateKey(now);
  const previous: ReviewSchedulingState = current ?? {
    itemId,
    status: "new",
    strength: 0.12,
    easeFactor: 2.35,
    intervalDays: 0,
    dueDate: today,
    successfulReviews: 0,
    totalReviews: 0,
    recentFailures: 0,
    lapses: 0,
  };
  const quality = responseQuality(attempt, exercise);
  const combinedDifficulty = (exercise.difficulty + itemDifficulty) / 2;
  const difficultyFactor = 1.12 - combinedDifficulty * 0.06;
  const success = quality >= 3;
  const successfulReviews = previous.successfulReviews + (success ? 1 : 0);
  const easeFactor = clamp(
    previous.easeFactor +
      (success ? (quality === 5 ? 0.08 : 0) : -0.2) -
      (attempt.hintUsed ? 0.05 : 0),
    1.3,
    3,
  );

  let intervalDays: number;
  if (!success) intervalDays = 1;
  else if (successfulReviews === 1) intervalDays = 1;
  else if (successfulReviews === 2) intervalDays = 3;
  else {
    intervalDays = Math.max(
      2,
      Math.round(previous.intervalDays * easeFactor * difficultyFactor),
    );
  }

  const strengthDelta = success
    ? 0.1 + quality * 0.025 - exercise.difficulty * 0.008
    : -0.18 - combinedDifficulty * 0.015;
  return {
    ...previous,
    status: success && successfulReviews >= 2 ? "review" : "learning",
    strength: clamp(previous.strength + strengthDelta, 0.04, 1),
    easeFactor,
    intervalDays,
    dueDate: addLocalDays(today, intervalDays),
    lastReviewedAt: now.toISOString(),
    successfulReviews,
    totalReviews: previous.totalReviews + 1,
    recentFailures: success
      ? Math.max(0, previous.recentFailures - 1)
      : previous.recentFailures + 1,
    lapses: previous.lapses + (success ? 0 : 1),
    lastOutcome:
      attempt.selfAssessment === "needs-practice"
        ? "needs-practice"
        : attempt.correct
          ? "correct"
          : "incorrect",
  };
}

const recordMistake = (
  mistakes: MistakeRecord[],
  attempt: ExerciseAttempt,
): MistakeRecord[] => {
  const targetId = `mistake.${attempt.lessonId}.${attempt.sourceExerciseId}`;
  const index = mistakes.findIndex(({ id }) => id === targetId);
  const isCorrection = !attempt.firstAttempt;
  if (index === -1 && attempt.correct) return mistakes;
  if (index === -1) {
    return [
      ...mistakes,
      {
        id: targetId,
        lessonId: attempt.lessonId,
        exerciseId: attempt.sourceExerciseId,
        sourceItemIds: attempt.sourceItemIds,
        firstSeenAt: attempt.answeredAt,
        lastSeenAt: attempt.answeredAt,
        timesWrong: 1,
        successfulCorrections: 0,
        resolved: false,
      },
    ];
  }
  return mistakes.map((mistake, mistakeIndex) => {
    if (mistakeIndex !== index) return mistake;
    const successfulCorrections =
      mistake.successfulCorrections + (attempt.correct && isCorrection ? 1 : 0);
    return {
      ...mistake,
      lastSeenAt: attempt.answeredAt,
      timesWrong: mistake.timesWrong + (attempt.correct ? 0 : 1),
      successfulCorrections,
      resolved: attempt.correct && isCorrection && successfulCorrections >= 1,
    };
  });
};

export function applyAttemptToLearningState(
  course: Course,
  progress: Progress,
  attempt: ExerciseAttempt,
  exercise: Exercise,
) {
  const reviewStates = { ...progress.reviewStates };
  for (const itemId of attempt.sourceItemIds) {
    const item =
      course.phrases.find(({ id }) => id === itemId) ??
      course.vocabulary.find(({ id }) => id === itemId);
    reviewStates[itemId] = scheduleReview(
      reviewStates[itemId],
      attempt,
      exercise,
      itemId,
      new Date(attempt.answeredAt),
      item?.difficulty ?? exercise.difficulty,
    );
  }
  const next: Progress = {
    ...progress,
    exerciseAttempts: [...progress.exerciseAttempts, attempt].slice(-500),
    mistakes: recordMistake(progress.mistakes, attempt),
    reviewStates,
  };
  return { ...next, masteryBySkill: recalculateMastery(course, next) };
}

const stableHash = (value: string) => {
  let hash = 0;
  for (const character of value) {
    hash = (Math.imul(hash, 31) + (character.codePointAt(0) ?? 0)) | 0;
  }
  return Math.abs(hash);
};

const exerciseFamily = (exercise: Exercise) => {
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
};

const candidatePriority = (
  exercise: Exercise,
  progress: Progress,
  today: string,
) => {
  const mistake = progress.mistakes.find(
    (record) =>
      !record.resolved &&
      (record.exerciseId === sourceExerciseId(exercise.id) ||
        record.sourceItemIds.some((itemId) =>
          exercise.sourceItemIds.includes(itemId),
        )),
  );
  const states = exercise.sourceItemIds
    .map((itemId) => progress.reviewStates[itemId])
    .filter((state): state is ReviewSchedulingState => Boolean(state));
  const dueScore = states.reduce((score, state) => {
    const overdue = Math.max(0, daysBetweenDateKeys(state.dueDate, today));
    return Math.max(
      score,
      overdue * 8 +
        (1 - state.strength) * 90 +
        state.recentFailures * 18 +
        exercise.difficulty * 4,
    );
  }, 0);
  return (mistake ? 1_000 + mistake.timesWrong * 25 : 0) + dueScore;
};

const rotateChoices = (exercise: Exercise, offset: number) => {
  if (!exercise.choices?.length) return exercise.choices;
  const amount = offset % exercise.choices.length;
  return [
    ...exercise.choices.slice(amount),
    ...exercise.choices.slice(0, amount),
  ];
};

const makeReviewVariant = (
  exercise: Exercise,
  index: number,
  mistake: boolean,
) => {
  if (mistake) return createMistakeCorrectionExercise(exercise, 1);
  return {
    ...exercise,
    id: `${exercise.id}.review-${index + 1}`,
    instruction: `Review · ${exercise.instruction}`,
    prompt: exercise.context
      ? `Return to “${exercise.context}”: ${exercise.prompt}`
      : `Without the lesson warm-up: ${exercise.prompt}`,
    choices: rotateChoices(exercise, index + 1),
    tags: Array.from(new Set([...exercise.tags, "spaced-review"])),
  } satisfies Exercise;
};

export function generateReviewSession(
  course: Course,
  progress: Progress,
  now = new Date(),
  targetSize = 7,
): ReviewSession {
  const today = localDateKey(now);
  const eligibleLessonIds = progress.completedLessonIds.length
    ? new Set(progress.completedLessonIds)
    : new Set(course.lessons.slice(0, 1).map(({ id }) => id));
  const pool = course.lessons
    .filter((lesson) => eligibleLessonIds.has(lesson.id))
    .flatMap((lesson) => lesson.exercises)
    .map((exercise) => ({
      exercise,
      priority: candidatePriority(exercise, progress, today),
      tie: stableHash(`${today}:${exercise.id}`),
    }))
    .sort(
      (left, right) => right.priority - left.priority || left.tie - right.tie,
    );

  const selected: Exercise[] = [];
  const selectedIds = new Set<string>();
  for (const family of ["listening", "recall", "conversation"]) {
    const candidate = pool.find(
      ({ exercise }) =>
        exerciseFamily(exercise) === family && !selectedIds.has(exercise.id),
    );
    if (candidate) {
      selected.push(candidate.exercise);
      selectedIds.add(candidate.exercise.id);
    }
  }
  for (const { exercise } of pool) {
    if (selected.length >= targetSize) break;
    if (!selectedIds.has(exercise.id)) {
      selected.push(exercise);
      selectedIds.add(exercise.id);
    }
  }

  const unresolved = new Set(
    progress.mistakes
      .filter(({ resolved }) => !resolved)
      .map(({ exerciseId }) => exerciseId),
  );
  const exercises = selected.map((exercise, index) =>
    makeReviewVariant(
      exercise,
      index,
      unresolved.has(sourceExerciseId(exercise.id)),
    ),
  );
  const dueItemIds = Array.from(
    new Set(exercises.flatMap(({ sourceItemIds }) => sourceItemIds)),
  );
  const hasMistakes = progress.mistakes.some(({ resolved }) => !resolved);
  const hasDue = dueItemIds.some((itemId) => {
    const state = progress.reviewStates[itemId];
    return state && state.dueDate <= today;
  });

  return {
    id: `review.${today}.${stableHash(dueItemIds.join("."))}`,
    generatedAt: now.toISOString(),
    dueItemIds,
    source: hasMistakes && hasDue ? "mixed" : hasMistakes ? "mistakes" : "due",
    estimatedMinutes: clamp(Math.ceil(exercises.length * 0.55), 1, 7),
    exercises,
  };
}

export function reviewOverview(
  course: Course,
  progress: Progress,
  now = new Date(),
) {
  const today = localDateKey(now);
  const dueCount = Object.values(progress.reviewStates).filter(
    (state) => state.dueDate <= today,
  ).length;
  const mistakeCount = progress.mistakes.filter(
    ({ resolved }) => !resolved,
  ).length;
  const weakSkills = course.skills
    .map((skill) => ({
      id: skill.id,
      title: skill.title,
      detail: skill.description,
      strength: Math.round((progress.masteryBySkill[skill.id] ?? 0.12) * 100),
    }))
    .sort((left, right) => left.strength - right.strength)
    .slice(0, 3);
  return {
    dueCount,
    mistakeCount,
    readyCount: 7,
    weakSkills,
  };
}
