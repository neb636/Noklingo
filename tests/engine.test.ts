import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { firstLesson } from "../src/domain/seed";
import { AppSnapshotSchema, type AppSnapshot } from "../src/domain/schemas";
import { validateCurriculum, isSessionCompatible, reconcileSnapshot } from "../src/domain/curriculum-validation";
import { deterministicShuffle } from "../src/engine/deterministic";
import {
  buildActiveQuestionQueue, buildSession, findQuestion, nextReviewState, passesMastery,
  selectTodayAction, updateConsistency,
} from "../src/engine/learning-engine";
import { addLocalDays, compareLocalDates, localDateOrdinal, localDaysBetween } from "../src/engine/local-date";
import { defaultSnapshot, useStudyStore } from "../src/state/study-store";

function snapshot(patch: Partial<AppSnapshot> = {}): AppSnapshot {
  return AppSnapshotSchema.parse({ ...defaultSnapshot, ...patch });
}

describe("local calendar dates", () => {
  it("adds days without elapsed-hour or DST assumptions", () => {
    expect(addLocalDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addLocalDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addLocalDays("2026-10-31", 2)).toBe("2026-11-02");
    expect(localDaysBetween("2026-03-07", "2026-03-10")).toBe(3);
    expect(localDateOrdinal("2026-03-08") - localDateOrdinal("2026-03-07")).toBe(1);
  });

  it("compares missed days correctly", () => {
    expect(compareLocalDates("2026-08-20", "2026-08-24")).toBeLessThan(0);
    expect(updateConsistency({ currentDays: 7, longestDays: 7, lastStudyDate: "2026-08-20" }, "2026-08-24")).toEqual({ currentDays: 1, longestDays: 7, lastStudyDate: "2026-08-24" });
  });
});

describe("deterministic queues", () => {
  it("repeats question selection and choice shuffling for the same seed", () => {
    const one = buildActiveQuestionQueue(firstLesson, 10, "fixed-seed");
    const two = buildActiveQuestionQueue(firstLesson, 10, "fixed-seed");
    expect(two).toEqual(one);
    expect(new Set(one.map((entry) => entry.itemId))).toEqual(new Set(firstLesson.cueCardIds));
    expect(new Set(one.map((entry) => entry.queueId)).size).toBe(10);
  });

  it("varies deterministically with a different seed", () => {
    expect(deterministicShuffle([1, 2, 3, 4, 5, 6], "a")).toEqual(deterministicShuffle([1, 2, 3, 4, 5, 6], "a"));
    expect(deterministicShuffle([1, 2, 3, 4, 5, 6], "a")).not.toEqual(deterministicShuffle([1, 2, 3, 4, 5, 6], "b"));
  });
});

describe("mastery and Today", () => {
  it("uses only the fixed ten active questions for the 9/10 gate", () => {
    expect(passesMastery(9, 10)).toBe(true);
    expect(passesMastery(10, 10)).toBe(true);
    expect(passesMastery(8, 10)).toBe(false);
    expect(passesMastery(12, 13)).toBe(false);
  });

  it("blocks mastery on the introduction date even after a perfect diagnostic", () => {
    const state = snapshot({ lessonProgress: [{ lessonId: firstLesson.id, status: "awaiting-mastery", introducedDate: "2026-08-24", masteryEligibleDate: "2026-08-25" }] });
    expect(selectTodayAction(state, "2026-08-24").kind).toBe("wait");
    expect(selectTodayAction(state, "2026-08-25").kind).toBe("mastery");
  });

  it("blocks a failed retry until tomorrow", () => {
    const state = snapshot({ lessonProgress: [{ lessonId: firstLesson.id, status: "awaiting-mastery", introducedDate: "2026-08-20", masteryEligibleDate: "2026-08-21", lastMasteryAttemptDate: "2026-08-24" }] });
    expect(selectTodayAction(state, "2026-08-24").kind).toBe("wait");
    expect(selectTodayAction(state, "2026-08-25").kind).toBe("mastery");
  });

  it("prioritizes an unfinished session over every other action", () => {
    const base = snapshot();
    const activeSession = buildSession({ mode: "introduction", lesson: firstLesson, snapshot: base, today: "2026-08-24", nowIso: "2026-08-24T12:00:00.000Z" });
    expect(selectTodayAction(snapshot({ activeSession }), "2026-08-24").kind).toBe("resume");
  });

  it("offers standalone review only after the published curriculum is mastered", () => {
    const state = snapshot({
      lessonProgress: [{ lessonId: firstLesson.id, status: "mastered", masteredDate: "2026-08-20" }],
      reviewStates: [{ itemId: firstLesson.cueCardIds[0], dueDate: "2026-08-24", intervalDays: 2, ease: 2.3, successfulRecalls: 1 }],
    });
    expect(selectTodayAction(state, "2026-08-24").kind).toBe("standalone-review");
    expect(selectTodayAction({ ...state, reviewStates: [] }, "2026-08-24").kind).toBe("complete");
  });
});

