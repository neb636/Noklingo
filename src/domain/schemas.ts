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
  .min(1)
  .refine(
    (value) => !thaiCharacters.test(value),
    "Romanization must use learner-facing Latin characters, not Thai script",
  );

/** Playback-compatible subset retained for the existing audio utility. */
export const AudioAssetSchema = z
  .object({
    id: IdSchema,
    speakerId: IdSchema.optional(),
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

const exerciseFields = {
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
};

type ExerciseShape = z.infer<z.ZodObject<typeof exerciseFields>>;

const validateExercise = (
  exercise: ExerciseShape,
  context: z.RefinementCtx,
) => {
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
      !exercise.choices.some(({ id }) => id === exercise.correctAnswer)
    ) {
      context.addIssue({
        code: "custom",
        path: ["correctAnswer"],
        message: `Correct choice “${exercise.correctAnswer}” does not exist`,
      });
    }
  }
  if (
    exercise.type === "phrase-order" &&
    (!exercise.tokens || !Array.isArray(exercise.correctAnswer))
  ) {
    context.addIssue({
      code: "custom",
      path: ["tokens"],
      message: "Phrase ordering requires tokens and an ordered array answer",
    });
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
};

/** Grading-compatible question shape retained from the previous UI. */
export const ExerciseSchema = z
  .object(exerciseFields)
  .superRefine(validateExercise);

export const QuizKindSchema = z.enum([
  "listening",
  "situation-response",
  "meaning-recognition",
  "phrase-recall",
]);

export const QuizItemSchema = z
  .object({
    ...exerciseFields,
    lessonId: IdSchema,
    variantOf: IdSchema,
    quizKind: QuizKindSchema,
  })
  .superRefine(validateExercise);

const LocalPublicAssetPathSchema = z
  .string()
  .min(1)
  .regex(/^\/(?!\/)/u, "Use a same-origin path rooted in public/");

export const LessonMediaSchema = z.object({
  src: LocalPublicAssetPathSchema.refine(
    (value) => value.toLocaleLowerCase().endsWith(".mp4"),
    "Lesson video must be an MP4",
  ),
  posterSrc: LocalPublicAssetPathSchema.optional(),
  captionsSrc: LocalPublicAssetPathSchema.refine(
    (value) => value.toLocaleLowerCase().endsWith(".vtt"),
    "Lesson captions must be WebVTT",
  ).optional(),
  mimeType: z.literal("video/mp4").default("video/mp4"),
  durationSeconds: z.number().positive().optional(),
  availability: z.enum(["bundled", "expected-local"]),
  fallbackMessage: z.string().min(1),
});

export const TranscriptLineSchema = z
  .object({
    id: IdSchema,
    startSeconds: z.number().min(0),
    endSeconds: z.number().positive(),
    speaker: z.string().min(1),
    thai: z.string().min(1),
    romanization: RomanizationSchema,
    meaning: z.string().min(1),
    literalMeaning: z.string().min(1).optional(),
    contextNote: z.string().min(1).optional(),
    sourceStatus: z.enum(["draft-placeholder", "verified"]),
  })
  .refine((line) => line.endSeconds > line.startSeconds, {
    message: "Transcript line must end after it starts",
    path: ["endSeconds"],
  });

export const KnowledgeItemSchema = z.object({
  id: IdSchema,
  lessonId: IdSchema,
  thai: z.string().min(1),
  romanization: RomanizationSchema,
  meaning: z.string().min(1),
  literalMeaning: z.string().min(1).optional(),
  usageNotes: z.string().min(1),
  context: z.string().min(1).optional(),
  culturalNote: z.string().min(1).optional(),
  audioRef: IdSchema,
  transcriptLineIds: z.array(IdSchema).min(1),
  tags: z.array(IdSchema).min(1),
});

// A cue card is the learner-facing projection of a reviewable knowledge item.
export const CueCardSchema = KnowledgeItemSchema;

export const VideoLessonSchema = z.object({
  id: IdSchema,
  order: z.number().int().positive(),
  title: z.string().min(1),
  objective: z.string().min(1),
  description: z.string().min(1),
  media: LessonMediaSchema,
  transcriptStatus: z.enum(["draft", "verified"]),
  transcript: z.array(TranscriptLineSchema),
  cueCardItemIds: z.array(IdSchema).min(5).max(10),
  quizBank: z.array(QuizItemSchema).min(10),
  tags: z.array(IdSchema).min(1),
});

export const CurriculumSchema = z
  .object({
    schemaVersion: z.literal(3),
    id: IdSchema,
    title: z.string().min(1),
    description: z.string().min(1),
    sourceLanguage: z.literal("th"),
    learnerLanguage: z.literal("en"),
    lessons: z.array(VideoLessonSchema).min(1),
    knowledgeItems: z.array(KnowledgeItemSchema).min(5),
    audioAssets: z.array(AudioAssetSchema).default([]),
  })
  .superRefine((curriculum, context) => {
    const lessonIds = new Set(curriculum.lessons.map(({ id }) => id));
    const itemById = new Map(
      curriculum.knowledgeItems.map((item) => [item.id, item]),
    );
    const audioById = new Map(
      curriculum.audioAssets.map((asset) => [asset.id, asset]),
    );
    const audioIds = new Set(audioById.keys());
    const allQuizIds = curriculum.lessons.flatMap(({ quizBank }) =>
      quizBank.map(({ id }) => id),
    );
    const allTranscriptIds = curriculum.lessons.flatMap(({ transcript }) =>
      transcript.map(({ id }) => id),
    );
    if (lessonIds.size !== curriculum.lessons.length) {
      context.addIssue({
        code: "custom",
        path: ["lessons"],
        message: "Lesson IDs must be unique",
      });
    }
    if (itemById.size !== curriculum.knowledgeItems.length) {
      context.addIssue({
        code: "custom",
        path: ["knowledgeItems"],
        message: "Knowledge item IDs must be unique",
      });
    }
    if (audioIds.size !== curriculum.audioAssets.length) {
      context.addIssue({
        code: "custom",
        path: ["audioAssets"],
        message: "Audio asset IDs must be unique",
      });
    }
    if (new Set(allQuizIds).size !== allQuizIds.length) {
      context.addIssue({
        code: "custom",
        path: ["lessons"],
        message: "Quiz item IDs must be unique across the curriculum",
      });
    }
    if (new Set(allTranscriptIds).size !== allTranscriptIds.length) {
      context.addIssue({
        code: "custom",
        path: ["lessons"],
        message: "Transcript line IDs must be unique across the curriculum",
      });
    }
    if (
      new Set(curriculum.lessons.map(({ order }) => order)).size !==
      curriculum.lessons.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["lessons"],
        message: "Lesson order values must be unique",
      });
    }
    curriculum.knowledgeItems.forEach((item, itemIndex) => {
      if (!lessonIds.has(item.lessonId)) {
        context.addIssue({
          code: "custom",
          path: ["knowledgeItems", itemIndex, "lessonId"],
          message: `Unknown lesson “${item.lessonId}”`,
        });
      }
      if (item.audioRef && !audioIds.has(item.audioRef)) {
        context.addIssue({
          code: "custom",
          path: ["knowledgeItems", itemIndex, "audioRef"],
          message: `Unknown audio asset “${item.audioRef}”`,
        });
      }
    });
    curriculum.lessons.forEach((lesson, lessonIndex) => {
      const cueIds = new Set(lesson.cueCardItemIds);
      const transcriptIds = new Set(lesson.transcript.map(({ id }) => id));
      const quizIds = new Set(lesson.quizBank.map(({ id }) => id));
      if (cueIds.size !== lesson.cueCardItemIds.length) {
        context.addIssue({
          code: "custom",
          path: ["lessons", lessonIndex, "cueCardItemIds"],
          message: "Cue-card item IDs must be unique within a lesson",
        });
      }
      if (transcriptIds.size !== lesson.transcript.length) {
        context.addIssue({
          code: "custom",
          path: ["lessons", lessonIndex, "transcript"],
          message: "Transcript line IDs must be unique within a lesson",
        });
      }
      if (quizIds.size !== lesson.quizBank.length) {
        context.addIssue({
          code: "custom",
          path: ["lessons", lessonIndex, "quizBank"],
          message: "Quiz item IDs must be unique within a lesson",
        });
      }
      for (const itemId of cueIds) {
        const item = itemById.get(itemId);
        if (!item || item.lessonId !== lesson.id) {
          context.addIssue({
            code: "custom",
            path: ["lessons", lessonIndex, "cueCardItemIds"],
            message: `Cue-card item “${itemId}” is missing or belongs to another lesson`,
          });
        } else
          for (const lineId of item.transcriptLineIds) {
            if (!transcriptIds.has(lineId)) {
              context.addIssue({
                code: "custom",
                path: ["lessons", lessonIndex, "transcript"],
                message: `Unknown transcript line “${lineId}” for item “${itemId}”`,
              });
            }
          }
      }
      const variantCounts = new Map<string, number>();
      const kinds = new Set<string>();
      lesson.quizBank.forEach((quiz, quizIndex) => {
        if (quiz.lessonId !== lesson.id) {
          context.addIssue({
            code: "custom",
            path: ["lessons", lessonIndex, "quizBank", quizIndex, "lessonId"],
            message: `Quiz item must belong to lesson “${lesson.id}”`,
          });
        }
        if (quiz.audioRef && !audioIds.has(quiz.audioRef)) {
          context.addIssue({
            code: "custom",
            path: ["lessons", lessonIndex, "quizBank", quizIndex, "audioRef"],
            message: `Unknown audio asset “${quiz.audioRef}”`,
          });
        }
        if (
          quiz.type === "dialogue-comprehension" ||
          quiz.type === "speaking-practice"
        ) {
          context.addIssue({
            code: "custom",
            path: ["lessons", lessonIndex, "quizBank", quizIndex, "type"],
            message:
              "Scored v3 quizzes cannot depend on unverified dialogue or self-assessed speech",
          });
        }
        kinds.add(quiz.quizKind);
        for (const itemId of quiz.sourceItemIds) {
          if (!cueIds.has(itemId)) {
            context.addIssue({
              code: "custom",
              path: [
                "lessons",
                lessonIndex,
                "quizBank",
                quizIndex,
                "sourceItemIds",
              ],
              message: `Quiz item references unavailable cue card “${itemId}”`,
            });
          }
          variantCounts.set(itemId, (variantCounts.get(itemId) ?? 0) + 1);
        }
      });
      for (const itemId of cueIds)
        if ((variantCounts.get(itemId) ?? 0) < 2) {
          context.addIssue({
            code: "custom",
            path: ["lessons", lessonIndex, "quizBank"],
            message: `Cue-card item “${itemId}” needs at least two scored variants`,
          });
        }
      for (const kind of QuizKindSchema.options)
        if (!kinds.has(kind)) {
          context.addIssue({
            code: "custom",
            path: ["lessons", lessonIndex, "quizBank"],
            message: `Lesson needs at least one ${kind} quiz item`,
          });
        }
      if (lesson.transcriptStatus === "verified") {
        if (lesson.media.availability !== "bundled") {
          context.addIssue({
            code: "custom",
            path: ["lessons", lessonIndex, "media", "availability"],
            message: "A verified lesson must use a bundled MP4",
          });
        }
        if (!lesson.media.captionsSrc) {
          context.addIssue({
            code: "custom",
            path: ["lessons", lessonIndex, "media", "captionsSrc"],
            message: "A verified lesson requires WebVTT captions",
          });
        }
        if (!lesson.media.posterSrc) {
          context.addIssue({
            code: "custom",
            path: ["lessons", lessonIndex, "media", "posterSrc"],
            message: "A verified lesson requires a local poster image",
          });
        }
        if (!lesson.media.durationSeconds) {
          context.addIssue({
            code: "custom",
            path: ["lessons", lessonIndex, "media", "durationSeconds"],
            message: "A verified lesson requires its confirmed duration",
          });
        }
        if (
          !lesson.transcript.length ||
          lesson.transcript.some(
            ({ sourceStatus }) => sourceStatus !== "verified",
          )
        ) {
          context.addIssue({
            code: "custom",
            path: ["lessons", lessonIndex, "transcript"],
            message: "A verified lesson requires verified transcript lines",
          });
        }
        lesson.quizBank.forEach((quiz, quizIndex) => {
          if (quiz.quizKind !== "listening") return;
          const audio = quiz.audioRef
            ? audioById.get(quiz.audioRef)
            : undefined;
          if (
            !audio ||
            audio.kind !== "bundled" ||
            !audio.src?.startsWith("/")
          ) {
            context.addIssue({
              code: "custom",
              path: ["lessons", lessonIndex, "quizBank", quizIndex, "audioRef"],
              message:
                "Verified listening questions require bundled same-origin audio",
            });
          }
        });
      }
    });
  });

