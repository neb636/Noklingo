import { describe, expect, it } from "vitest";
import { filterLessonsForKidsMode, isKidsLesson } from "@/lib/lesson-audience";

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
});