describe("spaced review", () => {
  it("uses the 2, 5, 12, and 30 day sequence then adapts", () => {
    let review = nextReviewState(undefined, "item", true, "2026-08-24", "2026-08-24T12:00:00.000Z");
    expect(review.intervalDays).toBe(2);
    review = nextReviewState(review, "item", true, review.dueDate, "2026-08-26T12:00:00.000Z");
    expect(review.intervalDays).toBe(5);
    review = nextReviewState(review, "item", true, review.dueDate, "2026-08-31T12:00:00.000Z");
    expect(review.intervalDays).toBe(12);
    review = nextReviewState(review, "item", true, review.dueDate, "2026-09-12T12:00:00.000Z");
    expect(review.intervalDays).toBe(30);
    expect(nextReviewState(review, "item", true, review.dueDate, "2026-10-12T12:00:00.000Z").intervalDays).toBeGreaterThan(30);
  });

  it("schedules failure tomorrow without changing lesson mastery data", () => {
    const failed = nextReviewState({ itemId: "item", dueDate: "2026-08-24", intervalDays: 30, ease: 2.5, successfulRecalls: 4 }, "item", false, "2026-08-24", "2026-08-24T12:00:00.000Z");
    expect(failed.dueDate).toBe("2026-08-25");
    expect(failed.intervalDays).toBe(1);
  });
});

