// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LessonVideoScreen } from "../src/components/LessonVideoScreen";
import { lessons } from "../src/domain/seed";

const lesson = lessons[0];

beforeEach(() => {
  Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
  Object.defineProperty(HTMLMediaElement.prototype, "pause", { configurable: true, value: vi.fn() });
});

afterEach(() => cleanup());

describe("lesson video playback", () => {
  it("starts without native controls or a pause overlay", async () => {
    const { container } = render(<LessonVideoScreen lesson={lesson} onClose={vi.fn()} onContinue={vi.fn()} />);
    const video = container.querySelector("video")!;

    expect(video).toHaveAttribute("autoplay");
    expect(video).not.toHaveAttribute("controls");
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /resume video|replay video/i })).not.toBeInTheDocument();
  });

  it("shows a custom play fallback when audible autoplay is rejected", async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValue(new DOMException("Playback blocked", "NotAllowedError"));
    render(<LessonVideoScreen lesson={lesson} onClose={vi.fn()} onContinue={vi.fn()} />);

    expect(await screen.findByRole("button", { name: new RegExp(`Play video: ${lesson.title}`, "i") })).toBeInTheDocument();
  });

  it("uses the video surface to pause and resume without enabling native controls", async () => {
    const { container } = render(<LessonVideoScreen lesson={lesson} onClose={vi.fn()} onContinue={vi.fn()} />);
    const video = container.querySelector("video")!;
    await act(async () => { fireEvent.playing(video); });

    fireEvent.click(video);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: new RegExp(`Resume video: ${lesson.title}`, "i") })).toBeInTheDocument();
    expect(video).not.toHaveAttribute("controls");

    fireEvent.click(screen.getByRole("button", { name: new RegExp(`Resume video: ${lesson.title}`, "i") }));
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2));
  });

  it("starts with sound and lets the viewer mute it", () => {
    const { container } = render(<LessonVideoScreen lesson={lesson} onClose={vi.fn()} onContinue={vi.fn()} />);
    const video = container.querySelector("video")!;

    expect(video.muted).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /mute video/i }));
    expect(video.muted).toBe(true);
    expect(screen.getByRole("button", { name: /turn video sound on/i })).toBeInTheDocument();
  });

  it("retries playback from the retry tap without restoring native controls", async () => {
    const unavailableLesson = { ...lesson, media: { ...lesson.media, availability: "draft-unavailable" as const } };
    const { container } = render(<LessonVideoScreen lesson={unavailableLesson} onClose={vi.fn()} onContinue={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /retry video/i }));
    const video = container.querySelector("video")!;
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalled());
    expect(video).not.toHaveAttribute("controls");
  });
});
