import type { Exercise, ExerciseAnswer, QuizItem } from "@/src/domain/types";

export type GradeResult = { correct: boolean };

export const normalizeAnswerText = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\s.,!?…'"“”‘’()[\]{}\-–—/\\]/gu, "")
    .trim();

const stringAnswerMatches = (exercise: Exercise | QuizItem, answer: string) => {
  const accepted = [
    ...(typeof exercise.correctAnswer === "string"
      ? [exercise.correctAnswer]
      : []),
    ...exercise.acceptedAnswers,
  ].map(normalizeAnswerText);
  return accepted.includes(normalizeAnswerText(answer));
};

export function gradeAnswer(
  exercise: Exercise | QuizItem,
  answer: ExerciseAnswer,
): GradeResult {
  if (exercise.type === "speaking-practice") {
    return { correct: answer === "confident" };
  }

  if (exercise.type === "matching-pairs") {
    if (typeof answer !== "object" || Array.isArray(answer)) {
      return { correct: false };
    }
    return {
      correct: (exercise.pairs ?? []).every(
        (pair) => answer[pair.left] === pair.right,
      ),
    };
  }

  if (Array.isArray(exercise.correctAnswer)) {
    return {
      correct:
        Array.isArray(answer) &&
        answer.length === exercise.correctAnswer.length &&
        answer.every(
          (part, index) =>
            normalizeAnswerText(part) ===
            normalizeAnswerText(exercise.correctAnswer[index]),
        ),
    };
  }

  return {
    correct:
      typeof answer === "string" && stringAnswerMatches(exercise, answer),
  };
}

export const isAnswerCorrect = (
  exercise: Exercise | QuizItem,
  answer: ExerciseAnswer,
) => gradeAnswer(exercise, answer).correct;

export function correctAnswerPresentation(exercise: Exercise | QuizItem) {
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
  return exercise.correctAnswer;
}
