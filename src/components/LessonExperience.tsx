"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ExternalLink, Play, RotateCcw, Sparkles } from "lucide-react";
import type { VideoLesson } from "@/domain/schemas";
import { cueCards } from "@/domain/seed";
import { writeSnapshot } from "@/data/db";
import { assetPath } from "@/lib/asset-path";
import { useQuizSounds } from "@/lib/use-quiz-sounds";
import { snapshotFromState, useStudyStore } from "@/state/study-store";
import { CueCardCarousel, StudyTopBar } from "./CueCardCarousel";
import { LessonVideoScreen, type LessonVideoScreenHandle } from "./LessonVideoScreen";
import { PracticeQuiz } from "./PracticeQuiz";

type LessonStage = "overview" | "video" | "cards" | "quiz" | "complete";

export function LessonExperience({ lesson }: { lesson: VideoLesson }) {
  const [stage, setStage] = useState<LessonStage>("overview");
  const [attempt, setAttempt] = useState(1);
  const [result, setResult] = useState({ score: 0, total: 0 });
  const quizSounds = useQuizSounds(stage === "quiz" || stage === "complete");
  const recordPracticeCompletion = useStudyStore((state) => state.recordPracticeCompletion);
  const videoScreenRef = useRef<LessonVideoScreenHandle>(null);
  const cards = lesson.cueCardIds.map((id) => cueCards.find((card) => card.id === id)).filter((card): card is (typeof cueCards)[number] => Boolean(card));
  const videoOnly = lesson.activityMode === "video-only";

  async function backToLibrary() {
    try {
      await writeSnapshot(snapshotFromState(useStudyStore.getState()));
    } finally {
      window.location.assign(assetPath("/library/"));
    }
  }

  function playVideo() {
    videoScreenRef.current?.startFromGesture();
  }

  return (
    <div className={`lesson-flow lesson-stage-${stage}`}>
      {(stage === "overview" || stage === "video") && (
        <LessonOverview
          lesson={lesson}
          cardCount={cards.length}
          expanded={stage === "video"}
          onBack={() => void backToLibrary()}
          onPlay={playVideo}
          onSkip={videoOnly ? undefined : () => setStage("cards")}
          player={(
            <LessonVideoScreen
              ref={videoScreenRef}
              lesson={lesson}
              presentation={stage === "video" ? "immersive" : "poster"}
              onEnterImmersive={() => setStage("video")}
              onClose={() => setStage("overview")}
              onContinue={videoOnly ? () => void backToLibrary() : () => setStage("cards")}
              continueLabel={videoOnly ? "Finish class" : undefined}
              continueHint={videoOnly ? "That’s the whole class—there’s no homework attached." : undefined}
            />
          )}
        />
      )}
      {!videoOnly && stage === "cards" && <CueCardCarousel lesson={lesson} cards={cards} mode="display" onBack={() => setStage("overview")} onComplete={() => setStage("quiz")} />}
      {!videoOnly && stage === "quiz" && <PracticeQuiz key={attempt} lesson={lesson} lessonCards={cards} allCards={cueCards} seed={`${lesson.id}:practice:${attempt}`} onClose={() => setStage("overview")} onAnswerChecked={(correct) => quizSounds.play(correct ? "correct" : "incorrect")} onComplete={(score, total) => { if (total > 0 && score === total) quizSounds.play("perfect"); recordPracticeCompletion(lesson.id); setResult({ score, total }); setStage("complete"); }} />}
      {stage === "complete" && <PracticeComplete lesson={lesson} score={result.score} total={result.total} onRetry={() => { setAttempt((value) => value + 1); setStage("quiz"); }} onCards={() => setStage("cards")} onLibrary={() => void backToLibrary()} />}
    </div>
  );
}

function LessonOverview({
  lesson,
  cardCount,
  expanded,
  onBack,
  onPlay,
  onSkip,
  player,
}: {
  lesson: VideoLesson;
  cardCount: number;
  expanded: boolean;
  onBack: () => void;
  onPlay: () => void;
  onSkip?: () => void;
  player: React.ReactNode;
}) {
  return <section className={`lesson-overview-screen${expanded ? " is-video-expanded" : ""}`}>
    <AnimatePresence initial={false}>
      {!expanded && <motion.div key="lesson-intro" className="lesson-overview-intro" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
        <StudyTopBar title={`Lesson ${lesson.order}`} onBack={onBack} />
        <div className="lesson-overview-copy">
          <p className="lesson-kicker">{lesson.activityMode === "video-only" ? "Watch · learn" : "Watch · notice · practice"}</p>
          <h1>{lesson.topicEmoji} {lesson.title}</h1>
          <p>{lesson.objective.replace(/^Draft plan —\s*/, "")}</p>
        </div>
      </motion.div>}
    </AnimatePresence>

    {player}

    <AnimatePresence initial={false}>
      {!expanded && <motion.div key="lesson-actions" className="lesson-overview-tail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}>
        <div className="lesson-overview-meta">{lesson.activityMode === "video-only" ? <><span>Video class</span><span>No homework</span></> : <><span>{cardCount} cue card{cardCount === 1 ? "" : "s"}</span><span>Practice quiz included</span></>}</div>
        <div className="lesson-overview-actions">
          <button type="button" className="black-button" onClick={onPlay}><Play size={18} fill="currentColor" /> Play video</button>
          {cardCount > 0 && onSkip && <button type="button" className="soft-button" onClick={onSkip}>Skip to cards <ArrowRight size={18} /></button>}
        </div>
        {lesson.source && <a className="lesson-source-link" href={lesson.source.url} target="_blank" rel="noreferrer">Source: {lesson.source.label} <ExternalLink size={13} /></a>}
      </motion.div>}
    </AnimatePresence>
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
