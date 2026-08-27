import { describe, expect, it } from "vitest";
import draftCueCardsJson from "../src/content/draft-cue-cards.json";
import draftReelsJson from "../src/content/draft-reels.json";
import { CueCardSchema, VideoLessonSchema } from "../src/domain/schemas";

const expectedEmoji = {
  "common-verbs": { topic: "🏃", cards: ["🍽️", "😴", "👍", "🚶", "🗣️"] },
  "question-words": { topic: "❓", cards: ["❓", "📍", "🕒", "🤔", "⚙️"] },
  connectors: { topic: "🔗", cards: ["➕", "↔️", "✋", "➡️", "🤝", "💡"] },
  "large-numbers": { topic: "🔢", cards: ["1️⃣"] },
  "time-units": { topic: "⏱️", cards: ["⏱️", "🕐", "☀️", "🗓️", "📆"] },
  "times-of-day": { topic: "🌅", cards: ["🌅", "☀️", "🕛", "🌤️", "🌇", "🌙"] },
  quantities: { topic: "⚖️", cards: ["0️⃣", "🤏", "🔢", "🌓", "📈", "💯"] },
  "country-names": { topic: "🌍", cards: ["🌍", "🏡", "🗺️"] },
  directions: { topic: "🧭", cards: ["⬆️", "➡️", "⬅️", "↩️"] },
  weather: { topic: "🌦️", cards: ["🔥", "🧊", "🥶", "🌧️", "☀️", "☁️", "💨"] },
  "feeling-unwell": { topic: "🤒", cards: ["🙂", "🤒", "😵‍💫", "👌", "🔁"] },
  "food-flavors": { topic: "😋", cards: ["🍋", "🍬", "🧂", "🌶️", "☕", "🍚"] },
  "food-allergies": { topic: "🤧", cards: ["🤧", "🦐", "🥜", "🥛"] },
  "coffee-order": { topic: "☕", cards: ["🥤", "☕"] },
  "what-are-you-doing": { topic: "💬", cards: ["🚶", "🤔", "📍", "🧭", "👋"] },
  "waking-up": { topic: "⏰", cards: ["🔥", "🏁", "👀", "🤤", "🍽️"] },
  "movie-invitation": { topic: "🎬", cards: ["🍽️", "🎬", "☕", "💕"] },
  "parting-safely": { topic: "👋", cards: ["👋", "🏠", "🚗", "📱"] },
  encouragement: { topic: "💪", cards: ["🫶", "💪", "🎁", "📞"] },
  compliments: { topic: "✨", cards: ["😄", "💛", "👏", "✨", "💬"] },
  "its-okay": { topic: "🤝", cards: ["👌", "🍃", "😌", "🧘", "👍"] },
  "making-up": { topic: "🕊️", cards: ["🙏", "❌", "🤝", "😌", "🫶"] },
  "affectionate-phrases": { topic: "❤️", cards: ["❤️", "🌸", "🥺", "🤗", "🌙"] },
} as const;

describe("curriculum emoji metadata", () => {
  const lessons = VideoLessonSchema.array().parse(draftReelsJson.lessons);
  const cards = CueCardSchema.array().parse(draftCueCardsJson.cueCards);

  it("covers every draft lesson and cue card with the approved emoji mapping", () => {
    expect(lessons).toHaveLength(23);
    expect(cards).toHaveLength(107);
    expect(Object.keys(expectedEmoji)).toHaveLength(23);

    for (const lesson of lessons) {
      const expected = expectedEmoji[lesson.id as keyof typeof expectedEmoji];
      expect(expected, lesson.id).toBeDefined();
      expect(lesson.topicEmoji, lesson.id).toBe(expected.topic);

      const lessonCards = lesson.cueCardIds.map((id) => cards.find((card) => card.id === id));
      expect(lessonCards.every(Boolean), lesson.id).toBe(true);
      expect(lessonCards.map((card) => card?.lessonId), lesson.id).toEqual(
        Array.from({ length: lesson.cueCardIds.length }, () => lesson.id),
      );
      expect(lessonCards.map((card) => card?.emoji), lesson.id).toEqual(expected.cards);
    }
  });

  it("requires nonblank lesson and cue-card emoji metadata", () => {
    expect(VideoLessonSchema.safeParse({ ...lessons[0], topicEmoji: " " }).success).toBe(false);
    expect(CueCardSchema.safeParse({ ...cards[0], emoji: " " }).success).toBe(false);
  });
});
