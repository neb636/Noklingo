import type {
  AnswerRecord,
  Exercise,
  ExerciseAnswer,
} from "@/src/domain/types";

export type GradeResult = {
  correct: boolean;
  heartCost: 0 | 1;
  needsReview: boolean;
  selfAssessment?: "confident" | "needs-practice";
};

export const normalizeAnswerText = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\s.,!?…'"“”‘’()[\]{}\-–—/\\]/gu, "")
    .trim();

const stringAnswerMatches = (exercise: Exercise, answer: string) => {
  const accepted = [
    ...(typeof exercise.correctAnswer === "string"
      ? [exercise.correctAnswer]
      : []),
    ...exercise.acceptedAnswers,
  ].map(normalizeAnswerText);
  return accepted.includes(normalizeAnswerText(answer));
};

export function gradeAnswer(
  exercise: Exercise,
  answer: ExerciseAnswer,
): GradeResult {
  if (exercise.type === "speaking-practice") {
    if (answer === "needs-practice") {
      return {
        correct: false,
        heartCost: 0,
        needsReview: true,
        selfAssessment: "needs-practice",
      };
    }
    if (answer === "confident") {
      return {
        correct: true,
        heartCost: 0,
        needsReview: false,
        selfAssessment: "confident",
      };
    }
  }

  if (exercise.type === "matching-pairs") {
    if (typeof answer !== "object" || Array.isArray(answer)) {
      return { correct: false, heartCost: 1, needsReview: true };
    }
    const correct = (exercise.pairs ?? []).every(
      (pair) => answer[pair.left] === pair.right,
    );
    return {
      correct,
      heartCost: correct ? 0 : 1,
      needsReview: !correct,
    };
  }

  if (Array.isArray(exercise.correctAnswer)) {
    const correct =
      Array.isArray(answer) &&
      answer.length === exercise.correctAnswer.length &&
      answer.every(
        (part, index) =>
          normalizeAnswerText(part) ===
          normalizeAnswerText(exercise.correctAnswer[index]),
      );
    return {
      correct,
      heartCost: correct ? 0 : 1,
      needsReview: !correct,
    };
  }

  const correct =
    typeof answer === "string" && stringAnswerMatches(exercise, answer);
  return {
    correct,
    heartCost: correct ? 0 : 1,
    needsReview: !correct,
  };
}

export const isAnswerCorrect = (exercise: Exercise, answer: ExerciseAnswer) =>
  gradeAnswer(exercise, answer).correct;

export function correctAnswerPresentation(exercise: Exercise) {
  if (exercise.type === "matching-pairs") {
    return (exercise.pairs ?? [])
      .map((pair) => `${pair.left} → ${pair.right}`)
      .join(" · ");
  }
  if (Array.isArray(exercise.correctAnswer)) {
    return exercise.correctAnswer.join(" ");
  }
  const choice = exercise.choices?.find(
    ({ id }) => id === exercise.correctAnswer,
  );
  if (choice) {
    return choice.meaning
      ? `${choice.label} — ${choice.meaning}`
      : choice.label;
  }
  if (exercise.type === "speaking-practice" && exercise.romanization) {
    return exercise.romanization;
  }
  return exercise.correctAnswer;
}

export function calculateAttemptXp({
  exercise,
  correct,
  firstAttempt,
  hintUsed,
  selfAssessment,
}: {
  exercise: Exercise;
  correct: boolean;
  firstAttempt: boolean;
  hintUsed: boolean;
  selfAssessment?: "confident" | "needs-practice";
}) {
  if (!correct || selfAssessment === "needs-practice") return 0;
  if (!firstAttempt || exercise.type === "mistake-correction") return 1;
  const difficultyBonus = exercise.difficulty >= 4 ? 1 : 0;
  return Math.max(1, 2 + difficultyBonus - (hintUsed ? 1 : 0));
}

export function sessionAccuracy(answers: AnswerRecord[]) {
  const originalAttempts = answers.filter((answer) => answer.firstAttempt);
  if (!originalAttempts.length) return 0;
  return Math.round(
    (originalAttempts.filter((answer) => answer.correct).length /
      originalAttempts.length) *
      100,
  );
}

const stableHash = (value: string) => {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const rotate = <T>(values: T[], offset: number) => {
  if (values.length < 2) return values;
  const amount = offset % values.length;
  return [...values.slice(amount), ...values.slice(0, amount)];
};

const correctionChoices = (exercise: Exercise) => {
  if (exercise.choices?.length) {
    return rotate(
      exercise.choices.map((choice) => ({ ...choice })),
      1 + (stableHash(exercise.id) % (exercise.choices.length - 1)),
    );
  }
  if (Array.isArray(exercise.correctAnswer)) {
    const correct = exercise.correctAnswer.join(" ");
    const reversed = [...exercise.correctAnswer].reverse().join(" ");
    const shifted = rotate([...exercise.correctAnswer], 1).join(" ");
    return [
      { id: "repair.correct", label: correct },
      { id: "repair.reversed", label: reversed },
      { id: "repair.shifted", label: shifted },
    ];
  }
  if (exercise.pairs?.length) {
    const correct = exercise.pairs
      .map((pair) => `${pair.left} → ${pair.right}`)
      .join(" · ");
    const shiftedRights = rotate(
      exercise.pairs.map((pair) => pair.right),
      1,
    );
    const wrong = exercise.pairs
      .map((pair, index) => `${pair.left} → ${shiftedRights[index]}`)
      .join(" · ");
    return [
      { id: "repair.correct", label: correct },
      { id: "repair.shifted", label: wrong },
    ];
  }
  const correct = exercise.romanization ?? String(exercise.correctAnswer);
  return [
    { id: "repair.correct", label: correct },
    { id: "repair.unsure", label: "I need to hear the model again" },
  ];
};

export function createMistakeCorrectionExercise(
  source: Exercise,
  round = 1,
): Exercise {
  const choices = correctionChoices(source);
  const originalCorrect = Array.isArray(source.correctAnswer)
    ? "repair.correct"
    : source.choices?.some(({ id }) => id === source.correctAnswer)
      ? source.correctAnswer
      : "repair.correct";
  return {
    ...source,
    id: `${source.id}.repair-${round}`,
    type: "mistake-correction",
    instruction: "Repair the idea in a fresh format",
    prompt: source.context
      ? `Back in “${source.context},” which response gets the meaning right?`
      : `One more angle: which answer matches “${source.meaning ?? source.prompt}”?`,
    audioRef: source.audioRef,
    dialogueId: undefined,
    choices,
    tokens: undefined,
    pairs: undefined,
    correctAnswer: originalCorrect,
    acceptedAnswers: [],
    inlineHint: undefined,
    hintIds: [],
    difficulty: Math.max(1, source.difficulty - 1),
    tags: Array.from(new Set([...source.tags, "mistake-review"])),
    feedback: {
      correct: "That repair will make the original easier next time.",
      incorrect: `The intended answer is ${correctAnswerPresentation(source)}.`,
      pronunciation: source.feedback.pronunciation,
    },
    accessibilityLabel: `Mistake correction for ${source.accessibilityLabel}`,
    estimatedSeconds: Math.min(45, source.estimatedSeconds + 5),
  };
}

export const sourceExerciseId = (exerciseId: string) =>
  exerciseId.replace(/\.repair-\d+$/u, "").replace(/\.review-\d+$/u, "");
