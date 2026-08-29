"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, CircleAlert, RefreshCw, X } from "lucide-react";
import type { VideoLesson } from "@/domain/schemas";
import { assetPath } from "@/lib/asset-path";

export function LessonVideoScreen({
  lesson,
  onClose,
  onContinue,
  requireCompletedWatch = false,
  continueLabel = "Continue to cards",
}: {
  lesson: VideoLesson;
  onClose: () => void;
  onContinue: (bypassed?: boolean) => void;
  requireCompletedWatch?: boolean;
  continueLabel?: string;
}) {
  const [mediaError, setMediaError] = useState(lesson.media.availability !== "available");
  const [retryKey, setRetryKey] = useState(0);
  const [watchComplete, setWatchComplete] = useState(false);
  const [playbackControlsVisible, setPlaybackControlsVisible] = useState(false);
  const screenRef = useRef<HTMLElement>(null);
  const watchedSeconds = useRef(0);
  const lastTime = useRef(0);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    screenRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

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
  }

  function close() {
    onClose();
  }

  function continueToCards(bypassed = false) {
    onContinue(bypassed);
  }

  function showPlaybackControls() {
    setPlaybackControlsVisible(true);
  }

  function retryPlayback() {
    setPlaybackControlsVisible(false);
    setMediaError(false);
    setRetryKey((value) => value + 1);
  }

  const canContinue = mediaError || !requireCompletedWatch || watchComplete;

  return (
    <section ref={screenRef} tabIndex={-1} className="immersive-video" aria-label={`${lesson.title} video`}>
      <header className="immersive-video-topbar">
        <button type="button" className="glass-icon-button" onClick={close} aria-label="Close video"><X size={22} /></button>
        <span>Lesson {lesson.order}</span>
        <span aria-hidden="true" />
      </header>

      <div className="immersive-video-media">
        {!mediaError ? (
          <video
            key={retryKey}
            className="immersive-video-element"
            controls={playbackControlsVisible}
            playsInline
            autoPlay
            preload="metadata"
            poster={assetPath(lesson.media.posterSrc)}
            tabIndex={0}
            aria-label={playbackControlsVisible ? `${lesson.title} video` : `Show controls for ${lesson.title} video`}
            onClick={showPlaybackControls}
            onKeyDown={(event) => {
              if (!playbackControlsVisible && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                showPlaybackControls();
              }
            }}
            onLoadedMetadata={resetPlayback}
            onTimeUpdate={(event) => noteProgress(event.currentTarget)}
            onEnded={(event) => finishPlayback(event.currentTarget)}
            onError={() => setMediaError(true)}
          >
            <source src={assetPath(lesson.media.videoSrc)} type="video/mp4" />
          </video>
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
          <strong>{watchComplete ? "Video complete" : mediaError ? "Keep learning without the clip" : "Watch at your own pace"}</strong>
          <span>{requireCompletedWatch && !canContinue ? "Finish the clip to continue." : "Your cards are ready whenever you are."}</span>
        </div>
        <button type="button" className="video-continue-button" disabled={!canContinue} onClick={() => continueToCards(mediaError)}>
          {mediaError && requireCompletedWatch ? "Continue without video" : continueLabel} <ArrowRight size={19} />
        </button>
      </footer>
    </section>
  );
}
