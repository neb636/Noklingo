// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PracticeQuiz } from "../src/components/PracticeQuiz";
import { cueCards, lessons } from "../src/domain/seed";
import LibraryPage from "../src/pages/library";
import StudyPage from "../src/pages/study";
import TodayPage from "../src/pages/today";
import { defaultSnapshot, useStudyStore } from "../src/state/study-store";

let query: Record<string, string> = {};
vi.mock("next/router", () => ({ useRouter: () => ({ query, pathname: "/study" }) }));

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (value: string) => ({ matches: false, media: value, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }),
  });
  window.scrollTo = vi.fn();
  Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
  Object.defineProperty(HTMLMediaElement.prototype, "pause", { configurable: true, value: vi.fn() });
});

beforeEach(() => {
  query = {};
  useStudyStore.setState({ ...defaultSnapshot, hydrated: true, hydrationNotice: false });
});
afterEach(() => {
  cleanup();
});

describe("lesson collection UI", () => {
  it("offers the lesson collection while scored study is unavailable", () => {
    render(<TodayPage />);
    expect(screen.getByRole("heading", { name: /23 short lessons are ready/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse lessons/i })).toBeInTheDocument();
  });

  it("opens the immersive video and lets practice continue to cue cards", () => {
    query = { preview: "common-verbs" };
    const { container } = render(<StudyPage />);
    expect(screen.getByRole("heading", { name: /essential verbs/i })).not.toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Play Essential verbs video" }));
    expect(container.querySelector(".immersive-video")).not.toBeNull();
    expect(screen.queryByRole("button", { name: /fullscreen/i })).not.toBeInTheDocument();
    const video = container.querySelector("video")!;
    expect(video).toHaveAttribute("autoplay");
    expect(video).not.toHaveAttribute("controls");
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /continue to cards/i }).closest("footer")).toHaveClass("immersive-video-footer");
    fireEvent.click(screen.getByRole("button", { name: /continue to cards/i }));
    expect(screen.getByText(/cue cards/i)).toBeInTheDocument();
    expect(screen.getByText("กิน")).toBeInTheDocument();
    expect(screen.getByText("eat")).toBeInTheDocument();
  });

  it("presents the supplied clips as a learner-facing collection", () => {
    const { container } = render(<LibraryPage />);
    expect(screen.getByRole("heading", { name: /explore the collection/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open lesson 1: essential verbs/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /previous lesson|next lesson/i })).not.toBeInTheDocument();
    expect(container.querySelector("video")).toBeNull();
  });

  it("moves from swipeable cue cards into the unscored visual quiz", () => {
    query = { preview: "food-flavors" };
    render(<StudyPage />);
    fireEvent.click(screen.getByRole("button", { name: /skip to cards/i }));

    expect(screen.getByText("🍋")).toBeInTheDocument();
    for (let index = 1; index < 6; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: /^next card/i }));
    }
    fireEvent.click(screen.getByRole("button", { name: /start practice quiz/i }));

    const prompt = screen.getByText(/choose the correct translation/i).parentElement;
    expect(prompt).toBeInTheDocument();
    expect(prompt).toHaveFocus();
    const choice = screen.getAllByRole("button").find((button) => button.classList.contains("visual-choice"));
    expect(choice).toBeDefined();
    fireEvent.click(choice!);
    const check = screen.getByRole("button", { name: /check answer/i });
    expect(check).toBeEnabled();
    fireEvent.click(check);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(useStudyStore.getState().activeSession).toBeNull();
  });

  it("includes a correct final practice answer in the local result", () => {
    const lesson = lessons.find((item) => item.id === "large-numbers")!;
    const lessonCards = cueCards.filter((card) => card.lessonId === lesson.id);
    const onComplete = vi.fn();
    render(<PracticeQuiz lesson={lesson} lessonCards={lessonCards} allCards={cueCards} seed="final-score" onClose={vi.fn()} onComplete={onComplete} />);

    fireEvent.click(screen.getByRole("button", { name: lessonCards[0].naturalMeaning }));
    fireEvent.click(screen.getByRole("button", { name: /check answer/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/correct/i);
    fireEvent.click(screen.getByRole("button", { name: /see results/i }));

    expect(onComplete).toHaveBeenCalledWith(1, 1);
  });
});
