import { z } from "zod";

const thaiCharacters = /[\u0E00-\u0E7F]/u;
const idPattern = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

export const IdSchema = z
  .string()
  .min(1)
  .regex(idPattern, "Use lowercase letters, numbers, dots, and hyphens only");
export const DateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a local calendar date (YYYY-MM-DD)");
export const DateTimeSchema = z.string().datetime({ offset: true });
export const RomanizationSchema = z
  .string()
  .trim()
  .min(1, "Romanization is required")
  .refine(
    (value) => !thaiCharacters.test(value),
    "Romanization must use learner-facing Latin characters, not Thai script",
  );

export const FormalitySchema = z.enum([
  "casual",
  "neutral",
  "polite",
  "formal",
]);
export const SpeakerGenderSchema = z.enum(["female", "male", "neutral"]);

export const SpeakerSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  gender: SpeakerGenderSchema,
  role: z.string().min(1),
  description: z.string().min(1),
  defaultPoliteParticle: z.enum(["khrap", "kha", "none"]).default("none"),
});

export const AudioAssetSchema = z
  .object({
    id: IdSchema,
    speakerId: IdSchema,
    src: z.string().min(1).optional(),
    slowSrc: z.string().min(1).optional(),
    fallbackText: z.string().min(1).optional(),
    transcriptThai: z.string().min(1),
    romanization: RomanizationSchema,
    kind: z.enum(["bundled", "cached", "tts-placeholder"]),
    license: z.string().min(1).optional(),
  })
  .refine((asset) => asset.src || asset.fallbackText, {
    message: "Audio needs a source or a Thai TTS fallback",
    path: ["src"],
  });

export const AudioManifestEntrySchema = z.object({
  id: IdSchema,
  audioAssetId: IdSchema,
  thaiText: z.string().min(1),
  romanization: RomanizationSchema,
  speakerDescription: z.string().min(1),
  gender: SpeakerGenderSchema,
  deliverySpeed: z.enum(["normal", "slow"]),
  emotionalTone: z.string().min(1),
  context: z.string().min(1),
  suggestedFilename: z.string().min(1),
  lessonIds: z.array(IdSchema).min(1),
  recordingStatus: z.enum(["needs-recording", "recorded"]),
  recordingNotes: z.string().min(1),
});

const LearningItemBaseSchema = z.object({
  id: IdSchema,
  thai: z.string().min(1),
  romanization: RomanizationSchema,
  meaning: z.string().min(1),
  literalMeaning: z.string().min(1).optional(),
  audioRef: IdSchema.optional(),
  speakerGender: SpeakerGenderSchema.optional(),
  politenessContext: z.string().min(1).optional(),
  toneGuidance: z.string().min(1),
  formality: FormalitySchema,
  usageNotes: z.string().min(1),
  tags: z.array(IdSchema).min(1),
  topics: z.array(IdSchema).min(1),
  difficulty: z.number().int().min(1).max(5),
  reviewPriority: z.number().min(0.5).max(2).default(1),
});

export const VocabularyItemSchema = LearningItemBaseSchema.extend({
  partOfSpeech: z.string().min(1).optional(),
});

export const PhraseSchema = LearningItemBaseSchema.extend({
  acceptedRomanizations: z.array(RomanizationSchema).default([]),
  vocabularyIds: z.array(IdSchema).default([]),
  grammarNoteIds: z.array(IdSchema).default([]),
  culturalNoteIds: z.array(IdSchema).default([]),
});

export const HintSchema = z.object({
  id: IdSchema,
  text: z.string().min(1),
  penaltyXp: z.number().int().min(0).max(3).default(1),
});

export const GrammarNoteSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  examples: z.array(IdSchema).default([]),
});

export const CulturalNoteSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  body: z.string().min(1),
  relatedItemIds: z.array(IdSchema).default([]),
});

export const DialogueTurnSchema = z.object({
  speakerId: IdSchema,
  phraseId: IdSchema.optional(),
  thai: z.string().min(1),
  romanization: RomanizationSchema,
  meaning: z.string().min(1),
  audioRef: IdSchema.optional(),
});

export const DialogueComprehensionQuestionSchema = z.object({
  id: IdSchema,
  prompt: z.string().min(1),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
});

export const DialogueSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  context: z.string().min(1),
  turns: z.array(DialogueTurnSchema).min(2),
  difficulty: z.number().int().min(1).max(5),
  tags: z.array(IdSchema).min(1),
  formality: FormalitySchema,
  usageNotes: z.string().min(1),
  comprehensionQuestions: z
    .array(DialogueComprehensionQuestionSchema)
    .default([]),
});

