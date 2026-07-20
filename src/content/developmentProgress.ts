import { course } from "@/src/content/course";
import type { Progress } from "@/src/domain/types";
import { defaultProgress, localDateKey } from "@/src/engine/progression";

export type DevelopmentProgressStage =
  "welcome-checkpoint-ready" | "after-welcome-checkpoint" | "review-ready";

const completedState = (lessonId: string, completedAt: string) => ({
  lessonId,
  status: "completed" as const,
  attempts: 1,
  bestAccuracy: 100,
  lastCompletedAt: completedAt,
});

export function createDevelopmentProgress(
  stage: DevelopmentProgressStage,
  now = new Date(),
): Progress {
  const progress = defaultProgress(now);
  const completedAt = now.toISOString();
  const welcomeLessons = [
    "lesson.first-hellos",
    "lesson.survival-repairs",
    "lesson.yes-no-okay",
  ];
  const completedLessonIds =
    stage === "after-welcome-checkpoint"
      ? [...welcomeLessons, "lesson.welcome-checkpoint"]
      : stage === "review-ready"
        ? ["lesson.first-hellos"]
        : welcomeLessons;
  const lessonStates = Object.fromEntries(
    completedLessonIds.map((lessonId) => [
      lessonId,
      completedState(lessonId, completedAt),
    ]),
  );

  if (stage === "review-ready") {
    const lesson = course.lessons.find(
      ({ id }) => id === "lesson.first-hellos",
    );
    const reviewStates = Object.fromEntries(
      (lesson?.introducedItemIds ?? []).map((itemId) => [
        itemId,
        {
          itemId,
          status: "learning" as const,
          strength: 0.18,
          easeFactor: 2.2,
          intervalDays: 0,
          dueDate: localDateKey(now),
          lastReviewedAt: completedAt,
          successfulReviews: 1,
          totalReviews: 2,
          recentFailures: 1,
          lapses: 1,
          lastOutcome: "incorrect" as const,
        },
      ]),
    );
    return {
      ...progress,
      totalXp: 20,
      todayXp: 20,
      completedLessonIds,
      lessonStates,
      reviewStates,
    };
  }

  return {
    ...progress,
    totalXp: stage === "after-welcome-checkpoint" ? 56 : 36,
    todayXp: stage === "after-welcome-checkpoint" ? 56 : 36,
    completedLessonIds,
    lessonStates,
    checkpointResults:
      stage === "after-welcome-checkpoint"
        ? {
            "checkpoint.welcome": {
              checkpointId: "checkpoint.welcome",
              attempts: 1,
              bestAccuracy: 100,
              passed: true,
              lastAttemptAt: completedAt,
            },
          }
        : {},
  };
}
