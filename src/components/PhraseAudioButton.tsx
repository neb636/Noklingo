"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Howl } from "howler";
import type { CueCard } from "@/domain/schemas";
import { assetPath } from "@/lib/asset-path";
import { CUE_CARD_TRANSLATION_PAUSE_MS } from "@/lib/audio-config";
import { pronunciationAudioAssets } from "@/lib/pronunciation-audio";
import { useStudyStore } from "@/state/study-store";
import { withPreferredParticle } from "@/lib/language-display";

type AudioState = "idle" | "loading" | "playing" | "error";
let activeAudio: { owner: symbol; stop: () => void } | undefined;

function AudioSequenceButton({ sources, label, compact = false, pauseMs = 0, autoPlayDelayMs, autoPlayKey, displayLabel }: {
  sources: string[]; label: string; compact?: boolean; pauseMs?: number; autoPlayDelayMs?: number; autoPlayKey?: string; displayLabel?: string;
}) {
  const [audioState, setAudioState] = useState<AudioState>("idle");
  const ownerRef = useRef(Symbol("audio-sequence"));
  const soundRef = useRef<Howl | null>(null);
  const pauseRef = useRef<number | undefined>(undefined);
  const autoplayRef = useRef<number | undefined>(undefined);
  const settings = useStudyStore((state) => state.settings);
  const updateSettings = useStudyStore((state) => state.updateSettings);
  const sourceKey = sources.join("\u0000");

  const stop = useCallback((next: AudioState = "idle") => {
    if (pauseRef.current !== undefined) window.clearTimeout(pauseRef.current);
    if (autoplayRef.current !== undefined) window.clearTimeout(autoplayRef.current);
    pauseRef.current = undefined;
    autoplayRef.current = undefined;
    soundRef.current?.unload();
    soundRef.current = null;
    if (activeAudio?.owner === ownerRef.current) activeAudio = undefined;
    setAudioState(next);
  }, []);

  useEffect(() => () => stop(), [sourceKey, stop]);

  const play = useCallback(() => {
    if (!settings.audioEnabled) {
      updateSettings({ audioEnabled: true });
      setAudioState("idle");
      return;
    }
    if (!sourceKey || audioState === "loading" || audioState === "playing") return;
    activeAudio?.stop();
    activeAudio = { owner: ownerRef.current, stop: () => stop("idle") };
    const playbackSources = sourceKey.split("\u0000");
    stop("loading");
    const playAt = (index: number) => {
      const sound = new Howl({
        src: [assetPath(playbackSources[index])],
        html5: true,
        rate: settings.speechRate,
        volume: settings.volume,
        onplay: () => setAudioState("playing"),
        onend: () => {
          sound.unload();
          soundRef.current = null;
          if (index + 1 >= playbackSources.length) {
            stop("idle");
            return;
          }
          pauseRef.current = window.setTimeout(() => playAt(index + 1), pauseMs);
        },
        onloaderror: () => stop("error"),
        onplayerror: () => stop("error"),
      });
      soundRef.current = sound;
      sound.play();
    };
    playAt(0);
  }, [audioState, pauseMs, settings.audioEnabled, settings.speechRate, settings.volume, sourceKey, stop, updateSettings]);

  useEffect(() => {
    if (autoPlayDelayMs === undefined || !settings.audioEnabled || !sourceKey) return;
    autoplayRef.current = window.setTimeout(play, autoPlayDelayMs);
    return () => {
      if (autoplayRef.current !== undefined) window.clearTimeout(autoplayRef.current);
    };
  }, [autoPlayDelayMs, autoPlayKey, play, settings.audioEnabled, sourceKey]);

  const unavailable = !sourceKey;
  const buttonLabel = !settings.audioEnabled ? `Turn sound on for ${label}` : unavailable ? `${label} is unavailable` : audioState === "error" ? `Retry ${label}` : audioState === "playing" ? `Playing ${label}` : `Play ${label}`;
  const Icon = !settings.audioEnabled || unavailable ? VolumeX : audioState === "loading" ? LoaderCircle : audioState === "error" ? RotateCcw : Volume2;
  return <button type="button" className={`${compact ? "icon-button" : "audio-button"}${audioState === "error" ? " audio-error" : ""}`} onClick={play} disabled={unavailable} aria-label={buttonLabel} aria-live="polite">
    <Icon className={audioState === "loading" ? "spin" : undefined} size={compact ? 18 : 17} aria-hidden="true" />
    {!compact && <span>{displayLabel ?? buttonLabel}</span>}
  </button>;
}

export function LocalAudioButton({ src, label, compact = false, autoPlayDelayMs, autoPlayKey, displayLabel }: { src?: string; label: string; compact?: boolean; autoPlayDelayMs?: number; autoPlayKey?: string; displayLabel?: string }) {
  return <AudioSequenceButton sources={src ? [src] : []} label={label} compact={compact} autoPlayDelayMs={autoPlayDelayMs} autoPlayKey={autoPlayKey} displayLabel={displayLabel} />;
}

export function ThaiAudioButton({ card, compact = false, autoPlayDelayMs, autoPlayKey, displayLabel }: { card: CueCard; compact?: boolean; autoPlayDelayMs?: number; autoPlayKey?: string; displayLabel?: string }) {
  const particle = useStudyStore((state) => state.settings.politeParticle);
  const { thaiSrc } = pronunciationAudioAssets(card);
  return <LocalAudioButton src={thaiSrc} label={withPreferredParticle(card.thai, particle)} compact={compact} autoPlayDelayMs={autoPlayDelayMs} autoPlayKey={autoPlayKey} displayLabel={displayLabel} />;
}

export function ConceptAudioButton({ card, compact = false, displayLabel }: { card: CueCard; compact?: boolean; displayLabel?: string }) {
  const particle = useStudyStore((state) => state.settings.politeParticle);
  const assets = pronunciationAudioAssets(card);
  const sources = assets.thaiSrc ? [assets.thaiSrc, assets.englishSrc].filter((value): value is string => Boolean(value)) : [];
  return <AudioSequenceButton sources={sources} label={`${withPreferredParticle(card.thai, particle)} then ${card.naturalMeaning}`} compact={compact} pauseMs={CUE_CARD_TRANSLATION_PAUSE_MS} displayLabel={displayLabel} />;
}
