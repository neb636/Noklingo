// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConceptAudioButton, ThaiAudioButton } from "../src/components/PhraseAudioButton";
import type { CueCard } from "../src/domain/schemas";
import { defaultSnapshot, useStudyStore } from "../src/state/study-store";

const howls = vi.hoisted(() => [] as Array<{ options: Record<string, unknown>; unload: ReturnType<typeof vi.fn> }>);
vi.mock("howler", () => ({
  Howl: class {
    options: Record<string, unknown>;
    unload = vi.fn();
    constructor(options: Record<string, unknown>) { this.options = options; howls.push(this); }
    play() { (this.options.onplay as (() => void) | undefined)?.(); }
  },
}));

const card: CueCard = {
  id: "audio-card", lessonId: "audio", emoji: "🔊", thai: "กิน", romanization: "gin", naturalMeaning: "eat",
  thaiAudioSrc: "/lessons/audio/audio-card-th.m4a", englishAudioSrc: "/lessons/audio/audio-card-en.m4a", verificationStatus: "draft",
};

beforeEach(() => {
  vi.useFakeTimers();
  howls.length = 0;
  useStudyStore.setState({ ...defaultSnapshot, hydrated: true, hydrationNotice: false });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("dual-language audio playback", () => {
  it("plays Thai, waits 750 ms after it ends, then plays English", () => {
    render(<ConceptAudioButton card={card} />);
    fireEvent.click(screen.getByRole("button"));
    expect(howls).toHaveLength(1);
    expect(howls[0].options.src).toEqual([card.thaiAudioSrc]);
    act(() => { (howls[0].options.onend as () => void)(); vi.advanceTimersByTime(749); });
    expect(howls).toHaveLength(1);
    act(() => vi.advanceTimersByTime(1));
    expect(howls).toHaveLength(2);
    expect(howls[1].options.src).toEqual([card.englishAudioSrc]);
  });

  it("never loads English for Thai-only quiz playback", () => {
    render(<ThaiAudioButton card={card} />);
    fireEvent.click(screen.getByRole("button"));
    expect(howls).toHaveLength(1);
    expect(howls[0].options.src).toEqual([card.thaiAudioSrc]);
    act(() => { (howls[0].options.onend as () => void)(); vi.advanceTimersByTime(1000); });
    expect(howls).toHaveLength(1);
  });

  it("cancels a pending English clip when the card unmounts", () => {
    const view = render(<ConceptAudioButton card={card} />);
    fireEvent.click(screen.getByRole("button"));
    act(() => (howls[0].options.onend as () => void)());
    view.unmount();
    act(() => vi.advanceTimersByTime(1000));
    expect(howls).toHaveLength(1);
  });
});
