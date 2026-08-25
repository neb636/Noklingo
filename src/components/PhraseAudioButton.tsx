"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Howl } from "howler";
import type { CueCard } from "@/domain/schemas";
import { assetPath } from "@/lib/asset-path";
import { useStudyStore } from "@/state/study-store";
import { withPreferredParticle } from "@/lib/language-display";

type AudioState = "idle" | "loading" | "playing" | "error";

export function LocalAudioButton({
  src,
  label,
  compact = false,
}: {
  src?: string;
  label: string;
  compact?: boolean;
}) {
  const [audioState, setAudioState] = useState<AudioState>("idle");
  const soundRef = useRef<Howl | null>(null);
  const settings = useStudyStore((state) => state.settings);
  const updateSettings = useStudyStore((state) => state.updateSettings);

  useEffect(() => () => { soundRef.current?.unload(); }, []);

  function stopAndReset(next: AudioState) {
    soundRef.current?.unload();
    soundRef.current = null;
    setAudioState(next);
  }

  function play() {
    if (!settings.audioEnabled) {
      updateSettings({ audioEnabled: true });
      setAudioState("idle");
      return;
    }
    if (!src || audioState === "loading" || audioState === "playing") return;

    setAudioState("loading");
    const sound = new Howl({
      src: [assetPath(src)],
      html5: true,
      rate: settings.speechRate,
      volume: settings.volume,
      onplay: () => setAudioState("playing"),
      onend: () => stopAndReset("idle"),
      onloaderror: () => stopAndReset("error"),
      onplayerror: () => stopAndReset("error"),
    });
    soundRef.current = sound;
    sound.play();
  }

  const unavailable = !src;
  const buttonLabel = !settings.audioEnabled
    ? `Turn sound on for ${label}`
    : unavailable
      ? `${label} is unavailable`
      : audioState === "error"
        ? `Retry ${label}`
        : audioState === "playing"
          ? `Playing ${label}`
          : `Play ${label}`;
  const Icon = !settings.audioEnabled || unavailable
    ? VolumeX
    : audioState === "loading"
      ? LoaderCircle
      : audioState === "error"
        ? RotateCcw
        : Volume2;

  return (
    <button
      type="button"
      className={`${compact ? "icon-button" : "audio-button"}${audioState === "error" ? " audio-error" : ""}`}
      onClick={play}
      disabled={unavailable}
      aria-label={buttonLabel}
      aria-live="polite"
    >
      <Icon className={audioState === "loading" ? "spin" : undefined} size={compact ? 18 : 17} aria-hidden="true" />
      {!compact && <span>{buttonLabel}</span>}
    </button>
  );
}

export function PhraseAudioButton({ card, compact = false }: { card: CueCard; compact?: boolean }) {
  const particle = useStudyStore((state) => state.settings.politeParticle);
  return (
    <LocalAudioButton
      src={card.phraseAudioSrc}
      label={withPreferredParticle(card.thai, particle)}
      compact={compact}
    />
  );
}
