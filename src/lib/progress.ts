import { course, orderedLessonIds } from "@/src/content/course";
import type {
  Exercise,
  ExerciseAnswer,
  LessonSession,
  Progress,
} from "@/src/domain/types";

export const localDateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const defaultProgress = (): Progress => ({
  totalXp: 0,
  todayXp: 0,
  todayDate: localDateKey(),
  currentStreak: 0,
  longestStreak: 0,
  lastPracticeDate: null,
  completedLessonIds: [],
  lessonAttempts: {},
  activities: [],
  mistakeExerciseIds: [],
});

const normalize = (value: string) =>
  value
    .toLocaleLowerCase()
    .replace(/[\s.,!?]/g, "")
    .trim();

export const isAnswerCorrect = (exercise: Exercise, answer: ExerciseAnswer) => {
  if (exercise.type === "matching") {
    if (typeof answer !== "object" || Array.isArray(answer)) return false;
    return (exercise.pairs ?? []).every(
      (pair) => answer[pair.left] === pair.right,
    );
  }

  if (Array.isArray(exercise.correctAnswer)) {
    return (
      Array.isArray(answer) &&
      answer.map(normalize).join("|") ===
        exercise.correctAnswer.map(normalize).join("|")
    );
  }

  if (typeof answer !== "string") return false;
  const accepted = [
    exercise.correctAnswer,
    ...(exercise.acceptedAnswers ?? []),
  ].map(normalize);
  return accepted.includes(normalize(answer));
};

export const isLessonUnlocked = (lessonId: string, completed: string[]) => {
  const index = orderedLessonIds.indexOf(lessonId);
  return index === 0 || completed.includes(orderedLessonIds[index - 1]);
};

export const unitPercent = (unitId: string, completed: string[]) => {
  const lessonIds = course.units
    .find((unit) => unit.id === unitId)
    ?.nodes.flatMap((node) => (node.lessonId ? [node.lessonId] : []));
  if (!lessonIds?.length) return 0;
  return Math.round(
    (lessonIds.filter((id) => completed.includes(id)).length /
      lessonIds.length) *
      100,
  );
};

export const sessionAccuracy = (session: LessonSession) => {
  if (!session.answers.length) return 0;
  return Math.round(
    (session.answers.filter((answer) => answer.correct).length /
      session.answers.length) *
      100,
  );
};

export const updateStreak = (progress: Progress) => {
  const today = localDateKey();
  if (progress.lastPracticeDate === today) return progress;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const nextStreak =
    progress.lastPracticeDate === localDateKey(yesterday)
      ? progress.currentStreak + 1
      : 1;
  return {
    ...progress,
    currentStreak: nextStreak,
    longestStreak: Math.max(progress.longestStreak, nextStreak),
    lastPracticeDate: today,
  };
};
