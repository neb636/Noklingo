import { Howl } from "howler";

class AudioGuide {
  private active: Howl | null = null;

  play(ref: string | undefined, enabled: boolean, volume: number) {
    if (!ref || !enabled || typeof window === "undefined") return;
    this.stop();

    if (ref.startsWith("tts:")) {
      if (!("speechSynthesis" in window)) return;
      const utterance = new SpeechSynthesisUtterance(ref.slice(4));
      utterance.lang = "th-TH";
      utterance.rate = 0.82;
      utterance.volume = volume;
      window.speechSynthesis.speak(utterance);
      return;
    }

    this.active = new Howl({ src: [ref], volume, html5: true });
    this.active.play();
  }

  stop() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.active?.stop();
    this.active = null;
  }
}

export const audioGuide = new AudioGuide();
