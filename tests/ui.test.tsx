// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { firstLesson } from "../src/domain/seed";
import { buildSession } from "../src/engine/learning-engine";
import { addLocalDays, localDateKey } from "../src/engine/local-date";
import LibraryPage from "../src/pages/library";
import StudyPage from "../src/pages/study";
import TodayPage from "../src/pages/today";
import { defaultSnapshot, useStudyStore } from "../src/state/study-store";

vi.mock("next/router", () => ({ useRouter: () => ({ query: {}, pathname: "/study" }) }));

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }),
  });
  window.scrollTo = vi.fn();
});

beforeEach(() => {
  useStudyStore.setState({ ...defaultSnapshot, hydrated: true, hydrationNotice: false });
});
afterEach(cleanup);

describe("Today", () => {
  it("shows only the due mastery action when eligibility has arrived", () => {
    const today = localDateKey();
    useStudyStore.setState({ lessonProgress: [{ lessonId: firstLesson.id, status: "awaiting-mastery", introducedDate: addLocalDays(today, -1), masteryEligibleDate: today }] });
    render(<TodayPage />);
    expect(screen.getByRole("button", { name: /begin mastery check/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /begin lesson/i })).not.toBeInTheDocument();
  });

  it("prioritizes resume when a session exists", () => {
    const today = localDateKey();
    const activeSession = buildSession({ mode: "introduction", lesson: firstLesson, snapshot: defaultSnapshot, today, nowIso: new Date().toISOString() });
    useStudyStore.setState({ activeSession });
    render(<TodayPage />);
    expect(screen.getByRole("link", { name: /resume session/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /begin lesson/i })).not.toBeInTheDocument();
  });
});

describe("Study and Library", () => {
  it("turns a missing video into a deliberate non-blocking action", async () => {
    const today = localDateKey();
    const activeSession = buildSession({ mode: "introduction", lesson: firstLesson, snapshot: defaultSnapshot, today, nowIso: new Date().toISOString() });
    useStudyStore.setState({ activeSession });
    render(<StudyPage />);
    const continueButton = screen.getByRole("button", { name: /continue without video/i });
    expect(continueButton).toBeInTheDocument();
    fireEvent.click(continueButton);
    expect(await screen.findByText(/cue card 1 of 5/i)).toBeInTheDocument();
    expect(useStudyStore.getState().activeSession?.videoBypassed).toBe(true);
  });

  it("renders future lessons locked without video elements", () => {
    const { container } = render(<LibraryPage />);
    expect(screen.getAllByText(/not yet available/i).length).toBeGreaterThan(0);
    expect(container.querySelector("video")).toBeNull();
  });

  it("keeps at least one reading system visible", () => {
    useStudyStore.getState().updateSettings({ showThaiScript: false });
    useStudyStore.getState().updateSettings({ showRomanization: false });
    const settings = useStudyStore.getState().settings;
    expect(settings.showThaiScript || settings.showRomanization).toBe(true);
  });
});
