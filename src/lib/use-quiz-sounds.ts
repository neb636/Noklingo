"use client";

import { useCallback, useEffect, useRef } from "react";
import { Howl } from "howler";
import { assetPath } from "@/lib/asset-path";
import { claimAudioChannel, releaseAudioChannel } from "@/lib/audio-channel";
import { useStudyStore } from "@/state/study-store";

export type QuizSound = "correct" | "incorrect" | "perfect";

export const QUIZ_SOUND_SOURCES: Record<QuizSound, string> = {
  correct: "/lessons/audio/quiz-feedback/correct.mp3",
  incorrect: "/lessons/audio/quiz-feedback/incorrect.mp3",
  perfect: "/lessons/audio/quiz-feedback/perfect.mp3",
};

export function useQuizSounds(enabled: boolean) {
  const audioEnabled = useStudyStore((state) => state.settings.audioEnabled);
  const volume = useStudyStore((state) => state.settings.volume);
  const ownerRef = useRef(Symbol("quiz-sounds"));
  const soundsRef = useRef<Partial<Record<QuizSound, Howl>>>({});

  const stop = useCallback(() => {
    Object.values(soundsRef.current).forEach((sound) => sound.stop());
    releaseAudioChannel(ownerRef.current);
  }, []);

  useEffect(() => {
    if (!enabled || !audioEnabled || volume <= 0) return;

    const owner = ownerRef.current;
    const sounds = Object.fromEntries(
      (Object.entries(QUIZ_SOUND_SOURCES) as Array<[QuizSound, string]>).map(([kind, source]) => [kind, new Howl({
        src: [assetPath(source)],
        preload: true,
        rate: 1,
        volume,
        onend: () => releaseAudioChannel(owner),
        onloaderror: () => releaseAudioChannel(owner),
        onplayerror: () => releaseAudioChannel(owner),
      })]),
    ) as Record<QuizSound, Howl>;
    soundsRef.current = sounds;

    return () => {
      Object.values(sounds).forEach((sound) => sound.unload());
      soundsRef.current = {};
      releaseAudioChannel(owner);
    };
  }, [audioEnabled, enabled, volume]);

  const play = useCallback((kind: QuizSound) => {
    if (!enabled || !audioEnabled || volume <= 0) return;
    const sound = soundsRef.current[kind];
    if (!sound) return;
    stop();
    claimAudioChannel(ownerRef.current, stop);
    sound.play();
  }, [audioEnabled, enabled, stop, volume]);

  return { play, stop };
}
