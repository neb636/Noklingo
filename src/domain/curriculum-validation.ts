import { cueCards, lessons } from "./seed";
import type { ActiveStudySession, AppSnapshot, QuizQuestion, VideoLesson } from "./schemas";

export type CurriculumIssue = { lessonId: string; message: string };

function validQuestion(question: QuizQuestion): boolean {
  if (!question.scored) return true;
  if (question.interactionType === "self-guided-speaking") return false;
  if (question.choices) return question.correctIndex !== undefined && question.correctIndex < question.choices.length;
  if (question.interactionType === "phrase-construction") return Boolean(question.constructionTokens && question.correctConstruction);
  if (question.interactionType === "matching") return Boolean(question.matchingPairs?.length);
  return false;
}

export function validateCurriculum(curriculum = lessons): CurriculumIssue[] {
  const issues: CurriculumIssue[] = [];
  const lessonIds = new Set<string>();
  const questionIds = new Set<string>();
  const itemIds = new Set(cueCards.map((card) => card.id));
  for (const lesson of curriculum) {
    if (lessonIds.has(lesson.id)) issues.push({ lessonId: lesson.id, message: "Duplicate lesson id." });
    lessonIds.add(lesson.id);
    for (const itemId of lesson.cueCardIds) if (!itemIds.has(itemId)) issues.push({ lessonId: lesson.id, message: `Unknown cue-card id: ${itemId}.` });
    for (const question of lesson.quizBank) {
      if (questionIds.has(question.id)) issues.push({ lessonId: lesson.id, message: `Duplicate question id: ${question.id}.` });
      questionIds.add(question.id);
      if (!lesson.cueCardIds.includes(question.itemId)) issues.push({ lessonId: lesson.id, message: `Question ${question.id} references an unreachable item.` });
      if (!validQuestion(question)) issues.push({ lessonId: lesson.id, message: `Question ${question.id} has no deterministic answer.` });
      if (question.interactionType === "listening" && lesson.contentStatus === "verified" && !question.audioSrc && !cueCards.find((card) => card.id === question.itemId)?.phraseAudioSrc) issues.push({ lessonId: lesson.id, message: `Verified listening question ${question.id} has no bundled audio.` });
    }
    if (lesson.contentStatus === "verified") {
      const lessonCards = lesson.cueCardIds.map((id) => cueCards.find((card) => card.id === id)).filter(Boolean);
      if (lesson.media.availability !== "available") issues.push({ lessonId: lesson.id, message: "Verified lesson media is unavailable." });
      if (lesson.source?.permissionStatus !== "authorized") issues.push({ lessonId: lesson.id, message: "Verified lessons require an authorized source record." });
      if (lesson.cueCardIds.length < 5 || lesson.cueCardIds.length > 10) issues.push({ lessonId: lesson.id, message: "Verified lessons require 5–10 cue cards." });
      if (lesson.quizBank.filter((question) => question.scored).length < 10) issues.push({ lessonId: lesson.id, message: "Verified lessons require at least ten scored questions." });
      if (lesson.transcript.some((line) => line.verificationStatus !== "verified")) issues.push({ lessonId: lesson.id, message: "Verified lessons require a verified transcript." });
      if (lessonCards.some((card) => card?.verificationStatus !== "verified" || !card.phraseAudioSrc)) issues.push({ lessonId: lesson.id, message: "Verified cue cards require verified language and bundled phrase audio." });
      const transcriptIds = new Set(lesson.transcript.map((line) => line.id));
      if (lessonCards.some((card) => card?.transcriptReferences.some((id) => !transcriptIds.has(id)))) issues.push({ lessonId: lesson.id, message: "Cue cards contain invalid transcript references." });
      const scoredTypes = new Set(lesson.quizBank.filter((question) => question.scored).map((question) => question.interactionType));
      for (const type of ["listening", "situation-response", "meaning-recognition", "phrase-construction"] as const) if (!scoredTypes.has(type)) issues.push({ lessonId: lesson.id, message: `Verified lesson is missing ${type} questions.` });
    }
  }
  return issues;
}

export function isSessionCompatible(session: ActiveStudySession): boolean {
  const lesson = session.lessonId ? lessons.find((item) => item.id === session.lessonId) : undefined;
  if (session.lessonId && !lesson) return false;
  if (new Set(session.queue.map((entry) => entry.queueId)).size !== session.queue.length) return false;
  if (session.answers.some((answer) => !session.queue.some((entry) => entry.queueId === answer.queueId))) return false;
  if (session.cardOrder.some((id) => !cueCards.some((card) => card.id === id))) return false;
  return session.queue.every((entry) => {
    const entryLesson = lessons.find((item) => item.id === entry.lessonId);
    return entryLesson?.quizBank.some((question) => question.id === entry.questionId && question.itemId === entry.itemId);
  });
}

export function reconcileSnapshot(snapshot: AppSnapshot): AppSnapshot {
  return snapshot.activeSession && !isSessionCompatible(snapshot.activeSession)
    ? { ...snapshot, activeSession: null }
    : snapshot;
}

export function isLessonStudyReady(lesson: VideoLesson): boolean {
  return lesson.cueCardIds.length >= 5 && lesson.cueCardIds.length <= 10
    && lesson.quizBank.filter((question) => question.scored && validQuestion(question)).length >= 10;
}