describe("persistence contracts", () => {
  beforeEach(() => useStudyStore.setState({ ...defaultSnapshot, hydrated: true, hydrationNotice: false }));
  afterEach(() => vi.useRealTimers());

  it("records a perfect day-one diagnostic as awaiting mastery, never mastered", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 24, 12));
    const store = useStudyStore.getState();
    store.startIntroduction(firstLesson.id);
    useStudyStore.getState().completeVideo(true);
    for (let index = 0; index < firstLesson.cueCardIds.length; index += 1) useStudyStore.getState().advanceCard();
    while (useStudyStore.getState().activeSession?.questionIndex !== useStudyStore.getState().activeSession?.queue.length) answerCurrentQuestionCorrectly();
    useStudyStore.getState().finishSession();
    const progress = useStudyStore.getState().lessonProgress.find((entry) => entry.lessonId === firstLesson.id);
    expect(progress?.status).toBe("awaiting-mastery");
    expect(progress?.masteryEligibleDate).toBe("2026-08-25");
    expect(useStudyStore.getState().streak.currentDays).toBe(1);
  });

  it("masters at 9/10 and leaves consistency unchanged when already counted today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 24, 12));
    useStudyStore.setState({
      lessonProgress: [{ lessonId: firstLesson.id, status: "awaiting-mastery", introducedDate: "2026-08-20", masteryEligibleDate: "2026-08-21" }],
      streak: { currentDays: 4, longestDays: 4, lastStudyDate: "2026-08-24" },
    });
    useStudyStore.getState().startMastery(firstLesson.id);
    for (let index = 0; index < firstLesson.cueCardIds.length; index += 1) useStudyStore.getState().advanceCard();
    let activeSeen = 0;
    while (useStudyStore.getState().activeSession?.questionIndex !== useStudyStore.getState().activeSession?.queue.length) {
      const entry = useStudyStore.getState().activeSession?.queue[useStudyStore.getState().activeSession?.questionIndex ?? 0];
      answerCurrentQuestion(entry?.source === "active" && activeSeen++ < 9);
    }
    useStudyStore.getState().finishSession();
    expect(useStudyStore.getState().lessonProgress[0]?.status).toBe("mastered");
    expect(useStudyStore.getState().streak.currentDays).toBe(4);
  });

  it("keeps 8/10 awaiting mastery and blocks the same local day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 24, 12));
    useStudyStore.setState({ lessonProgress: [{ lessonId: firstLesson.id, status: "awaiting-mastery", introducedDate: "2026-08-20", masteryEligibleDate: "2026-08-21" }] });
    useStudyStore.getState().startMastery(firstLesson.id);
    for (let index = 0; index < firstLesson.cueCardIds.length; index += 1) useStudyStore.getState().advanceCard();
    let activeSeen = 0;
    while (useStudyStore.getState().activeSession?.questionIndex !== useStudyStore.getState().activeSession?.queue.length) answerCurrentQuestion(activeSeen++ < 8);
    useStudyStore.getState().finishSession();
    const progress = useStudyStore.getState().lessonProgress[0];
    expect(progress?.status).toBe("awaiting-mastery");
    expect(progress?.lastMasteryAttemptDate).toBe("2026-08-24");
    useStudyStore.getState().startMastery(firstLesson.id);
    expect(useStudyStore.getState().activeSession).toBeNull();
  });

  it("reschedules standalone review failure without relocking or incrementing consistency", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 24, 12));
    useStudyStore.setState({
      lessonProgress: [{ lessonId: firstLesson.id, status: "mastered", masteredDate: "2026-08-20" }],
      reviewStates: firstLesson.cueCardIds.slice(0, 2).map((itemId) => ({ itemId, dueDate: "2026-08-24", intervalDays: 2, ease: 2.3, successfulRecalls: 1 as const })),
      streak: { currentDays: 3, longestDays: 3, lastStudyDate: "2026-08-23" },
    });
    useStudyStore.getState().startStandaloneReview();
    while (useStudyStore.getState().activeSession?.questionIndex !== useStudyStore.getState().activeSession?.queue.length) answerCurrentQuestion(false);
    useStudyStore.getState().finishSession();
    expect(useStudyStore.getState().lessonProgress[0]?.status).toBe("mastered");
    expect(useStudyStore.getState().reviewStates.every((review) => review.dueDate === "2026-08-25")).toBe(true);
    expect(useStudyStore.getState().streak.currentDays).toBe(3);
  });

  it("round-trips every resumable stage and its fixed queue", () => {
    const activeSession = buildSession({ mode: "mastery", lesson: firstLesson, snapshot: snapshot(), today: "2026-08-24", nowIso: "2026-08-24T12:00:00.000Z" });
    for (const stage of ["video", "cue-cards", "retrieval-cards", "diagnostic", "mastery-quiz"] as const) {
      const parsed = AppSnapshotSchema.parse(snapshot({ activeSession: { ...activeSession, stage } }));
      expect(parsed.activeSession?.queue).toEqual(activeSession.queue);
    }
  });

  it("discards only a stale active session", () => {
    const activeSession = buildSession({ mode: "introduction", lesson: firstLesson, snapshot: snapshot(), today: "2026-08-24", nowIso: "2026-08-24T12:00:00.000Z" });
    expect(isSessionCompatible(activeSession)).toBe(true);
    const stale = { ...activeSession, queue: [{ ...activeSession.queue[0], questionId: "removed-question" }] };
    const validProgress = [{ lessonId: firstLesson.id, status: "awaiting-mastery" as const, masteryEligibleDate: "2026-08-25" }];
    const reconciled = reconcileSnapshot(snapshot({ activeSession: stale, lessonProgress: validProgress }));
    expect(reconciled.activeSession).toBeNull();
    expect(reconciled.lessonProgress).toEqual(validProgress);
  });

  it("rejects incompatible exports", () => {
    expect(() => AppSnapshotSchema.parse({ ...defaultSnapshot, version: 1 })).toThrow();
  });

  it("keeps curriculum contracts valid while draft media remains explicit", () => {
    expect(validateCurriculum()).toEqual([]);
  });
});

function answerCurrentQuestionCorrectly() {
  answerCurrentQuestion(true);
}

function answerCurrentQuestion(correct: boolean) {
  const session = useStudyStore.getState().activeSession;
  const entry = session?.queue[session.questionIndex];
  if (!entry) throw new Error("No current question");
  const question = findQuestion(entry);
  if (!question) throw new Error("Missing question");
  if (question.choices && question.correctIndex !== undefined) {
    const displayedIndex = entry.choiceOrder?.findIndex((original) => original === question.correctIndex) ?? question.correctIndex;
    const choice = correct ? displayedIndex : (displayedIndex + 1) % question.choices.length;
    useStudyStore.getState().answerChoice(choice);
  } else if (question.correctConstruction) {
    useStudyStore.getState().answerConstruction(correct ? question.correctConstruction : [...question.correctConstruction].reverse());
  } else if (question.matchingPairs) {
    const wrong = question.matchingPairs.map((pair, index, pairs) => ({ left: pair.left, right: pairs[(index + 1) % pairs.length].right }));
    useStudyStore.getState().answerMatching(correct ? question.matchingPairs : wrong);
  } else throw new Error("Question has no deterministic answer");
}
