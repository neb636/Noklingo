import manifest from "@/content/pronunciation-manifest.json";
import type { CueCard } from "@/domain/schemas";
import type { PronunciationIndex } from "@/domain/pronunciation";

const pronunciationIndex = manifest as unknown as PronunciationIndex;

export type ConceptAudioAssets = { thaiSrc?: string; englishSrc?: string };

export function pronunciationAudioAssets(card: CueCard): ConceptAudioAssets {
  if (card.thaiAudioSrc || card.englishAudioSrc) return { thaiSrc: card.thaiAudioSrc, englishSrc: card.englishAudioSrc };
  for (const lesson of pronunciationIndex.lessons) {
    const clip = lesson.clips.find((entry) => entry.cueCardId === card.id);
    if (!clip) continue;
    const usable = (entry: typeof clip.thai | undefined) => entry?.audio && (entry.status === "matched" || entry.status === "overridden") ? entry.audio : undefined;
    return { thaiSrc: usable(clip.thai), englishSrc: usable(clip.english) };
  }
  return {};
}
