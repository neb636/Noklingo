import { cueCards, lessons, studyLessons } from "@/domain/seed";
import type {
  ActiveStudySession, AppSnapshot, ItemReviewState, LessonProgress, QuizQuestion,
  SessionAnswer, SessionMode, SessionQueueEntry, StreakState, VideoLesson,
} from "@/domain/schemas";
import { addLocalDays, compareLocalDates, localDaysBetween } from "./local-date";
import { deterministicShuffle } from "./deterministic";

export const CURRICULUM_VERSION = "2026-08-25-reel-intake-v3";

export function passesMastery(activeCorrect: number, activeTotal: number): boolean {
  return activeTotal === 10 && activeCorrect >= 9;
}

export type TodayAction =
  | { kind: "resume"; session: ActiveStudySession }
  | { kind: "mastery"; lesson: VideoLesson }
  | { kind: "wait"; lesson: VideoLesson; eligibleDate: string }
  | { kind: "introduction"; lesson: VideoLesson }
  | { kind: "standalone-review"; dueCount: number }
  | { kind: "editorial-hold"; draftCount: number }
  | { kind: "complete"; dueCount: number };

export function lessonProgress(snapshot: Pick<AppSnapshot, "lessonProgress">, lessonId: string): LessonProgress | undefined {
  return snapshot.lessonProgress.find((entry) => entry.lessonId === lessonId);
}

export function dueReviewStates(snapshot: Pick<AppSnapshot, "reviewStates">, today: string): ItemReviewState[] {
  return snapshot.reviewStates
    .filter((review) => compareLocalDates(review.dueDate, today) <= 0)
    .sort((a, b) => compareLocalDates(a.dueDate, b.dueDate) || a.itemId.localeCompare(b.itemId));
}

export function selectTodayAction(snapshot: AppSnapshot, today: string): TodayAction {
  if (snapshot.activeSession) return { kind: "resume", session: snapshot.activeSession };

  const active = studyLessons.find((lesson) => {
    const progress = lessonProgress(snapshot, lesson.id);
    return progress && progress.status !== "unseen" && progress.status !== "mastered";
  });
  if (active) {
    const progress = lessonProgress(snapshot, active.id)!;
    const eligibleDate = progress.masteryEligibleDate ?? addLocalDays(progress.introducedDate ?? today, 1);
    if (progress.status === "awaiting-mastery" && compareLocalDates(eligibleDate, today) <= 0 && progress.lastMasteryAttemptDate !== today) {
      return { kind: "mastery", lesson: active };
    }
    if (progress.status === "awaiting-mastery") return { kind: "wait", lesson: active, eligibleDate };
    return { kind: "introduction", lesson: active };
  }

  const next = studyLessons.find((lesson) => lessonProgress(snapshot, lesson.id)?.status !== "mastered");
  if (next) return { kind: "introduction", lesson: next };

  const dueCount = dueReviewStates(snapshot, today).length;
  if (!studyLessons.length && lessons.some((lesson) => lesson.contentStatus === "draft")) {
    return { kind: "editorial-hold", draftCount: lessons.filter((lesson) => lesson.contentStatus === "draft").length };
  }
  return dueCount > 0 ? { kind: "standalone-review", dueCount } : { kind: "complete", dueCount: 0 };
}

function indexOrder(length: number, seed: string): number[] {
  return deterministicShuffle(Array.from({ length }, (_, index) => index), seed);
}

function queueEntry(question: QuizQuestion, lessonId: string, source: "active" | "review", seed: string): SessionQueueEntry {
  return {
    queueId: `${source}:${lessonId}:${question.id}`,
    questionId: question.id,
    lessonId,
    itemId: question.itemId,
    source,
    choiceOrder: question.choices ? indexOrder(question.choices.length, `${seed}:${question.id}:choices`) : undefined,
    tokenOrder: question.constructionTokens ? indexOrder(question.constructionTokens.length, `${seed}:${question.id}:tokens`) : undefined,
    pairOrder: question.matchingPairs ? indexOrder(question.matchingPairs.length, `${seed}:${question.id}:pairs`) : undefined,
  };
}

export function buildActiveQuestionQueue(lesson: VideoLesson, count: number, seed: string): SessionQueueEntry[] {
  const scored = lesson.quizBank.filter((question) => question.scored && question.interactionType !== "self-guided-speaking");
  const byItem = new Map<string, QuizQuestion[]>();
  for (const question of scored) byItem.set(question.itemId, [...(byItem.get(question.itemId) ?? []), question]);
  const covered: QuizQuestion[] = [];
  for (const itemId of deterministicShuffle(lesson.cueCardIds, `${seed}:items`)) {
    const candidates = deterministicShuffle(byItem.get(itemId) ?? [], `${seed}:${itemId}`);
    if (candidates[0]) covered.push(candidates[0]);
  }
  const used = new Set(covered.map((question) => question.id));
  const rest = deterministicShuffle(scored.filter((question) => !used.has(question.id)), `${seed}:rest`);
  return [...covered, ...rest].slice(0, count).map((question) => queueEntry(question, lesson.id, "active", seed));
}

function reviewQuestion(itemId: string, seed: string): { question: QuizQuestion; lessonId: string } | undefined {
  const card = cueCards.find((item) => item.id === itemId);
  const lesson = lessons.find((item) => item.id === card?.lessonId);
  if (!card || !lesson) return undefined;
  const candidates = lesson.quizBank.filter((question) => question.itemId === itemId && question.scored);
  const question = deterministicShuffle(candidates, `${seed}:${itemId}`)[0];
  return question ? { question, lessonId: lesson.id } : undefined;
}

