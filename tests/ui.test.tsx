// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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
});

beforeEach(() => {
  query = {};
  useStudyStore.setState({ ...defaultSnapshot, hydrated: true, hydrationNotice: false });
});
afterEach(cleanup);

describe("lesson collection UI", () => {
  it("offers the lesson collection while scored study is unavailable", () => {
    render(<TodayPage />);
    expect(screen.getByRole("heading", { name: /23 short lessons are ready/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse lessons/i })).toBeInTheDocument();
  });

  it("opens phrase cards after the lesson video ends", () => {
    query = { preview: "common-verbs" };
    const { container } = render(<StudyPage />);
    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    fireEvent.ended(video!);
    fireEvent.click(screen.getByRole("button", { name: /open cue cards/i }));
    expect(screen.getByText(/phrase card 1 of 5/i)).toBeInTheDocument();
    expect(screen.getByText("กิน")).toBeInTheDocument();
    expect(screen.getByText("eat")).toBeInTheDocument();
  });

  it("presents the supplied clips as a learner-facing collection", () => {
    const { container } = render(<LibraryPage />);
    expect(screen.getByRole("heading", { name: /keep exploring/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /watch lesson 1: essential verbs/i })).toBeInTheDocument();
    expect(container.querySelector("video")).toBeNull();
  });
});