export const ExerciseTypeSchema = z.enum([
  "listen-meaning",
  "listen-phrase",
  "english-to-phrase",
  "phrase-order",
  "missing-word",
  "matching-pairs",
  "conversation-response",
  "dialogue-comprehension",
  "speaking-practice",
  "mistake-correction",
  "personalized-translation",
]);

export const ChoiceSchema = z.object({
  id: IdSchema,
  label: z.string().min(1),
  romanization: RomanizationSchema.optional(),
  meaning: z.string().min(1).optional(),
  thai: z.string().min(1).optional(),
  accessibilityLabel: z.string().min(1).optional(),
});

export const PairSchema = z.object({
  id: IdSchema,
  left: z.string().min(1),
  right: z.string().min(1),
  leftAccessibilityLabel: z.string().min(1).optional(),
  rightAccessibilityLabel: z.string().min(1).optional(),
});

export const ExerciseFeedbackSchema = z.object({
  correct: z.string().min(1),
  incorrect: z.string().min(1),
  pronunciation: z.string().min(1).optional(),
});

const choiceExerciseTypes = new Set([
  "listen-meaning",
  "listen-phrase",
  "english-to-phrase",
  "missing-word",
  "conversation-response",
  "dialogue-comprehension",
  "mistake-correction",
  "personalized-translation",
]);

export const ExerciseSchema = z
  .object({
    id: IdSchema,
    type: ExerciseTypeSchema,
    instruction: z.string().min(1),
    prompt: z.string().min(1),
    thai: z.string().min(1).optional(),
    romanization: RomanizationSchema.optional(),
    meaning: z.string().min(1).optional(),
    context: z.string().min(1).optional(),
    speakerId: IdSchema.optional(),
    audioRef: IdSchema.optional(),
    dialogueId: IdSchema.optional(),
    choices: z.array(ChoiceSchema).min(2).optional(),
    tokens: z.array(z.string().min(1)).min(2).optional(),
    pairs: z.array(PairSchema).min(2).optional(),
    correctAnswer: z.union([
      z.string().min(1),
      z.array(z.string().min(1)).min(1),
    ]),
    acceptedAnswers: z.array(z.string().min(1)).default([]),
    hintIds: z.array(IdSchema).default([]),
    inlineHint: z.string().min(1).optional(),
    explanation: z.string().min(1),
    difficulty: z.number().int().min(1).max(5),
    tags: z.array(IdSchema).min(1),
    sourceItemIds: z.array(IdSchema).min(1),
    feedback: ExerciseFeedbackSchema,
    accessibilityLabel: z.string().min(1),
    estimatedSeconds: z.number().int().min(10).max(180).default(30),
  })
  .superRefine((exercise, context) => {
    if (choiceExerciseTypes.has(exercise.type)) {
      if (!exercise.choices) {
        context.addIssue({
          code: "custom",
          path: ["choices"],
          message: `${exercise.type} requires answer choices`,
        });
      } else if (typeof exercise.correctAnswer !== "string") {
        context.addIssue({
          code: "custom",
          path: ["correctAnswer"],
          message: "Choice exercises require a choice ID as the correct answer",
        });
      } else if (
        !exercise.choices.some((choice) => choice.id === exercise.correctAnswer)
      ) {
        context.addIssue({
          code: "custom",
          path: ["correctAnswer"],
          message: `Correct choice “${exercise.correctAnswer}” does not exist`,
        });
      }
    }
    if (exercise.type === "phrase-order") {
      if (!exercise.tokens || !Array.isArray(exercise.correctAnswer)) {
        context.addIssue({
          code: "custom",
          path: ["tokens"],
          message:
            "Phrase ordering requires tokens and an ordered array answer",
        });
      }
    }
    if (exercise.type === "matching-pairs" && !exercise.pairs) {
      context.addIssue({
        code: "custom",
        path: ["pairs"],
        message: "Matching exercises require at least two pairs",
      });
    }
    if (
      ["listen-meaning", "listen-phrase", "speaking-practice"].includes(
        exercise.type,
      ) &&
      !exercise.audioRef
    ) {
      context.addIssue({
        code: "custom",
        path: ["audioRef"],
        message: `${exercise.type} requires audio`,
      });
    }
    if (exercise.type === "dialogue-comprehension" && !exercise.dialogueId) {
      context.addIssue({
        code: "custom",
        path: ["dialogueId"],
        message: "Dialogue comprehension requires a dialogue reference",
      });
    }
  });

export const SkillSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  itemIds: z.array(IdSchema).min(1),
  tags: z.array(IdSchema).min(1),
});

