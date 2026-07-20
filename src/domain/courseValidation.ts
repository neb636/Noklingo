import { CourseSchema } from "@/src/domain/schemas";
import type { Course, Exercise, Lesson } from "@/src/domain/types";

export type AuthoringIssue = {
  severity: "error" | "warning";
  path: string;
  message: string;
};

export class CourseAuthoringError extends Error {
  readonly issues: AuthoringIssue[];

  constructor(issues: AuthoringIssue[]) {
    super(
      `Course validation failed with ${issues.length} issue${issues.length === 1 ? "" : "s"}:\n${issues
        .map((issue) => `- ${issue.path}: ${issue.message}`)
        .join("\n")}`,
    );
    this.name = "CourseAuthoringError";
    this.issues = issues;
  }
}

const duplicateIssues = <T extends { id: string }>(
  collection: string,
  values: T[],
) => {
  const seen = new Map<string, number>();
  const issues: AuthoringIssue[] = [];
  values.forEach((value, index) => {
    const previous = seen.get(value.id);
    if (previous !== undefined) {
      issues.push({
        severity: "error",
        path: `${collection}[${index}].id`,
        message: `Duplicate ID “${value.id}” (first used at ${collection}[${previous}])`,
      });
    } else {
      seen.set(value.id, index);
    }
  });
  return issues;
};

const hasDuplicate = (values: string[]) =>
  new Set(values).size !== values.length;

const compositionFamily = (exercise: Exercise) => {
  if (exercise.type.startsWith("listen-")) return "listening";
  if (
    [
      "conversation-response",
      "dialogue-comprehension",
      "personalized-translation",
    ].includes(exercise.type)
  )
    return "conversation";
  if (exercise.type === "speaking-practice") return "speaking";
  if (exercise.type === "matching-pairs") return "matching";
  return "recall";
};

const validateLessonComposition = (lesson: Lesson): AuthoringIssue[] => {
  const issues: AuthoringIssue[] = [];
  const base = `lessons.${lesson.id}`;
  const types = new Set(lesson.exercises.map((exercise) => exercise.type));
  const families = new Set(lesson.exercises.map(compositionFamily));
  const listening = lesson.exercises.some((exercise) =>
    exercise.type.startsWith("listen-"),
  );
  const conversational = lesson.exercises.some((exercise) =>
    [
      "conversation-response",
      "dialogue-comprehension",
      "personalized-translation",
    ].includes(exercise.type),
  );
  const finalExercise = lesson.exercises.at(-1);
  const hardEnding =
    finalExercise &&
    [
      "phrase-order",
      "conversation-response",
      "dialogue-comprehension",
      "speaking-practice",
      "personalized-translation",
      "mistake-correction",
    ].includes(finalExercise.type) &&
    finalExercise.difficulty >= 3;

  if (!listening) {
    issues.push({
      severity: "error",
      path: `${base}.exercises`,
      message: "A lesson needs at least one listening exercise",
    });
  }
  if (!conversational) {
    issues.push({
      severity: "error",
      path: `${base}.exercises`,
      message: "A lesson needs at least one conversation or dialogue exercise",
    });
  }
  if (families.size < 3 || types.size < 4) {
    issues.push({
      severity: "error",
      path: `${base}.exercises`,
      message: "Use at least three modalities and four exercise types",
    });
  }
  if (!hardEnding) {
    issues.push({
      severity: "error",
      path: `${base}.exercises[${lesson.exercises.length - 1}]`,
      message: "End with a difficulty 3+ retrieval, speaking, or dialogue task",
    });
  }
  const signatures = lesson.exercises.map((exercise) =>
    JSON.stringify([
      exercise.prompt.trim().toLocaleLowerCase(),
      exercise.correctAnswer,
    ]),
  );
  if (hasDuplicate(signatures)) {
    issues.push({
      severity: "error",
      path: `${base}.exercises`,
      message: "Exact prompt/answer repetition is not meaningful variation",
    });
  }
  const estimatedSeconds = lesson.exercises.reduce(
    (sum, exercise) => sum + exercise.estimatedSeconds,
    0,
  );
  if (estimatedSeconds < 180 || estimatedSeconds > 420) {
    issues.push({
      severity: "warning",
      path: `${base}.estimatedMinutes`,
      message: `Exercise timings total ${Math.round(estimatedSeconds / 60)} minutes; target 3–7`,
    });
  }
  return issues;
};