export const ExerciseAnswerSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.record(z.string(), z.string()),
]);
export const StudyModeSchema = z.enum(["introduction", "mastery", "review"]);
export const SessionModeSchema = z.enum([
  "introduction",
  "mastery",
  "review",
  "replay",
]);
export const SessionStageSchema = z.enum([
  "video",
  "cue-cards",
  "retrieval-cards",
  "quiz",
  "complete",
]);
export const QuizScopeSchema = z.enum(["active", "review"]);

export const QuizQueueEntrySchema = z.object({
  id: IdSchema,
  scope: QuizScopeSchema,
  sourceLessonId: IdSchema,
  knowledgeItemIds: z.array(IdSchema).min(1),
  quizItem: QuizItemSchema,
});

export const SessionAnswerSchema = z.object({
  queueEntryId: IdSchema,
  quizItemId: IdSchema,
  scope: QuizScopeSchema,
  sourceLessonId: IdSchema,
  knowledgeItemIds: z.array(IdSchema).min(1),
  answer: ExerciseAnswerSchema,
  correct: z.boolean(),
  answeredAt: DateTimeSchema,
});

export const DailyStudySessionSchema = z
  .object({
    id: IdSchema,
    lessonId: IdSchema,
    mode: SessionModeSchema,
    stage: SessionStageSchema,
    videoCompleted: z.boolean(),
    videoSkipped: z.boolean(),
    cardItemIds: z.array(IdSchema).min(1),
    cardIndex: z.number().int().min(0),
    quizQueue: z.array(QuizQueueEntrySchema).max(13),
    quizIndex: z.number().int().min(0),
    answers: z.array(SessionAnswerSchema).max(13),
    seed: z.string().min(1),
    startedAt: DateTimeSchema,
    updatedAt: DateTimeSchema,
  })
  .superRefine((session, context) => {
    const issue = (path: Array<string | number>, message: string) =>
      context.addIssue({ code: "custom", path, message });
    const queueIds = new Set(session.quizQueue.map(({ id }) => id));
    const answerIds = new Set(
      session.answers.map(({ queueEntryId }) => queueEntryId),
    );
    const activeCount = session.quizQueue.filter(
      ({ scope }) => scope === "active",
    ).length;
    const reviewCount = session.quizQueue.length - activeCount;

    if (new Set(session.cardItemIds).size !== session.cardItemIds.length) {
      issue(["cardItemIds"], "Session cue-card IDs must be unique");
    }
    if (queueIds.size !== session.quizQueue.length) {
      issue(["quizQueue"], "Session queue entry IDs must be unique");
    }
    if (answerIds.size !== session.answers.length) {
      issue(["answers"], "A queue entry can only be answered once");
    }
    if (session.quizIndex !== session.answers.length) {
      issue(
        ["quizIndex"],
        "Quiz index must equal the number of locked answers",
      );
    }
    if (session.videoCompleted && session.videoSkipped) {
      issue(
        ["videoSkipped"],
        "A video cannot be both completed and deliberately skipped",
      );
    }

    session.answers.forEach((answer, index) => {
      const entry = session.quizQueue[index];
      if (!entry || answer.queueEntryId !== entry.id) {
        issue(
          ["answers", index, "queueEntryId"],
          "Answers must follow the fixed quiz queue in order",
        );
        return;
      }
      if (
        answer.quizItemId !== entry.quizItem.id ||
        answer.scope !== entry.scope ||
        answer.sourceLessonId !== entry.sourceLessonId ||
        answer.knowledgeItemIds.length !== entry.knowledgeItemIds.length ||
        answer.knowledgeItemIds.some(
          (itemId, itemIndex) => itemId !== entry.knowledgeItemIds[itemIndex],
        )
      ) {
        issue(
          ["answers", index],
          "Answer metadata must match its fixed queue entry",
        );
      }
    });

    if (session.mode === "replay") {
      if (session.quizQueue.length || session.answers.length) {
        issue(["quizQueue"], "Replay sessions cannot contain a scored quiz");
      }
      if (session.stage === "retrieval-cards" || session.stage === "quiz") {
        issue(["stage"], "Replay sessions only contain video and cue cards");
      }
    } else if (session.mode === "introduction") {
      if (activeCount !== session.cardItemIds.length || reviewCount) {
        issue(
          ["quizQueue"],
          "Introduction sessions require one active diagnostic per cue card",
        );
      }
      if (session.stage === "retrieval-cards") {
        issue(["stage"], "Introduction sessions use regular cue cards");
      }
    } else if (session.mode === "mastery") {
      if (activeCount !== 10 || reviewCount > 3) {
        issue(
          ["quizQueue"],
          "Mastery sessions require 10 active and at most 3 review questions",
        );
      }
      if (session.stage === "video" || session.stage === "cue-cards") {
        issue(["stage"], "Mastery sessions begin with retrieval cue cards");
      }
    } else {
      if (activeCount || reviewCount < 1 || reviewCount > 10) {
        issue(
          ["quizQueue"],
          "Standalone review requires 1–10 review questions and no active questions",
        );
      }
      if (session.stage === "video" || session.stage === "cue-cards") {
        issue(["stage"], "Standalone review begins with retrieval cue cards");
      }
    }

    if (session.stage === "video") {
      if (
        session.cardIndex !== 0 ||
        session.quizIndex !== 0 ||
        session.videoCompleted ||
        session.videoSkipped
      ) {
        issue(
          ["stage"],
          "A video-stage session must be at its untouched start",
        );
      }
    } else if (
      session.stage === "cue-cards" ||
      session.stage === "retrieval-cards"
    ) {
      if (
        session.cardIndex >= session.cardItemIds.length ||
        session.quizIndex !== 0
      ) {
        issue(
          ["cardIndex"],
          "Cue-card progress must stay within the fixed card queue",
        );
      }
      if (session.mode === "introduction" || session.mode === "replay") {
        if (!session.videoCompleted && !session.videoSkipped) {
          issue(
            ["videoCompleted"],
            "First-time and replay cue cards require a completed or skipped video",
          );
        }
      }
    } else if (session.stage === "quiz") {
      if (
        session.mode === "replay" ||
        session.cardIndex !== session.cardItemIds.length ||
        session.quizIndex >= session.quizQueue.length
      ) {
        issue(
          ["stage"],
          "Quiz stage requires completed cards and an unanswered queue entry",
        );
      }
    } else if (session.mode === "replay") {
      if (session.cardIndex !== session.cardItemIds.length) {
        issue(["cardIndex"], "A completed replay must finish every cue card");
      }
    } else if (
      session.cardIndex !== session.cardItemIds.length ||
      session.quizIndex !== session.quizQueue.length
    ) {
      issue(
        ["stage"],
        "A completed study session must finish its card and quiz queues",
      );
    }
  });

