import { describe, expect, it } from "vitest";
import type { CueCard } from "../src/domain/schemas";
import { buildPracticeQuiz } from "../src/engine/practice-quiz";

function card(
  id: string,
  lessonId: string,
  naturalMeaning: string,
  thai: string,
  emoji: string,
): CueCard {
  return {
    id,
    lessonId,
    naturalMeaning,
    thai,
    emoji,
    romanization: `${id}-romanization`,
    verificationStatus: "draft",
  };
}

const globalCards = [
  card("global-1", "global", "red", "แดง", "🔴"),
  card("global-2", "global", "blue", "น้ำเงิน", "🔵"),
  card("global-3", "global", "green", "เขียว", "🟢"),
  card("global-4", "global", "yellow", "เหลือง", "🟡"),
  card("global-5", "global", "purple", "ม่วง", "🟣"),
];

describe("buildPracticeQuiz", () => {
  it("creates one deterministic question per target with the target among its choices", () => {
    const lesson = [
      card("lesson-1", "lesson", "one", "หนึ่ง", "1️⃣"),
      card("lesson-2", "lesson", "two", "สอง", "2️⃣"),
      card("lesson-3", "lesson", "three", "สาม", "3️⃣"),
      card("lesson-4", "lesson", "four", "สี่", "4️⃣"),
      card("lesson-5", "lesson", "five", "ห้า", "5️⃣"),
    ];

    const first = buildPracticeQuiz(lesson, [...lesson, ...globalCards], "fixed-seed");
    const repeated = buildPracticeQuiz(lesson, [...lesson, ...globalCards], "fixed-seed");

    expect(repeated).toEqual(first);
    expect(first).toHaveLength(lesson.length);
    expect(new Set(first.map((question) => question.promptCardId))).toEqual(
      new Set(lesson.map((item) => item.id)),
    );
    for (const question of first) {
      expect(question.correctChoiceId).toBe(question.promptCardId);
      expect(question.choiceCardIds).toHaveLength(4);
      expect(question.choiceCardIds).toContain(question.correctChoiceId);
    }
    expect(buildPracticeQuiz(lesson, [...lesson, ...globalCards], "another-seed")).not.toEqual(first);
  });

  it.each([
    { lessonSize: 1, localDistractors: 0 },
    { lessonSize: 2, localDistractors: 1 },
    { lessonSize: 3, localDistractors: 2 },
  ])("fills a $lessonSize-card lesson from the global pool after its $localDistractors local distractors", ({ lessonSize }) => {
    const lesson = Array.from({ length: lessonSize }, (_, index) => card(
      `lesson-${index + 1}`,
      "lesson",
      `lesson meaning ${index + 1}`,
      `บท${index + 1}`,
      `${index + 1}️⃣`,
    ));
    const quiz = buildPracticeQuiz(lesson, [...lesson, ...globalCards], `size-${lessonSize}`);

    for (const question of quiz) {
      const otherLessonIds = lesson
        .filter((item) => item.id !== question.promptCardId)
        .map((item) => item.id);
      expect(question.choiceCardIds).toHaveLength(4);
      expect(question.choiceCardIds).toEqual(expect.arrayContaining(otherLessonIds));
      expect(question.choiceCardIds.filter((id) => id.startsWith("global-"))).toHaveLength(3 - otherLessonIds.length);
    }
  });

  it("excludes normalized meaning and Thai duplicates from all distractor pools", () => {
    const target = card("target", "lesson", "  Good   morning ", "สวัสดี ตอนเช้า", "🌅");
    const localMeaningDuplicate = card("local-meaning-copy", "lesson", "GOOD MORNING", "อรุณสวัสดิ์", "☀️");
    const localThaiDuplicate = card("local-thai-copy", "lesson", "morning greeting", "  สวัสดี   ตอนเช้า ", "👋");
    const localValid = card("local-valid", "lesson", "good evening", "สวัสดีตอนเย็น", "🌇");
    const globalMeaningDuplicate = card("global-meaning-copy", "other", "good morning", "ทักทายเช้า", "🐓");
    const globalThaiDuplicate = card("global-thai-copy", "other", "hello at sunrise", "สวัสดี ตอนเช้า", "🌞");
    const fallbackA = card("fallback-a", "other", "good night", "ราตรีสวัสดิ์", "🌙");
    const fallbackB = card("fallback-b", "other", "see you", "แล้วเจอกัน", "👀");

    const targetQuestion = buildPracticeQuiz(
      [target, localMeaningDuplicate, localThaiDuplicate, localValid],
      [target, localMeaningDuplicate, localThaiDuplicate, localValid, globalMeaningDuplicate, globalThaiDuplicate, fallbackA, fallbackB],
      "duplicates",
    ).find((question) => question.promptCardId === target.id)!;

    expect(targetQuestion.choiceCardIds).toHaveLength(4);
    expect(targetQuestion.choiceCardIds).toEqual(expect.arrayContaining([target.id, localValid.id, fallbackA.id, fallbackB.id]));
    expect(targetQuestion.choiceCardIds).not.toEqual(expect.arrayContaining([
      localMeaningDuplicate.id,
      localThaiDuplicate.id,
      globalMeaningDuplicate.id,
      globalThaiDuplicate.id,
    ]));
    expect(new Set(targetQuestion.choiceCardIds)).toHaveLength(targetQuestion.choiceCardIds.length);
  });

  it("prefers distinct emoji but repeats them when necessary to keep four choices", () => {
    const target = card("target", "lesson", "sour", "เปรี้ยว", "🍋");
    const diversePool = [
      card("another-lemon", "other", "lemon", "มะนาว", "🍋"),
      card("sweet", "other", "sweet", "หวาน", "🍬"),
      card("salty", "other", "salty", "เค็ม", "🧂"),
      card("spicy", "other", "spicy", "เผ็ด", "🌶️"),
    ];
    const cardById = new Map([target, ...diversePool].map((item) => [item.id, item]));
    const diverse = buildPracticeQuiz([target], [target, ...diversePool], "emoji-diverse")[0];

    expect(diverse.choiceCardIds).toHaveLength(4);
    expect(new Set(diverse.choiceCardIds.map((id) => cardById.get(id)!.emoji))).toHaveLength(4);

    const repeatedPool = [1, 2, 3].map((index) => card(
      `same-emoji-${index}`,
      "other",
      `meaning ${index}`,
      `ไทย${index}`,
      "🍋",
    ));
    expect(buildPracticeQuiz([target], [target, ...repeatedPool], "emoji-repeat")[0].choiceCardIds).toHaveLength(4);
  });

  it("returns two or three choices when the available unique pool is limited", () => {
    const target = card("target", "lesson", "target", "เป้าหมาย", "🎯");
    const first = card("first", "other", "first", "แรก", "1️⃣");
    const second = card("second", "other", "second", "ที่สอง", "2️⃣");

    expect(buildPracticeQuiz([target], [target, first], "two")[0].choiceCardIds).toHaveLength(2);
    expect(buildPracticeQuiz([target], [target, first, second], "three")[0].choiceCardIds).toHaveLength(3);
  });

  it("does not mutate lesson or global card arrays", () => {
    const lesson = [card("target", "lesson", "target", "เป้าหมาย", "🎯")];
    const all = [...lesson, ...globalCards];
    const lessonOrder = lesson.map((item) => item.id);
    const allOrder = all.map((item) => item.id);

    buildPracticeQuiz(lesson, all, "immutability");

    expect(lesson.map((item) => item.id)).toEqual(lessonOrder);
    expect(all.map((item) => item.id)).toEqual(allOrder);
  });
});
