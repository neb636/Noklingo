// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { LessonExperience } from "../src/components/LessonExperience";
import { buildPracticeQuiz } from "../src/engine/practice-quiz";
import { cueCards, lessons } from "../src/domain/seed";
import { QUIZ_SOUND_SOURCES } from "../src/lib/use-quiz-sounds";
import { defaultSnapshot, useStudyStore } from "../src/state/study-store";

const howls = vi.hoisted(() => [] as Array<{
  options: Record<string, unknown>;
  play: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  unload: ReturnType<typeof vi.fn>;
}>);

vi.mock("howler", () => ({
  Howl: class {
    options: Record<string, unknown>;
    play = vi.fn();
    stop = vi.fn();
    unload = vi.fn();
    constructor(options: Record<string, unknown>) {
      this.options = options;
      howls.push(this);
    }
  },
}));

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (value: string) => ({ matches: false, media: value, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }),
  });
});

beforeEach(() => {
  howls.length = 0;
  useStudyStore.setState({ ...defaultSnapshot, hydrated: true, hydrationNotice: false });
});

afterEach(cleanup);

function sound(kind: keyof typeof QUIZ_SOUND_SOURCES) {
  return howls.find((howl) => howl.options.src instanceof Array && howl.options.src[0] === QUIZ_SOUND_SOURCES[kind]);
}

function enterQuiz(lessonId: string) {
  const lesson = lessons.find((item) => item.id === lessonId)!;
  render(<LessonExperience lesson={lesson} />);
  fireEvent.click(screen.getByRole("button", { name: /skip to cards/i }));
  for (let index = 1; index < lesson.cueCardIds.length; index += 1) {
    fireEvent.click(screen.getByRole("button", { name: /^next card/i }));
  }
  fireEvent.click(screen.getByRole("button", { name: /start practice quiz/i }));
  return lesson;
}

describe("lesson practice quiz feedback sounds", () => {
  it("plays the configured correct cue and a separate perfect-score celebration", () => {
    useStudyStore.setState((state) => ({ ...state, settings: { ...state.settings, volume: 0.4 } }));
    const lesson = enterQuiz("large-numbers");
    const card = cueCards.find((item) => item.id === lesson.cueCardIds[0])!;

    expect(sound("correct")?.options).toMatchObject({ preload: true, rate: 1, volume: 0.4 });
    fireEvent.click(screen.getByRole("button", { name: card.naturalMeaning }));
    fireEvent.click(screen.getByRole("button", { name: /check answer/i }));
    expect(sound("correct")?.play).toHaveBeenCalledTimes(1);
    expect(sound("incorrect")?.play).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /see results/i }));
    expect(screen.getByRole("heading", { name: "1 of 1" })).toBeInTheDocument();
    expect(sound("perfect")?.play).toHaveBeenCalledTimes(1);
  });

  it("plays the wrong-answer buzz but never celebrates a non-perfect result", () => {
    const lesson = enterQuiz("directions");
    const lessonCards = lesson.cueCardIds.map((id) => cueCards.find((card) => card.id === id)!).filter(Boolean);
    const questions = buildPracticeQuiz(lessonCards, cueCards, `${lesson.id}:practice:1`);

    questions.forEach((question, index) => {
      const choiceId = index === 0
        ? question.choiceCardIds.find((id) => id !== question.correctChoiceId)!
        : question.correctChoiceId;
      const choice = cueCards.find((card) => card.id === choiceId)!;
      fireEvent.click(screen.getByRole("button", { name: choice.naturalMeaning }));
      fireEvent.click(screen.getByRole("button", { name: /check answer/i }));
      fireEvent.click(screen.getByRole("button", { name: index === questions.length - 1 ? /see results/i : /continue/i }));
    });

    expect(sound("incorrect")?.play).toHaveBeenCalledTimes(1);
    expect(sound("correct")?.play).toHaveBeenCalledTimes(questions.length - 1);
    expect(sound("perfect")?.play).not.toHaveBeenCalled();
  });

  it.each([
    { audioEnabled: false, volume: 0.75, state: "audio is disabled" },
    { audioEnabled: true, volume: 0, state: "volume is zero" },
  ])("does not preload or play feedback effects when $state", ({ audioEnabled, volume }) => {
    useStudyStore.setState((state) => ({ ...state, settings: { ...state.settings, audioEnabled, volume } }));
    const lesson = enterQuiz("large-numbers");
    const card = cueCards.find((item) => item.id === lesson.cueCardIds[0])!;

    fireEvent.click(screen.getByRole("button", { name: card.naturalMeaning }));
    fireEvent.click(screen.getByRole("button", { name: /check answer/i }));
    fireEvent.click(screen.getByRole("button", { name: /see results/i }));

    expect(howls).toHaveLength(0);
  });
});
