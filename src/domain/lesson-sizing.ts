import type { VideoLesson } from "./schemas";

export function diagnosticQuestionCount(lesson: Pick<VideoLesson, "cueCardIds">): number {
  return lesson.cueCardIds.length;
}

export function masteryQuestionCount(lesson: Pick<VideoLesson, "cueCardIds">): number {
  return Math.min(10, Math.max(4, lesson.cueCardIds.length * 2));
}

export function minimumQuestionBankSize(lesson: Pick<VideoLesson, "cueCardIds">): number {
  return Math.max(4, lesson.cueCardIds.length * 2);
}

export function passesAdaptiveMastery(
  activeCorrect: number,
  activeTotal: number,
  itemSuccess: readonly boolean[] = [true],
): boolean {
  return activeTotal >= 1
    && activeCorrect >= Math.max(1, activeTotal - 1)
    && itemSuccess.length > 0
    && itemSuccess.every(Boolean);
}
