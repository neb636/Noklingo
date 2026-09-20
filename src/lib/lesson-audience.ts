import type { VideoLesson } from "@/domain/schemas";

export function isKidsLesson(lesson: Pick<VideoLesson, "categories">): boolean {
  return lesson.categories?.includes("kids") ?? false;
}

export function filterLessonsForKidsMode<T extends Pick<VideoLesson, "categories">>(
  lessons: readonly T[],
  kidsMode: boolean,
): T[] {
  return kidsMode ? lessons.filter(isKidsLesson) : [...lessons];
}
