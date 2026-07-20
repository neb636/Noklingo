import type { z } from "zod";
import type {
  AchievementSchema,
  ActivitySchema,
  AnswerRecordSchema,
  AudioAssetSchema,
  AudioManifestEntrySchema,
  CheckpointResultSchema,
  CheckpointSchema,
  ChoiceSchema,
  CompletionSummarySchema,
  CourseSchema,
  CulturalNoteSchema,
  DialogueSchema,
  DialogueComprehensionQuestionSchema,
  DialogueTurnSchema,
  ExerciseAnswerSchema,
  ExerciseAttemptSchema,
  ExerciseFeedbackSchema,
  ExerciseSchema,
  ExerciseTypeSchema,
  GrammarNoteSchema,
  HintSchema,
  LessonSchema,
  LessonSessionSchema,
  LessonStateSchema,
  MistakeRecordSchema,
  PairSchema,
  PathNodeSchema,
  PersistedAppDataSchema,
  PhraseSchema,
  ProfileSchema,
  ReviewSchedulingStateSchema,
  ReviewSessionSchema,
  SectionSchema,
  SettingsSchema,
  SkillSchema,
  SpeakerSchema,
  UnitSchema,
  UserProgressSchema,
  VocabularyItemSchema,
} from "@/src/domain/schemas";

export type Achievement = z.infer<typeof AchievementSchema>;
export type Milestone = Achievement;
export type Activity = z.infer<typeof ActivitySchema>;
export type AnswerRecord = z.infer<typeof AnswerRecordSchema>;
export type AudioAsset = z.infer<typeof AudioAssetSchema>;
export type AudioManifestEntry = z.infer<typeof AudioManifestEntrySchema>;
export type Checkpoint = z.infer<typeof CheckpointSchema>;
export type CheckpointResult = z.infer<typeof CheckpointResultSchema>;
export type Choice = z.infer<typeof ChoiceSchema>;
export type CompletionSummary = z.infer<typeof CompletionSummarySchema>;
export type Course = z.infer<typeof CourseSchema>;
export type CourseUnit = z.infer<typeof UnitSchema>;
export type CulturalNote = z.infer<typeof CulturalNoteSchema>;
export type Dialogue = z.infer<typeof DialogueSchema>;
export type DialogueComprehensionQuestion = z.infer<
  typeof DialogueComprehensionQuestionSchema
>;
export type DialogueTurn = z.infer<typeof DialogueTurnSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type ExerciseAnswer = z.infer<typeof ExerciseAnswerSchema>;
export type ExerciseAttempt = z.infer<typeof ExerciseAttemptSchema>;
export type ExerciseFeedback = z.infer<typeof ExerciseFeedbackSchema>;
export type ExerciseType = z.infer<typeof ExerciseTypeSchema>;
export type GrammarNote = z.infer<typeof GrammarNoteSchema>;
export type Hint = z.infer<typeof HintSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type LessonSession = z.infer<typeof LessonSessionSchema>;
export type LessonState = z.infer<typeof LessonStateSchema>;
export type MistakeRecord = z.infer<typeof MistakeRecordSchema>;
export type Pair = z.infer<typeof PairSchema>;
export type PathNode = z.infer<typeof PathNodeSchema>;
export type PersistedAppData = z.infer<typeof PersistedAppDataSchema>;
export type Phrase = z.infer<typeof PhraseSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Progress = z.infer<typeof UserProgressSchema>;
export type ReviewSchedulingState = z.infer<typeof ReviewSchedulingStateSchema>;
export type ReviewSession = z.infer<typeof ReviewSessionSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type Speaker = z.infer<typeof SpeakerSchema>;
export type Unit = z.infer<typeof UnitSchema>;
export type UserProgress = z.infer<typeof UserProgressSchema>;
export type VocabularyItem = z.infer<typeof VocabularyItemSchema>;
