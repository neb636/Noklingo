import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { CueCardSchema } from "../../src/domain/schemas";

export type ReviewLanguage = "thai" | "english";
export type ApprovalInput = {
  cardsPath: string;
  cueCardId: string;
  language: ReviewLanguage;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  sourceHash: string;
  algorithmFingerprint: string;
  reviewedAt?: string;
};

function objectBounds(text: string, marker: number): { start: number; end: number } {
  const stack: number[] = []; let inString = false; let escaped = false;
  for (let index = 0; index <= marker; index += 1) {
    const character = text[index];
    if (inString) { if (escaped) escaped = false; else if (character === "\\") escaped = true; else if (character === '"') inString = false; continue; }
    if (character === '"') inString = true; else if (character === "{") stack.push(index); else if (character === "}") stack.pop();
  }
  const start = stack.at(-1); if (start === undefined) throw new Error("Could not locate cue-card object.");
  let depth = 0; inString = false; escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (inString) { if (escaped) escaped = false; else if (character === "\\") escaped = true; else if (character === '"') inString = false; continue; }
    if (character === '"') inString = true; else if (character === "{") depth += 1; else if (character === "}" && --depth === 0) return { start, end: index + 1 };
  }
  throw new Error("Cue-card object is not closed.");
}

/** Atomically updates only the selected cue-card object, leaving unrelated source formatting untouched. */
export function approvePronunciationOverride(input: ApprovalInput): void {
  if (!Number.isFinite(input.startSeconds) || !Number.isFinite(input.endSeconds) || input.startSeconds < 0 || input.endSeconds <= input.startSeconds || input.endSeconds > input.durationSeconds) throw new Error("Approved range must be ordered and inside the source video.");
  if (!/^[a-f0-9]{64}$/.test(input.sourceHash) || !input.algorithmFingerprint) throw new Error("Invalid review provenance.");
  const original = readFileSync(input.cardsPath, "utf8"); const root = JSON.parse(original) as { cueCards?: unknown[] };
  const cards = CueCardSchema.array().parse(root.cueCards); const index = cards.findIndex((card) => card.id === input.cueCardId); if (index === -1) throw new Error(`Unknown cue card: ${input.cueCardId}`);
  const card = cards[index]; const previous = card.pronunciationOverrides?.[input.language];
  const updated = CueCardSchema.parse({
    ...card,
    pronunciationOverrides: {
      ...card.pronunciationOverrides,
      [input.language]: {
        startSeconds: Number(input.startSeconds.toFixed(3)), endSeconds: Number(input.endSeconds.toFixed(3)),
        ...(previous?.matchText ? { matchText: previous.matchText } : {}),
        review: { sourceHash: input.sourceHash, algorithmFingerprint: input.algorithmFingerprint, reviewedAt: input.reviewedAt ?? new Date().toISOString() },
      },
    },
  });
  const encodedId = JSON.stringify(input.cueCardId); const marker = original.indexOf(`"id": ${encodedId}`);
  const fallbackMarker = marker === -1 ? original.indexOf(encodedId) : marker; if (fallbackMarker === -1) throw new Error("Could not locate cue card in source text.");
  const bounds = objectBounds(original, fallbackMarker); const next = `${original.slice(0, bounds.start)}${JSON.stringify(updated)}${original.slice(bounds.end)}`;
  const validated = JSON.parse(next) as { cueCards?: unknown[] }; CueCardSchema.array().parse(validated.cueCards);
  const temporary = `${input.cardsPath}.tmp-${process.pid}`; writeFileSync(temporary, next); renameSync(temporary, input.cardsPath);
}
