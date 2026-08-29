// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CueCardCarousel } from "../src/components/CueCardCarousel";
import { cueCards, lessons } from "../src/domain/seed";
import { defaultSnapshot, useStudyStore } from "../src/state/study-store";

vi.mock("howler", () => ({
  Howl: class {
    play() {}
    unload() {}
  },
}));

beforeEach(() => {
  useStudyStore.setState({ ...defaultSnapshot, hydrated: true, hydrationNotice: false });
});

afterEach(cleanup);

describe("cue-card flipping", () => {
  it("flips from the card surface without making the audio control flip the card", () => {
    const lesson = lessons.find((item) => item.id === "common-verbs")!;
    const card = cueCards.find((item) => item.lessonId === lesson.id)!;
    const { container } = render(<CueCardCarousel lesson={lesson} cards={[card]} onBack={vi.fn()} onComplete={vi.fn()} />);
    const learningCard = container.querySelector(".learning-card")!;
    const front = container.querySelector(".learning-card-front")!;
    const back = container.querySelector(".learning-card-back")!;

    expect(screen.getByRole("button", { name: /see meaning/i })).not.toHaveTextContent(/see meaning/i);
    fireEvent.click(screen.getByRole("button", { name: /play กิน/i }));
    expect(learningCard).not.toHaveClass("is-flipped");

    fireEvent.click(screen.getByText("กิน"));
    expect(learningCard).toHaveClass("is-flipped");
    expect(front).toHaveAttribute("aria-hidden", "true");
    expect(back).toHaveAttribute("aria-hidden", "false");

    fireEvent.click(screen.getByRole("heading", { name: "eat" }));
    expect(learningCard).not.toHaveClass("is-flipped");
    expect(front).toHaveAttribute("aria-hidden", "false");
    expect(back).toHaveAttribute("aria-hidden", "true");
  });
});