export const StudyAttemptSchema = z
  .object({
    id: IdSchema,
    sessionId: IdSchema,
    lessonId: IdSchema,
    mode: StudyModeSchema,
    startedAt: DateTimeSchema,
    completedAt: DateTimeSchema,
    activeCorrect: z.number().int().min(0),
    activeTotal: z.number().int().min(0).max(10),
    activeAccuracy: z.number().min(0).max(100),
    reviewCorrect: z.number().int().min(0),
    reviewTotal: z.number().int().min(0).max(10),
    passed: z.boolean(),
    missedItemIds: z.array(IdSchema),
  })
  .superRefine((attempt, context) => {
    const issue = (path: string, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });
    const expectedAccuracy = attempt.activeTotal
      ? Math.round((attempt.activeCorrect / attempt.activeTotal) * 100)
      : 0;
    if (attempt.activeCorrect > attempt.activeTotal) {
      issue("activeCorrect", "Correct active answers cannot exceed the total");
    }
    if (attempt.reviewCorrect > attempt.reviewTotal) {
      issue("reviewCorrect", "Correct review answers cannot exceed the total");
    }
    if (attempt.activeAccuracy !== expectedAccuracy) {
      issue("activeAccuracy", "Active accuracy must match the scored answers");
    }
    if (new Set(attempt.missedItemIds).size !== attempt.missedItemIds.length) {
      issue("missedItemIds", "Missed cue-card IDs must be unique");
    }
    if (attempt.mode === "introduction") {
      if (
        attempt.activeTotal < 1 ||
        attempt.reviewTotal !== 0 ||
        !attempt.passed
      ) {
        issue(
          "mode",
          "Introduction attempts are completion-based active diagnostics",
        );
      }
    } else if (attempt.mode === "mastery") {
      if (
        attempt.activeTotal !== 10 ||
        attempt.reviewTotal > 3 ||
        attempt.passed !== attempt.activeAccuracy >= 90
      ) {
        issue(
          "mode",
          "Mastery attempts require 10 active answers and the 90% gate",
        );
      }
    } else if (
      attempt.activeTotal !== 0 ||
      attempt.activeAccuracy !== 0 ||
      attempt.reviewTotal < 1 ||
      !attempt.passed
    ) {
      issue(
        "mode",
        "Standalone review attempts contain only completion-based review answers",
      );
    }
  });

