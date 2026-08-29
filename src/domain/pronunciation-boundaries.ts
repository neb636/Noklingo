import type { BoundaryOptions } from "./pronunciation";

export type EnergyFrame = { start: number; end: number; db: number };
export type SpeechEnvelope = { id: string; start: number; end: number };
export type SpeechIsland = { start: number; end: number; peakDb: number };
export type RefinedSpeechEnvelope = SpeechEnvelope & { method: "whisper" | "energy-island"; score?: number };
export type BoundaryProposal = {
  start: number;
  end: number;
  method: { start: "quiet" | "fallback"; end: "quiet" | "fallback" };
  confidence: { start: number; end: number };
  warnings: string[];
};

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

function percentile(values: number[], fraction: number): number {
  if (!values.length) return -60;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))];
}

export function detectSpeechIslands(frames: EnergyFrame[], options: BoundaryOptions): SpeechIsland[] {
  if (!frames.length) return [];
  const levels = frames.map((frame) => frame.db); const noiseFloor = percentile(levels, 0.2); const speechLevel = percentile(levels, 0.9);
  if (speechLevel - noiseFloor < 6) return [];
  const threshold = Math.min(noiseFloor + options.speechThresholdDbAboveNoise, speechLevel - 4);
  const active = frames.filter((frame) => frame.db >= threshold); if (!active.length) return [];
  const mergeGap = options.speechIslandMergeGapMs / 1000; const minimum = options.minimumSpeechIslandMs / 1000; const islands: SpeechIsland[] = [];
  let current: SpeechIsland = { start: active[0].start, end: active[0].end, peakDb: active[0].db };
  for (const frame of active.slice(1)) {
    if (frame.start - current.end <= mergeGap) { current.end = frame.end; current.peakDb = Math.max(current.peakDb, frame.db); }
    else { if (current.end - current.start >= minimum) islands.push(current); current = { start: frame.start, end: frame.end, peakDb: frame.db }; }
  }
  if (current.end - current.start >= minimum) islands.push(current);
  return islands;
}

/** Maps imprecise Whisper ranges onto distinct nearby speech bursts without reusing a burst. */
export function refineSpeechEnvelopes(envelopes: SpeechEnvelope[], islands: SpeechIsland[], options: BoundaryOptions): RefinedSpeechEnvelope[] {
  const used = new Set<number>(); const search = options.speechIslandSearchMs / 1000;
  return [...envelopes].sort((left, right) => (left.start + left.end) - (right.start + right.end)).map((envelope) => {
    const candidates = islands.map((island, index) => {
      const overlap = Math.max(0, Math.min(envelope.end, island.end) - Math.max(envelope.start, island.start));
      const shorter = Math.min(envelope.end - envelope.start, island.end - island.start); const overlapScore = shorter > 0 ? overlap / shorter : 0;
      const distance = Math.abs((envelope.start + envelope.end - island.start - island.end) / 2);
      const proximityScore = Math.max(0, 0.8 * (1 - distance / Math.max(search, 0.001)));
      const score = Math.max(overlapScore, proximityScore);
      return { island, index, score, distance };
    }).filter((candidate) => !used.has(candidate.index) && candidate.distance <= search && candidate.score >= options.minimumSpeechIslandScore)
      .sort((left, right) => right.score - left.score || left.distance - right.distance);
    const selected = candidates[0];
    if (!selected) return { ...envelope, method: "whisper" as const };
    used.add(selected.index);
    return { ...envelope, start: selected.island.start, end: selected.island.end, method: "energy-island" as const, score: selected.score };
  });
}

function quietBoundary(
  frames: EnergyFrame[],
  rangeStart: number,
  rangeEnd: number,
  fromEnd: boolean,
  options: BoundaryOptions,
): { time: number; confidence: number } | undefined {
  if (rangeEnd <= rangeStart) return undefined;
  const local = frames.filter((frame) => frame.end > rangeStart && frame.start < rangeEnd);
  if (!local.length) return undefined;
  const noiseFloor = percentile(local.map((frame) => frame.db), 0.2);
  const dynamicRange = percentile(local.map((frame) => frame.db), 0.8) - noiseFloor;
  if (dynamicRange < 3 && noiseFloor > -35) return undefined;
  const threshold = noiseFloor + options.quietThresholdDbAboveNoise;
  const required = Math.max(1, Math.ceil(options.quietRunMs / options.frameDurationMs));
  const runs: EnergyFrame[][] = [];
  let run: EnergyFrame[] = [];
  for (const frame of local) {
    if (frame.db <= threshold) run.push(frame);
    else {
      if (run.length >= required) runs.push(run);
      run = [];
    }
  }
  if (run.length >= required) runs.push(run);
  const selected = fromEnd ? runs.at(-1) : runs[0];
  if (!selected) return undefined;
  const average = selected.reduce((sum, frame) => sum + frame.db, 0) / selected.length;
  return {
    time: clamp((selected[0].start + selected.at(-1)!.end) / 2, rangeStart, rangeEnd),
    confidence: clamp((threshold - average) / 18, 0, 1),
  };
}

