import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { approvePronunciationOverride } from "../tools/pronunciation-generator/review-store";

const card = (id: string) => ({ id, lessonId: "lesson", emoji: "🗣️", thai: "คำ", romanization: "kam", naturalMeaning: "word", verificationStatus: "draft" });

describe("pronunciation review persistence", () => {
  it("atomically records exact approved boundaries while preserving unrelated text", () => {
    const directory = mkdtempSync(join(tmpdir(), "noklingo-review-")); const path = join(directory, "cards.json");
    const untouched = `    ${JSON.stringify(card("untouched"))},`;
    writeFileSync(path, `{\n  "cueCards": [\n${untouched}\n    ${JSON.stringify(card("target"))}\n  ]\n}\n`);
    approvePronunciationOverride({ cardsPath: path, cueCardId: "target", language: "thai", startSeconds: 1.2344, endSeconds: 2.3456, durationSeconds: 4, sourceHash: "a".repeat(64), algorithmFingerprint: "fingerprint", reviewedAt: "2026-08-29T12:00:00.000Z" });
    const text = readFileSync(path, "utf8"); const root = JSON.parse(text);
    expect(text).toContain(untouched);
    expect(root.cueCards[1].pronunciationOverrides.thai).toEqual({ startSeconds: 1.234, endSeconds: 2.346, review: { sourceHash: "a".repeat(64), algorithmFingerprint: "fingerprint", reviewedAt: "2026-08-29T12:00:00.000Z" } });
  });

  it("rejects ranges outside the source without changing the file", () => {
    const directory = mkdtempSync(join(tmpdir(), "noklingo-review-")); const path = join(directory, "cards.json"); const original = JSON.stringify({ cueCards: [card("target")] }); writeFileSync(path, original);
    expect(() => approvePronunciationOverride({ cardsPath: path, cueCardId: "target", language: "english", startSeconds: 3, endSeconds: 5, durationSeconds: 4, sourceHash: "b".repeat(64), algorithmFingerprint: "fingerprint" })).toThrow(/inside the source/);
    expect(readFileSync(path, "utf8")).toBe(original);
  });
});
