import { Howl } from "howler";
import type { AudioAsset } from "@/src/domain/types";

export type AudioPlaybackSpeed = "normal" | "slow";
export type AudioAssetResolver = (
  audioRef: string | undefined,
) => AudioAsset | undefined;

type AudioAssetCollection =
  readonly AudioAsset[] | Readonly<Record<string, AudioAsset>>;

const playbackRate = (asset: AudioAsset, speed: AudioPlaybackSpeed) =>
  speed === "slow" && !asset.slowSrc ? 0.72 : 1;

const sourceFor = (asset: AudioAsset, speed: AudioPlaybackSpeed) =>
  speed === "slow" ? (asset.slowSrc ?? asset.src) : asset.src;

const ttsTextFromSource = (source: string | undefined) => {
  if (source?.startsWith("tts-slow:")) return source.slice("tts-slow:".length);
  if (source?.startsWith("tts:")) return source.slice("tts:".length);
  return undefined;
};

const preloadKey = (source: string, speed: AudioPlaybackSpeed) =>
  `${speed}:${source}`;

export function createAudioAssetResolver(
  assets: AudioAssetCollection,
): AudioAssetResolver {
  const assetsById = Array.isArray(assets)
    ? new Map(assets.map((asset) => [asset.id, asset]))
    : new Map(Object.entries(assets));

  return (audioRef) => (audioRef ? assetsById.get(audioRef) : undefined);
}

export function resolveAudioAsset(
  audioRef: string | undefined,
  assets: AudioAssetCollection,
) {
  return createAudioAssetResolver(assets)(audioRef);
}

class AudioGuide {
  private active: Howl | null = null;
  private preloaded = new Map<string, Howl>();
  private playbackGeneration = 0;
  private settlePendingPlayback: ((played: boolean) => void) | null = null;

  async play(
    asset: AudioAsset | undefined,
    enabled: boolean,
    volume: number,
    speed: AudioPlaybackSpeed = "normal",
  ): Promise<boolean> {
    if (!asset || !enabled || typeof window === "undefined") return false;

    const generation = ++this.playbackGeneration;
    this.stopActive();
    const source = sourceFor(asset, speed);
    const ttsText = ttsTextFromSource(source);

    if (ttsText) return this.speakText(ttsText, volume, speed);

    if (source) {
      const played = await this.playSource(
        source,
        volume,
        speed,
        playbackRate(asset, speed),
        generation,
      );
      if (played) return true;
    }

    if (generation !== this.playbackGeneration) return false;
    return this.speakFallback(asset, volume, speed);
  }

  preload(asset: AudioAsset | undefined, speed: AudioPlaybackSpeed = "normal") {
    if (!asset || typeof window === "undefined") return false;
    const source = sourceFor(asset, speed);
    if (!source || ttsTextFromSource(source)) return false;

    const key = preloadKey(source, speed);
    if (this.preloaded.has(key)) return true;

    const howl = new Howl({
      src: [source],
      html5: true,
      preload: true,
      rate: playbackRate(asset, speed),
    });
    howl.once("loaderror", () => {
      if (this.preloaded.get(key) === howl) this.preloaded.delete(key);
      howl.unload();
    });
    this.preloaded.set(key, howl);
    howl.load();
    return true;
  }

  stop() {
    this.playbackGeneration += 1;
    this.stopActive();
  }

  clearPreloaded() {
    for (const howl of this.preloaded.values()) howl.unload();
    this.preloaded.clear();
  }

  private stopActive() {
    this.settlePendingPlayback?.(false);
    this.settlePendingPlayback = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.active?.stop();
    this.active?.unload();
    this.active = null;
  }

  private playSource(
    source: string,
    volume: number,
    speed: AudioPlaybackSpeed,
    rate: number,
    generation: number,
  ) {
    return new Promise<boolean>((resolve) => {
      const key = preloadKey(source, speed);
      const howl =
        this.preloaded.get(key) ??
        new Howl({
          src: [source],
          html5: true,
          preload: true,
          rate,
        });
      this.preloaded.delete(key);
      howl.volume(volume);
      howl.rate(rate);
      this.active = howl;

      let settled = false;
      const settle = (played: boolean) => {
        if (settled) return;
        settled = true;
        if (this.settlePendingPlayback === settle) {
          this.settlePendingPlayback = null;
        }
        resolve(played && generation === this.playbackGeneration);
      };
      this.settlePendingPlayback = settle;
      const fail = () => {
        if (this.active === howl) this.active = null;
        howl.unload();
        settle(false);
      };

      howl.once("play", () => settle(true));
      howl.once("loaderror", fail);
      howl.once("playerror", fail);

      try {
        howl.play();
      } catch {
        fail();
      }
    });
  }

  private speakFallback(
    asset: AudioAsset,
    volume: number,
    speed: AudioPlaybackSpeed,
  ) {
    const text = asset.fallbackText ?? asset.transcriptThai;
    return this.speakText(text, volume, speed);
  }

  private speakText(text: string, volume: number, speed: AudioPlaybackSpeed) {
    if (!("speechSynthesis" in window)) return false;
    if (!text || typeof SpeechSynthesisUtterance === "undefined") return false;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "th-TH";
    utterance.rate = speed === "slow" ? 0.62 : 0.86;
    utterance.volume = volume;
    const thaiVoice = window.speechSynthesis
      .getVoices()
      .find((voice) => voice.lang.toLocaleLowerCase().startsWith("th"));
    if (thaiVoice) utterance.voice = thaiVoice;
    window.speechSynthesis.speak(utterance);
    return true;
  }
}

export const audioGuide = new AudioGuide();
