import { describe, expect, it } from "vitest";
import { cueCards, lessons } from "../src/domain/seed";
import { AppSnapshotSchema, type AppSnapshot } from "../src/domain/schemas";
import {
  buildMixedReviewSession,
  eligibleMixedReviewCards,
  eligibleMixedReviewLessonIds,
  mixedReviewQuestions,
  mixedReviewSessionIsCompatible,
} from "../src/engine/mixed-review";
import { defaultSnapshot } from "../src/state/study-store";

const completedAt = "2026-08-31T12:00:00.000Z";

function snapshot(patch: Partial<AppSnapshot>): AppSnapshot {
  return { ...defaultSnapshot, ...patch };
}

describe("mixed lesson review", () => {
  it("includes completed practice and prior scored-study lessons while excluding video-only lessons", () => {
    const practiceLesson = lessons.find((lesson) => lesson.activityMode !== "video-only" && lesson.cueCardIds.length)!;
    const studiedLesson = lessons.find((lesson) => lesson.id !== practiceLesson.id && lesson.activityMode !== "video-only" && lesson.cueCardIds.length)!;
    const videoOnly = lessons.find((lesson) => lesson.activityMode === "video-only")!;
    const state = snapshot({
      practiceCompletions: [
        { lessonId: practiceLesson.id, completedAt },
        { lessonId: videoOnly.id, completedAt },
      ],
      lessonProgress: [{ lessonId: studiedLesson.id, status: "awaiting-mastery", introducedAt: completedAt }],
    });

    expect(eligibleMixedReviewLessonIds(state)).toEqual([practiceLesson.id, studiedLesson.id]);
    expect(new Set(eligibleMixedReviewCards(state).map((card) => card.lessonId))).toEqual(new Set([practiceLesson.id, studiedLesson.id]));
  });

  it("creates stable independent queues covering every eligible card exactly once", () => {
    const eligibleLessons = lessons.filter((lesson) => lesson.activityMode !== "video-only" && lesson.cueCardIds.length).slice(0, 3);
    const lessonIds = eligibleLessons.map((lesson) => lesson.id);
    const cardIds = new Set(eligibleLessons.flatMap((lesson) => lesson.cueCardIds));
    const cards = cueCards.filter((card) => cardIds.has(card.id));
    const first = buildMixedReviewSession(lessonIds, cards, completedAt)!;
    const second = buildMixedReviewSession(lessonIds, cards, completedAt)!;
    const questions = mixedReviewQuestions(first);

    expect(first).toEqual(second);
    expect(new Set(first.cardOrder)).toEqual(cardIds);
    expect(new Set(first.quizOrder)).toEqual(cardIds);
    expect(questions.map((question) => question.promptCardId)).toEqual(first.quizOrder);
    expect(questions).toHaveLength(cards.length);
    for (const question of questions) {
      expect(question.choiceCardIds).toContain(question.correctChoiceId);
      expect(question.choiceCardIds.every((id) => cardIds.has(id))).toBe(true);
    }
    expect(mixedReviewSessionIsCompatible(first, lessons, cueCards)).toBe(true);
    expect(mixedReviewSessionIsCompatible({ ...first, quizOrder: first.quizOrder.slice(1) }, lessons, cueCards)).toBe(false);
  });

  it("migrates version-3 backups with empty review defaults", () => {
    const legacy = { ...defaultSnapshot, version: 3 };
    delete (legacy as Partial<AppSnapshot>).practiceCompletions;
    delete (legacy as Partial<AppSnapshot>).activeMixedReviewSession;

    const migrated = AppSnapshotSchema.parse(legacy);
    expect(migrated.version).toBe(4);
    expect(migrated.practiceCompletions).toEqual([]);
    expect(migrated.activeMixedReviewSession).toBeNull();
  });
});
