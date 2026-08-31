// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { StrictMode } from "react";
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
  it("plays English, waits 750 ms after it ends, then plays Thai", () => {
    render(<ConceptAudioButton card={card} />);
    fireEvent.click(screen.getByRole("button"));
    expect(howls).toHaveLength(1);
    expect(howls[0].options.src).toEqual([card.englishAudioSrc]);
    act(() => { (howls[0].options.onend as () => void)(); vi.advanceTimersByTime(749); });
    expect(howls).toHaveLength(1);
    act(() => vi.advanceTimersByTime(1));
    expect(howls).toHaveLength(2);
    expect(howls[1].options.src).toEqual([card.thaiAudioSrc]);
  });

  it("autoplays both languages for a display card", () => {
    render(<ConceptAudioButton card={card} autoPlayDelayMs={1000} autoPlayKey={card.id} />);

    act(() => vi.advanceTimersByTime(1000));
    expect(howls).toHaveLength(1);
    expect(howls[0].options.src).toEqual([card.englishAudioSrc]);

    act(() => { (howls[0].options.onend as () => void)(); vi.advanceTimersByTime(750); });
    expect(howls).toHaveLength(2);
    expect(howls[1].options.src).toEqual([card.thaiAudioSrc]);
  });

  it("never loads English for Thai-only quiz playback", () => {
    render(<ThaiAudioButton card={card} />);
    fireEvent.click(screen.getByRole("button"));
    expect(howls).toHaveLength(1);
    expect(howls[0].options.src).toEqual([card.thaiAudioSrc]);
    act(() => { (howls[0].options.onend as () => void)(); vi.advanceTimersByTime(1000); });
    expect(howls).toHaveLength(1);
  });

  it("autoplays each quiz prompt once without replaying the current prompt", () => {
    const view = render(<StrictMode><ThaiAudioButton key="question-1" card={card} autoPlayDelayMs={1000} autoPlayKey="question-1" /></StrictMode>);

    act(() => vi.advanceTimersByTime(1000));
    expect(howls).toHaveLength(1);

    act(() => (howls[0].options.onend as () => void)());
    act(() => vi.advanceTimersByTime(5000));
    expect(howls).toHaveLength(1);

    view.rerender(<StrictMode><ThaiAudioButton key="question-2" card={card} autoPlayDelayMs={1000} autoPlayKey="question-2" /></StrictMode>);
    act(() => vi.advanceTimersByTime(1000));
    expect(howls).toHaveLength(2);

    act(() => (howls[1].options.onend as () => void)());
    act(() => vi.advanceTimersByTime(5000));
    expect(howls).toHaveLength(2);
  });

  it("cancels pending autoplay when the quiz audio button is clicked", () => {
    render(<ThaiAudioButton card={card} autoPlayDelayMs={1000} autoPlayKey="question-1" />);

    fireEvent.click(screen.getByRole("button"));
    expect(howls).toHaveLength(1);

    act(() => vi.advanceTimersByTime(5000));
    expect(howls).toHaveLength(1);
  });

  it("allows manual replay after a quiz prompt has autoplayed", () => {
    render(<ThaiAudioButton card={card} autoPlayDelayMs={1000} autoPlayKey="question-1" />);

    act(() => vi.advanceTimersByTime(1000));
    act(() => (howls[0].options.onend as () => void)());
    fireEvent.click(screen.getByRole("button"));

    expect(howls).toHaveLength(2);
  });

  it("does not autoplay a current quiz prompt when audio is enabled after entry", () => {
    useStudyStore.setState((state) => ({ ...state, settings: { ...state.settings, audioEnabled: false } }));
    render(<ThaiAudioButton card={card} autoPlayDelayMs={1000} autoPlayKey="question-1" />);

    useStudyStore.setState((state) => ({ ...state, settings: { ...state.settings, audioEnabled: true } }));
    act(() => vi.advanceTimersByTime(5000));

    expect(howls).toHaveLength(0);
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
