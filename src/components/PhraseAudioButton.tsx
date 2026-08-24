"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { Howl } from "howler";
import type { CueCard } from "@/domain/schemas";
import { assetPath } from "@/lib/asset-path";
import { useStudyStore } from "@/state/study-store";

export function PhraseAudioButton({ card, compact = false }: { card: CueCard; compact?: boolean }) {
  const [speaking, setSpeaking] = useState(false);
  const settings = useStudyStore((state) => state.settings);

  function speechFallback() {
    if (!("speechSynthesis" in window)) return setSpeaking(false);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(card.thai.replace("…", ""));
    utterance.lang = "th-TH";
    utterance.rate = settings.speechRate;
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
      rate: settings.speechRate,
      onend: () => setSpeaking(false),
      onloaderror: () => speechFallback(),
      onplayerror: () => speechFallback(),
    });
    sound.play();
  }

  return (
    <button className={compact ? "icon-button" : "audio-button"} onClick={play} disabled={!settings.audioEnabled} aria-label={`Hear ${card.thai}`}>
      <Volume2 size={compact ? 18 : 17} aria-hidden="true" />
      {!compact && <span>{speaking ? "Speaking…" : "Hear phrase"}</span>}
    </button>
  );
}
