import manifest from "@/content/pronunciation-manifest.json";
import type { CueCard } from "@/domain/schemas";
import type { PronunciationIndex } from "@/domain/pronunciation";

const pronunciationIndex = manifest as PronunciationIndex;

export function pronunciationAudioSrc(card: CueCard): string | undefined {
  if (card.phraseAudioSrc) return card.phraseAudioSrc;
  for (const lesson of pronunciationIndex.lessons) {
    const clip = lesson.clips.find((entry) => entry.cueCardId === card.id);
    if (clip?.audio && (clip.status === "matched" || clip.status === "overridden")) return clip.audio;
  }
  return undefined;
}
