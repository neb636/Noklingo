export function clampLessonIndex(index: number, lessonCount: number): number {
  if (lessonCount <= 0) return 0;
  return Math.max(0, Math.min(lessonCount - 1, index));
}

export function lessonIndexForId(lessonIds: readonly string[], lessonId: string): number {
  const index = lessonIds.indexOf(lessonId);
  return index === -1 ? 0 : index;
}

export function nextLessonIndex(currentIndex: number, direction: -1 | 1, lessonCount: number): number {
  return clampLessonIndex(currentIndex + direction, lessonCount);
}