export function validateCourseAuthoring(course: Course): AuthoringIssue[] {
  const issues: AuthoringIssue[] = [];
  const collections = [
    ["sections", course.sections],
    ["units", course.units],
    ["skills", course.skills],
    ["lessons", course.lessons],
    ["vocabulary", course.vocabulary],
    ["phrases", course.phrases],
    ["dialogues", course.dialogues],
    ["speakers", course.speakers],
    ["audioAssets", course.audioAssets],
    ["hints", course.hints],
    ["grammarNotes", course.grammarNotes],
    ["culturalNotes", course.culturalNotes],
    ["checkpoints", course.checkpoints],
    ["achievements", course.achievements],
  ] as const;
  for (const [name, values] of collections) {
    issues.push(
      ...duplicateIssues(name, values as unknown as Array<{ id: string }>),
    );
  }
  const globallySeen = new Map<string, string>();
  for (const [name, values] of collections) {
    (values as unknown as Array<{ id: string }>).forEach((value, index) => {
      const path = `${name}[${index}].id`;
      const previous = globallySeen.get(value.id);
      if (previous && !previous.startsWith(`${name}[`)) {
        issues.push({
          severity: "error",
          path,
          message: `ID “${value.id}” is already used at ${previous}; IDs are global`,
        });
      } else if (!previous) {
        globallySeen.set(value.id, path);
      }
    });
  }

  const unitIds = new Set(course.units.map(({ id }) => id));
  const sectionIds = new Set(course.sections.map(({ id }) => id));
  const skillIds = new Set(course.skills.map(({ id }) => id));
  const lessonIds = new Set(course.lessons.map(({ id }) => id));
  const itemIds = new Set([
    ...course.vocabulary.map(({ id }) => id),
    ...course.phrases.map(({ id }) => id),
  ]);
  const vocabularyIds = new Set(course.vocabulary.map(({ id }) => id));
  const phraseIds = new Set(course.phrases.map(({ id }) => id));
  const speakerIds = new Set(course.speakers.map(({ id }) => id));
  const speakerById = new Map(
    course.speakers.map((speaker) => [speaker.id, speaker]),
  );
  const audioIds = new Set(course.audioAssets.map(({ id }) => id));
  const audioById = new Map(
    course.audioAssets.map((asset) => [asset.id, asset]),
  );
  const hintIds = new Set(course.hints.map(({ id }) => id));
  const grammarNoteIds = new Set(course.grammarNotes.map(({ id }) => id));
  const culturalNoteIds = new Set(course.culturalNotes.map(({ id }) => id));
  const dialogueIds = new Set(course.dialogues.map(({ id }) => id));
  const checkpointIds = new Set(course.checkpoints.map(({ id }) => id));
  const checkpointsById = new Map(
    course.checkpoints.map((checkpoint) => [checkpoint.id, checkpoint]),
  );
  const lessonsById = new Map(
    course.lessons.map((lesson) => [lesson.id, lesson]),
  );
  const unitOrder = new Map(
    course.units.map((unit, index) => [unit.id, index]),
  );

  const requireRef = (
    exists: boolean,
    path: string,
    kind: string,
    id: string,
  ) => {
    if (!exists)
      issues.push({
        severity: "error",
        path,
        message: `Unknown ${kind} reference “${id}”`,
      });
  };

  course.sections.forEach((section, sectionIndex) => {
    section.unitIds.forEach((id, index) =>
      requireRef(
        unitIds.has(id),
        `sections[${sectionIndex}].unitIds[${index}]`,
        "unit",
        id,
      ),
    );
  });

  course.units.forEach((unit, unitIndex) => {
    const owners = course.sections.filter((section) =>
      section.unitIds.includes(unit.id),
    );
    if (owners.length !== 1) {
      issues.push({
        severity: "error",
        path: `units[${unitIndex}].id`,
        message: `Unit “${unit.id}” must appear in exactly one section (found ${owners.length})`,
      });
    } else if (owners[0].id !== unit.sectionId) {
      issues.push({
        severity: "error",
        path: `units[${unitIndex}].sectionId`,
        message: `Unit declares “${unit.sectionId}” but is listed by “${owners[0].id}”`,
      });
    }
  });

  const orderedLessonIds = course.units.flatMap((unit) =>
    unit.nodes.flatMap((node) => (node.lessonId ? [node.lessonId] : [])),
  );
  const lessonOrder = new Map(
    orderedLessonIds.map((lessonId, index) => [lessonId, index]),
  );
  const lessonNodeOwners = new Map<
    string,
    Array<{ unitId: string; type: string }>
  >();
  course.units.forEach((unit, unitIndex) => {
    requireRef(
      sectionIds.has(unit.sectionId),
      `units[${unitIndex}].sectionId`,
      "section",
      unit.sectionId,
    );
    unit.skillIds.forEach((id, index) =>
      requireRef(
        skillIds.has(id),
        `units[${unitIndex}].skillIds[${index}]`,
        "skill",
        id,
      ),
    );
    unit.prerequisiteCheckpointIds.forEach((id, index) => {
      const path = `units[${unitIndex}].prerequisiteCheckpointIds[${index}]`;
      requireRef(checkpointIds.has(id), path, "checkpoint", id);
      const checkpointLesson = lessonsById.get(
        checkpointsById.get(id)?.lessonId ?? "",
      );
      const prerequisiteUnitOrder = checkpointLesson
        ? unitOrder.get(checkpointLesson.unitId)
        : undefined;
      if (
        prerequisiteUnitOrder !== undefined &&
        prerequisiteUnitOrder >= unitIndex
      ) {
        issues.push({
          severity: "error",
          path,
          message: `Checkpoint “${id}” must appear in an earlier unit or progression is impossible`,
        });
      }
    });
    unit.nodes.forEach((node, nodeIndex) => {
      const nodePath = `units[${unitIndex}].nodes[${nodeIndex}].id`;
      const previousNode = globallySeen.get(node.id);
      if (previousNode) {
        issues.push({
          severity: "error",
          path: nodePath,
          message: `ID “${node.id}” is already used at ${previousNode}; IDs are global`,
        });
      } else globallySeen.set(node.id, nodePath);
      if (node.type !== "review" && !node.lessonId) {
        issues.push({
          severity: "error",
          path: `units[${unitIndex}].nodes[${nodeIndex}].lessonId`,
          message: `${node.type} nodes need a lesson reference`,
        });
      }
      if (node.lessonId)
        requireRef(
          lessonIds.has(node.lessonId),
          `units[${unitIndex}].nodes[${nodeIndex}].lessonId`,
          "lesson",
          node.lessonId,
        );
      if (node.lessonId) {
        const owners = lessonNodeOwners.get(node.lessonId) ?? [];
        owners.push({ unitId: unit.id, type: node.type });
        lessonNodeOwners.set(node.lessonId, owners);
      }
    });
  });

  course.lessons.forEach((lesson, lessonIndex) => {
    const owners = lessonNodeOwners.get(lesson.id) ?? [];
    if (owners.length !== 1) {
      issues.push({
        severity: "error",
        path: `lessons[${lessonIndex}].id`,
        message: `Lesson “${lesson.id}” must appear in exactly one path node (found ${owners.length})`,
      });
      return;
    }
    if (owners[0].unitId !== lesson.unitId) {
      issues.push({
        severity: "error",
        path: `lessons[${lessonIndex}].unitId`,
        message: `Lesson belongs to “${lesson.unitId}” but its path node is in “${owners[0].unitId}”`,
      });
    }
    if (owners[0].type !== lesson.kind) {
      issues.push({
        severity: "error",
        path: `lessons[${lessonIndex}].kind`,
        message: `Lesson kind “${lesson.kind}” does not match path node type “${owners[0].type}”`,
      });
    }
  });

  course.skills.forEach((skill, skillIndex) => {
    skill.itemIds.forEach((id, index) =>
      requireRef(
        itemIds.has(id),
        `skills[${skillIndex}].itemIds[${index}]`,
        "learning item",
        id,
      ),
    );
  });

  const exerciseIds = new Map<string, string>();
  const introducedAt = new Map<string, { lessonId: string; order: number }>();
  for (const lesson of course.lessons) {
    const order = lessonOrder.get(lesson.id);
    if (order === undefined) continue;
    for (const itemId of lesson.introducedItemIds) {
      const previous = introducedAt.get(itemId);
      if (previous) {
        issues.push({
          severity: "error",
          path: `lessons.${lesson.id}.introducedItemIds`,
          message: `Learning item “${itemId}” was already introduced by “${previous.lessonId}”`,
        });
      } else introducedAt.set(itemId, { lessonId: lesson.id, order });
    }
  }
  course.lessons.forEach((lesson, lessonIndex) => {
    requireRef(
      unitIds.has(lesson.unitId),
      `lessons[${lessonIndex}].unitId`,
      "unit",
      lesson.unitId,
    );
    lesson.skillIds.forEach((id, index) =>
      requireRef(
        skillIds.has(id),
        `lessons[${lessonIndex}].skillIds[${index}]`,
        "skill",
        id,
      ),
    );
    lesson.introducedItemIds.forEach((id, index) =>
      requireRef(
        itemIds.has(id),
        `lessons[${lessonIndex}].introducedItemIds[${index}]`,
        "learning item",
        id,
      ),
    );
    lesson.prerequisiteLessonIds.forEach((id, index) => {
      requireRef(
        lessonIds.has(id),
        `lessons[${lessonIndex}].prerequisiteLessonIds[${index}]`,
        "lesson",
        id,
      );
      const prereqOrder = lessonOrder.get(id);
      const currentOrder = lessonOrder.get(lesson.id);
      if (
        prereqOrder !== undefined &&
        currentOrder !== undefined &&
        prereqOrder >= currentOrder
      ) {
        issues.push({
          severity: "error",
          path: `lessons[${lessonIndex}].prerequisiteLessonIds[${index}]`,
          message: `Prerequisite “${id}” must appear earlier in the path`,
        });
      }
    });
    lesson.exercises.forEach((exercise, exerciseIndex) => {
      const exercisePath = `lessons[${lessonIndex}].exercises[${exerciseIndex}]`;
      const previous = exerciseIds.get(exercise.id);
      if (previous) {
        issues.push({
          severity: "error",
          path: `${exercisePath}.id`,
          message: `Duplicate exercise ID “${exercise.id}” (first used at ${previous})`,
        });
      } else exerciseIds.set(exercise.id, exercisePath);
      const globalPrevious = globallySeen.get(exercise.id);
      if (globalPrevious) {
        issues.push({
          severity: "error",
          path: `${exercisePath}.id`,
          message: `ID “${exercise.id}” is already used at ${globalPrevious}; IDs are global`,
        });
      } else globallySeen.set(exercise.id, `${exercisePath}.id`);

      exercise.sourceItemIds.forEach((id, index) =>
        requireRef(
          itemIds.has(id),
          `${exercisePath}.sourceItemIds[${index}]`,
          "learning item",
          id,
        ),
      );
      const currentOrder = lessonOrder.get(lesson.id);
      exercise.sourceItemIds.forEach((id, index) => {
        const introduction = introducedAt.get(id);
        if (
          currentOrder !== undefined &&
          (!introduction || introduction.order > currentOrder)
        ) {
          issues.push({
            severity: "error",
            path: `${exercisePath}.sourceItemIds[${index}]`,
            message: `Tested item “${id}” must be introduced in this lesson or an earlier path lesson`,
          });
        }
      });
      exercise.hintIds.forEach((id, index) =>
        requireRef(
          hintIds.has(id),
          `${exercisePath}.hintIds[${index}]`,
          "hint",
          id,
        ),
      );
      if (exercise.audioRef)
        requireRef(
          audioIds.has(exercise.audioRef),
          `${exercisePath}.audioRef`,
          "audio",
          exercise.audioRef,
        );
      if (exercise.dialogueId)
        requireRef(
          dialogueIds.has(exercise.dialogueId),
          `${exercisePath}.dialogueId`,
          "dialogue",
          exercise.dialogueId,
        );
      if (exercise.speakerId)
        requireRef(
          speakerIds.has(exercise.speakerId),
          `${exercisePath}.speakerId`,
          "speaker",
          exercise.speakerId,
        );
      if (exercise.choices) {
        const ids = exercise.choices.map(({ id }) => id);
        const labels = exercise.choices.map(({ label }) =>
          label.trim().toLocaleLowerCase(),
        );
        if (hasDuplicate(ids) || hasDuplicate(labels)) {
          issues.push({
            severity: "error",
            path: `${exercisePath}.choices`,
            message: "Answer choices must have unique IDs and labels",
          });
        }
      }
      if (exercise.pairs) {
        if (
          hasDuplicate(exercise.pairs.map(({ left }) => left)) ||
          hasDuplicate(exercise.pairs.map(({ right }) => right))
        ) {
          issues.push({
            severity: "error",
            path: `${exercisePath}.pairs`,
            message: "Matching columns must be one-to-one",
          });
        }
      }
      if (hasDuplicate(exercise.acceptedAnswers)) {
        issues.push({
          severity: "error",
          path: `${exercisePath}.acceptedAnswers`,
          message: "Accepted answers must be unique",
        });
      }
    });
    issues.push(...validateLessonComposition(lesson));
  });

  course.audioAssets.forEach((asset, index) => {
    requireRef(
      speakerIds.has(asset.speakerId),
      `audioAssets[${index}].speakerId`,
      "speaker",
      asset.speakerId,
    );
    const speaker = speakerById.get(asset.speakerId);
    if (
      speaker?.defaultPoliteParticle === "kha" &&
      asset.transcriptThai.endsWith("ครับ")
    ) {
      issues.push({
        severity: "error",
        path: `audioAssets[${index}].transcriptThai`,
        message: `Speaker “${speaker.id}” normally uses kha but this recording ends in khrap`,
      });
    }
    if (
      speaker?.defaultPoliteParticle === "khrap" &&
      /(?:ค่ะ|คะ)$/u.test(asset.transcriptThai)
    ) {
      issues.push({
        severity: "error",
        path: `audioAssets[${index}].transcriptThai`,
        message: `Speaker “${speaker.id}” normally uses khrap but this recording ends in kha`,
      });
    }
  });
  course.phrases.forEach((phrase, phraseIndex) => {
    if (phrase.audioRef) {
      requireRef(
        audioIds.has(phrase.audioRef),
        `phrases[${phraseIndex}].audioRef`,
        "audio",
        phrase.audioRef,
      );
      const asset = audioById.get(phrase.audioRef);
      if (asset && asset.transcriptThai !== phrase.thai) {
        issues.push({
          severity: "error",
          path: `phrases[${phraseIndex}].audioRef`,
          message: `Audio transcript for “${phrase.audioRef}” does not match the phrase Thai source`,
        });
      }
    }
    phrase.vocabularyIds.forEach((id, index) =>
      requireRef(
        vocabularyIds.has(id),
        `phrases[${phraseIndex}].vocabularyIds[${index}]`,
        "vocabulary",
        id,
      ),
    );
    phrase.grammarNoteIds.forEach((id, index) =>
      requireRef(
        grammarNoteIds.has(id),
        `phrases[${phraseIndex}].grammarNoteIds[${index}]`,
        "grammar note",
        id,
      ),
    );
    phrase.culturalNoteIds.forEach((id, index) =>
      requireRef(
        culturalNoteIds.has(id),
        `phrases[${phraseIndex}].culturalNoteIds[${index}]`,
        "cultural note",
        id,
      ),
    );
  });
  course.vocabulary.forEach((item, index) => {
    if (item.audioRef) {
      requireRef(
        audioIds.has(item.audioRef),
        `vocabulary[${index}].audioRef`,
        "audio",
        item.audioRef,
      );
      const asset = audioById.get(item.audioRef);
      if (asset && asset.transcriptThai !== item.thai) {
        issues.push({
          severity: "error",
          path: `vocabulary[${index}].audioRef`,
          message: `Audio transcript for “${item.audioRef}” does not match the vocabulary Thai source`,
        });
      }
    }
  });
  course.dialogues.forEach((dialogue, dialogueIndex) => {
    const questionIds = dialogue.comprehensionQuestions.map(({ id }) => id);
    if (hasDuplicate(questionIds)) {
      issues.push({
        severity: "error",
        path: `dialogues[${dialogueIndex}].comprehensionQuestions`,
        message: "Dialogue comprehension question IDs must be unique",
      });
    }
    dialogue.turns.forEach((turn, turnIndex) => {
      const path = `dialogues[${dialogueIndex}].turns[${turnIndex}]`;
      requireRef(
        speakerIds.has(turn.speakerId),
        `${path}.speakerId`,
        "speaker",
        turn.speakerId,
      );
      if (turn.phraseId)
        requireRef(
          phraseIds.has(turn.phraseId),
          `${path}.phraseId`,
          "phrase",
          turn.phraseId,
        );
      if (turn.phraseId) {
        const referencedPhrase = course.phrases.find(
          ({ id }) => id === turn.phraseId,
        );
        if (
          referencedPhrase &&
          (referencedPhrase.thai !== turn.thai ||
            referencedPhrase.romanization !== turn.romanization ||
            referencedPhrase.meaning !== turn.meaning)
        ) {
          issues.push({
            severity: "error",
            path: `${path}.phraseId`,
            message: `Dialogue turn content must match referenced phrase “${turn.phraseId}”`,
          });
        }
      }
      if (turn.audioRef)
        requireRef(
          audioIds.has(turn.audioRef),
          `${path}.audioRef`,
          "audio",
          turn.audioRef,
        );
      const turnAsset = turn.audioRef
        ? audioById.get(turn.audioRef)
        : undefined;
      if (turnAsset && turnAsset.speakerId !== turn.speakerId) {
        issues.push({
          severity: "error",
          path: `${path}.audioRef`,
          message: `Dialogue audio speaker “${turnAsset.speakerId}” does not match turn speaker “${turn.speakerId}”`,
        });
      }
      if (turnAsset && turnAsset.transcriptThai !== turn.thai) {
        issues.push({
          severity: "error",
          path: `${path}.audioRef`,
          message: `Audio transcript for “${turn.audioRef}” does not match the dialogue turn`,
        });
      }
    });
  });
  course.checkpoints.forEach((checkpoint, index) => {
    requireRef(
      lessonIds.has(checkpoint.lessonId),
      `checkpoints[${index}].lessonId`,
      "lesson",
      checkpoint.lessonId,
    );
    const checkpointLesson = lessonsById.get(checkpoint.lessonId);
    if (checkpointLesson && checkpointLesson.kind !== "checkpoint") {
      issues.push({
        severity: "error",
        path: `checkpoints[${index}].lessonId`,
        message: `Checkpoint lesson “${checkpoint.lessonId}” must have kind “checkpoint”`,
      });
    }
    if (checkpoint.passingAccuracy !== 80) {
      issues.push({
        severity: "error",
        path: `checkpoints[${index}].passingAccuracy`,
        message:
          "Course checkpoints must use the documented 80% pass threshold",
      });
    }
    checkpoint.unlocksUnitIds.forEach((id, unlockIndex) => {
      const path = `checkpoints[${index}].unlocksUnitIds[${unlockIndex}]`;
      requireRef(unitIds.has(id), path, "unit", id);
      const checkpointLesson = lessonsById.get(checkpoint.lessonId);
      const sourceOrder = checkpointLesson
        ? unitOrder.get(checkpointLesson.unitId)
        : undefined;
      const targetOrder = unitOrder.get(id);
      if (
        sourceOrder !== undefined &&
        targetOrder !== undefined &&
        targetOrder <= sourceOrder
      ) {
        issues.push({
          severity: "error",
          path,
          message: `Checkpoint “${checkpoint.id}” must unlock a later unit`,
        });
      }
    });
  });

  course.skills.forEach((skill, skillIndex) => {
    skill.itemIds.forEach((itemId, itemIndex) => {
      if (!introducedAt.has(itemId)) {
        issues.push({
          severity: "error",
          path: `skills[${skillIndex}].itemIds[${itemIndex}]`,
          message: `Reviewable skill item “${itemId}” is never introduced by a path lesson`,
        });
      }
    });
  });

  return issues;
}

export function parseCourse(input: unknown): Course {
  const parsed = CourseSchema.safeParse(input);
  if (!parsed.success) {
    const issues: AuthoringIssue[] = parsed.error.issues.map((issue) => ({
      severity: "error",
      path: issue.path.length ? issue.path.join(".") : "course",
      message: issue.message,
    }));
    throw new CourseAuthoringError(issues);
  }
  const semanticIssues = validateCourseAuthoring(parsed.data);
  const errors = semanticIssues.filter((issue) => issue.severity === "error");
  if (errors.length) throw new CourseAuthoringError(errors);
  return parsed.data;
}