/** Proposes clip cuts around, but never inside, a complete matched-speech envelope. */
export function proposeSpeechProtectedRange(
  envelope: SpeechEnvelope,
  neighbors: SpeechEnvelope[],
  frames: EnergyFrame[],
  duration: number,
  options: BoundaryOptions,
): BoundaryProposal | undefined {
  if (envelope.start < 0 || envelope.end <= envelope.start || envelope.end > duration) return undefined;
  if (envelope.end - envelope.start > options.maximumClipDurationMs / 1000) return undefined;
  const ordered = neighbors.filter((item) => item.id !== envelope.id).sort((a, b) => a.start - b.start);
  const immediatePrevious = ordered.filter((item) => item.end <= envelope.start).sort((left, right) => right.end - left.end)[0];
  const immediateNext = ordered.filter((item) => item.start >= envelope.end).sort((left, right) => left.start - right.start)[0];
  const previous = immediatePrevious?.end === envelope.start ? undefined : immediatePrevious;
  const next = immediateNext?.start === envelope.end ? undefined : immediateNext;
  const overlaps = ordered.filter((item) => item.start < envelope.end && item.end > envelope.start);
  const touching = ordered.filter((item) => Math.abs(item.end - envelope.start) < options.frameDurationMs / 1000 || Math.abs(item.start - envelope.end) < options.frameDurationMs / 1000);
  const searchStart = Math.max(0, envelope.start - options.boundarySearchBeforeMs / 1000, previous?.end ?? 0);
  const searchEnd = Math.min(duration, envelope.end + options.boundarySearchAfterMs / 1000, next?.start ?? duration);
  const startQuiet = quietBoundary(frames, searchStart, envelope.start, true, options);
  const endQuiet = quietBoundary(frames, envelope.end, searchEnd, false, options);
  let start = startQuiet?.time ?? Math.max(searchStart, envelope.start - options.protectivePaddingBeforeMs / 1000);
  let end = endQuiet?.time ?? Math.min(searchEnd, envelope.end + options.protectivePaddingAfterMs / 1000);
  const minimum = options.minimumClipDurationMs / 1000;
  if (end - start < minimum) {
    const missing = minimum - (end - start);
    start = Math.max(searchStart, start - missing / 2);
    end = Math.min(searchEnd, end + missing - (startQuiet ? 0 : missing / 2));
  }
  start = Math.min(start, envelope.start);
  end = Math.max(end, envelope.end);
  if (end - start > options.maximumClipDurationMs / 1000) return undefined;
  const warnings: string[] = [];
  if (!startQuiet) warnings.push("start-fallback");
  if (!endQuiet) warnings.push("end-fallback");
  if (overlaps.length) warnings.push("overlapping-speech-envelopes");
  if (touching.length) warnings.push("touching-speech-envelopes");
  if (previous && previous.end === searchStart && envelope.start - previous.end < options.protectivePaddingBeforeMs / 1000) warnings.push("tight-previous-neighbor");
  if (next && next.start === searchEnd && next.start - envelope.end < options.protectivePaddingAfterMs / 1000) warnings.push("tight-next-neighbor");
  return {
    start,
    end,
    method: { start: startQuiet ? "quiet" : "fallback", end: endQuiet ? "quiet" : "fallback" },
    confidence: { start: startQuiet?.confidence ?? 0, end: endQuiet?.confidence ?? 0 },
    warnings,
  };
}

export function assertProtectedRange(proposal: { start: number; end: number }, envelope: { start: number; end: number }): boolean {
  return proposal.start <= envelope.start && proposal.end >= envelope.end;
}
