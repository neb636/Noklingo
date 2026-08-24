import type { z } from "zod";
import type {
  AudioAssetSchema,
  ChoiceSchema,
  CueCardSchema,
  CurriculumSchema,
  DailyStudySessionSchema,
  ExerciseAnswerSchema,
  ExerciseFeedbackSchema,
  ExerciseSchema,
  ExerciseTypeSchema,
  ItemReviewStateSchema,
  KnowledgeItemSchema,
  LessonMediaSchema,
  LessonProgressSchema,
  PairSchema,
  PersistedAppDataV3Schema,
  QuizItemSchema,
  QuizKindSchema,
  QuizQueueEntrySchema,
  QuizScopeSchema,
  SessionAnswerSchema,
  SessionModeSchema,
  SessionStageSchema,
  SettingsSchema,
  StreakStateSchema,
  StudyAttemptSchema,
  StudyModeSchema,
  TranscriptLineSchema,
  VideoLessonSchema,
} from "@/src/domain/schemas";

export type AudioAsset = z.infer<typeof AudioAssetSchema>;
export type Choice = z.infer<typeof ChoiceSchema>;
export type CueCard = z.infer<typeof CueCardSchema>;
export type Curriculum = z.infer<typeof CurriculumSchema>;
export type DailyStudySession = z.infer<typeof DailyStudySessionSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type ExerciseAnswer = z.infer<typeof ExerciseAnswerSchema>;
export type ExerciseFeedback = z.infer<typeof ExerciseFeedbackSchema>;
export type ExerciseType = z.infer<typeof ExerciseTypeSchema>;
export type ItemReviewState = z.infer<typeof ItemReviewStateSchema>;
export type KnowledgeItem = z.infer<typeof KnowledgeItemSchema>;
export type LessonMedia = z.infer<typeof LessonMediaSchema>;
export type LessonProgress = z.infer<typeof LessonProgressSchema>;
export type Pair = z.infer<typeof PairSchema>;
export type PersistedAppDataV3 = z.infer<typeof PersistedAppDataV3Schema>;
export type PersistedAppData = PersistedAppDataV3;
export type QuizItem = z.infer<typeof QuizItemSchema>;
export type QuizKind = z.infer<typeof QuizKindSchema>;
export type QuizQueueEntry = z.infer<typeof QuizQueueEntrySchema>;
export type QuizScope = z.infer<typeof QuizScopeSchema>;
export type SessionAnswer = z.infer<typeof SessionAnswerSchema>;
export type SessionMode = z.infer<typeof SessionModeSchema>;
export type SessionStage = z.infer<typeof SessionStageSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type StreakState = z.infer<typeof StreakStateSchema>;
export type StudyAttempt = z.infer<typeof StudyAttemptSchema>;
export type StudyMode = z.infer<typeof StudyModeSchema>;
export type TranscriptLine = z.infer<typeof TranscriptLineSchema>;
export type VideoLesson = z.infer<typeof VideoLessonSchema>;

export type StudyCompletionSummary = {
  attempt: StudyAttempt;
  lessonProgress: LessonProgress;
  passed: boolean;
  accuracy: number;
  activeCorrect: number;
  activeTotal: number;
  reviewCorrect: number;
  reviewTotal: number;
  missedItemIds: string[];
  nextEligibleMasteryDate?: string;
  nextLessonId?: string;
};
export type CompletionSummary = StudyCompletionSummary;

export type TodayState =
  | {
      kind: "resume-session";
      lesson: VideoLesson;
      session: DailyStudySession;
      dueReviewCount: number;
    }
  | { kind: "new-lesson-ready"; lesson: VideoLesson; dueReviewCount: number }
  | { kind: "mastery-review-due"; lesson: VideoLesson; dueReviewCount: number }
  | {
      kind: "waiting";
      lesson: VideoLesson;
      nextEligibleDate: string;
      dueReviewCount: number;
    }
  | { kind: "spaced-review-due"; dueReviewCount: number }
  | { kind: "curriculum-complete"; dueReviewCount: number };