export function buildSession(params: {
  mode: SessionMode; lesson?: VideoLesson; snapshot: AppSnapshot; today: string; nowIso: string;
}): ActiveStudySession {
  const lessonId = params.lesson?.id;
  const previousAttempts = params.snapshot.completedSessions.filter((session) => session.mode === params.mode && session.lessonId === lessonId).length;
  const attemptNumber = previousAttempts + 1;
  const seed = `${CURRICULUM_VERSION}:${lessonId ?? "review"}:${params.mode}:${params.today}:${attemptNumber}`;
  let queue: SessionQueueEntry[] = [];
  let cardOrder: string[] = [];
  let stage: ActiveStudySession["stage"];

  if (params.mode === "introduction" && params.lesson) {
    queue = buildActiveQuestionQueue(params.lesson, Math.min(5, params.lesson.quizBank.length), seed);
    cardOrder = params.lesson.cueCardIds;
    stage = "video";
  } else if (params.mode === "mastery" && params.lesson) {
    const active = buildActiveQuestionQueue(params.lesson, 10, seed);
    const review = dueReviewStates(params.snapshot, params.today)
      .filter((state) => cueCards.find((card) => card.id === state.itemId)?.lessonId !== params.lesson?.id)
      .slice(0, 3).flatMap((state) => {
      const selected = reviewQuestion(state.itemId, seed);
      return selected ? [queueEntry(selected.question, selected.lessonId, "review", seed)] : [];
      });
    queue = deterministicShuffle([...active, ...review], `${seed}:interleave`);
    cardOrder = deterministicShuffle(params.lesson.cueCardIds, `${seed}:retrieval`);
    stage = "retrieval-cards";
  } else {
    queue = dueReviewStates(params.snapshot, params.today).slice(0, 10).flatMap((state) => {
      const selected = reviewQuestion(state.itemId, seed);
      return selected ? [queueEntry(selected.question, selected.lessonId, "review", seed)] : [];
    });
    stage = "mastery-quiz";
  }

  return {
    id: `session-${params.mode}-${lessonId ?? "review"}-${params.today}-${attemptNumber}`,
    curriculumVersion: CURRICULUM_VERSION,
    mode: params.mode, lessonId, localDate: params.today, attemptNumber, stage,
    cardOrder, cardIndex: 0, cardRevealed: false, videoCompleted: false, videoBypassed: false,
    queue, questionIndex: 0, answers: [], startedAt: params.nowIso,
  };
}

export function findQuestion(entry: SessionQueueEntry): QuizQuestion | undefined {
  return lessons.find((lesson) => lesson.id === entry.lessonId)?.quizBank.find((question) => question.id === entry.questionId);
}

export function gradeChoice(entry: SessionQueueEntry, displayedChoiceIndex: number): boolean {
  const question = findQuestion(entry);
  const originalIndex = entry.choiceOrder?.[displayedChoiceIndex];
  return question?.correctIndex !== undefined && originalIndex === question.correctIndex;
}

export function gradeConstruction(entry: SessionQueueEntry, tokens: string[]): boolean {
  const question = findQuestion(entry);
  return Boolean(question?.correctConstruction && question.correctConstruction.join("\u0000") === tokens.join("\u0000"));
}

export function gradeMatching(entry: SessionQueueEntry, pairs: Array<{ left: string; right: string }>): boolean {
  const question = findQuestion(entry);
  if (!question?.matchingPairs || pairs.length !== question.matchingPairs.length) return false;
  return question.matchingPairs.every((pair) => pairs.some((answer) => answer.left === pair.left && answer.right === pair.right));
}

export function answerFor(session: ActiveStudySession, queueId: string): SessionAnswer | undefined {
  return session.answers.find((answer) => answer.queueId === queueId);
}

export function nextReviewState(existing: ItemReviewState | undefined, itemId: string, correct: boolean, today: string, nowIso: string): ItemReviewState {
  if (!correct) return {
    itemId, dueDate: addLocalDays(today, 1), intervalDays: 1,
    ease: Math.max(1.3, (existing?.ease ?? 2.3) - 0.2), successfulRecalls: existing?.successfulRecalls ?? 0,
    lastResult: "again", lastReviewedAt: nowIso,
  };
  const successfulRecalls = (existing?.successfulRecalls ?? 0) + 1;
  const sequence = [2, 5, 12, 30];
  const ease = Math.min(3, (existing?.ease ?? 2.3) + 0.08);
  const intervalDays = sequence[successfulRecalls - 1] ?? Math.max(31, Math.round((existing?.intervalDays ?? 30) * ease));
  return { itemId, dueDate: addLocalDays(today, intervalDays), intervalDays, ease, successfulRecalls, lastResult: "remembered", lastReviewedAt: nowIso };
}

export function updateConsistency(streak: StreakState, today: string): StreakState {
  if (streak.lastStudyDate === today) return streak;
  const consecutive = streak.lastStudyDate && localDaysBetween(streak.lastStudyDate, today) === 1;
  const currentDays = consecutive ? streak.currentDays + 1 : 1;
  return { currentDays, longestDays: Math.max(streak.longestDays, currentDays), lastStudyDate: today };
}