export const LessonSchema = z.object({
  id: IdSchema,
  unitId: IdSchema,
  kind: z.enum(["lesson", "checkpoint", "review"]).default("lesson"),
  title: z.string().min(1),
  eyebrow: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
  completionXp: z.number().int().min(0),
  estimatedMinutes: z.number().min(3).max(7),
  skillIds: z.array(IdSchema).min(1),
  prerequisiteLessonIds: z.array(IdSchema).default([]),
  introducedItemIds: z.array(IdSchema).max(3).default([]),
  exercises: z.array(ExerciseSchema).min(6).max(12),
  tags: z.array(IdSchema).min(1),
});

export const PathNodeSchema = z.object({
  id: IdSchema,
  type: z.enum(["lesson", "checkpoint", "review"]),
  title: z.string().min(1),
  lessonId: IdSchema.optional(),
});

export const UnitSchema = z.object({
  id: IdSchema,
  sectionId: IdSchema,
  number: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  color: z.enum(["coral", "teal", "sun"]),
  skillIds: z.array(IdSchema).min(1),
  prerequisiteCheckpointIds: z.array(IdSchema).default([]),
  nodes: z.array(PathNodeSchema).min(1),
});

export const SectionSchema = z.object({
  id: IdSchema,
  number: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  unitIds: z.array(IdSchema).min(1),
});

export const CheckpointSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  lessonId: IdSchema,
  passingAccuracy: z.number().int().min(50).max(100),
  unlocksUnitIds: z.array(IdSchema).default([]),
});

export const AchievementSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
  criteria: z.object({
    kind: z.enum([
      "lesson-count",
      "perfect-lesson",
      "checkpoint-count",
      "streak",
      "xp",
    ]),
    threshold: z.number().int().positive(),
  }),
});

export const CourseSchema = z.object({
  schemaVersion: z.literal(1),
  id: IdSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  sourceLanguage: z.literal("th"),
  learnerLanguage: z.literal("en"),
  sections: z.array(SectionSchema).min(1),
  units: z.array(UnitSchema).min(1),
  skills: z.array(SkillSchema).min(1),
  lessons: z.array(LessonSchema).min(1),
  vocabulary: z.array(VocabularyItemSchema).default([]),
  phrases: z.array(PhraseSchema).min(1),
  dialogues: z.array(DialogueSchema).default([]),
  speakers: z.array(SpeakerSchema).min(1),
  audioAssets: z.array(AudioAssetSchema).min(1),
  hints: z.array(HintSchema).default([]),
  grammarNotes: z.array(GrammarNoteSchema).default([]),
  culturalNotes: z.array(CulturalNoteSchema).default([]),
  checkpoints: z.array(CheckpointSchema).default([]),
  achievements: z.array(AchievementSchema).default([]),
});

export const ExerciseAnswerSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.record(z.string(), z.string()),
]);

export const ExerciseAttemptSchema = z.object({
  id: IdSchema,
  sessionId: IdSchema,
  lessonId: IdSchema,
  exerciseId: IdSchema,
  sourceExerciseId: IdSchema,
  sourceItemIds: z.array(IdSchema),
  answer: ExerciseAnswerSchema,
  correct: z.boolean(),
  firstAttempt: z.boolean(),
  hintUsed: z.boolean(),
  retryCount: z.number().int().min(0),
  elapsedMs: z.number().int().min(0),
  xpEarned: z.number().int().min(0),
  answeredAt: DateTimeSchema,
  selfAssessment: z.enum(["confident", "needs-practice"]).optional(),
});

export const MistakeRecordSchema = z.object({
  id: IdSchema,
  lessonId: IdSchema,
  exerciseId: IdSchema,
  sourceItemIds: z.array(IdSchema),
  firstSeenAt: DateTimeSchema,
  lastSeenAt: DateTimeSchema,
  timesWrong: z.number().int().positive(),
  successfulCorrections: z.number().int().min(0),
  resolved: z.boolean(),
});

export const ReviewSchedulingStateSchema = z.object({
  itemId: IdSchema,
  status: z.enum(["new", "learning", "review"]),
  strength: z.number().min(0).max(1),
  easeFactor: z.number().min(1.3).max(3),
  intervalDays: z.number().int().min(0),
  dueDate: DateKeySchema,
  lastReviewedAt: DateTimeSchema.optional(),
  successfulReviews: z.number().int().min(0),
  totalReviews: z.number().int().min(0),
  recentFailures: z.number().int().min(0),
  lapses: z.number().int().min(0),
  lastOutcome: z.enum(["correct", "incorrect", "needs-practice"]).optional(),
});

export const ReviewSessionSchema = z.object({
  id: IdSchema,
  generatedAt: DateTimeSchema,
  dueItemIds: z.array(IdSchema),
  source: z.enum(["mistakes", "due", "mixed"]),
  estimatedMinutes: z.number().min(1).max(10),
  exercises: z.array(ExerciseSchema).min(1).max(12),
});

