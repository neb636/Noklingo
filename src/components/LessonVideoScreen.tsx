"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CircleAlert, Clock3, RefreshCw, Volume2, VolumeX, X } from "lucide-react";
import type { VideoLesson } from "@/domain/schemas";
import { assetPath } from "@/lib/asset-path";

type PlaybackStatus = "idle" | "loading" | "playing" | "paused" | "blocked" | "ended";
type VideoPresentation = "poster" | "immersive";

export type LessonVideoScreenHandle = {
  startFromGesture: () => void;
};

type LessonVideoScreenProps = {
  lesson: VideoLesson;
  onClose: () => void;
  onContinue: (bypassed?: boolean) => void;
  presentation?: VideoPresentation;
  onEnterImmersive?: () => void;
  requireCompletedWatch?: boolean;
  continueLabel?: string;
  continueHint?: string;
};

export const LessonVideoScreen = forwardRef<LessonVideoScreenHandle, LessonVideoScreenProps>(function LessonVideoScreen({
  lesson,
  onClose,
  onContinue,
  presentation = "immersive",
  onEnterImmersive,
  requireCompletedWatch = false,
  continueLabel = "Continue to cards",
  continueHint = "Your cards are ready whenever you are.",
}, ref) {
  const immersive = presentation === "immersive";
  const [mediaError, setMediaError] = useState(lesson.media.availability !== "available");
  const [watchComplete, setWatchComplete] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [frozenFrame, setFrozenFrame] = useState(false);
  const screenRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLCanvasElement>(null);
  const watchedSeconds = useRef(0);
  const lastTime = useRef(0);
  const playAttempt = useRef(0);
  const attemptedDirectStart = useRef(false);
  const ignorePauseEvent = useRef(false);

  const captureFrame = useCallback((video: HTMLVideoElement) => {
    const canvas = frameRef.current;
    if (!canvas || !video.videoWidth || !video.videoHeight) return false;
    const context = canvas.getContext("2d");
    if (!context) return false;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setFrozenFrame(true);
    return true;
  }, []);

  const requestPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || mediaError) return;
    const attempt = ++playAttempt.current;

    if (video.ended) video.currentTime = 0;

    // Keep play() in the original click stack. Safari loses transient user
    // activation if playback waits for a render, effect, or async boundary.
    let playback: Promise<void>;
    try {
      ignorePauseEvent.current = false;
      playback = video.play();
    } catch {
      captureFrame(video);
      setPlaybackStatus("blocked");
      return;
    }

    setFrozenFrame(false);
    setPlaybackStatus("loading");
    void playback.then(() => {
      if (attempt === playAttempt.current && !video.paused) setPlaybackStatus("playing");
    }).catch(() => {
      if (attempt === playAttempt.current && video.paused) {
        captureFrame(video);
        setPlaybackStatus("blocked");
      }
    });
  }, [captureFrame, mediaError]);

  const startFromGesture = useCallback(() => {
    requestPlayback();
    onEnterImmersive?.();
  }, [onEnterImmersive, requestPlayback]);

  useImperativeHandle(ref, () => ({ startFromGesture }), [startFromGesture]);

  useEffect(() => {
    if (!immersive) {
      attemptedDirectStart.current = false;
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    screenRef.current?.focus({ preventScroll: true });

    // The overview flow has already called play() from its click. This branch
    // preserves a custom fallback for the durable study route if it is opened
    // directly without the pre-mounted poster.
    if (!onEnterImmersive && !attemptedDirectStart.current && !mediaError) {
      attemptedDirectStart.current = true;
      requestPlayback();
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [immersive, mediaError, onEnterImmersive, requestPlayback]);

  function resetWatchProgress() {
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
    captureFrame(video);
    setPlaybackStatus("ended");
  }

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;

    if (!immersive) {
      startFromGesture();
      return;
    }

    if (!video.paused && !video.ended) {
      playAttempt.current += 1;
      captureFrame(video);
      video.pause();
      return;
    }

    requestPlayback();
  }

  function toggleMuted() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  function resetVideo() {
    const video = videoRef.current;
    playAttempt.current += 1;
    ignorePauseEvent.current = true;
    video?.pause();
    if (video) {
      video.currentTime = 0;
      video.muted = false;
    }
    resetWatchProgress();
    setMuted(false);
    setFrozenFrame(false);
    setPlaybackStatus("idle");
  }

  function closeVideo() {
    resetVideo();
    onClose();
  }

  function continueToCards() {
    playAttempt.current += 1;
    ignorePauseEvent.current = true;
    videoRef.current?.pause();
    onContinue(mediaError);
  }

  function retryPlayback() {
    const video = videoRef.current;
    if (!video) return;
    setMediaError(false);
    setPlaybackStatus("loading");
    setFrozenFrame(false);
    video.load();

    const attempt = ++playAttempt.current;
    let playback: Promise<void>;
    try {
      ignorePauseEvent.current = false;
      playback = video.play();
    } catch {
      setPlaybackStatus("blocked");
      return;
    }
    void playback.then(() => {
      if (attempt === playAttempt.current && !video.paused) setPlaybackStatus("playing");
    }).catch(() => {
      if (attempt === playAttempt.current && video.paused) {
        captureFrame(video);
        setPlaybackStatus("blocked");
      }
    });
  }

  const canContinue = mediaError || !requireCompletedWatch || watchComplete;
  const showPlayGlyph = !immersive || playbackStatus === "idle" || playbackStatus === "paused" || playbackStatus === "blocked" || playbackStatus === "ended";
  const interactionLabel = !immersive
    ? `Play ${lesson.title} video`
    : playbackStatus === "playing"
      ? `Pause ${lesson.title} video`
      : playbackStatus === "ended"
        ? `Replay ${lesson.title} video`
        : `Resume ${lesson.title} video`;
  const concealNativeVideo = !immersive
    || playbackStatus === "blocked"
    || (frozenFrame && (playbackStatus === "paused" || playbackStatus === "ended"));

  return (
    <motion.section
      ref={screenRef}
      layout
      initial={false}
      transition={{ layout: { duration: 0.42, ease: [0.22, 0.8, 0.2, 1] } }}
      tabIndex={immersive ? -1 : undefined}
      className={`lesson-video-player lesson-video-player--${presentation}${immersive ? " immersive-video" : ""}${concealNativeVideo ? " is-native-video-concealed" : ""}${playbackStatus === "blocked" ? " is-playback-blocked" : ""}`}
      aria-label={immersive ? `${lesson.title} video` : undefined}
    >
      <div className="immersive-video-media">
        <div className="video-poster-frame" style={{ backgroundImage: `url(${assetPath(lesson.media.posterSrc)})` }} aria-hidden="true" />
        <canvas ref={frameRef} className={`video-freeze-frame${frozenFrame ? " is-visible" : ""}`} aria-hidden="true" />
        <video
          ref={videoRef}
          className="immersive-video-element"
          playsInline
          preload="auto"
          poster={assetPath(lesson.media.posterSrc)}
          disablePictureInPicture
          disableRemotePlayback
          tabIndex={-1}
          aria-hidden="true"
          onLoadedMetadata={resetWatchProgress}
          onPlaying={() => {
            setFrozenFrame(false);
            setPlaybackStatus("playing");
          }}
          onPause={(event) => {
            if (!event.currentTarget.ended && !ignorePauseEvent.current) {
              captureFrame(event.currentTarget);
              setPlaybackStatus("paused");
            }
          }}
          onTimeUpdate={(event) => noteProgress(event.currentTarget)}
          onEnded={(event) => finishPlayback(event.currentTarget)}
          onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
          onError={() => {
            playAttempt.current += 1;
            setMediaError(true);
          }}
        >
          <source src={assetPath(lesson.media.videoSrc)} type="video/mp4" />
        </video>

        {!mediaError && (
          <button type="button" className="video-interaction-surface" onClick={togglePlayback} aria-label={interactionLabel}>
            {!immersive && <span className="lesson-poster-emoji" aria-hidden="true">{lesson.topicEmoji}</span>}
            {showPlayGlyph && <span className="video-play-glyph" aria-hidden="true"><i /></span>}
            {!immersive && <span className="lesson-poster-duration"><Clock3 size={14} /> {formatDuration(lesson.media.durationSeconds)}</span>}
          </button>
        )}

        {mediaError && (
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

      <AnimatePresence>
        {immersive && (
          <motion.header className="immersive-video-topbar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <button type="button" className="glass-icon-button" onClick={closeVideo} aria-label="Close video"><X size={22} /></button>
            <span>Lesson {lesson.order}</span>
            {!mediaError ? (
              <button type="button" className="glass-icon-button video-sound-button" onClick={toggleMuted} aria-label={muted ? "Turn video sound on" : "Mute video"}>
                {muted ? <VolumeX size={21} /> : <Volume2 size={21} />}
              </button>
            ) : <span aria-hidden="true" />}
          </motion.header>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {immersive && (
          <motion.footer className="immersive-video-footer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div>
              <strong>{watchComplete ? "Video complete" : mediaError ? "Keep learning without the clip" : playbackStatus === "blocked" ? "Tap play to start" : playbackStatus === "paused" ? "Video paused" : "Watch at your own pace"}</strong>
              <span>{requireCompletedWatch && !canContinue ? "Finish the clip to continue." : continueHint}</span>
            </div>
            <button type="button" className="video-continue-button" disabled={!canContinue} onClick={continueToCards}>
              {mediaError && requireCompletedWatch ? "Continue without video" : continueLabel} <ArrowRight size={19} />
            </button>
          </motion.footer>
        )}
      </AnimatePresence>
    </motion.section>
  );
});

function formatDuration(seconds: number) {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}
