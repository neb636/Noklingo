import { describe, expect, it } from "vitest";
import { firstLesson } from "../src/domain/seed";
import { diagnosticQuestionCount, masteryQuestionCount, minimumQuestionBankSize, passesAdaptiveMastery } from "../src/domain/lesson-sizing";
import { AppSnapshotSchema, CueCardSchema, VideoLessonSchema, type SessionAnswer } from "../src/domain/schemas";
import { isSessionCompatible, reconcileSnapshot, validateCurriculum } from "../src/domain/curriculum-validation";
import { deterministicShuffle } from "../src/engine/deterministic";
import { buildActiveQuestionQueue, buildSession, nextReviewState, passesMastery, selectTodayAction, updateConsistency } from "../src/engine/learning-engine";
import { addLocalDays, localDateOrdinal, localDaysBetween } from "../src/engine/local-date";
import { defaultSnapshot } from "../src/state/study-store";

describe("lesson collection", () => {
  it("keeps the bundled curriculum valid and exposes screenshot-derived cards", () => {
    expect(validateCurriculum()).toEqual([]);
    expect(firstLesson.contentStatus).toBe("draft");
    expect(firstLesson.cueCardIds).toHaveLength(5);
  });

  it("offers the lesson library while no scored lessons exist", () => {
    expect(selectTodayAction(defaultSnapshot, "2026-08-24").kind).toBe("lesson-library");
    expect(selectTodayAction({ ...defaultSnapshot, lessonProgress: [{ lessonId: firstLesson.id, status: "mastered" }] }, "2026-08-24").kind).toBe("lesson-library");
  });

  it("does not build a scoreable queue from a draft lesson", () => {
    expect(buildActiveQuestionQueue(firstLesson, 10, "fixed-seed")).toEqual([]);
    const session = buildSession({ mode: "introduction", lesson: firstLesson, snapshot: defaultSnapshot, today: "2026-08-24", nowIso: "2026-08-24T12:00:00.000Z" });
    expect(isSessionCompatible(session)).toBe(false);
    expect(reconcileSnapshot({ ...defaultSnapshot, activeSession: session }).activeSession).toBeNull();
  });
});

describe("learning engine primitives", () => {
  it("accepts a verified one-card lesson and keeps immediate feedback resumable", () => {
    const card = CueCardSchema.parse({
      id: "thin-card", lessonId: "thin", thai: "หนึ่งแสน", romanization: "neung saen",
      emoji: "1️⃣", naturalMeaning: "one hundred thousand", usage: "Use this when stating an amount of 100,000.",
      phraseAudioSrc: "/lessons/thin/audio/thin-card.m4a", verificationStatus: "verified",
    });
    const common = { itemId: card.id, scored: true, verificationStatus: "verified" as const, explanation: "หนึ่งแสน means one hundred thousand." };
    const lesson = VideoLessonSchema.parse({
      id: "thin", order: 1, topicEmoji: "🔢", title: "Thin lesson", objective: "Recall one amount.", description: "One useful amount.",
      media: { videoSrc: "/lessons/thin/intro.mp4", posterSrc: "/lessons/thin/poster.jpg", durationSeconds: 5, durationStatus: "confirmed", availability: "available", fallbackMessage: "Unavailable." },
      cueCardIds: [card.id], contentStatus: "verified",
      source: { label: "Authorized test source", url: "https://example.com/source", permissionStatus: "authorized" },
      quizBank: [
        { ...common, id: "thin-listen", interactionType: "listening", prompt: "What amount do you hear?", choices: ["one hundred thousand", "ten thousand"], correctIndex: 0, audioSrc: card.phraseAudioSrc },
        { ...common, id: "thin-situation", interactionType: "situation-response", prompt: "Choose 100,000 in Thai.", choices: ["หนึ่งแสน", "หนึ่งหมื่น"], correctIndex: 0 },
        { ...common, id: "thin-meaning", interactionType: "meaning-recognition", prompt: "What does หนึ่งแสน mean?", choices: ["one hundred thousand", "one million"], correctIndex: 0 },
        { ...common, id: "thin-build", interactionType: "phrase-construction", prompt: "Build 100,000.", constructionTokens: ["หนึ่ง", "แสน", "หมื่น"], correctConstruction: ["หนึ่ง", "แสน"] },
      ],
    });
    expect(validateCurriculum([lesson], [card])).toEqual([]);

    const intro = buildSession({ mode: "introduction", lesson, snapshot: defaultSnapshot, today: "2026-08-25", nowIso: "2026-08-25T12:00:00.000Z" });
    const mastery = buildSession({ mode: "mastery", lesson, snapshot: defaultSnapshot, today: "2026-08-26", nowIso: "2026-08-26T12:00:00.000Z" });
    expect(intro.queue).toHaveLength(1);
    expect(mastery.queue).toHaveLength(4);

    const entry = intro.queue[0];
    const question = lesson.quizBank.find((item) => item.id === entry.questionId)!;
    const answer: SessionAnswer = question.choices
      ? { queueId: entry.queueId, selectedChoice: entry.choiceOrder!.indexOf(question.correctIndex!), correct: true, answeredAt: "2026-08-25T12:01:00.000Z" }
      : { queueId: entry.queueId, constructedTokens: question.correctConstruction, correct: true, answeredAt: "2026-08-25T12:01:00.000Z" };
    const feedbackSession = { ...intro, stage: "diagnostic" as const, videoCompleted: true, answers: [answer], feedbackQueueId: entry.queueId };
    expect(isSessionCompatible(feedbackSession, [lesson], [card], intro.curriculumVersion)).toBe(true);
  });

  it("scales diagnostics and mastery checks to thin and full lessons", () => {
    const lessonWith = (count: number) => ({ cueCardIds: Array.from({ length: count }, (_, index) => `card-${index}`) });
    expect(diagnosticQuestionCount(lessonWith(1))).toBe(1);
    expect(diagnosticQuestionCount(lessonWith(7))).toBe(7);
    expect([1, 2, 3, 4, 5, 7].map((count) => masteryQuestionCount(lessonWith(count)))).toEqual([4, 4, 6, 8, 10, 10]);
    expect([1, 2, 3, 5, 7].map((count) => minimumQuestionBankSize(lessonWith(count)))).toEqual([4, 4, 6, 10, 14]);
  });

  it("allows one mastery miss only when every phrase was recalled", () => {
    expect(passesAdaptiveMastery(9, 10, [true, true, true, true, true])).toBe(true);
    expect(passesAdaptiveMastery(8, 10, [true, true, true, true, true])).toBe(false);
    expect(passesAdaptiveMastery(9, 10, [true, true, false, true, true])).toBe(false);
    expect(passesAdaptiveMastery(3, 4, [true])).toBe(true);
  });

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
