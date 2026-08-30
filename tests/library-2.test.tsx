// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Library2LessonExperience } from "../src/components/Library2LessonExperience";
import Library2Page from "../src/pages/library-2";
import { clampLessonIndex, lessonIndexForId, nextLessonIndex } from "../src/lib/lesson-feed";

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Library 2 lesson selection", () => {
  it("clamps reel navigation at the feed boundaries", () => {
    expect(clampLessonIndex(-4, 3)).toBe(0);
    expect(clampLessonIndex(6, 3)).toBe(2);
    expect(nextLessonIndex(0, -1, 3)).toBe(0);
    expect(nextLessonIndex(2, 1, 3)).toBe(2);
  });

  it("uses the requested lesson when a focused route opens", () => {
    expect(lessonIndexForId(["one", "two", "three"], "two")).toBe(1);
    expect(lessonIndexForId(["one", "two", "three"], "missing")).toBe(0);
  });
});

describe("Library 2 UI", () => {
  it("presents the portrait reel collection", () => {
    render(<Library2Page />);
    expect(screen.getByRole("heading", { name: /start with a real moment/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /watch lesson 1: essential verbs/i })).toBeInTheDocument();
  });

  it("reveals cue cards only after the reel ends and returns to the same reel", () => {
    render(<Library2LessonExperience initialLessonId="food-flavors" />);
    expect(screen.queryByRole("button", { name: /view .*cue card/i })).not.toBeInTheDocument();

    fireEvent.ended(document.querySelector("video")!);
    fireEvent.click(screen.getByRole("button", { name: /view .*cue card/i }));
    expect(screen.getByText("Cue cards")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.getByText(/describing flavors/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view .*cue card/i })).toBeInTheDocument();
  });

  it("shows a completion state instead of cards for video-only lessons", () => {
    render(<Library2LessonExperience initialLessonId="coffee-order" />);
    fireEvent.ended(document.querySelector("video")!);
    expect(screen.getByText("Video complete")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /view .*cue card/i })).not.toBeInTheDocument();
  });

  it("supports keyboard arrow navigation from the reel controls", () => {
    render(<Library2LessonExperience initialLessonId="common-verbs" />);
    const playControl = screen.getByRole("button", { name: /play essential verbs/i });
    fireEvent.keyDown(playControl, { key: "ArrowDown" });
    expect(screen.getByText(/what, where, when, why, how/i)).toBeInTheDocument();
  });
});
