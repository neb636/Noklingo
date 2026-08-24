// Vinext's development module runner mis-evaluates Dexie's CJS compatibility
// wrapper. The package's native ESM build avoids that wrapper; types still come
// from the public package entry.
import Dexie from "dexie/dist/dexie.mjs";
import type { EntityTable } from "dexie";
import {
  AppSnapshotSchema,
  type AppSnapshot,
  type DailyStudySession,
  type ItemReviewState,
  type LessonProgress,
  type Settings,
  type StreakState,
  type StudyAttempt,
} from "@/domain/schemas";

type SettingsRow = Settings & { id: "settings" };
type StreakRow = StreakState & { id: "streak" };

class ThaiStudyDatabase extends Dexie {
  lessonProgress!: EntityTable<LessonProgress, "lessonId">;
  reviewStates!: EntityTable<ItemReviewState, "itemId">;
  attempts!: EntityTable<StudyAttempt, "id">;
  sessions!: EntityTable<DailyStudySession, "id">;
  settings!: EntityTable<SettingsRow, "id">;
  streak!: EntityTable<StreakRow, "id">;

  constructor() {
    super("thai-study-local");
    this.version(1).stores({
      lessonProgress: "&lessonId, status, lastStudiedAt",
      reviewStates: "&itemId, dueAt",
      attempts: "&id, lessonId, itemId, createdAt",
      sessions: "&id, date, lessonId",
      settings: "&id",
      streak: "&id",
    });
  }
}

export const db = new ThaiStudyDatabase();

export async function readSnapshot(fallback: AppSnapshot): Promise<AppSnapshot> {
  const [lessonProgress, reviewStates, attempts, sessions, settings, streak] = await Promise.all([
    db.lessonProgress.toArray(),
    db.reviewStates.toArray(),
    db.attempts.toArray(),
    db.sessions.toArray(),
    db.settings.get("settings"),
    db.streak.get("streak"),
  ]);

  if (!settings) return fallback;
  return AppSnapshotSchema.parse({
    version: 1,
    lessonProgress,
    reviewStates,
    attempts,
    sessions,
    settings: withoutId(settings),
    streak: streak ? withoutId(streak) : fallback.streak,
  });
}

function withoutId<T extends { id: string }>(row: T): Omit<T, "id"> {
  return Object.fromEntries(Object.entries(row).filter(([key]) => key !== "id")) as Omit<T, "id">;
}

export async function writeSnapshot(snapshot: AppSnapshot): Promise<void> {
  const parsed = AppSnapshotSchema.parse(snapshot);
  await db.transaction("rw", db.tables, async () => {
    await Promise.all([
      db.lessonProgress.clear(),
      db.reviewStates.clear(),
      db.attempts.clear(),
      db.sessions.clear(),
    ]);
    await Promise.all([
      db.lessonProgress.bulkPut(parsed.lessonProgress),
      db.reviewStates.bulkPut(parsed.reviewStates),
      db.attempts.bulkPut(parsed.attempts),
      db.sessions.bulkPut(parsed.sessions),
      db.settings.put({ id: "settings", ...parsed.settings }),
      db.streak.put({ id: "streak", ...parsed.streak }),
    ]);
  });
}

export async function clearLocalData(): Promise<void> {
  await db.delete();
  await db.open();
}
