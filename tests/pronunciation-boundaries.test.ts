import { describe, expect, it } from "vitest";
import { defaultBoundaryOptions } from "../src/domain/pronunciation";
import { assertProtectedRange, detectSpeechIslands, proposeSpeechProtectedRange, refineSpeechEnvelopes, type EnergyFrame } from "../src/domain/pronunciation-boundaries";

const frames = (duration: number, dbAt: (time: number) => number): EnergyFrame[] => Array.from({ length: Math.ceil(duration / 0.01) }, (_, index) => ({ start: index / 100, end: (index + 1) / 100, db: dbAt((index + 0.5) / 100) }));

describe("speech-protective pronunciation boundaries", () => {
  it("uses quiet valleys without entering matched speech", () => {
    const envelope = { id: "one", start: 1, end: 1.5 };
    const result = proposeSpeechProtectedRange(envelope, [envelope], frames(3, (time) => time > 0.85 && time < 1.7 ? -10 : -55), 3, defaultBoundaryOptions)!;
    expect(result.method).toEqual({ start: "quiet", end: "quiet" });
    expect(assertProtectedRange(result, envelope)).toBe(true);
    expect(result.start).toBeLessThanOrEqual(1);
    expect(result.end).toBeGreaterThanOrEqual(1.5);
  });

  it("falls back conservatively when continuous audio has no quiet valley", () => {
    const envelope = { id: "one", start: 1, end: 1.5 };
    const result = proposeSpeechProtectedRange(envelope, [envelope], frames(3, () => -12), 3, defaultBoundaryOptions)!;
    expect(result.method).toEqual({ start: "fallback", end: "fallback" });
    expect(result.start).toBeCloseTo(0.9);
    expect(result.end).toBeCloseTo(1.64);
    expect(assertProtectedRange(result, envelope)).toBe(true);
  });

  it("does not resolve overlapping speech by cutting either envelope", () => {
    const envelope = { id: "one", start: 1, end: 1.6 };
    const result = proposeSpeechProtectedRange(envelope, [envelope, { id: "two", start: 1.5, end: 2 }], frames(3, () => -15), 3, defaultBoundaryOptions)!;
    expect(result.warnings).toContain("overlapping-speech-envelopes");
    expect(assertProtectedRange(result, envelope)).toBe(true);
  });

  it("clamps safely at the media edges and rejects invalid or overlong matches", () => {
    const leading = { id: "leading", start: 0, end: 0.2 };
    expect(proposeSpeechProtectedRange(leading, [leading], frames(1, () => -15), 1, defaultBoundaryOptions)?.start).toBe(0);
    expect(proposeSpeechProtectedRange({ id: "bad", start: 0.5, end: 8 }, [], frames(10, () => -15), 10, defaultBoundaryOptions)).toBeUndefined();
    expect(proposeSpeechProtectedRange({ id: "outside", start: 0.5, end: 2 }, [], frames(1, () => -15), 1, defaultBoundaryOptions)).toBeUndefined();
  });

  it("corrects lagging Whisper timestamps by assigning distinct speech islands in order", () => {
    const energy = frames(4, (time) => (time < 0.75 || (time > 1.45 && time < 2) || (time > 2.55 && time < 3.1) ? -10 : -55));
    const islands = detectSpeechIslands(energy, defaultBoundaryOptions);
    const refined = refineSpeechEnvelopes([
      { id: "english", start: 0, end: 0.7 },
      { id: "thai", start: 0.7, end: 1.7 },
      { id: "next", start: 1.7, end: 2.8 },
    ], islands, defaultBoundaryOptions);
    expect(refined.map((item) => item.method)).toEqual(["energy-island", "energy-island", "energy-island"]);
    expect(refined[1].start).toBeGreaterThan(1.4);
    expect(refined[1].end).toBeLessThanOrEqual(2.01);
    expect(refined[2].start).toBeGreaterThan(2.5);
  });
});
