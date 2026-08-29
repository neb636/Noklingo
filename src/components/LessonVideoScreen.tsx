"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowRight, CircleAlert, Play, RefreshCw, Volume2, VolumeX, X } from "lucide-react";
import type { VideoLesson } from "@/domain/schemas";
import { assetPath } from "@/lib/asset-path";

type PlaybackStatus = "loading" | "playing" | "paused" | "blocked" | "ended";

export type LessonVideoScreenHandle = {
  play: () => Promise<boolean>;
};

type LessonVideoScreenProps = {
  lesson: VideoLesson;
  onClose: () => void;
  onContinue: (bypassed?: boolean) => void;
  requireCompletedWatch?: boolean;
  continueLabel?: string;
};

export const LessonVideoScreen = forwardRef<LessonVideoScreenHandle, LessonVideoScreenProps>(function LessonVideoScreen({
  lesson,
  onClose,
  onContinue,
  requireCompletedWatch = false,
  continueLabel = "Continue to cards",
}, ref) {
  const [mediaError, setMediaError] = useState(lesson.media.availability !== "available");
  const [retryKey, setRetryKey] = useState(0);
  const [watchComplete, setWatchComplete] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>("loading");
  const [muted, setMuted] = useState(false);
  const screenRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const watchedSeconds = useRef(0);
  const lastTime = useRef(0);
  const playAttempt = useRef(0);

  const startPlayback = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return false;
    const attempt = ++playAttempt.current;

    if (video.ended) video.currentTime = 0;
    setPlaybackStatus("loading");

    try {
      await video.play();
      if (attempt === playAttempt.current) setPlaybackStatus("playing");
      return true;
    } catch {
      if (attempt === playAttempt.current && video.paused) setPlaybackStatus("blocked");
      return false;
    }
  }, []);

  useImperativeHandle(ref, () => ({ play: startPlayback }), [startPlayback]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    screenRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!mediaError) void startPlayback();
  }, [mediaError, retryKey, startPlayback]);

  function resetPlayback() {
    watchedSeconds.current = 0;
    lastTime.current = 0;
    setWatchComplete(false);
  }

  function noteProgress(video: HTMLVideoElement) {
    const delta = video.currentTime - lastTime.current;
    if (!video.seeking && delta > 0 && delta < 1.5) watchedSeconds.current += delta;
    lastTime.current = video.currentTime;
  }

  function finishPlayback(video: HTMLVideoElement) {
    const required = Math.max(1, Math.min(video.duration - 1, video.duration * 0.82));
    setWatchComplete(!requireCompletedWatch || watchedSeconds.current >= required);
    setPlaybackStatus("ended");
  }

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (playbackStatus === "playing") {
      video.pause();
      setPlaybackStatus("paused");
      return;
    }
    void startPlayback();
  }

  function toggleMuted() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  function retryPlayback() {
    flushSync(() => {
      setPlaybackStatus("loading");
      setMediaError(false);
      setRetryKey((value) => value + 1);
    });
    void startPlayback();
  }

  const canContinue = mediaError || !requireCompletedWatch || watchComplete;
  const showStartButton = playbackStatus === "blocked" || playbackStatus === "paused" || playbackStatus === "ended";
  const startLabel = playbackStatus === "ended" ? "Replay video" : playbackStatus === "paused" ? "Resume video" : "Play video";

  return (
    <section ref={screenRef} tabIndex={-1} className="immersive-video" aria-label={`${lesson.title} video`}>
      <header className="immersive-video-topbar">
        <button type="button" className="glass-icon-button" onClick={onClose} aria-label="Close video"><X size={22} /></button>
        <span>Lesson {lesson.order}</span>
        {!mediaError ? (
          <button type="button" className="glass-icon-button video-sound-button" onClick={toggleMuted} aria-label={muted ? "Turn video sound on" : "Mute video"}>
            {muted ? <VolumeX size={21} /> : <Volume2 size={21} />}
          </button>
        ) : <span aria-hidden="true" />}
      </header>

      <div className="immersive-video-media">
        {!mediaError ? (
          <>
            <video
              ref={videoRef}
              key={retryKey}
              className="immersive-video-element"
              playsInline
              autoPlay
              preload="metadata"
              poster={assetPath(lesson.media.posterSrc)}
              tabIndex={0}
              role="button"
              aria-label={playbackStatus === "playing" ? `Pause ${lesson.title} video` : `Play ${lesson.title} video`}
              onClick={togglePlayback}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  togglePlayback();
                }
              }}
              onLoadedMetadata={resetPlayback}
              onPlaying={() => setPlaybackStatus("playing")}
              onPause={(event) => { if (!event.currentTarget.ended) setPlaybackStatus("paused"); }}
              onTimeUpdate={(event) => noteProgress(event.currentTarget)}
              onEnded={(event) => finishPlayback(event.currentTarget)}
              onError={() => { playAttempt.current += 1; setMediaError(true); }}
            >
              <source src={assetPath(lesson.media.videoSrc)} type="video/mp4" />
            </video>
            {showStartButton && (
              <button type="button" className="video-start-button" onClick={() => void startPlayback()} aria-label={`${startLabel}: ${lesson.title}`}>
                <Play size={28} fill="currentColor" /> <span>{startLabel}</span>
              </button>
            )}
          </>
        ) : (
          <div className="immersive-video-error" role="alert">
            <CircleAlert size={34} />
            <h2>Video unavailable</h2>
            <p>{lesson.media.fallbackMessage}</p>
            <button type="button" className="video-retry-button" onClick={retryPlayback}>
              <RefreshCw size={17} /> Retry video
            </button>
          </div>
        )}
      </div>

      <footer className="immersive-video-footer">
        <div>
          <strong>{watchComplete ? "Video complete" : mediaError ? "Keep learning without the clip" : playbackStatus === "blocked" ? "Tap play to start" : playbackStatus === "paused" ? "Video paused" : "Watch at your own pace"}</strong>
          <span>{requireCompletedWatch && !canContinue ? "Finish the clip to continue." : "Your cards are ready whenever you are."}</span>
        </div>
        <button type="button" className="video-continue-button" disabled={!canContinue} onClick={() => onContinue(mediaError)}>
          {mediaError && requireCompletedWatch ? "Continue without video" : continueLabel} <ArrowRight size={19} />
        </button>
      </footer>
    </section>
  );
});
