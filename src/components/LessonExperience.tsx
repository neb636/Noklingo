"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Clock3, ExternalLink, Play, RotateCcw, Sparkles } from "lucide-react";
import type { VideoLesson } from "@/domain/schemas";
import { cueCards } from "@/domain/seed";
import { assetPath } from "@/lib/asset-path";
import { CueCardCarousel, StudyTopBar } from "./CueCardCarousel";
import { LessonVideoScreen, requestContainerFullscreen } from "./LessonVideoScreen";
import { PracticeQuiz } from "./PracticeQuiz";

type LessonStage = "overview" | "video" | "cards" | "quiz" | "complete";

export function LessonExperience({ lesson }: { lesson: VideoLesson }) {
  const [stage, setStage] = useState<LessonStage>("overview");
  const [attempt, setAttempt] = useState(1);
  const [result, setResult] = useState({ score: 0, total: 0 });
  const flowRef = useRef<HTMLDivElement>(null);
  const cards = lesson.cueCardIds.map((id) => cueCards.find((card) => card.id === id)).filter((card): card is (typeof cueCards)[number] => Boolean(card));

  function backToLibrary() {
    window.location.assign(assetPath("/library/"));
  }

  function playVideo() {
    setStage("video");
    void requestContainerFullscreen(flowRef.current);
  }

  return (
    <div ref={flowRef} className={`lesson-flow lesson-stage-${stage}`}>
      {stage === "overview" && <LessonOverview lesson={lesson} cardCount={cards.length} onBack={backToLibrary} onPlay={playVideo} onSkip={() => setStage("cards")} />}
      {stage === "video" && <LessonVideoScreen lesson={lesson} fullscreenTargetRef={flowRef} onClose={() => setStage("overview")} onContinue={() => setStage("cards")} />}
      {stage === "cards" && <CueCardCarousel lesson={lesson} cards={cards} onBack={() => setStage("overview")} onComplete={() => setStage("quiz")} />}
      {stage === "quiz" && <PracticeQuiz lesson={lesson} lessonCards={cards} allCards={cueCards} seed={`${lesson.id}:practice:${attempt}`} onClose={() => setStage("overview")} onComplete={(score, total) => { setResult({ score, total }); setStage("complete"); }} />}
      {stage === "complete" && <PracticeComplete lesson={lesson} score={result.score} total={result.total} onRetry={() => { setAttempt((value) => value + 1); setStage("quiz"); }} onCards={() => setStage("cards")} onLibrary={backToLibrary} />}
    </div>
  );
}

function LessonOverview({
  lesson,
  cardCount,
  onBack,
  onPlay,
  onSkip,
}: {
  lesson: VideoLesson;
  cardCount: number;
  onBack: () => void;
  onPlay: () => void;
  onSkip: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  return <section className="lesson-overview-screen">
    <StudyTopBar title={`Lesson ${lesson.order}`} onBack={onBack} />
    <div className="lesson-overview-copy">
      <p className="lesson-kicker">Watch · notice · practice</p>
      <h1 ref={headingRef} tabIndex={-1}>{lesson.topicEmoji} {lesson.title}</h1>
      <p>{lesson.objective.replace(/^Draft plan —\s*/, "")}</p>
    </div>
    <div className="lesson-overview-poster">
      <Image src={assetPath(lesson.media.posterSrc)} width={720} height={1280} priority unoptimized alt="" />
      <span className="lesson-poster-emoji" aria-hidden="true">{lesson.topicEmoji}</span>
      <span className="lesson-poster-duration"><Clock3 size={14} /> {formatDuration(lesson.media.durationSeconds)}</span>
    </div>
    <div className="lesson-overview-meta"><span>{cardCount} cue card{cardCount === 1 ? "" : "s"}</span><span>Practice quiz included</span></div>
    <div className="lesson-overview-actions">
      <button type="button" className="black-button" onClick={onPlay}><Play size={18} fill="currentColor" /> Play video</button>
      {cardCount > 0 && <button type="button" className="soft-button" onClick={onSkip}>Skip to cards <ArrowRight size={18} /></button>}
    </div>
    {lesson.source && <a className="lesson-source-link" href={lesson.source.url} target="_blank" rel="noreferrer">Source: {lesson.source.label} <ExternalLink size={13} /></a>}
  </section>;
}

function PracticeComplete({ lesson, score, total, onRetry, onCards, onLibrary }: { lesson: VideoLesson; score: number; total: number; onRetry: () => void; onCards: () => void; onLibrary: () => void }) {
  const percent = total ? Math.round((score / total) * 100) : 0;
  const scoreRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { scoreRef.current?.focus(); }, []);
  return <section className="practice-complete-screen">
    <StudyTopBar title="Practice complete" onBack={onLibrary} />
    <div className="practice-complete-content">
      <span className="complete-emoji" aria-hidden="true">{percent >= 80 ? "🎉" : "🌱"}</span>
      <p className="eyebrow">Practice · not scored</p>
      <h1 ref={scoreRef} tabIndex={-1}>{score} of {total}</h1>
      <p>{percent >= 80 ? `Great work with ${lesson.title.toLowerCase()}.` : "A quick replay will make these phrases feel more familiar."}</p>
      <div className="practice-score-ring" style={{ "--score": `${percent * 3.6}deg` } as React.CSSProperties}><CheckCircle2 size={28} /><b>{percent}%</b></div>
      <button type="button" className="gradient-button" onClick={onRetry}><Sparkles size={18} /> Try the quiz again</button>
      <button type="button" className="soft-button" onClick={onCards}><RotateCcw size={18} /> Review cue cards</button>
      <button type="button" className="text-button" onClick={onLibrary}>Back to Library</button>
    </div>
  </section>;
}

function formatDuration(seconds: number) {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}