export const LessonProgressSchema = z
  .object({
    lessonId: IdSchema,
    status: z.enum(["unseen", "introduced", "awaiting-mastery", "mastered"]),
    introducedOn: DateKeySchema.optional(),
    nextEligibleMasteryDate: DateKeySchema.optional(),
    masteredOn: DateKeySchema.optional(),
    bestDelayedAccuracy: z.number().min(0).max(100),
    attemptHistory: z.array(StudyAttemptSchema),
  })
  .superRefine((progress, context) => {
    const issue = (path: string, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });
    if (
      progress.attemptHistory.some(
        (attempt) =>
          attempt.lessonId !== progress.lessonId || attempt.mode === "review",
      )
    ) {
      issue(
        "attemptHistory",
        "Lesson history can only contain this lesson's introduction and mastery attempts",
      );
    }
    if (progress.status === "unseen") {
      if (
        progress.introducedOn ||
        progress.nextEligibleMasteryDate ||
        progress.masteredOn ||
        progress.bestDelayedAccuracy !== 0 ||
        progress.attemptHistory.length
      ) {
        issue("status", "An unseen lesson cannot contain learning history");
      }
    } else if (progress.status === "introduced") {
      if (progress.nextEligibleMasteryDate || progress.masteredOn) {
        issue("status", "An in-progress introduction is not mastery-eligible");
      }
    } else if (progress.status === "awaiting-mastery") {
      if (
        !progress.introducedOn ||
        !progress.nextEligibleMasteryDate ||
        progress.masteredOn ||
        progress.bestDelayedAccuracy >= 90
      ) {
        issue(
          "status",
          "Awaiting mastery requires a completed introduction and eligible date",
        );
      }
    } else if (
      !progress.introducedOn ||
      !progress.masteredOn ||
      progress.nextEligibleMasteryDate ||
      progress.bestDelayedAccuracy < 90 ||
      !progress.attemptHistory.some(
        (attempt) => attempt.mode === "mastery" && attempt.passed,
      )
    ) {
      issue(
        "status",
        "Mastery requires a passing delayed attempt and mastery date",
      );
    }
  });

