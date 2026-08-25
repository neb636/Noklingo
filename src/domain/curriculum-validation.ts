import type {
  ActiveStudySession,
  AppSnapshot,
  CompletedStudySession,
  CueCard,
  QuizQuestion,
  SessionAnswer,
  SessionQueueEntry,
  VideoLesson,
} from "./schemas";
import { cueCards as bundledCards, lessons as bundledLessons } from "./seed";
import { diagnosticQuestionCount, masteryQuestionCount, minimumQuestionBankSize, passesAdaptiveMastery } from "./lesson-sizing";

export type CurriculumIssue = { lessonId: string; message: string };
export type CurriculumValidationOptions = {
  assetExists?: (localPath: string) => boolean;
};

const requiredQuestionTypes = [
  "listening",
  "situation-response",
  "meaning-recognition",
  "phrase-construction",
] as const;

function isPermutation(order: number[] | undefined, length: number): boolean {
  return Boolean(order && order.length === length
    && new Set(order).size === length
    && order.every((value) => value >= 0 && value < length));
}

function isSafeLocalAssetPath(path: string | undefined): path is string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || /[\\?#\u0000-\u001f]/.test(path)) return false;
  try {
    const decoded = decodeURIComponent(path);
    if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\")) return false;
    return decoded.split("/").slice(1).every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
  } catch {
    return false;
  }
}

function localExtension(path: string | undefined, extensions: string[]): boolean {
  return Boolean(isSafeLocalAssetPath(path)
    && extensions.some((extension) => decodeURIComponent(path).toLowerCase().endsWith(extension)));
}

