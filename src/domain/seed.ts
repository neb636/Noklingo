import { CueCardSchema, VideoLessonSchema, type CueCard, type VideoLesson } from "./schemas";
import { lessonIsReleaseReady, validateCurriculum } from "./curriculum-validation";
import draftReelPackages from "@/content/draft-reels.json";
import draftCueCards from "@/content/draft-cue-cards.json";
import reviewedPackages from "@/content/lesson-packages.json";

const draftLessons = VideoLessonSchema.array().parse(draftReelPackages.lessons);
const reviewedLessons = VideoLessonSchema.array().parse(reviewedPackages.lessons);
const draftCards = CueCardSchema.array().parse(draftCueCards.cueCards);
const reviewedCards = CueCardSchema.array().parse(reviewedPackages.cueCards);

// Preserve raw arrays through validation so duplicate ids cannot disappear in
// a Map before the publication gate sees them. A reviewed package may replace
// its matching draft plan only after the combined registry is known to be sane.
const reviewedIds = new Set(reviewedLessons.map((lesson) => lesson.id));
const combinedLessons: VideoLesson[] = [
  ...draftLessons.filter((lesson) => !reviewedIds.has(lesson.id)),
  ...reviewedLessons,
].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

export const lessons = combinedLessons;
export const cueCards: CueCard[] = [
  ...draftCards.filter((card) => !reviewedIds.has(card.lessonId)),
  ...reviewedCards,
];
export const curriculumIssues = validateCurriculum(lessons, cueCards);
export const studyLessons = lessons.filter((lesson) => lessonIsReleaseReady(lesson, lessons, cueCards));
export const firstLesson = studyLessons[0] ?? lessons[0];
