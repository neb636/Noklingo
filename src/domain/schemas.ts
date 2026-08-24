import { z } from "zod";

export const VerificationStatusSchema = z.enum(["draft", "verified"]);

export const LessonMediaSchema = z.object({
  videoSrc: z.string(),
  posterSrc: z.string(),
  captionsSrc: z.string(),
  durationSeconds: z.number().nonnegative(),
  availability: z.enum(["draft-unavailable", "available"]),
  fallbackMessage: z.string().min(1),
});

export const TranscriptLineSchema = z.object({
  id: z.string(),
  startSeconds: z.number().nonnegative(),
  endSeconds: z.number().positive(),
  speaker: z.string(),
  thai: z.string(),
  romanization: z.string(),
  naturalEnglish: z.string(),
  literalNote: z.string().optional(),
  contextNote: z.string().optional(),
  verificationStatus: VerificationStatusSchema,
});

export const QuizQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  itemId: z.string(),
  choices: z.array(z.string()).min(2),
  correctIndex: z.number().int().nonnegative(),
  explanation: z.string(),
});

export const VideoLessonSchema = z.object({
  id: z.string(),
  order: z.number().int().positive(),
  title: z.string(),
  objective: z.string(),
  description: z.string(),
  media: LessonMediaSchema,
  transcript: z.array(TranscriptLineSchema),
  cueCardIds: z.array(z.string()),
  quizBank: z.array(QuizQuestionSchema),
  contentStatus: VerificationStatusSchema,
});

export const KnowledgeItemSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  thai: z.string(),
  romanization: z.string(),
  naturalMeaning: z.string(),
  usage: z.string(),
  transcriptReferences: z.array(z.string()),
  phraseAudioSrc: z.string().optional(),
  verificationStatus: VerificationStatusSchema,
});

export const CueCardSchema = KnowledgeItemSchema;

export const LessonProgressStatusSchema = z.enum([
  "unseen",
  "introduced",
  "awaiting-mastery",
  "mastered",
]);

export const LessonProgressSchema = z.object({
  lessonId: z.string(),
  status: LessonProgressStatusSchema,
  introducedAt: z.string().datetime().optional(),
  masteredAt: z.string().datetime().optional(),
  lastStudiedAt: z.string().datetime().optional(),
});

export const ItemReviewStateSchema = z.object({
  itemId: z.string(),
  dueAt: z.string().datetime(),
  intervalDays: z.number().int().nonnegative(),
  ease: z.number().min(1.3).max(3),
  successfulRecalls: z.number().int().nonnegative(),
  lastResult: z.enum(["again", "effortful", "remembered"]).optional(),
});

export const StudyAttemptSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  itemId: z.string(),
  promptType: z.enum(["thai-to-meaning", "meaning-to-thai", "listening"]),
  result: z.enum(["again", "effortful", "remembered"]),
  createdAt: z.string().datetime(),
});

export const DailyStudySessionSchema = z.object({
  id: z.string(),
  date: z.string(),
  lessonId: z.string(),
  attemptIds: z.array(z.string()),
  completedAt: z.string().datetime().optional(),
});

export const SettingsSchema = z.object({
  audioEnabled: z.boolean(),
  speechRate: z.number().min(0.5).max(1.25),
  theme: z.enum(["system", "light", "dark"]),
  thaiSize: z.enum(["standard", "large"]),
  reduceMotion: z.boolean(),
  captionsByDefault: z.boolean(),
});

export const StreakStateSchema = z.object({
  currentDays: z.number().int().nonnegative(),
  longestDays: z.number().int().nonnegative(),
  lastStudyDate: z.string().optional(),
});

export const AppSnapshotSchema = z.object({
  version: z.literal(1),
  lessonProgress: z.array(LessonProgressSchema),
  reviewStates: z.array(ItemReviewStateSchema),
  attempts: z.array(StudyAttemptSchema),
  sessions: z.array(DailyStudySessionSchema),
  settings: SettingsSchema,
  streak: StreakStateSchema,
});

export type VideoLesson = z.infer<typeof VideoLessonSchema>;
export type LessonMedia = z.infer<typeof LessonMediaSchema>;
export type TranscriptLine = z.infer<typeof TranscriptLineSchema>;
export type KnowledgeItem = z.infer<typeof KnowledgeItemSchema>;
export type CueCard = z.infer<typeof CueCardSchema>;
export type LessonProgress = z.infer<typeof LessonProgressSchema>;
export type ItemReviewState = z.infer<typeof ItemReviewStateSchema>;
export type StudyAttempt = z.infer<typeof StudyAttemptSchema>;
export type DailyStudySession = z.infer<typeof DailyStudySessionSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type StreakState = z.infer<typeof StreakStateSchema>;
export type AppSnapshot = z.infer<typeof AppSnapshotSchema>;
