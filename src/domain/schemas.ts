import { z } from "zod";

export const LocalDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const VerificationStatusSchema = z.enum(["draft", "verified"]);

export const LessonMediaSchema = z.object({
  videoSrc: z.string(), posterSrc: z.string(), captionsSrc: z.string(),
  durationSeconds: z.number().nonnegative(),
  availability: z.enum(["draft-unavailable", "available"]),
  fallbackMessage: z.string().min(1),
});

export const TranscriptLineSchema = z.object({
  id: z.string(), startSeconds: z.number().nonnegative(), endSeconds: z.number().positive(),
  speaker: z.string(), thai: z.string(), romanization: z.string(), naturalEnglish: z.string(),
  literalNote: z.string().optional(), contextNote: z.string().optional(),
  verificationStatus: VerificationStatusSchema,
});

export const InteractionTypeSchema = z.enum([
  "listening", "situation-response", "meaning-recognition",
  "phrase-construction", "matching", "self-guided-speaking",
]);

export const QuizQuestionSchema = z.object({
  id: z.string(), itemId: z.string(), interactionType: InteractionTypeSchema,
  prompt: z.string(), choices: z.array(z.string()).min(2).optional(),
  correctIndex: z.number().int().nonnegative().optional(),
  constructionTokens: z.array(z.string()).min(2).optional(),
  correctConstruction: z.array(z.string()).min(2).optional(),
  matchingPairs: z.array(z.object({ left: z.string(), right: z.string() })).min(2).optional(),
  audioSrc: z.string().optional(), explanation: z.string(), scored: z.boolean(),
  verificationStatus: VerificationStatusSchema,
});

export const VideoLessonSchema = z.object({
  id: z.string(), order: z.number().int().positive(), title: z.string(), objective: z.string(),
  description: z.string(), media: LessonMediaSchema, transcript: z.array(TranscriptLineSchema),
  cueCardIds: z.array(z.string()), quizBank: z.array(QuizQuestionSchema),
  contentStatus: VerificationStatusSchema,
  source: z.object({
    label: z.string(), url: z.string().url(),
    permissionStatus: z.enum(["pending", "authorized"]),
  }).optional(),
});

export const KnowledgeItemSchema = z.object({
  id: z.string(), lessonId: z.string(), thai: z.string(), romanization: z.string(),
  naturalMeaning: z.string(), usage: z.string(), literalNote: z.string().optional(),
  culturalNote: z.string().optional(), transcriptReferences: z.array(z.string()),
  phraseAudioSrc: z.string().optional(), verificationStatus: VerificationStatusSchema,
});
export const CueCardSchema = KnowledgeItemSchema;

export const LessonProgressStatusSchema = z.enum(["unseen", "introduced", "awaiting-mastery", "mastered"]);
export const LessonProgressSchema = z.object({
  lessonId: z.string(), status: LessonProgressStatusSchema,
  introducedAt: z.string().datetime().optional(), introducedDate: LocalDateSchema.optional(),
  masteryEligibleDate: LocalDateSchema.optional(), lastMasteryAttemptDate: LocalDateSchema.optional(),
  masteredAt: z.string().datetime().optional(), masteredDate: LocalDateSchema.optional(),
  lastStudiedAt: z.string().datetime().optional(),
});

export const RecallResultSchema = z.enum(["again", "remembered"]);
export const ItemReviewStateSchema = z.object({
  itemId: z.string(), dueDate: LocalDateSchema, intervalDays: z.number().int().nonnegative(),
  ease: z.number().min(1.3).max(3), successfulRecalls: z.number().int().nonnegative(),
  lastResult: RecallResultSchema.optional(), lastReviewedAt: z.string().datetime().optional(),
});

