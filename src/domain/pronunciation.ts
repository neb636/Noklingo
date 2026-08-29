export type TranscriptWord = {
  text: string;
  start: number;
  end: number;
  probability?: number;
};

export type TranscriptSegment = {
  text: string;
  start: number;
  end: number;
  averageLogProbability?: number;
  words: TranscriptWord[];
};

export type TranscriptCandidate = {
  start: number;
  end: number;
  transcriptMatch: string;
  confidence: number;
  exact: boolean;
  segmentIndex: number;
};

export type MatchResult = {
  status: "matched" | "ambiguous" | "unmatched" | "overridden";
  confidence?: number;
  start?: number;
  end?: number;
  transcriptMatch?: string;
  candidates: TranscriptCandidate[];
  diagnostic?: string;
};

export type ThaiMatchOptions = {
  confidenceThreshold: number;
  ambiguityMargin: number;
};

export type ClipPaddingOptions = {
  paddingBeforeMs: number;
  paddingAfterMs: number;
  minimumClipDurationMs: number;
  maximumClipDurationMs: number;
};

export type BoundaryOptions = ClipPaddingOptions & {
  frameDurationMs: number;
  boundarySearchBeforeMs: number;
  boundarySearchAfterMs: number;
  protectivePaddingBeforeMs: number;
  protectivePaddingAfterMs: number;
  quietRunMs: number;
  quietThresholdDbAboveNoise: number;
  fadeMs: number;
  speechThresholdDbAboveNoise: number;
  speechIslandMergeGapMs: number;
  minimumSpeechIslandMs: number;
  speechIslandSearchMs: number;
  minimumSpeechIslandScore: number;
};

export const defaultThaiMatchOptions: ThaiMatchOptions = {
  confidenceThreshold: 0.84,
  ambiguityMargin: 0.08,
};

export const defaultClipPaddingOptions: ClipPaddingOptions = {
  paddingBeforeMs: 150,
  paddingAfterMs: 250,
  minimumClipDurationMs: 450,
  maximumClipDurationMs: 5500,
};

export const defaultBoundaryOptions: BoundaryOptions = {
  ...defaultClipPaddingOptions,
  frameDurationMs: 10,
  boundarySearchBeforeMs: 350,
  boundarySearchAfterMs: 450,
  protectivePaddingBeforeMs: 100,
  protectivePaddingAfterMs: 140,
  quietRunMs: 40,
  quietThresholdDbAboveNoise: 6,
  fadeMs: 8,
  speechThresholdDbAboveNoise: 10,
  speechIslandMergeGapMs: 180,
  minimumSpeechIslandMs: 60,
  speechIslandSearchMs: 1000,
  minimumSpeechIslandScore: 0.2,
};

export type PronunciationManifestClip = {
  cueCardId: string;
  thaiText: string;
  englishText: string;
  thai: PronunciationLanguageClip;
  english: PronunciationLanguageClip;
  pairStatus: "complete" | "thai-only" | "english-only" | "ambiguous" | "unmatched";
};

export type PronunciationLanguageClip = {
  audio?: string;
  status: MatchResult["status"];
  start?: number;
  end?: number;
  transcriptMatch?: string;
  confidence?: number;
  candidates: TranscriptCandidate[];
  diagnostic?: string;
  rawStart?: number;
  rawEnd?: number;
  protectedStart?: number;
  protectedEnd?: number;
  envelopeMethod?: "whisper" | "energy-island" | "override";
  boundaryMethod?: { start: "quiet" | "fallback" | "override"; end: "quiet" | "fallback" | "override" };
  boundaryConfidence?: { start: number; end: number };
  warnings?: string[];
};

export type PronunciationLessonManifest = {
  lessonId: string;
  sourceVideo: string;
  sourceHash: string;
  model: string;
  generatedAt: string;
  algorithmFingerprint?: string;
  clips: PronunciationManifestClip[];
};

export type PronunciationIndex = {
  version: number;
  lessons: PronunciationLessonManifest[];
};

export function pronunciationReviewIsStale(
  review: { sourceHash: string; algorithmFingerprint: string } | undefined,
  sourceHash: string,
  algorithmFingerprint: string,
): boolean {
  return Boolean(review && (review.sourceHash !== sourceHash || review.algorithmFingerprint !== algorithmFingerprint));
}

/** Match-friendly Thai text: Thai normally has no mandatory word spaces. */
export function normalizeThai(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[\s\u200b\u2060]+/gu, "")
    .replace(/[\p{P}\p{S}]+/gu, "");
}

/** Match-friendly English text; punctuation, spaces, and capitalization are not meaningful. */
export function normalizeEnglish(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, "");
}