export const LessonStateSchema = z.object({
  lessonId: IdSchema,
  status: z.enum([
    "locked",
    "available",
    "in-progress",
    "completed",
    "mastered",
  ]),
  attempts: z.number().int().min(0),
  bestAccuracy: z.number().min(0).max(100),
  lastCompletedAt: DateTimeSchema.optional(),
});

export const CheckpointResultSchema = z.object({
  checkpointId: IdSchema,
  attempts: z.number().int().positive(),
  bestAccuracy: z.number().min(0).max(100),
  passed: z.boolean(),
  lastAttemptAt: DateTimeSchema,
});

export const ActivitySchema = z.object({
  id: IdSchema,
  lessonId: IdSchema,
  title: z.string().min(1),
  xp: z.number().int().min(0),
  accuracy: z.number().min(0).max(100),
  completedAt: DateTimeSchema,
  mode: z.enum(["lesson", "checkpoint", "review"]),
  passed: z.boolean().default(true),
});

export const UserProgressSchema = z.object({
  totalXp: z.number().int().min(0),
  todayXp: z.number().int().min(0),
  todayDate: DateKeySchema,
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  lastPracticeDate: DateKeySchema.nullable(),
  completedLessonIds: z.array(IdSchema),
  lessonAttempts: z.record(IdSchema, z.number().int().min(0)),
  lessonStates: z.record(IdSchema, LessonStateSchema),
  checkpointResults: z.record(IdSchema, CheckpointResultSchema),
  activities: z.array(ActivitySchema),
  exerciseAttempts: z.array(ExerciseAttemptSchema),
  mistakes: z.array(MistakeRecordSchema),
  reviewStates: z.record(IdSchema, ReviewSchedulingStateSchema),
  masteryBySkill: z.record(IdSchema, z.number().min(0).max(1)),
  unlockedAchievementIds: z.array(IdSchema),
});

export const SettingsSchema = z.object({
  audioEnabled: z.boolean(),
  volume: z.number().min(0).max(1),
  romanization: z.enum(["always", "learning"]),
  showThaiScript: z.boolean(),
  reducedMotion: z.boolean(),
  darkMode: z.boolean(),
});

export const ProfileSchema = z.object({
  name: z.string().min(1),
  onboarded: z.boolean(),
  dailyGoal: z.number().int().min(5).max(100),
  motivation: z.string().min(1),
  familiarity: z.enum(["new", "some", "comfortable"]),
  politeParticle: z.enum(["khrap", "kha"]),
});

export const AnswerRecordSchema = z.object({
  exerciseId: IdSchema,
  sourceExerciseId: IdSchema,
  correct: z.boolean(),
  firstAttempt: z.boolean(),
  answer: ExerciseAnswerSchema,
  hintUsed: z.boolean(),
  xpEarned: z.number().int().min(0),
});

export const LessonSessionSchema = z.object({
  sessionId: IdSchema,
  lessonId: IdSchema,
  lessonTitle: z.string().min(1),
  mode: z.enum(["lesson", "checkpoint", "review"]),
  exerciseQueue: z.array(ExerciseSchema).min(1),
  exerciseIndex: z.number().int().min(0),
  hearts: z.number().int().min(0),
  maxHearts: z.number().int().positive(),
  answers: z.array(AnswerRecordSchema),
  currentAnswer: ExerciseAnswerSchema.nullable(),
  currentResult: z.boolean().nullable(),
  currentHintUsed: z.boolean(),
  exerciseStartedAt: DateTimeSchema,
  startedAt: DateTimeSchema,
  earnedXp: z.number().int().min(0),
  recoveryCount: z.number().int().min(0),
  correctionCounts: z.record(IdSchema, z.number().int().min(0)),
});

export const CompletionSummarySchema = z.object({
  lessonId: IdSchema,
  lessonTitle: z.string().min(1),
  mode: z.enum(["lesson", "checkpoint", "review"]),
  xp: z.number().int().min(0),
  accuracy: z.number().min(0).max(100),
  mistakes: z.number().int().min(0),
  seconds: z.number().int().min(1),
  passed: z.boolean(),
  requiredAccuracy: z.number().min(0).max(100).optional(),
  unlockedTitle: z.string().optional(),
  newAchievementTitles: z.array(z.string()).default([]),
});

export const PersistedAppDataSchema = z.object({
  version: z.literal(2),
  profile: ProfileSchema,
  settings: SettingsSchema,
  progress: UserProgressSchema,
  activeSession: LessonSessionSchema.nullable(),
});

export type CourseInput = z.input<typeof CourseSchema>;
export type PersistedAppDataInput = z.input<typeof PersistedAppDataSchema>;