export const SessionModeSchema = z.enum(["introduction", "mastery", "standalone-review"]);
export const SessionStageSchema = z.enum([
  "video", "cue-cards", "diagnostic", "retrieval-cards", "mastery-quiz", "results",
]);
export const SessionQueueEntrySchema = z.object({
  queueId: z.string(), questionId: z.string(), lessonId: z.string(), itemId: z.string(),
  source: z.enum(["active", "review"]), choiceOrder: z.array(z.number().int().nonnegative()).optional(),
  tokenOrder: z.array(z.number().int().nonnegative()).optional(),
  pairOrder: z.array(z.number().int().nonnegative()).optional(),
});
export const SessionAnswerSchema = z.object({
  queueId: z.string(), selectedChoice: z.number().int().nonnegative().optional(),
  constructedTokens: z.array(z.string()).optional(),
  matchedPairs: z.array(z.object({ left: z.string(), right: z.string() })).optional(),
  correct: z.boolean(), answeredAt: z.string().datetime(),
});
export const ActiveStudySessionSchema = z.object({
  id: z.string(), mode: SessionModeSchema, lessonId: z.string().optional(), localDate: LocalDateSchema,
  attemptNumber: z.number().int().positive(), stage: SessionStageSchema, cardOrder: z.array(z.string()),
  cardIndex: z.number().int().nonnegative(), cardRevealed: z.boolean(),
  videoCompleted: z.boolean(), videoBypassed: z.boolean(), queue: z.array(SessionQueueEntrySchema),
  questionIndex: z.number().int().nonnegative(), answers: z.array(SessionAnswerSchema),
  startedAt: z.string().datetime(), completedAt: z.string().datetime().optional(),
});
export const CompletedStudySessionSchema = ActiveStudySessionSchema.extend({
  completedAt: z.string().datetime(), activeCorrect: z.number().int().nonnegative(),
  activeTotal: z.number().int().nonnegative(), reviewCorrect: z.number().int().nonnegative(),
  reviewTotal: z.number().int().nonnegative(), passed: z.boolean().optional(),
});
export const StudyAttemptSchema = z.object({
  id: z.string(), sessionId: z.string(), lessonId: z.string(), itemId: z.string(),
  questionId: z.string(), source: z.enum(["diagnostic", "active-mastery", "spaced-review"]),
  correct: z.boolean(), createdAt: z.string().datetime(),
});

export const SettingsSchema = z.object({
  audioEnabled: z.boolean(), volume: z.number().min(0).max(1), speechRate: z.number().min(0.5).max(1.25),
  theme: z.enum(["system", "light", "dark"]), showRomanization: z.boolean(), showThaiScript: z.boolean(),
  thaiSize: z.enum(["standard", "large"]), reduceMotion: z.boolean(), captionsByDefault: z.boolean(),
  politeParticle: z.enum(["khráp", "khâ", "both"]),
});
export const StreakStateSchema = z.object({
  currentDays: z.number().int().nonnegative(), longestDays: z.number().int().nonnegative(),
  lastStudyDate: LocalDateSchema.optional(),
});
export const AppSnapshotSchema = z.object({
  version: z.literal(2), lessonProgress: z.array(LessonProgressSchema),
  reviewStates: z.array(ItemReviewStateSchema), attempts: z.array(StudyAttemptSchema),
  completedSessions: z.array(CompletedStudySessionSchema), activeSession: ActiveStudySessionSchema.nullable(),
  lastResultSessionId: z.string().optional(), settings: SettingsSchema, streak: StreakStateSchema,
});

export type VideoLesson = z.infer<typeof VideoLessonSchema>;
export type LessonMedia = z.infer<typeof LessonMediaSchema>;
export type TranscriptLine = z.infer<typeof TranscriptLineSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type KnowledgeItem = z.infer<typeof KnowledgeItemSchema>;
export type CueCard = z.infer<typeof CueCardSchema>;
export type LessonProgress = z.infer<typeof LessonProgressSchema>;
export type ItemReviewState = z.infer<typeof ItemReviewStateSchema>;
export type SessionMode = z.infer<typeof SessionModeSchema>;
export type SessionStage = z.infer<typeof SessionStageSchema>;
export type SessionQueueEntry = z.infer<typeof SessionQueueEntrySchema>;
export type SessionAnswer = z.infer<typeof SessionAnswerSchema>;
export type ActiveStudySession = z.infer<typeof ActiveStudySessionSchema>;
export type CompletedStudySession = z.infer<typeof CompletedStudySessionSchema>;
export type StudyAttempt = z.infer<typeof StudyAttemptSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type StreakState = z.infer<typeof StreakStateSchema>;
export type AppSnapshot = z.infer<typeof AppSnapshotSchema>;