function levenshtein(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 0; i < left.length; i += 1) {
    const current = [i + 1];
    for (let j = 0; j < right.length; j += 1) {
      current[j + 1] = Math.min(
        current[j] + 1,
        previous[j + 1] + 1,
        previous[j] + (left[i] === right[j] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function unitsFor(segment: TranscriptSegment): TranscriptWord[] {
  return segment.words.length ? segment.words : [{ text: segment.text, start: segment.start, end: segment.end }];
}

function candidateForRange(
  segment: TranscriptSegment,
  segmentIndex: number,
  startCharacter: number,
  endCharacter: number,
  exact: boolean,
  textScore: number,
  normalize: (value: string) => string,
): TranscriptCandidate | undefined {
  const units = unitsFor(segment);
  const normalizedUnits = units.map((unit) => normalize(unit.text));
  let offset = 0;
  let first = -1;
  let last = -1;
  for (let index = 0; index < normalizedUnits.length; index += 1) {
    const next = offset + normalizedUnits[index].length;
    if (first === -1 && next > startCharacter) first = index;
    if (offset < endCharacter) last = index;
    offset = next;
  }
  if (first === -1 || last === -1) return undefined;
  const selected = units.slice(first, last + 1);
  const probabilities = selected.map((unit) => unit.probability).filter((value): value is number => value !== undefined);
  const probability = probabilities.length ? probabilities.reduce((sum, value) => sum + value, 0) / probabilities.length : 0.8;
  return {
    start: selected[0].start,
    end: selected[selected.length - 1].end,
    transcriptMatch: selected.map((unit) => unit.text).join(""),
    confidence: Math.min(1, textScore * 0.88 + probability * 0.12),
    exact,
    segmentIndex,
  };
}

function matchPhrase(
  targetText: string,
  segments: TranscriptSegment[],
  normalize: (value: string) => string,
  options: ThaiMatchOptions,
): MatchResult {
  const target = normalize(targetText);
  if (!target) return { status: "unmatched", candidates: [], diagnostic: "Target text normalizes to empty." };
  const candidates: TranscriptCandidate[] = [];

  for (const [segmentIndex, segment] of segments.entries()) {
    const text = unitsFor(segment).map((unit) => normalize(unit.text)).join("");
    if (!text) continue;
    let cursor = text.indexOf(target);
    while (cursor !== -1) {
      const candidate = candidateForRange(segment, segmentIndex, cursor, cursor + target.length, true, 1, normalize);
      if (candidate) candidates.push(candidate);
      cursor = text.indexOf(target, cursor + 1);
    }

    const tolerance = Math.max(1, Math.floor(target.length * 0.2));
    const minLength = Math.max(1, target.length - tolerance);
    const maxLength = Math.min(text.length, target.length + tolerance);
    for (let start = 0; start < text.length; start += 1) {
      for (let length = minLength; length <= maxLength && start + length <= text.length; length += 1) {
        const sample = text.slice(start, start + length);
        const score = 1 - levenshtein(target, sample) / Math.max(target.length, sample.length);
        if (score < 0.82 || sample === target) continue;
        const candidate = candidateForRange(segment, segmentIndex, start, start + length, false, score, normalize);
        if (candidate) candidates.push(candidate);
      }
    }
  }

  const deduped = candidates
    .sort((left, right) => right.confidence - left.confidence || left.start - right.start)
    .filter((candidate, index, values) => index === 0 || !values.slice(0, index).some((other) => {
      const overlap = Math.max(0, Math.min(other.end, candidate.end) - Math.max(other.start, candidate.start));
      const shorter = Math.min(other.end - other.start, candidate.end - candidate.start);
      return (Math.abs(other.start - candidate.start) < 0.04 && Math.abs(other.end - candidate.end) < 0.04)
        || (shorter > 0 && overlap / shorter >= 0.65);
    }));
  const best = deduped[0];
  if (!best || best.confidence < options.confidenceThreshold) return { status: "unmatched", candidates: deduped, diagnostic: "No candidate reached the confidence threshold." };
  const next = deduped[1];
  if (next && best.confidence - next.confidence < options.ambiguityMargin) {
    return { status: "ambiguous", candidates: deduped, diagnostic: "The top candidate is too close to another occurrence." };
  }
  return { status: "matched", candidates: deduped, start: best.start, end: best.end, transcriptMatch: best.transcriptMatch, confidence: best.confidence };
}

/**
 * Finds phrase envelopes from Whisper timestamp units. Fuzzy matching is deliberately
 * limited to a single recognized segment so unrelated speech cannot be stitched together.
 */
export function matchThaiPhrase(targetText: string, segments: TranscriptSegment[], options: ThaiMatchOptions = defaultThaiMatchOptions): MatchResult {
  return matchPhrase(targetText, segments, normalizeThai, options);
}

export function matchEnglishPhrase(targetText: string, segments: TranscriptSegment[], options: ThaiMatchOptions = defaultThaiMatchOptions): MatchResult {
  return matchPhrase(targetText, segments, normalizeEnglish, options);
}

export function paddedClipRange(
  start: number,
  end: number,
  duration: number,
  options: ClipPaddingOptions = defaultClipPaddingOptions,
): { start: number; end: number } | undefined {
  let nextStart = Math.max(0, start - options.paddingBeforeMs / 1000);
  let nextEnd = Math.min(duration, end + options.paddingAfterMs / 1000);
  const minimum = options.minimumClipDurationMs / 1000;
  const maximum = options.maximumClipDurationMs / 1000;
  if (nextEnd - nextStart > maximum) return undefined;
  if (nextEnd - nextStart < minimum) {
    const centre = (nextStart + nextEnd) / 2;
    nextStart = Math.max(0, centre - minimum / 2);
    nextEnd = Math.min(duration, nextStart + minimum);
    nextStart = Math.max(0, nextEnd - minimum);
  }
  return nextEnd > nextStart ? { start: nextStart, end: nextEnd } : undefined;
}
