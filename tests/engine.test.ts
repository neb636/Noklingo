import { describe, expect, it } from "vitest";
import { firstLesson } from "../src/domain/seed";
import { AppSnapshotSchema } from "../src/domain/schemas";
import { isSessionCompatible, reconcileSnapshot, validateCurriculum } from "../src/domain/curriculum-validation";
import { deterministicShuffle } from "../src/engine/deterministic";
import { buildActiveQuestionQueue, buildSession, nextReviewState, passesMastery, selectTodayAction, updateConsistency } from "../src/engine/learning-engine";
import { addLocalDays, localDateOrdinal, localDaysBetween } from "../src/engine/local-date";
import { defaultSnapshot } from "../src/state/study-store";

describe("curriculum in review", () => {
  it("keeps the bundled curriculum valid and exposes screenshot-derived cards", () => {
    expect(validateCurriculum()).toEqual([]);
    expect(firstLesson.contentStatus).toBe("draft");
    expect(firstLesson.cueCardIds).toHaveLength(5);
  });

  it("keeps scored study closed while no verified lessons exist", () => {
    expect(selectTodayAction(defaultSnapshot, "2026-08-24").kind).toBe("editorial-hold");
    expect(selectTodayAction({ ...defaultSnapshot, lessonProgress: [{ lessonId: firstLesson.id, status: "mastered" }] }, "2026-08-24").kind).toBe("editorial-hold");
  });

  it("does not build a scoreable queue from a draft lesson", () => {
    expect(buildActiveQuestionQueue(firstLesson, 10, "fixed-seed")).toEqual([]);
    const session = buildSession({ mode: "introduction", lesson: firstLesson, snapshot: defaultSnapshot, today: "2026-08-24", nowIso: "2026-08-24T12:00:00.000Z" });
    expect(isSessionCompatible(session)).toBe(false);
    expect(reconcileSnapshot({ ...defaultSnapshot, activeSession: session }).activeSession).toBeNull();
  });
});

describe("learning engine primitives", () => {
  it("uses local calendar dates without elapsed-hour assumptions", () => {
    expect(addLocalDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(localDaysBetween("2026-03-07", "2026-03-10")).toBe(3);
    expect(localDateOrdinal("2026-03-08") - localDateOrdinal("2026-03-07")).toBe(1);
    expect(updateConsistency({ currentDays: 7, longestDays: 7, lastStudyDate: "2026-08-20" }, "2026-08-24").currentDays).toBe(1);
  });

  it("keeps deterministic and mastery helpers stable", () => {
    expect(deterministicShuffle([1, 2, 3, 4], "a")).toEqual(deterministicShuffle([1, 2, 3, 4], "a"));
    expect(passesMastery(9, 10)).toBe(true);
    expect(passesMastery(8, 10)).toBe(false);
  });

  it("uses the spaced-review sequence", () => {
    const first = nextReviewState(undefined, "item", true, "2026-08-24", "2026-08-24T12:00:00.000Z");
    expect(first.intervalDays).toBe(2);
    expect(nextReviewState(first, "item", false, first.dueDate, "2026-08-26T12:00:00.000Z").dueDate).toBe("2026-08-27");
  });

  it("retains snapshot schema compatibility", () => {
    expect(() => AppSnapshotSchema.parse({ ...defaultSnapshot, version: 1 })).toThrow();
  });
});
