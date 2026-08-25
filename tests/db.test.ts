import "fake-indexeddb/auto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { firstLesson } from "../src/domain/seed";
import { buildSession } from "../src/engine/learning-engine";
import { clearLocalData, db, readSnapshot, writeSnapshot } from "../src/data/db";
import { defaultSnapshot } from "../src/state/study-store";

describe("IndexedDB snapshot persistence", () => {
  beforeEach(async () => {
    await clearLocalData();
  });

  afterAll(async () => {
    db.close();
    await db.delete();
  });

  it("discards an active scored session for an editorial draft", async () => {
    const activeSession = buildSession({ mode: "introduction", lesson: firstLesson, snapshot: defaultSnapshot, today: "2026-08-24", nowIso: "2026-08-24T12:00:00.000Z" });
    const saved = { ...defaultSnapshot, activeSession: { ...activeSession, stage: "cue-cards" as const, cardIndex: 2 } };
    await writeSnapshot(saved);
    const result = await readSnapshot(defaultSnapshot);
    expect(result.snapshot.activeSession).toBeNull();
    expect(result.incompatible).toBe(false);
  });

  it("clears learning records and preferences on reset", async () => {
    await writeSnapshot({ ...defaultSnapshot, streak: { currentDays: 4, longestDays: 7, lastStudyDate: "2026-08-24" } });
    await clearLocalData();
    const result = await readSnapshot(defaultSnapshot);
    expect(result.snapshot).toEqual(defaultSnapshot);
  });
});
