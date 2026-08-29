import draftCardsJson from "../src/content/draft-cue-cards.json";
import draftLessonsJson from "../src/content/draft-reels.json";
import reviewedJson from "../src/content/lesson-packages.json";
import { minimumQuestionBankSize } from "../src/domain/lesson-sizing";
import { CueCardSchema, VideoLessonSchema } from "../src/domain/schemas";

const drafts = VideoLessonSchema.array().parse(draftLessonsJson.lessons);
const draftCards = CueCardSchema.array().parse(draftCardsJson.cueCards);
const reviewed = VideoLessonSchema.array().parse(reviewedJson.lessons);
const reviewedCards = CueCardSchema.array().parse(reviewedJson.cueCards);
const reviewedIds = new Set(reviewed.map((lesson) => lesson.id));

console.log("# Curriculum readiness\n");
for (const lesson of drafts) {
  const published = reviewed.find((item) => item.id === lesson.id);
  const cards = published
    ? reviewedCards.filter((card) => card.lessonId === lesson.id)
    : draftCards.filter((card) => card.lessonId === lesson.id);
  const verifiedCards = cards.filter((card) => card.verificationStatus === "verified").length;
  const usage = cards.filter((card) => Boolean(card.usage)).length;
  const thaiAudio = cards.filter((card) => Boolean(card.thaiAudioSrc)).length;
  const englishAudio = cards.filter((card) => Boolean(card.englishAudioSrc)).length;
  const questions = published?.quizBank.filter((question) => question.scored && question.verificationStatus === "verified").length ?? 0;
  const requiredQuestions = lesson.activityMode === "video-only" ? 0 : minimumQuestionBankSize(lesson);
  const ready = reviewedIds.has(lesson.id);
  console.log(`${String(lesson.order).padStart(2, "0")} ${lesson.title} — ${ready ? "PUBLISHED" : "BLOCKED"}`);
  console.log(`   cards ${verifiedCards}/${cards.length} verified · usage ${usage}/${cards.length} · Thai audio ${thaiAudio}/${cards.length} · English audio ${englishAudio}/${cards.length} · questions ${questions}/${requiredQuestions}+`);
}
