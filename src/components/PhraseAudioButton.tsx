"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { Howl } from "howler";
import type { CueCard } from "@/domain/schemas";
import { assetPath } from "@/lib/asset-path";
import { useStudyStore } from "@/state/study-store";
import { withPreferredParticle } from "@/lib/language-display";

export function PhraseAudioButton({ card, compact = false }: { card: CueCard; compact?: boolean }) {
  const [speaking, setSpeaking] = useState(false);
  const settings = useStudyStore((state) => state.settings);

  function speechFallback() {
    if (!("speechSynthesis" in window)) return setSpeaking(false);
    window.speechSynthesis.cancel();
    const spokenThai = withPreferredParticle(card.thai, settings.politeParticle).replaceAll("…", "");
    const utterance = new SpeechSynthesisUtterance(spokenThai);
    utterance.lang = "th-TH";
    utterance.rate = settings.speechRate;
    utterance.volume = settings.volume;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function play() {
    if (!settings.audioEnabled || speaking) return;
    setSpeaking(true);
    if (!card.phraseAudioSrc) return speechFallback();
    const sound = new Howl({
      src: [assetPath(card.phraseAudioSrc)], html5: true,
      rate: settings.speechRate, volume: settings.volume,
      onend: () => setSpeaking(false),
      onloaderror: () => speechFallback(),
      onplayerror: () => speechFallback(),
    });
    sound.play();
  }

  return (
    <button className={compact ? "icon-button" : "audio-button"} onClick={play} disabled={!settings.audioEnabled} aria-label={`Hear ${withPreferredParticle(card.thai, settings.politeParticle)}`}>
      <Volume2 size={compact ? 18 : 17} aria-hidden="true" />
      {!compact && <span>{speaking ? "Speaking…" : "Hear phrase"}</span>}
    </button>
  );
}
