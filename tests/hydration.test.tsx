// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import StudyPage from "../src/pages/study";
import TodayPage from "../src/pages/today";
import { defaultSnapshot, useStudyStore } from "../src/state/study-store";

const routerState = vi.hoisted(() => ({
  pathname: "/study",
  query: {} as Record<string, string>,
}));

vi.mock("next/router", () => ({ useRouter: () => routerState }));

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
});

beforeEach(() => {
  routerState.query = {};
  useStudyStore.setState({
    ...defaultSnapshot,
    hydrated: false,
    hydrationNotice: false,
    staleSessionNotice: false,
  });
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("server/client hydration", () => {
  it("keeps Today's first render stable across a local-date rollover", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 25, 23, 59));
    const markup = renderToString(<TodayPage />);
    vi.setSystemTime(new Date(2026, 7, 26, 0, 1));

    const errors: unknown[] = [];
    const { container, root } = await hydrate(markup, <TodayPage />, errors);

    expect(errors).toEqual([]);
    expect(container).toHaveTextContent("Wednesday, August 26");
    await act(async () => root.unmount());
  });

  it("defers preview query rendering until after the shared first render", async () => {
    routerState.query = { preview: "common-verbs" };
    const markup = renderToString(<StudyPage />);
    const errors: unknown[] = [];
    const { container, root } = await hydrate(markup, <StudyPage />, errors);

    expect(errors).toEqual([]);
    expect(container).toHaveTextContent("A short lesson, yours to revisit");
    await act(async () => root.unmount());
  });
});

async function hydrate(markup: string, element: React.ReactNode, errors: unknown[]) {
  const container = document.createElement("div");
  container.innerHTML = markup;
  document.body.append(container);
  let root: Root | undefined;
  await act(async () => {
    root = hydrateRoot(container, element, {
      onRecoverableError: (error) => errors.push(error),
    });
  });
  return { container, root: root as Root };
}