export const ItemReviewStateSchema = z
  .object({
    itemId: IdSchema,
    lessonId: IdSchema,
    dueDate: DateKeySchema,
    intervalDays: z.number().int().min(1).max(365),
    nextIntervalIndex: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
    ]),
    successfulReviews: z.number().int().min(0),
    totalReviews: z.number().int().min(0),
    lapses: z.number().int().min(0),
    lastReviewedOn: DateKeySchema.optional(),
    lastOutcome: z.enum(["correct", "incorrect"]).optional(),
  })
  .superRefine((review, context) => {
    if (review.totalReviews !== review.successfulReviews + review.lapses) {
      context.addIssue({
        code: "custom",
        path: ["totalReviews"],
        message: "Review totals must equal successes plus lapses",
      });
    }
    if (
      Boolean(review.lastReviewedOn) !== Boolean(review.lastOutcome) ||
      Boolean(review.lastReviewedOn) !== review.totalReviews > 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["lastReviewedOn"],
        message: "Review timestamps and outcomes must accompany review history",
      });
    }
  });

export const StreakStateSchema = z
  .object({
    current: z.number().int().min(0),
    longest: z.number().int().min(0),
    lastStudyDate: DateKeySchema.nullable(),
  })
  .superRefine((streak, context) => {
    if (streak.longest < streak.current) {
      context.addIssue({
        code: "custom",
        path: ["longest"],
        message: "Longest streak cannot be shorter than the current streak",
      });
    }
    if ((streak.current === 0) !== (streak.lastStudyDate === null)) {
      context.addIssue({
        code: "custom",
        path: ["lastStudyDate"],
        message: "A zero streak must not have a last study date",
      });
    }
  });

