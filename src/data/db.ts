import Dexie from "dexie/dist/dexie.mjs";
import type { EntityTable } from "dexie";
import {
  AppSnapshotSchema,
  type ActiveStudySession, type AppSnapshot, type CompletedStudySession,
  type ItemReviewState, type LessonProgress, type Settings, type StreakState, type StudyAttempt,
} from "@/domain/schemas";

type SettingsRow = Settings & { id: "settings" };
type StreakRow = StreakState & { id: "streak" };
type ActiveSessionRow = ActiveStudySession & { recordId: "active" };
type MetaRow = { key: string; value: unknown };

class ThaiStudyDatabase extends Dexie {
  lessonProgress!: EntityTable<LessonProgress, "lessonId">;
  reviewStates!: EntityTable<ItemReviewState, "itemId">;
  attempts!: EntityTable<StudyAttempt, "id">;
  completedSessions!: EntityTable<CompletedStudySession, "id">;
  activeSessions!: EntityTable<ActiveSessionRow, "recordId">;
  settings!: EntityTable<SettingsRow, "id">;
  streak!: EntityTable<StreakRow, "id">;
  meta!: EntityTable<MetaRow, "key">;

  constructor() {
    super("thai-study-local");
    this.version(1).stores({
      lessonProgress: "&lessonId, status, lastStudiedAt", reviewStates: "&itemId, dueAt",
      attempts: "&id, lessonId, itemId, createdAt", sessions: "&id, date, lessonId",
      settings: "&id", streak: "&id",
    });
    this.version(2).stores({
      lessonProgress: "&lessonId, status, masteryEligibleDate, lastStudiedAt",
      reviewStates: "&itemId, dueDate", attempts: "&id, sessionId, lessonId, itemId, createdAt",
      sessions: null, completedSessions: "&id, mode, lessonId, localDate, completedAt",
      activeSessions: "&recordId, id, mode, lessonId, localDate", settings: "&id", streak: "&id", meta: "&key",
    }).upgrade(async (transaction) => {
      await Promise.all([
        transaction.table("lessonProgress").clear(), transaction.table("reviewStates").clear(),
        transaction.table("attempts").clear(), transaction.table("settings").clear(), transaction.table("streak").clear(),
      ]);
      await transaction.table("meta").put({ key: "redesignNotice", value: true });
    });
  }
}

export const db = new ThaiStudyDatabase();

export async function readSnapshot(fallback: AppSnapshot): Promise<{ snapshot: AppSnapshot; incompatible: boolean }> {
  const [lessonProgress, reviewStates, attempts, completedSessions, active, settings, streak, notice] = await Promise.all([
    db.lessonProgress.toArray(), db.reviewStates.toArray(), db.attempts.toArray(), db.completedSessions.toArray(),
    db.activeSessions.get("active"), db.settings.get("settings"), db.streak.get("streak"), db.meta.get("redesignNotice"),
  ]);
  const incompatible = notice?.value === true;
  if (incompatible) await db.meta.delete("redesignNotice");
  if (!settings) return { snapshot: fallback, incompatible };
  try {
    return {
      snapshot: AppSnapshotSchema.parse({
        version: 2, lessonProgress, reviewStates, attempts, completedSessions,
        activeSession: active ? withoutKeys(active, ["recordId"]) : null,
        lastResultSessionId: (await db.meta.get("lastResultSessionId"))?.value,
        settings: withoutKeys(settings, ["id"]), streak: streak ? withoutKeys(streak, ["id"]) : fallback.streak,
      }),
      incompatible,
    };
  } catch {
    return { snapshot: fallback, incompatible: true };
  }
}

function withoutKeys<T extends object>(row: T, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key)));
}

export async function writeSnapshot(snapshot: AppSnapshot): Promise<void> {
  const parsed = AppSnapshotSchema.parse(snapshot);
  await db.transaction("rw", db.tables, async () => {
    await Promise.all([
      db.lessonProgress.clear(), db.reviewStates.clear(), db.attempts.clear(),
      db.completedSessions.clear(), db.activeSessions.clear(),
    ]);
    await Promise.all([
      db.lessonProgress.bulkPut(parsed.lessonProgress), db.reviewStates.bulkPut(parsed.reviewStates),
      db.attempts.bulkPut(parsed.attempts), db.completedSessions.bulkPut(parsed.completedSessions),
      parsed.activeSession ? db.activeSessions.put({ recordId: "active", ...parsed.activeSession }) : Promise.resolve(),
      db.settings.put({ id: "settings", ...parsed.settings }), db.streak.put({ id: "streak", ...parsed.streak }),
      parsed.lastResultSessionId
        ? db.meta.put({ key: "lastResultSessionId", value: parsed.lastResultSessionId })
        : db.meta.delete("lastResultSessionId"),
    ]);
  });
}

export async function clearLocalData(): Promise<void> {
  await db.transaction("rw", db.tables, async () => Promise.all(db.tables.map((table) => table.clear())));
}
