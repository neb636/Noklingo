import Dexie from "dexie/dist/dexie.mjs";
import type { EntityTable } from "dexie";
import {
  AppSnapshotSchema,
  type ActiveStudySession, type AppSnapshot, type CompletedStudySession,
  type ItemReviewState, type LessonProgress, type MixedReviewSession, type PracticeCompletion,
  type Settings, type StreakState, type StudyAttempt,
} from "@/domain/schemas";
import { reconcileSnapshot } from "@/domain/curriculum-validation";
import { cueCards, lessons } from "@/domain/seed";
import { CURRICULUM_VERSION } from "@/engine/learning-engine";

const REDESIGN_NOTICE_KEY = "redesignNotice:v3";
const CURRICULUM_VERSION_KEY = "curriculumVersion";

type SettingsRow = Settings & { id: "settings" };
type StreakRow = StreakState & { id: "streak" };
type ActiveSessionRow = ActiveStudySession & { recordId: "active" };
type MixedReviewSessionRow = MixedReviewSession & { recordId: "active" };
type MetaRow = { key: string; value: unknown };

class ThaiStudyDatabase extends Dexie {
  lessonProgress!: EntityTable<LessonProgress, "lessonId">;
  reviewStates!: EntityTable<ItemReviewState, "itemId">;
  attempts!: EntityTable<StudyAttempt, "id">;
  completedSessions!: EntityTable<CompletedStudySession, "id">;
  activeSessions!: EntityTable<ActiveSessionRow, "recordId">;
  practiceCompletions!: EntityTable<PracticeCompletion, "lessonId">;
  mixedReviewSessions!: EntityTable<MixedReviewSessionRow, "recordId">;
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
    this.version(3).stores({
      lessonProgress: "&lessonId, status, masteryEligibleDate, lastStudiedAt",
      reviewStates: "&itemId, dueDate", attempts: "&id, sessionId, lessonId, itemId, createdAt",
      completedSessions: "&id, mode, lessonId, localDate, completedAt",
      activeSessions: "&recordId, id, mode, lessonId, localDate", settings: "&id", streak: "&id", meta: "&key",
    }).upgrade(async (transaction) => {
      const tables = [
        "lessonProgress", "reviewStates", "attempts", "completedSessions",
        "activeSessions", "settings", "streak", "meta",
      ];
      await Promise.all(tables.map((table) => transaction.table(table).clear()));
      await transaction.table("meta").put({ key: REDESIGN_NOTICE_KEY, value: true });
    });
    this.version(4).stores({
      lessonProgress: "&lessonId, status, masteryEligibleDate, lastStudiedAt",
      reviewStates: "&itemId, dueDate", attempts: "&id, sessionId, lessonId, itemId, createdAt",
      completedSessions: "&id, mode, lessonId, localDate, completedAt",
      activeSessions: "&recordId, id, mode, lessonId, localDate",
      practiceCompletions: "&lessonId, completedAt",
      mixedReviewSessions: "&recordId, id, stage, startedAt",
      settings: "&id", streak: "&id", meta: "&key",
    });
  }
}

export const db = new ThaiStudyDatabase();

export type ReadSnapshotResult = {
  snapshot: AppSnapshot;
  incompatible: boolean;
  staleSessionDropped: boolean;
};

export async function readSnapshot(fallback: AppSnapshot): Promise<ReadSnapshotResult> {
  const [lessonProgress, reviewStates, attempts, completedSessions, active, practiceCompletions, mixedReview, settings, streak, notice, lastResult, storedCurriculumVersion] = await Promise.all([
    db.lessonProgress.toArray(), db.reviewStates.toArray(), db.attempts.toArray(), db.completedSessions.toArray(),
    db.activeSessions.get("active"), db.practiceCompletions.toArray(), db.mixedReviewSessions.get("active"),
    db.settings.get("settings"), db.streak.get("streak"), db.meta.get(REDESIGN_NOTICE_KEY),
    db.meta.get("lastResultSessionId"), db.meta.get(CURRICULUM_VERSION_KEY),
  ]);
  const incompatible = notice?.value === true;
  if (incompatible) await db.meta.delete(REDESIGN_NOTICE_KEY);
  if (!settings) return { snapshot: fallback, incompatible, staleSessionDropped: false };
  try {
    const parsed = AppSnapshotSchema.parse({
      version: 4,
      curriculumVersion: typeof storedCurriculumVersion?.value === "string"
        ? storedCurriculumVersion.value
        : fallback.curriculumVersion,
      lessonProgress, reviewStates, attempts, completedSessions,
      activeSession: active ? withoutKeys(active, ["recordId"]) : null,
      lastResultSessionId: lastResult?.value,
      practiceCompletions,
      activeMixedReviewSession: mixedReview ? withoutKeys(mixedReview, ["recordId"]) : null,
      settings: withoutKeys(settings, ["id"]), streak: streak ? withoutKeys(streak, ["id"]) : fallback.streak,
    });
    const reconciled = reconcileSnapshot(parsed, lessons, cueCards, CURRICULUM_VERSION);
    return {
      snapshot: reconciled,
      incompatible,
      staleSessionDropped: parsed.activeSession !== null && reconciled.activeSession === null,
    };
  } catch {
    return { snapshot: fallback, incompatible: true, staleSessionDropped: false };
  }
}

function withoutKeys<T extends object>(row: T, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key)));
}

export async function writeSnapshot(snapshot: AppSnapshot): Promise<void> {
  const parsed = reconcileSnapshot(AppSnapshotSchema.parse(snapshot), lessons, cueCards, CURRICULUM_VERSION);
  if (parsed.curriculumVersion !== CURRICULUM_VERSION) {
    throw new Error("Snapshot curriculum version is not current.");
  }
  await db.transaction("rw", db.tables, async () => {
    await Promise.all([
      db.lessonProgress.clear(), db.reviewStates.clear(), db.attempts.clear(),
      db.completedSessions.clear(), db.activeSessions.clear(), db.practiceCompletions.clear(), db.mixedReviewSessions.clear(),
    ]);
    await Promise.all([
      db.lessonProgress.bulkPut(parsed.lessonProgress), db.reviewStates.bulkPut(parsed.reviewStates),
      db.attempts.bulkPut(parsed.attempts), db.completedSessions.bulkPut(parsed.completedSessions),
      parsed.activeSession ? db.activeSessions.put({ recordId: "active", ...parsed.activeSession }) : Promise.resolve(),
      db.practiceCompletions.bulkPut(parsed.practiceCompletions),
      parsed.activeMixedReviewSession ? db.mixedReviewSessions.put({ recordId: "active", ...parsed.activeMixedReviewSession }) : Promise.resolve(),
      db.settings.put({ id: "settings", ...parsed.settings }), db.streak.put({ id: "streak", ...parsed.streak }),
      db.meta.put({ key: CURRICULUM_VERSION_KEY, value: parsed.curriculumVersion }),
      parsed.lastResultSessionId
        ? db.meta.put({ key: "lastResultSessionId", value: parsed.lastResultSessionId })
        : db.meta.delete("lastResultSessionId"),
    ]);
  });
}

export async function clearLocalData(): Promise<void> {
  await db.transaction("rw", db.tables, async () => Promise.all(db.tables.map((table) => table.clear())));
}
