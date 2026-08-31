import { cueCards, lessons } from "@/domain/seed";
import type {
  AppSnapshot,
  CueCard,
  MixedReviewSession,
  VideoLesson,
} from "@/domain/schemas";
import { deterministicShuffle } from "./deterministic";
import { buildPracticeQuiz, type PracticeQuestion } from "./practice-quiz";

type ReviewEligibilitySnapshot = Pick<AppSnapshot, "lessonProgress" | "practiceCompletions">;

export function eligibleMixedReviewLessonIds(
  snapshot: ReviewEligibilitySnapshot,
  curriculum: readonly VideoLesson[] = lessons,
): string[] {
  const completed = new Set(snapshot.practiceCompletions.map((entry) => entry.lessonId));
  for (const progress of snapshot.lessonProgress) {
    if (progress.status !== "unseen") completed.add(progress.lessonId);
  }

  return curriculum
    .filter((lesson) => completed.has(lesson.id) && lesson.activityMode !== "video-only" && lesson.cueCardIds.length > 0)
    .map((lesson) => lesson.id);
}

export function eligibleMixedReviewCards(
  snapshot: ReviewEligibilitySnapshot,
  curriculum: readonly VideoLesson[] = lessons,
  cards: readonly CueCard[] = cueCards,
): CueCard[] {
  const lessonIds = new Set(eligibleMixedReviewLessonIds(snapshot, curriculum));
  const byId = new Map(cards.map((card) => [card.id, card]));
  return curriculum
    .filter((lesson) => lessonIds.has(lesson.id))
    .flatMap((lesson) => lesson.cueCardIds.map((id) => byId.get(id)))
    .filter((card): card is CueCard => Boolean(card));
}

export function buildMixedReviewSession(
  eligibleLessonIds: readonly string[],
  cards: readonly CueCard[],
  nowIso: string,
): MixedReviewSession | undefined {
  if (!eligibleLessonIds.length || !cards.length) return undefined;
  const seed = `mixed-review:${nowIso}`;
  const questions = buildPracticeQuiz(cards, cards, `${seed}:quiz`);
  return {
    id: seed,
    seed,
    eligibleLessonIds: [...eligibleLessonIds],
    cardOrder: deterministicShuffle(cards.map((card) => card.id), `${seed}:cards`),
    cardIndex: 0,
    quizOrder: questions.map((question) => question.promptCardId),
    questionIndex: 0,
    answers: [],
    stage: "cards",
    startedAt: nowIso,
  };
}

export function mixedReviewQuestions(
  session: MixedReviewSession,
  cards: readonly CueCard[] = cueCards,
): PracticeQuestion[] {
  const included = new Set(session.cardOrder);
  const pool = cards.filter((card) => included.has(card.id));
  const generated = buildPracticeQuiz(pool, pool, `${session.seed}:quiz`);
  const byCardId = new Map(generated.map((question) => [question.promptCardId, question]));
  return session.quizOrder
    .map((cardId) => byCardId.get(cardId))
    .filter((question): question is PracticeQuestion => Boolean(question));
}

export function mixedReviewSessionIsCompatible(
  session: MixedReviewSession,
  curriculum: readonly VideoLesson[] = lessons,
  cards: readonly CueCard[] = cueCards,
): boolean {
  const lessonById = new Map(curriculum.map((lesson) => [lesson.id, lesson]));
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const lessonIds = new Set(session.eligibleLessonIds);
  if (lessonIds.size !== session.eligibleLessonIds.length) return false;
  if ([...lessonIds].some((id) => {
    const lesson = lessonById.get(id);
    return !lesson || lesson.activityMode === "video-only" || !lesson.cueCardIds.length;
  })) return false;

  const expectedCardIds = new Set(session.eligibleLessonIds.flatMap((id) => lessonById.get(id)?.cueCardIds ?? []));
  const cardIds = new Set(session.cardOrder);
  const quizIds = new Set(session.quizOrder);
  if (expectedCardIds.size !== session.cardOrder.length || cardIds.size !== session.cardOrder.length
    || quizIds.size !== session.quizOrder.length || session.quizOrder.length !== session.cardOrder.length) return false;
  if ([...expectedCardIds].some((id) => !cardIds.has(id) || !quizIds.has(id) || !cardById.has(id))) return false;
  if (session.cardIndex >= session.cardOrder.length || session.questionIndex > session.quizOrder.length) return false;

  if (session.answers.length > session.quizOrder.length || session.answers.some((answer, index) => {
    const cardId = session.quizOrder[index];
    return answer.cardId !== cardId || !cardIds.has(answer.selectedCardId) || answer.correct !== (answer.selectedCardId === cardId);
  })) return false;
  if (session.feedbackCardId) {
    if (session.stage !== "quiz" || session.feedbackCardId !== session.quizOrder[session.questionIndex]
      || session.answers.length !== session.questionIndex + 1) return false;
  } else if (session.stage === "quiz" && session.answers.length !== session.questionIndex) return false;
  if (session.stage === "cards" && (session.questionIndex !== 0 || session.answers.length || session.completedAt)) return false;
  if (session.stage === "results" && (session.questionIndex !== session.quizOrder.length
    || session.answers.length !== session.quizOrder.length || !session.completedAt || session.feedbackCardId)) return false;
  if (session.stage !== "results" && session.completedAt) return false;
  return true;
}
