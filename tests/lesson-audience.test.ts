import { describe, expect, it } from "vitest";
import { filterLessonsForKidsMode, isKidsLesson, lessonPosterSrc } from "@/lib/lesson-audience";

const generalLesson = { categories: undefined };
const kidsLesson: { categories: Array<"kids"> } = { categories: ["kids"] };

describe("lesson audience filtering", () => {
  it("recognizes lessons in the kids category", () => {
    expect(isKidsLesson(kidsLesson)).toBe(true);
    expect(isKidsLesson(generalLesson)).toBe(false);
  });

  it("keeps the full collection when kids mode is off", () => {
    expect(filterLessonsForKidsMode([generalLesson, kidsLesson], false)).toEqual([generalLesson, kidsLesson]);
  });

  it("shows only kids-category lessons when kids mode is on", () => {
    expect(filterLessonsForKidsMode([generalLesson, kidsLesson], true)).toEqual([kidsLesson]);
  });

  it("uses kids artwork only for tagged lessons while kids mode is on", () => {
    const lesson = {
      categories: ["kids"] as Array<"kids">,
      media: { posterSrc: "/video-poster.jpg", kidsPosterSrc: "/kids-poster.png" },
    };
    expect(lessonPosterSrc(lesson, true)).toBe("/kids-poster.png");
    expect(lessonPosterSrc(lesson, false)).toBe("/video-poster.jpg");
  });

  it("falls back to the video poster when kids artwork is unavailable", () => {
    const lesson = {
      categories: ["kids"] as Array<"kids">,
      media: { posterSrc: "/video-poster.jpg" },
    };
    expect(lessonPosterSrc(lesson, true)).toBe("/video-poster.jpg");
  });
});
