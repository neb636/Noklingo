import { afterEach, describe, expect, it, vi } from "vitest";
import { claimAudioChannel, releaseAudioChannel } from "../src/lib/audio-channel";

const owner = Symbol("audio-channel-test");
const nextOwner = Symbol("audio-channel-next-test");

afterEach(() => {
  releaseAudioChannel(owner);
  releaseAudioChannel(nextOwner);
});

describe("audio playback channel", () => {
  it("stops the previous owner before a different sound takes over", () => {
    const firstOwner = Symbol("first");
    const stopFirst = vi.fn();
    const stopSecond = vi.fn();

    claimAudioChannel(firstOwner, stopFirst);
    claimAudioChannel(owner, stopSecond);

    expect(stopFirst).toHaveBeenCalledTimes(1);
    expect(stopSecond).not.toHaveBeenCalled();
  });

  it("does not stop a released owner or interrupt the same owner", () => {
    const stop = vi.fn();

    claimAudioChannel(owner, stop);
    claimAudioChannel(owner, stop);
    releaseAudioChannel(owner);
    claimAudioChannel(nextOwner, vi.fn());

    expect(stop).not.toHaveBeenCalled();
  });
});
