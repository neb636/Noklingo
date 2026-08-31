import { z } from "zod";

export const LocalDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const VerificationStatusSchema = z.enum(["draft", "verified"]);

export const LocalAssetPathSchema = z.string().min(2).superRefine((path, context) => {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("..") || /^(?:[a-z]+:)?\/\//i.test(path)) {
    context.addIssue({ code: "custom", message: "Media must use a same-origin local asset path." });
  }
});

export const LessonMediaSchema = z.object({
  videoSrc: LocalAssetPathSchema,
  posterSrc: LocalAssetPathSchema,
  durationSeconds: z.number().finite().positive(),
  durationStatus: z.enum(["estimated", "confirmed"]),
  availability: z.enum(["draft-unavailable", "available"]),
  fallbackMessage: z.string().min(1),
});

export const InteractionTypeSchema = z.enum([
  "listening", "situation-response", "meaning-recognition",
  "phrase-construction", "matching", "self-guided-speaking",
]);

export const QuizQuestionSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
  interactionType: InteractionTypeSchema,
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2).optional(),
  correctIndex: z.number().int().nonnegative().optional(),
  constructionTokens: z.array(z.string().min(1)).min(2).optional(),
  correctConstruction: z.array(z.string().min(1)).min(2).optional(),
  matchingPairs: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).min(2).optional(),
  audioSrc: LocalAssetPathSchema.optional(),
  explanation: z.string().min(1),
  scored: z.boolean(),
  verificationStatus: VerificationStatusSchema,
});

export const VideoLessonSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().positive(),
  topicEmoji: z.string().trim().min(1),
  title: z.string().min(1),
  objective: z.string().min(1),
  description: z.string().min(1),
  activityMode: z.enum(["video-and-practice", "video-only"]).optional(),
  visibility: z.enum(["visible", "hidden"]).optional(),
  media: LessonMediaSchema,
  cueCardIds: z.array(z.string().min(1)),
  quizBank: z.array(QuizQuestionSchema),
  contentStatus: VerificationStatusSchema,
  source: z.object({
    label: z.string().min(1),
    url: z.string().url(),
    permissionStatus: z.enum(["pending", "authorized"]),
  }).optional(),
});

export const KnowledgeItemSchema = z.object({
  id: z.string().min(1),
  lessonId: z.string().min(1),
  emoji: z.string().trim().min(1),
  thai: z.string().min(1),
  romanization: z.string().min(1),
  naturalMeaning: z.string().min(1),
  usage: z.string().min(1).optional(),
  literalNote: z.string().min(1).optional(),
  culturalNote: z.string().min(1).optional(),
  thaiAudioSrc: LocalAssetPathSchema.optional(),
  englishAudioSrc: LocalAssetPathSchema.optional(),
  pronunciationOverrides: z.object({
    thai: z.object({
      startSeconds: z.number().finite().nonnegative(),
      endSeconds: z.number().finite().positive(),
      matchText: z.string().min(1).optional(),
      review: z.object({
        sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
        algorithmFingerprint: z.string().min(1),
        reviewedAt: z.string().datetime(),
      }).optional(),
    }).refine((value) => value.endSeconds > value.startSeconds, {
      message: "Thai pronunciation override endSeconds must be after startSeconds.",
    }).optional(),
    english: z.object({
      startSeconds: z.number().finite().nonnegative(),
      endSeconds: z.number().finite().positive(),
      matchText: z.string().min(1).optional(),
      review: z.object({
        sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
        algorithmFingerprint: z.string().min(1),
        reviewedAt: z.string().datetime(),
      }).optional(),
    }).refine((value) => value.endSeconds > value.startSeconds, {
      message: "English pronunciation override endSeconds must be after startSeconds.",
    }).optional(),
  }).optional(),
  verificationStatus: VerificationStatusSchema,
});
export const CueCardSchema = KnowledgeItemSchema;

export const LessonProgressStatusSchema = z.enum(["unseen", "introduced", "awaiting-mastery", "mastered"]);
export const LessonProgressSchema = z.object({
  lessonId: z.string().min(1),
  status: LessonProgressStatusSchema,
  introducedAt: z.string().datetime().optional(),
  introducedDate: LocalDateSchema.optional(),
  masteryEligibleDate: LocalDateSchema.optional(),
  lastMasteryAttemptDate: LocalDateSchema.optional(),
  masteredAt: z.string().datetime().optional(),
  masteredDate: LocalDateSchema.optional(),
  lastStudiedAt: z.string().datetime().optional(),
});

