import type { Achievement, Course, Progress } from "@/src/domain/types";

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

export const defaultProgress = (date = new Date()): Progress => ({
  totalXp: 0,
  todayXp: 0,
  todayDate: localDateKey(date),
  currentStreak: 0,
  longestStreak: 0,
  lastPracticeDate: null,
  completedLessonIds: [],
  lessonAttempts: {},
  lessonStates: {},
  checkpointResults: {},
  activities: [],
  exerciseAttempts: [],
  mistakes: [],
  reviewStates: {},
  masteryBySkill: {},
  unlockedAchievementIds: [],
});

export function refreshDailyProgress(progress: Progress, now = new Date()) {
  const today = localDateKey(now);
  return progress.todayDate === today
    ? progress
    : { ...progress, todayXp: 0, todayDate: today };
}

export function updateStreak(progress: Progress, now = new Date()): Progress {
  const today = localDateKey(now);
  if (progress.lastPracticeDate === today) return progress;
  if (
    progress.lastPracticeDate &&
    daysBetweenDateKeys(progress.lastPracticeDate, today) < 0
  ) {
    // Traveling west or correcting a device clock should not erase a streak.
    return progress;
  }
  const consecutive =
    progress.lastPracticeDate !== null &&
    daysBetweenDateKeys(progress.lastPracticeDate, today) === 1;
  const currentStreak = consecutive ? progress.currentStreak + 1 : 1;
  return {
    ...progress,
    currentStreak,
    longestStreak: Math.max(progress.longestStreak, currentStreak),
    lastPracticeDate: today,
  };
}

const checkpointPassed = (progress: Progress, checkpointId: string) =>
  progress.checkpointResults[checkpointId]?.passed === true;

export function isUnitUnlocked(
  course: Course,
  unitId: string,
  progress: Progress,
) {
  const unit = course.units.find(({ id }) => id === unitId);
  if (!unit) return false;
  return unit.prerequisiteCheckpointIds.every((checkpointId) =>
    checkpointPassed(progress, checkpointId),
  );
}

export function isLessonUnlocked(
  course: Course,
  lessonId: string,
  progress: Progress,
) {
  const lesson = course.lessons.find(({ id }) => id === lessonId);
  if (!lesson || !isUnitUnlocked(course, lesson.unitId, progress)) return false;
  return lesson.prerequisiteLessonIds.every((prerequisiteId) =>
    progress.completedLessonIds.includes(prerequisiteId),
  );
}

export function orderedLessonIds(course: Course) {
  return course.units.flatMap((unit) =>
    unit.nodes.flatMap((node) => (node.lessonId ? [node.lessonId] : [])),
  );
}

export function findNextLessonId(course: Course, progress: Progress) {
  return (
    orderedLessonIds(course).find(
      (lessonId) =>
        !progress.completedLessonIds.includes(lessonId) &&
        isLessonUnlocked(course, lessonId, progress),
    ) ?? null
  );
}

export function unitPercent(
  course: Course,
  unitId: string,
  progress: Progress,
) {
  const lessonIds = course.units
    .find((unit) => unit.id === unitId)
    ?.nodes.flatMap((node) => (node.lessonId ? [node.lessonId] : []));
  if (!lessonIds?.length) return 0;
  return Math.round(
    (lessonIds.filter((id) => progress.completedLessonIds.includes(id)).length /
      lessonIds.length) *
      100,
  );
}

export function recalculateMastery(
  course: Course,
  progress: Progress,
): Progress["masteryBySkill"] {
  return Object.fromEntries(
    course.skills.map((skill) => {
      const strengths = skill.itemIds.map(
        (itemId) => progress.reviewStates[itemId]?.strength ?? 0.12,
      );
      return [
        skill.id,
        strengths.reduce((sum, strength) => sum + strength, 0) /
          strengths.length,
      ];
    }),
  );
}

const achievementUnlocked = (
  achievement: Achievement,
  progress: Progress,
  accuracy: number,
  mode: "lesson" | "checkpoint" | "review",
) => {
  const { kind, threshold } = achievement.criteria;
  if (kind === "lesson-count")
    return progress.completedLessonIds.length >= threshold;
  if (kind === "perfect-lesson") return mode === "lesson" && accuracy === 100;
  if (kind === "checkpoint-count")
    return (
      Object.values(progress.checkpointResults).filter(
        (result) => result.passed,
      ).length >= threshold
    );
  if (kind === "streak") return progress.currentStreak >= threshold;
  return progress.totalXp >= threshold;
};

export function unlockAchievements(
  course: Course,
  progress: Progress,
  accuracy: number,
  mode: "lesson" | "checkpoint" | "review" = "lesson",
) {
  const newlyUnlocked = course.achievements.filter(
    (achievement) =>
      !progress.unlockedAchievementIds.includes(achievement.id) &&
      achievementUnlocked(achievement, progress, accuracy, mode),
  );
  return {
    progress: {
      ...progress,
      unlockedAchievementIds: [
        ...progress.unlockedAchievementIds,
        ...newlyUnlocked.map(({ id }) => id),
      ],
    },
    newlyUnlocked,
  };
}
