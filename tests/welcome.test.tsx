// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import WelcomePage, { WELCOME_SEEN_KEY } from "../src/pages/welcome";

afterEach(() => {
  window.localStorage.clear();
});

describe("NokLingo welcome flow", () => {
  it("sends a first-time root visit to Welcome and a returning visit to Today", () => {
    expect(runRootDispatcher(null)).toBe("https://example.test/Noklingo/welcome/");
    expect(runRootDispatcher("true")).toBe("https://example.test/Noklingo/today/");
  });

  it("records onboarding and exposes only a real Get Started action", () => {
    render(<WelcomePage />);

    expect(screen.getByRole("heading", { name: "NokLingo" })).toBeInTheDocument();
    expect(screen.queryByText(/account/i)).not.toBeInTheDocument();

    const getStarted = screen.getByRole("link", { name: "Get Started" });
    expect(getStarted).toHaveAttribute("href", "/today/");
    getStarted.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(getStarted);
    expect(window.localStorage.getItem(WELCOME_SEEN_KEY)).toBe("true");
  });
});

function runRootDispatcher(storedValue: string | null): string | undefined {
  const html = readFileSync(join(process.cwd(), "public", "index.html"), "utf8");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  if (!script) throw new Error("Root dispatcher script is missing.");

  let destination: string | undefined;
  const location = {
    href: "https://example.test/Noklingo/",
    replace: (value: string) => { destination = value; },
  };
  runInNewContext(script, {
    URL,
    window: {
      location,
      localStorage: { getItem: () => storedValue },
    },
  });
  return destination;
}
