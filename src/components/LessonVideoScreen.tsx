"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowRight, CircleAlert, Maximize2, Minimize2, RefreshCw, X } from "lucide-react";
import type { VideoLesson } from "@/domain/schemas";
import { assetPath } from "@/lib/asset-path";

type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

export async function requestContainerFullscreen(element: HTMLElement | null): Promise<boolean> {
  if (!element) return false;
  const target = element as FullscreenElement;
  try {
    if (target.requestFullscreen) await target.requestFullscreen();
    else if (target.webkitRequestFullscreen) await target.webkitRequestFullscreen();
    else return false;
    return true;
  } catch {
    return false;
  }
}

async function exitOwnedFullscreen(element: HTMLElement | null) {
  if (!element) return;
  const currentDocument = document as FullscreenDocument;
  const active = document.fullscreenElement ?? currentDocument.webkitFullscreenElement;
  if (active !== element) return;
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else await currentDocument.webkitExitFullscreen?.();
  } catch {
    // CSS immersive mode remains usable if the browser refuses to exit.
  }
}

export function LessonVideoScreen({
  lesson,
  fullscreenTargetRef,
  onClose,
  onContinue,
  requireCompletedWatch = false,
  continueLabel = "Continue to cards",
}: {
  lesson: VideoLesson;
  fullscreenTargetRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onContinue: (bypassed?: boolean) => void;
  requireCompletedWatch?: boolean;
  continueLabel?: string;
}) {
  const [mediaError, setMediaError] = useState(lesson.media.availability !== "available");
  const [retryKey, setRetryKey] = useState(0);
  const [watchComplete, setWatchComplete] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenStatus, setFullscreenStatus] = useState("");
  const screenRef = useRef<HTMLElement>(null);
  const watchedSeconds = useRef(0);
  const lastTime = useRef(0);

  useEffect(() => {
    const fullscreenTarget = fullscreenTargetRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const currentDocument = document as FullscreenDocument;
    const updateFullscreen = () => {
      const active = document.fullscreenElement ?? currentDocument.webkitFullscreenElement;
      setFullscreen(active === fullscreenTarget);
    };
    document.addEventListener("fullscreenchange", updateFullscreen);
    document.addEventListener("webkitfullscreenchange", updateFullscreen as EventListener);
    updateFullscreen();
    screenRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("fullscreenchange", updateFullscreen);
      document.removeEventListener("webkitfullscreenchange", updateFullscreen as EventListener);
      void exitOwnedFullscreen(fullscreenTarget);
    };
  }, [fullscreenTargetRef]);

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

  async function toggleFullscreen() {
    if (fullscreen) {
      await exitOwnedFullscreen(fullscreenTargetRef.current);
      return;
    }
    const entered = await requestContainerFullscreen(fullscreenTargetRef.current);
    if (!entered) {
      setFullscreenStatus("Fullscreen is unavailable here. The immersive player remains active.");
    } else {
      setFullscreenStatus("");
    }
  }

  function close() {
    void exitOwnedFullscreen(fullscreenTargetRef.current);
    onClose();
  }

  function continueToCards(bypassed = false) {
    void exitOwnedFullscreen(fullscreenTargetRef.current);
    onContinue(bypassed);
  }

  const canContinue = mediaError || !requireCompletedWatch || watchComplete;

  return (
    <section ref={screenRef} tabIndex={-1} className="immersive-video" aria-label={`${lesson.title} video`}>
      <header className="immersive-video-topbar">
        <button type="button" className="glass-icon-button" onClick={close} aria-label="Close video"><X size={22} /></button>
        <span>Lesson {lesson.order}</span>
        <button type="button" className="glass-icon-button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
          {fullscreen ? <Minimize2 size={21} /> : <Maximize2 size={21} />}
        </button>
      </header>

      <div className="immersive-video-media">
        {!mediaError ? (
          <video
            key={retryKey}
            className="immersive-video-element"
            controls
            playsInline
            autoPlay
            preload="metadata"
            poster={assetPath(lesson.media.posterSrc)}
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
            <button type="button" className="video-retry-button" onClick={() => { setMediaError(false); setRetryKey((value) => value + 1); }}>
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
      {fullscreenStatus && <p className="sr-only" role="status">{fullscreenStatus}</p>}
    </section>
  );
}
