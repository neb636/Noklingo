"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, CircleAlert, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cueCards, lessons } from "@/domain/seed";
import { assetPath } from "@/lib/asset-path";
import { lessonIndexForId, nextLessonIndex } from "@/lib/lesson-feed";
import { CueCardCarousel } from "./CueCardCarousel";

type ReelStage = "video" | "cards";
type PlaybackStatus = "loading" | "playing" | "paused" | "blocked" | "ended" | "error";

const swipeThreshold = 56;

export function Library2LessonExperience({ initialLessonId }: { initialLessonId: string }) {
  const [activeIndex, setActiveIndex] = useState(() => lessonIndexForId(lessons.map((lesson) => lesson.id), initialLessonId));
  const [stage, setStage] = useState<ReelStage>("video");
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(() => new Set());
  const [muted, setMuted] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>("loading");
  const videoRef = useRef<HTMLVideoElement>(null);
  const mutedRef = useRef(false);
  const gestureStart = useRef<{ x: number; y: number } | undefined>(undefined);
  const swiped = useRef(false);
  const activeLesson = lessons[activeIndex];
  const cards = activeLesson.cueCardIds.map((id) => cueCards.find((card) => card.id === id)).filter((card): card is (typeof cueCards)[number] => Boolean(card));
  const videoOnly = activeLesson.activityMode === "video-only";
  const videoCompleted = completedLessonIds.has(activeLesson.id);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setPlaybackStatus("loading");
    video.currentTime = 0;
    video.muted = mutedRef.current;
    video.load();
    const playAttempt = video.play();
    void playAttempt.catch(() => setPlaybackStatus("blocked"));
  }, [activeLesson.id]);

  function closeToLibrary() {
    window.location.assign(assetPath("/library-2/"));
  }

  function changeLesson(direction: -1 | 1) {
    const nextIndex = nextLessonIndex(activeIndex, direction, lessons.length);
    if (nextIndex === activeIndex) return;
    videoRef.current?.pause();
    setStage("video");
    setActiveIndex(nextIndex);
  }

  function togglePlayback() {
    const video = videoRef.current;
    if (!video || playbackStatus === "error") return;
    if (!video.paused && !video.ended) {
      video.pause();
      return;
    }
    if (video.ended) video.currentTime = 0;
    setPlaybackStatus("loading");
    void video.play().catch(() => setPlaybackStatus("blocked"));
  }

  function toggleMuted() {
    const video = videoRef.current;
    const nextMuted = !muted;
    setMuted(nextMuted);
    mutedRef.current = nextMuted;
    if (video) video.muted = nextMuted;
  }

  function onGestureStart(event: React.PointerEvent<HTMLButtonElement>) {
    gestureStart.current = { x: event.clientX, y: event.clientY };
    swiped.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onGestureEnd(event: React.PointerEvent<HTMLButtonElement>) {
    const start = gestureStart.current;
    gestureStart.current = undefined;
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaY) >= swipeThreshold && Math.abs(deltaY) > Math.abs(deltaX)) {
      swiped.current = true;
      changeLesson(deltaY < 0 ? 1 : -1);
    }
  }

  if (stage === "cards") {
    return <CueCardCarousel
      lesson={activeLesson}
      cards={cards}
      onBack={() => setStage("video")}
      onComplete={() => setStage("video")}
      completeLabel="Back to video"
    />;
  }

  const atFirstLesson = activeIndex === 0;
  const atLastLesson = activeIndex === lessons.length - 1;
  const showPlayButton = playbackStatus !== "playing";

  return <section
    className="library-2-reel"
    aria-label={`${activeLesson.title}, lesson ${activeIndex + 1} of ${lessons.length}`}
    onKeyDown={(event) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        changeLesson(-1);
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        changeLesson(1);
      }
    }}
  >
    <video
      key={activeLesson.id}
      ref={videoRef}
      className="library-2-reel-video"
      playsInline
      preload="auto"
      poster={assetPath(activeLesson.media.posterSrc)}
      disablePictureInPicture
      disableRemotePlayback
      onPlaying={() => setPlaybackStatus("playing")}
      onPause={(event) => { if (!event.currentTarget.ended) setPlaybackStatus("paused"); }}
      onEnded={() => {
        setCompletedLessonIds((ids) => new Set(ids).add(activeLesson.id));
        setPlaybackStatus("ended");
      }}
      onError={() => setPlaybackStatus("error")}
    >
      <source src={assetPath(activeLesson.media.videoSrc)} type="video/mp4" />
    </video>

    <button
      type="button"
      className="library-2-reel-gesture"
      onPointerDown={onGestureStart}
      onPointerUp={onGestureEnd}
      onClick={() => { if (!swiped.current) togglePlayback(); }}
      aria-label={playbackStatus === "playing" ? `Pause ${activeLesson.title}` : `Play ${activeLesson.title}`}
    >
      {showPlayButton && playbackStatus !== "error" && <span className="library-2-play-glyph" aria-hidden="true">{playbackStatus === "paused" ? <Play size={25} fill="currentColor" /> : <Play size={28} fill="currentColor" />}</span>}
    </button>

    <header className="library-2-reel-topbar">
      <button type="button" className="library-2-top-icon" onClick={closeToLibrary} aria-label="Back to Library 2"><ChevronLeft size={25} /></button>
      <div><span>Lesson {String(activeLesson.order).padStart(2, "0")} · {activeIndex + 1} of {lessons.length}</span><strong>{activeLesson.topicEmoji} {activeLesson.title}</strong></div>
      <button type="button" className="library-2-top-icon" onClick={toggleMuted} aria-label={muted ? "Turn sound on" : "Mute video"}>{muted ? <VolumeX size={21} /> : <Volume2 size={21} />}</button>
    </header>

    <div className="library-2-reel-controls" aria-label="Lesson navigation">
      <button type="button" onClick={() => changeLesson(-1)} disabled={atFirstLesson} aria-label="Previous lesson"><ArrowUp size={20} /></button>
      <button type="button" onClick={() => changeLesson(1)} disabled={atLastLesson} aria-label="Next lesson"><ArrowDown size={20} /></button>
    </div>

    {playbackStatus === "blocked" && <div className="library-2-playback-notice" role="status"><Play size={18} fill="currentColor" /><span>Tap anywhere to play with sound</span></div>}
    {playbackStatus === "error" && <div className="library-2-playback-notice is-error" role="alert"><CircleAlert size={19} /><span>{activeLesson.media.fallbackMessage}</span></div>}

    <footer className="library-2-reel-footer">
      <p>{activeLesson.objective.replace(/^Draft plan —\s*/, "")}</p>
      {videoCompleted && !videoOnly && <button type="button" className="library-2-cards-button" onClick={() => setStage("cards")}>View {cards.length} cue card{cards.length === 1 ? "" : "s"}</button>}
      {videoCompleted && videoOnly && <span className="library-2-complete-label">Video complete</span>}
      {!videoCompleted && playbackStatus !== "error" && <span className="library-2-swipe-hint">Swipe up for the next lesson</span>}
      {playbackStatus === "paused" && <span className="library-2-paused-label"><Pause size={13} /> Paused</span>}
    </footer>
  </section>;
}