export const SettingsSchema = z.object({
  audioEnabled: z.boolean(),
  volume: z.number().min(0).max(1),
  romanization: z.enum(["always", "learning", "never"]),
  showThaiScript: z.boolean(),
  reducedMotion: z.boolean(),
  darkMode: z.boolean(),
  politeParticle: z.enum(["khrap", "kha"]),
});

export const PersistedAppDataV3Schema = z
  .object({
    version: z.literal(3),
    settings: SettingsSchema,
    streak: StreakStateSchema,
    lessonProgress: z.record(IdSchema, LessonProgressSchema),
    itemReviewStates: z.record(IdSchema, ItemReviewStateSchema),
    attempts: z.array(StudyAttemptSchema),
    activeSession: DailyStudySessionSchema.nullable(),
    redesignNoticeSeen: z.boolean(),
  })
  .superRefine((data, context) => {
    for (const [lessonId, progress] of Object.entries(data.lessonProgress)) {
      if (lessonId !== progress.lessonId) {
        context.addIssue({
          code: "custom",
          path: ["lessonProgress", lessonId, "lessonId"],
          message: "Lesson-progress record key must match its lesson ID",
        });
      }
    }
    for (const [itemId, review] of Object.entries(data.itemReviewStates)) {
      if (itemId !== review.itemId) {
        context.addIssue({
          code: "custom",
          path: ["itemReviewStates", itemId, "itemId"],
          message: "Review-state record key must match its item ID",
        });
      }
    }
    if (data.activeSession?.mode === "replay") {
      context.addIssue({
        code: "custom",
        path: ["activeSession", "mode"],
        message: "Replay sessions are disposable and must not be persisted",
      });
    }
  });

export const PersistedAppDataSchema = PersistedAppDataV3Schema;
export type CurriculumInput = z.input<typeof CurriculumSchema>;
export type PersistedAppDataV3Input = z.input<typeof PersistedAppDataV3Schema>;
export type PersistedAppDataInput = PersistedAppDataV3Input;