export const RecallResultSchema = z.enum(["again", "remembered"]);
export const ItemReviewStateSchema = z.object({
  itemId: z.string().min(1),
  dueDate: LocalDateSchema,
  intervalDays: z.number().int().nonnegative(),
  ease: z.number().min(1.3).max(3),
  successfulRecalls: z.number().int().nonnegative(),
  lastResult: RecallResultSchema.optional(),
  lastReviewedAt: z.string().datetime().optional(),
});

export const SessionModeSchema = z.enum(["introduction", "mastery", "standalone-review"]);
export const SessionStageSchema = z.enum([
  "video", "cue-cards", "diagnostic", "retrieval-cards", "mastery-quiz", "results",
]);
export const SessionQueueEntrySchema = z.object({
  queueId: z.string().min(1),
  questionId: z.string().min(1),
  lessonId: z.string().min(1),
  itemId: z.string().min(1),
  source: z.enum(["active", "review"]),
  choiceOrder: z.array(z.number().int().nonnegative()).optional(),
  tokenOrder: z.array(z.number().int().nonnegative()).optional(),
  pairOrder: z.array(z.number().int().nonnegative()).optional(),
});
export const SessionAnswerSchema = z.object({
  queueId: z.string().min(1),
  selectedChoice: z.number().int().nonnegative().optional(),
  constructedTokens: z.array(z.string()).optional(),
  matchedPairs: z.array(z.object({ left: z.string(), right: z.string() })).optional(),
  correct: z.boolean(),
  answeredAt: z.string().datetime(),
});
export const ActiveStudySessionSchema = z.object({
  id: z.string().min(1),
  curriculumVersion: z.string().min(1),
  mode: SessionModeSchema,
  lessonId: z.string().optional(),
  localDate: LocalDateSchema,
  attemptNumber: z.number().int().positive(),
  stage: SessionStageSchema,
  cardOrder: z.array(z.string()),
  cardIndex: z.number().int().nonnegative(),
  cardRevealed: z.boolean(),
  videoCompleted: z.boolean(),
  videoBypassed: z.boolean(),
  queue: z.array(SessionQueueEntrySchema),
  questionIndex: z.number().int().nonnegative(),
  answers: z.array(SessionAnswerSchema),
  feedbackQueueId: z.string().min(1).optional(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});
export const CompletedStudySessionSchema = ActiveStudySessionSchema.extend({
  completedAt: z.string().datetime(),
  activeCorrect: z.number().int().nonnegative(),
  activeTotal: z.number().int().nonnegative(),
  reviewCorrect: z.number().int().nonnegative(),
  reviewTotal: z.number().int().nonnegative(),
  passed: z.boolean().optional(),
});
export const StudyAttemptSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  lessonId: z.string().min(1),
  itemId: z.string().min(1),
  questionId: z.string().min(1),
  source: z.enum(["diagnostic", "active-mastery", "spaced-review"]),
  correct: z.boolean(),
  createdAt: z.string().datetime(),
});

export const SettingsSchema = z.object({
  audioEnabled: z.boolean(),
  volume: z.number().min(0).max(1),
  speechRate: z.number().min(0.5).max(1.25),
  theme: z.enum(["system", "light", "dark"]),
  showRomanization: z.boolean(),
  showThaiScript: z.boolean(),
  thaiSize: z.enum(["standard", "large"]),
  reduceMotion: z.boolean(),
  politeParticle: z.enum(["khráp", "khâ", "both"]),
});
export const StreakStateSchema = z.object({
  currentDays: z.number().int().nonnegative(),
  longestDays: z.number().int().nonnegative(),
  lastStudyDate: LocalDateSchema.optional(),
});
export const AppSnapshotSchema = z.object({
  version: z.literal(3),
  curriculumVersion: z.string().min(1),
  lessonProgress: z.array(LessonProgressSchema),
  reviewStates: z.array(ItemReviewStateSchema),
  attempts: z.array(StudyAttemptSchema),
  completedSessions: z.array(CompletedStudySessionSchema),
  activeSession: ActiveStudySessionSchema.nullable(),
  lastResultSessionId: z.string().optional(),
  settings: SettingsSchema,
  streak: StreakStateSchema,
});

export type VideoLesson = z.infer<typeof VideoLessonSchema>;
export type LessonMedia = z.infer<typeof LessonMediaSchema>;
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