function valueCounts(values: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

export function questionIssues(question: QuizQuestion): string[] {
  const issues: string[] = [];
  const hasChoices = question.choices !== undefined || question.correctIndex !== undefined;
  const hasConstruction = question.constructionTokens !== undefined || question.correctConstruction !== undefined;
  const hasMatching = question.matchingPairs !== undefined;
  if (question.scored && question.interactionType === "self-guided-speaking") {
    issues.push("self-guided speaking cannot be scored");
  }

  if (["listening", "situation-response", "meaning-recognition"].includes(question.interactionType)) {
    if (!question.choices || question.correctIndex === undefined || question.correctIndex < 0 || question.correctIndex >= question.choices.length) {
      issues.push("choice answer is unreachable");
    } else if (question.choices.some((choice) => !choice.trim()) || new Set(question.choices.map((choice) => choice.trim())).size !== question.choices.length) {
      issues.push("choices are not unique");
    }
    if (hasConstruction || hasMatching) issues.push("choice question contains a conflicting answer format");
  } else if (question.interactionType === "phrase-construction") {
    if (!question.constructionTokens || !question.correctConstruction) {
      issues.push("construction answer is missing");
    } else {
      if (question.constructionTokens.some((token) => !token.trim()) || question.correctConstruction.some((token) => !token.trim())) {
        issues.push("construction answer contains an empty token");
      }
      const available = valueCounts(question.constructionTokens);
      const needed = valueCounts(question.correctConstruction);
      if ([...needed].some(([token, count]) => (available.get(token) ?? 0) < count)) {
        issues.push("construction answer cannot be built from its tokens");
      }
    }
    if (hasChoices || hasMatching) issues.push("construction question contains a conflicting answer format");
  } else if (question.interactionType === "matching") {
    const pairs = question.matchingPairs;
    if (!pairs?.length
      || pairs.some((pair) => !pair.left.trim() || !pair.right.trim())
      || new Set(pairs.map((pair) => pair.left)).size !== pairs.length
      || new Set(pairs.map((pair) => pair.right)).size !== pairs.length) {
      issues.push("matching answer is ambiguous");
    }
    if (hasChoices || hasConstruction) issues.push("matching question contains a conflicting answer format");
  } else if (hasChoices || hasConstruction || hasMatching) {
    issues.push("self-guided speaking contains a conflicting scored answer format");
  }
  return issues;
}

function pushDuplicateIssues(
  issues: CurriculumIssue[],
  values: Array<{ value: string | number; lessonId: string }>,
  label: string,
) {
  const owners = new Map<string | number, string[]>();
  for (const entry of values) owners.set(entry.value, [...(owners.get(entry.value) ?? []), entry.lessonId]);
  for (const [value, lessonIds] of owners) {
    if (lessonIds.length < 2) continue;
    for (const lessonId of new Set(lessonIds)) issues.push({ lessonId, message: `Duplicate ${label}: ${value}.` });
  }
}

export function validateCurriculum(
  curriculum: readonly VideoLesson[] = bundledLessons,
  cards: readonly CueCard[] = bundledCards,
  options: CurriculumValidationOptions = {},
): CurriculumIssue[] {
  const issues: CurriculumIssue[] = [];
  const lessonById = new Map(curriculum.map((lesson) => [lesson.id, lesson]));
  const cardById = new Map(cards.map((card) => [card.id, card]));

  pushDuplicateIssues(issues, curriculum.map((lesson) => ({ value: lesson.id, lessonId: lesson.id })), "lesson id");
  pushDuplicateIssues(issues, curriculum.map((lesson) => ({ value: lesson.order, lessonId: lesson.id })), "lesson order");
  pushDuplicateIssues(issues, cards.map((card) => ({ value: card.id, lessonId: card.lessonId })), "cue-card id");
  pushDuplicateIssues(issues, curriculum.flatMap((lesson) => lesson.quizBank.map((question) => ({ value: question.id, lessonId: lesson.id }))), "question id");

  for (const card of cards) {
    const owner = lessonById.get(card.lessonId);
    if (!owner) issues.push({ lessonId: card.lessonId, message: `Cue card ${card.id} belongs to an unknown lesson.` });
    else if (!owner.cueCardIds.includes(card.id)) issues.push({ lessonId: owner.id, message: `Cue card ${card.id} is orphaned from its lesson plan.` });
  }

  for (const lesson of curriculum) {
    if (new Set(lesson.cueCardIds).size !== lesson.cueCardIds.length) issues.push({ lessonId: lesson.id, message: "Duplicate cue-card entry." });

    for (const itemId of lesson.cueCardIds) {
      const card = cardById.get(itemId);
      if (!card) issues.push({ lessonId: lesson.id, message: `Unknown cue-card id: ${itemId}.` });
      else if (card.lessonId !== lesson.id) issues.push({ lessonId: lesson.id, message: `Cue card ${itemId} belongs to another lesson.` });
    }

    for (const question of lesson.quizBank) {
      if (!lesson.cueCardIds.includes(question.itemId)) issues.push({ lessonId: lesson.id, message: `Question ${question.id} references an unreachable cue card.` });
      for (const message of questionIssues(question)) issues.push({ lessonId: lesson.id, message: `Question ${question.id}: ${message}.` });
    }

    if (lesson.contentStatus !== "verified") continue;
    const lessonCards = lesson.cueCardIds.map((id) => cardById.get(id)).filter((card): card is CueCard => Boolean(card));
    const scored = lesson.quizBank.filter((question) => question.scored);

    if (lesson.source?.permissionStatus !== "authorized") issues.push({ lessonId: lesson.id, message: "Verified lessons require an authorized source record." });
    if (lesson.media.availability !== "available") issues.push({ lessonId: lesson.id, message: "Verified lesson media is unavailable." });
    if (lesson.media.durationStatus !== "confirmed") issues.push({ lessonId: lesson.id, message: "Verified lessons require a confirmed duration." });
    if (!localExtension(lesson.media.videoSrc, [".mp4"])) issues.push({ lessonId: lesson.id, message: "Verified video must be a local MP4." });
    if (!localExtension(lesson.media.posterSrc, [".jpg", ".jpeg", ".png", ".webp"])) issues.push({ lessonId: lesson.id, message: "Verified lessons require a local poster image." });

    for (const path of [lesson.media.videoSrc, lesson.media.posterSrc]) {
      if (path && options.assetExists && !options.assetExists(path)) issues.push({ lessonId: lesson.id, message: `Bundled media is missing: ${path}.` });
    }
    if (lesson.cueCardIds.length < 1 || lesson.cueCardIds.length > 10) issues.push({ lessonId: lesson.id, message: "Verified lessons require 1–10 cue cards." });
    if (lessonCards.some((card) => card.verificationStatus !== "verified" || !card.usage || !localExtension(card.phraseAudioSrc, [".m4a", ".mp3", ".wav", ".ogg"]))) {
      issues.push({ lessonId: lesson.id, message: "Verified cue cards require verified language and bundled phrase audio." });
    }
    for (const card of lessonCards) {
      if (card.phraseAudioSrc && options.assetExists && !options.assetExists(card.phraseAudioSrc)) {
        issues.push({ lessonId: lesson.id, message: `Bundled phrase audio is missing: ${card.phraseAudioSrc}.` });
      }
    }

    for (const question of lesson.quizBank) {
      if (question.audioSrc && !localExtension(question.audioSrc, [".m4a", ".mp3", ".wav", ".ogg"])) {
        issues.push({ lessonId: lesson.id, message: `Question ${question.id} references invalid local audio.` });
      } else if (question.audioSrc && options.assetExists && !options.assetExists(question.audioSrc)) {
        issues.push({ lessonId: lesson.id, message: `Question audio is missing: ${question.audioSrc}.` });
      }
      if (question.verificationStatus === "verified" && question.interactionType === "listening"
        && !localExtension(question.audioSrc, [".m4a", ".mp3", ".wav", ".ogg"])) {
        issues.push({ lessonId: lesson.id, message: `Verified listening question ${question.id} requires explicit bundled local audio.` });
      }
    }

    const activeQuestions = scored.filter((question) => {
      const card = cardById.get(question.itemId);
      const audioAvailable = question.interactionType !== "listening"
        || (localExtension(question.audioSrc, [".m4a", ".mp3", ".wav", ".ogg"])
          && (!options.assetExists || options.assetExists(question.audioSrc!)));
      return question.verificationStatus === "verified"
        && questionIssues(question).length === 0
        && lesson.cueCardIds.includes(question.itemId)
        && card?.lessonId === lesson.id
        && card.verificationStatus === "verified"
        && Boolean(card.usage)
        && audioAvailable;
    });
    for (const card of lessonCards) {
      const variants = activeQuestions.filter((question) => question.itemId === card.id);
      if (variants.length < 2) issues.push({ lessonId: lesson.id, message: `Cue card ${card.id} requires at least two valid scored quiz variants.` });
      if (!variants.some((question) => ["listening", "meaning-recognition"].includes(question.interactionType))) {
        issues.push({ lessonId: lesson.id, message: `Cue card ${card.id} requires a receptive quiz variant.` });
      }
      if (!variants.some((question) => ["situation-response", "phrase-construction"].includes(question.interactionType))) {
        issues.push({ lessonId: lesson.id, message: `Cue card ${card.id} requires a contextual or productive quiz variant.` });
      }
    }
    const minimumQuestions = minimumQuestionBankSize(lesson);
    if (activeQuestions.length < minimumQuestions) issues.push({ lessonId: lesson.id, message: `Verified lessons require at least ${minimumQuestions} valid active questions.` });
    if (scored.some((question) => question.verificationStatus !== "verified")) issues.push({ lessonId: lesson.id, message: "Verified lessons cannot score unverified questions." });
    for (const type of requiredQuestionTypes) {
      if (!activeQuestions.some((question) => question.interactionType === type)) issues.push({ lessonId: lesson.id, message: `Verified lesson is missing valid ${type} questions.` });
    }
  }
  return issues;
}

export function lessonIsReleaseReady(
  lesson: VideoLesson,
  curriculum: readonly VideoLesson[],
  cards: readonly CueCard[],
): boolean {
  return lesson.contentStatus === "verified" && validateCurriculum(curriculum, cards).length === 0;
}

export const isLessonStudyReady = lessonIsReleaseReady;

function questionFor(entry: SessionQueueEntry, curriculum: readonly VideoLesson[]) {
  return curriculum.find((lesson) => lesson.id === entry.lessonId)?.quizBank.find((question) => question.id === entry.questionId);
}

function expectedCorrect(entry: SessionQueueEntry, answer: SessionAnswer, question: QuizQuestion): boolean | undefined {
  if (question.choices) {
    if (answer.selectedChoice === undefined
      || answer.selectedChoice >= question.choices.length
      || answer.constructedTokens !== undefined
      || answer.matchedPairs !== undefined
      || !isPermutation(entry.choiceOrder, question.choices.length)) return undefined;
    return entry.choiceOrder![answer.selectedChoice] === question.correctIndex;
  }
  if (question.interactionType === "phrase-construction" && question.correctConstruction) {
    if (!answer.constructedTokens || answer.selectedChoice !== undefined || answer.matchedPairs !== undefined) return undefined;
    return answer.constructedTokens.join("\u0000") === question.correctConstruction.join("\u0000");
  }
  if (question.interactionType === "matching" && question.matchingPairs) {
    if (!answer.matchedPairs || answer.selectedChoice !== undefined || answer.constructedTokens !== undefined
      || answer.matchedPairs.length !== question.matchingPairs.length) return undefined;
    return question.matchingPairs.every((pair) => answer.matchedPairs!.some((answerPair) => answerPair.left === pair.left && answerPair.right === pair.right));
  }
  return undefined;
}

export function isSessionCompatible(
  session: ActiveStudySession,
  curriculum: readonly VideoLesson[] = bundledLessons,
  cards: readonly CueCard[] = bundledCards,
  curriculumVersion: string = session.curriculumVersion,
  completed = false,
): boolean {
  if (session.curriculumVersion !== curriculumVersion) return false;
  if (completed ? !session.completedAt : Boolean(session.completedAt)) return false;
  const published = curriculum.filter((lesson) => lesson.contentStatus === "verified" && lessonIsReleaseReady(lesson, curriculum, cards));
  const lesson = session.lessonId ? published.find((item) => item.id === session.lessonId) : undefined;
  if ((session.mode === "standalone-review") !== !session.lessonId || (session.lessonId && !lesson)) return false;

  const allowedStages = completed
    ? ["results"]
    : session.mode === "introduction"
      ? ["video", "cue-cards", "diagnostic"]
      : session.mode === "mastery"
        ? ["retrieval-cards", "mastery-quiz"]
        : ["mastery-quiz"];
  if (!allowedStages.includes(session.stage)) return false;

  const expectedCards = lesson?.cueCardIds ?? [];
  if (session.mode === "introduction" && session.cardOrder.join("\u0000") !== expectedCards.join("\u0000")) return false;
  if (session.mode === "mastery" && (session.cardOrder.length !== expectedCards.length || new Set(session.cardOrder).size !== expectedCards.length || session.cardOrder.some((id) => !expectedCards.includes(id)))) return false;
  if (session.mode === "standalone-review" && session.cardOrder.length) return false;
  if (session.cardOrder.length ? session.cardIndex >= session.cardOrder.length : session.cardIndex !== 0) return false;

  const queueIds = session.queue.map((entry) => entry.queueId);
  const questionKeys = session.queue.map((entry) => `${entry.lessonId}:${entry.questionId}`);
  if (new Set(queueIds).size !== queueIds.length || new Set(questionKeys).size !== questionKeys.length) return false;
  const activeEntries = session.queue.filter((entry) => entry.source === "active");
  const reviewEntries = session.queue.filter((entry) => entry.source === "review");
  if (session.mode === "introduction" && (activeEntries.length !== diagnosticQuestionCount(lesson!) || reviewEntries.length)) return false;
  if (session.mode === "mastery" && (activeEntries.length !== masteryQuestionCount(lesson!) || reviewEntries.length > 3 || session.queue.length !== activeEntries.length + reviewEntries.length)) return false;
  if (session.mode === "standalone-review" && (activeEntries.length || reviewEntries.length < 1 || reviewEntries.length > 10)) return false;
  if (session.mode === "introduction" && new Set(activeEntries.map((entry) => entry.itemId)).size !== activeEntries.length) return false;
  if (session.mode === "mastery" && expectedCards.some((itemId) => !activeEntries.some((entry) => entry.itemId === itemId))) return false;

  for (const entry of session.queue) {
    const entryLesson = published.find((item) => item.id === entry.lessonId);
    const question = questionFor(entry, curriculum);
    if (!entryLesson || !question || !question.scored || question.verificationStatus !== "verified"
      || question.interactionType === "self-guided-speaking" || questionIssues(question).length
      || question.itemId !== entry.itemId || !entryLesson.cueCardIds.includes(entry.itemId)) return false;
    if (entry.queueId !== `${entry.source}:${entry.lessonId}:${entry.questionId}`) return false;
    if (entry.source === "active" && entry.lessonId !== session.lessonId) return false;
    if (entry.source === "review" && entry.lessonId === session.lessonId) return false;
    if (question.choices ? !isPermutation(entry.choiceOrder, question.choices.length) : entry.choiceOrder !== undefined) return false;
    if (question.constructionTokens ? !isPermutation(entry.tokenOrder, question.constructionTokens.length) : entry.tokenOrder !== undefined) return false;
    if (question.matchingPairs ? !isPermutation(entry.pairOrder, question.matchingPairs.length) : entry.pairOrder !== undefined) return false;
  }

  if (new Set(session.answers.map((answer) => answer.queueId)).size !== session.answers.length) return false;
  if (session.answers.length > session.queue.length) return false;
  const immediateFeedback = session.mode === "introduction" || session.mode === "standalone-review";
  if (session.feedbackQueueId) {
    if (!immediateFeedback || session.answers.length !== session.questionIndex + 1
      || session.queue[session.questionIndex]?.queueId !== session.feedbackQueueId
      || session.answers.at(-1)?.queueId !== session.feedbackQueueId) return false;
  } else if (session.questionIndex !== session.answers.length) return false;
  for (const [index, answer] of session.answers.entries()) {
    const entry = session.queue[index];
    const question = entry && questionFor(entry, curriculum);
    if (!entry || !question || answer.queueId !== entry.queueId) return false;
    const correct = expectedCorrect(entry, answer, question);
    if (correct === undefined || answer.correct !== correct) return false;
  }

  if (!completed && ["video", "cue-cards", "retrieval-cards"].includes(session.stage) && session.answers.length) return false;
  if (!completed && session.stage === "video" && (session.videoCompleted || session.videoBypassed)) return false;
  if (!completed && session.stage !== "video" && session.mode === "introduction" && session.videoCompleted === session.videoBypassed) return false;
  if (session.mode !== "introduction" && (session.videoCompleted || session.videoBypassed)) return false;
  if (completed && (session.answers.length !== session.queue.length || session.feedbackQueueId)) return false;
  if (completed) {
    const stored = session as CompletedStudySession;
    const activeCorrect = session.queue.filter((entry, index) => entry.source === "active" && session.answers[index]?.correct).length;
    const reviewCorrect = session.queue.filter((entry, index) => entry.source === "review" && session.answers[index]?.correct).length;
    if (stored.activeTotal !== activeEntries.length || stored.reviewTotal !== reviewEntries.length
      || stored.activeCorrect !== activeCorrect || stored.reviewCorrect !== reviewCorrect) return false;
    const itemSuccess = lesson?.cueCardIds.map((itemId) => activeEntries
      .filter((entry) => entry.itemId === itemId)
      .some((entry) => session.answers.find((answer) => answer.queueId === entry.queueId)?.correct === true)) ?? [];
    const expectedPassed = session.mode === "mastery" ? passesAdaptiveMastery(activeCorrect, activeEntries.length, itemSuccess) : undefined;
    if (stored.passed !== expectedPassed) return false;
  }
  return true;
}

function uniqueBy<T>(values: readonly T[], key: (value: T) => string): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const id = key(value);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function reconcileSnapshot(
  snapshot: AppSnapshot,
  curriculum: readonly VideoLesson[] = bundledLessons,
  cards: readonly CueCard[] = bundledCards,
  curriculumVersion: string = snapshot.curriculumVersion,
): AppSnapshot {
  const publishedIds = new Set(curriculum.filter((lesson) => lesson.contentStatus === "verified" && lessonIsReleaseReady(lesson, curriculum, cards)).map((lesson) => lesson.id));
  const cardIds = new Set(cards.filter((card) => publishedIds.has(card.lessonId)).map((card) => card.id));
  const questionKeys = new Set(curriculum.filter((lesson) => publishedIds.has(lesson.id)).flatMap((lesson) => lesson.quizBank.map((question) => `${lesson.id}:${question.id}:${question.itemId}`)));

  const lessonProgress = uniqueBy(snapshot.lessonProgress.filter((entry) => publishedIds.has(entry.lessonId)), (entry) => entry.lessonId);
  const reviewStates = uniqueBy(snapshot.reviewStates.filter((entry) => cardIds.has(entry.itemId)), (entry) => entry.itemId);
  const attempts = uniqueBy(snapshot.attempts.filter((entry) => publishedIds.has(entry.lessonId) && cardIds.has(entry.itemId) && questionKeys.has(`${entry.lessonId}:${entry.questionId}:${entry.itemId}`)), (entry) => entry.id);
  const completedSessions = uniqueBy(snapshot.completedSessions.filter((session) => isSessionCompatible(session, curriculum, cards, curriculumVersion, true)), (session) => session.id);
  const activeSession = snapshot.activeSession && isSessionCompatible(snapshot.activeSession, curriculum, cards, curriculumVersion)
    ? snapshot.activeSession
    : null;
  const completedIds = new Set(completedSessions.map((session) => session.id));

  return {
    ...snapshot,
    version: 3,
    curriculumVersion,
    lessonProgress,
    reviewStates,
    attempts,
    completedSessions,
    activeSession,
    lastResultSessionId: snapshot.lastResultSessionId && completedIds.has(snapshot.lastResultSessionId) ? snapshot.lastResultSessionId : undefined,
  };
}
