import Dexie, { type EntityTable } from "dexie";
import { exercisesById } from "@/src/content/course";
import { PersistedAppDataSchema } from "@/src/domain/schemas";
import type { PersistedAppData, Progress } from "@/src/domain/types";
import { defaultProgress, localDateKey } from "@/src/engine/progression";

type AppRecord = {
  id: "app";
  data: unknown;
  updatedAt: string;
};

class NoklingoDatabase extends Dexie {
  app!: EntityTable<AppRecord, "id">;

  constructor() {
    super("noklingo");
    this.version(1).stores({ app: "&id, updatedAt" });
    this.version(2).stores({ app: "&id, updatedAt" });
  }
}

export const db = new NoklingoDatabase();

type LegacyData = {
  version?: number;
  profile?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  progress?: Record<string, unknown>;
};

const numberValue = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const stringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

export function migratePersistedAppData(input: unknown): PersistedAppData {
  const current = PersistedAppDataSchema.safeParse(input);
  if (current.success) return current.data;

  const legacy = (
    input && typeof input === "object" ? input : {}
  ) as LegacyData;
  if (legacy.version !== 1) {
    throw new Error("That file is not a valid Noklingo progress export.");
  }
  const oldProgress = legacy.progress ?? {};
  const today = localDateKey();
  const completedLessonIds = stringArray(oldProgress.completedLessonIds);
  const mistakeExerciseIds = stringArray(oldProgress.mistakeExerciseIds);
  const base = defaultProgress();
  const progress: Progress = {
    ...base,
    totalXp: numberValue(oldProgress.totalXp),
    todayXp:
      oldProgress.todayDate === today ? numberValue(oldProgress.todayXp) : 0,
    todayDate: today,
    currentStreak: numberValue(oldProgress.currentStreak),
    longestStreak: numberValue(oldProgress.longestStreak),
    lastPracticeDate:
      typeof oldProgress.lastPracticeDate === "string"
        ? oldProgress.lastPracticeDate
        : null,
    completedLessonIds,
    lessonAttempts:
      oldProgress.lessonAttempts &&
      typeof oldProgress.lessonAttempts === "object"
        ? (oldProgress.lessonAttempts as Record<string, number>)
        : {},
    lessonStates: Object.fromEntries(
      completedLessonIds.map((lessonId) => [
        lessonId,
        {
          lessonId,
          status: "completed" as const,
          attempts: 1,
          bestAccuracy: 0,
        },
      ]),
    ),
    activities: Array.isArray(oldProgress.activities)
      ? oldProgress.activities.flatMap((activity, index) => {
          if (!activity || typeof activity !== "object") return [];
          const value = activity as Record<string, unknown>;
          if (
            typeof value.lessonId !== "string" ||
            typeof value.title !== "string" ||
            typeof value.completedAt !== "string"
          )
            return [];
          return [
            {
              id: `activity.migrated-${index}`,
              lessonId: value.lessonId,
              title: value.title,
              xp: numberValue(value.xp),
              accuracy: numberValue(value.accuracy),
              completedAt: value.completedAt,
              mode: "lesson" as const,
              passed: true,
            },
          ];
        })
      : [],
    mistakes: mistakeExerciseIds.flatMap((exerciseId, index) => {
      const exercise = exercisesById[exerciseId];
      if (!exercise) return [];
      const at = new Date().toISOString();
      return [
        {
          id: `mistake.migrated-${index}`,
          lessonId: "lesson.first-hellos",
          exerciseId,
          sourceItemIds: exercise.sourceItemIds,
          firstSeenAt: at,
          lastSeenAt: at,
          timesWrong: 1,
          successfulCorrections: 0,
          resolved: false,
        },
      ];
    }),
  };

  return PersistedAppDataSchema.parse({
    version: 2,
    profile: {
      name:
        typeof legacy.profile?.name === "string"
          ? legacy.profile.name
          : "Learner",
      onboarded: legacy.profile?.onboarded === true,
      dailyGoal: numberValue(legacy.profile?.dailyGoal, 20),
      motivation:
        typeof legacy.profile?.motivation === "string"
          ? legacy.profile.motivation
          : "Talk with family",
      familiarity: ["new", "some", "comfortable"].includes(
        String(legacy.profile?.familiarity),
      )
        ? legacy.profile?.familiarity
        : "new",
      politeParticle: "khrap",
    },
    settings: {
      audioEnabled: legacy.settings?.audioEnabled !== false,
      volume: numberValue(legacy.settings?.volume, 0.8),
      romanization:
        legacy.settings?.romanization === "always" ? "always" : "learning",
      showThaiScript: false,
      reducedMotion: legacy.settings?.reducedMotion === true,
      darkMode: legacy.settings?.darkMode === true,
    },
    progress,
    // Version 1 did not persist a self-contained queue, so resuming it after a
    // curriculum upgrade would be unsafe. Version 2 sessions resume exactly.
    activeSession: null,
  });
}

export const loadAppData = async () => {
  const value = (await db.app.get("app"))?.data;
  if (!value) return null;
  return migratePersistedAppData(value);
};

let saveChain: Promise<void> = Promise.resolve();

export const saveAppData = async (data: PersistedAppData) => {
  const validated = PersistedAppDataSchema.parse(data);
  saveChain = saveChain
    .catch(() => undefined)
    .then(() =>
      db.app.put({
        id: "app",
        data: validated,
        updatedAt: new Date().toISOString(),
      }),
    )
    .then(() => undefined);
  await saveChain;
};

export const clearAppData = async () => {
  await db.delete();
  await db.open();
};

export const exportAppData = async () => {
  const data = await loadAppData();
  return JSON.stringify(data, null, 2);
};

export const importAppData = async (raw: string) => {
  const parsed = migratePersistedAppData(JSON.parse(raw));
  await saveAppData(parsed);
  return parsed;
};
