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

export function lessonPosterSrc(
  lesson: Pick<VideoLesson, "categories"> & {
    media: Pick<VideoLesson["media"], "posterSrc" | "kidsPosterSrc">;
  },
  kidsMode: boolean,
): string {
  if (kidsMode && isKidsLesson(lesson) && lesson.media.kidsPosterSrc) {
    return lesson.media.kidsPosterSrc;
  }
  return lesson.media.posterSrc;
}
