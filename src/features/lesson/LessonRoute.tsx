import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Heart,
  Lightbulb,
  Play,
  RotateCcw,
  X,
  XCircle,
} from "lucide-react";
import {
  dialoguesById,
  hintsById,
  resolveAudioAsset,
  speakersById,
} from "@/src/content/course";
import { Button, ProgressBar } from "@/src/components/ui";
import { correctAnswerPresentation } from "@/src/engine/grading";
import {
  ExerciseRenderer,
  isExerciseAnswerComplete,
} from "@/src/features/lesson/ExerciseRenderer";
import { audioGuide } from "@/src/lib/audio";
import { useAppStore } from "@/src/store/useAppStore";

export function LessonRoute() {
  const session = useAppStore((state) => state.activeSession);
  const settings = useAppStore((state) => state.settings);
  const setAnswer = useAppStore((state) => state.setAnswer);
  const markHintUsed = useAppStore((state) => state.markHintUsed);
  const checkAnswer = useAppStore((state) => state.checkAnswer);
  const continueLesson = useAppStore((state) => state.continueLesson);
  const exitLesson = useAppStore((state) => state.exitLesson);
  const navigate = useAppStore((state) => state.navigate);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const current = session?.exerciseQueue[session.exerciseIndex] ?? null;
  const next = session?.exerciseQueue[(session?.exerciseIndex ?? 0) + 1];

  useEffect(() => {
    headingRef.current?.focus();
  }, [current?.id]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!session || !current) return;
      const target = event.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
      if (
        session.currentResult === null &&
        /^[1-9]$/u.test(event.key) &&
        current.choices
      ) {
        const choice = current.choices[Number(event.key) - 1];
        if (choice) setAnswer(choice.id);
        return;
      }
      if (
        event.key !== "Enter" ||
        event.shiftKey ||
        target.tagName === "BUTTON"
      )
        return;
      if (session.currentResult !== null) continueLesson();
      else if (isExerciseAnswerComplete(current, session.currentAnswer))
        checkAnswer();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [checkAnswer, continueLesson, current, session, setAnswer]);

  if (!session || !current) {
    return (
      <div className="empty-state">
        <h1>No active lesson</h1>
        <p>Your lesson may already be complete.</p>
        <Button onClick={() => navigate("home")}>Back to the path</Button>
      </div>
    );
  }

  const percent =
    ((session.exerciseIndex + (session.currentResult !== null ? 1 : 0)) /
      session.exerciseQueue.length) *
    100;
  const hasAnswer = isExerciseAnswerComplete(current, session.currentAnswer);
  const hint =
    current.inlineHint ??
    (current.hintIds[0] ? hintsById[current.hintIds[0]]?.text : undefined);
  const selfMarkedForReview = session.currentAnswer === "needs-practice";
  const correctPresentation = correctAnswerPresentation(current);

  const confirmExit = () => {
    if (
      window.confirm(
        "Leave this lesson? Your exact place and generated review queue are saved on this device.",
      )
    )
      exitLesson();
  };

  const replayFeedback = (slow: boolean) =>
    void audioGuide.play(
      resolveAudioAsset(current.audioRef),
      settings.audioEnabled,
      settings.volume,
      slow ? "slow" : "normal",
    );

  return (
    <div className="lesson-page">
      <header className="lesson-topbar">
        <button
          className="icon-button"
          onClick={confirmExit}
          aria-label="Exit lesson"
        >
          <X size={25} />
        </button>
        <ProgressBar value={percent} label="Lesson progress" />
        <div
          className="hearts"
          aria-label={`${session.hearts} hearts remaining`}
          aria-live="polite"
        >
          <Heart size={23} fill="currentColor" />
          <strong>{session.hearts}</strong>
        </div>
      </header>

      <main className="lesson-stage">
        <div className="lesson-meta">
          <span>
            {session.mode === "checkpoint"
              ? "Checkpoint"
              : session.mode === "review"
                ? "Smart review"
                : session.lessonTitle}
          </span>
          <span>
            {session.exerciseIndex + 1} of {session.exerciseQueue.length}
          </span>
        </div>
        {session.recoveryCount > 0 && (
          <div className="recovery-note" role="status">
            <RotateCcw size={16} /> Recovery mode added two hearts and queued a
            fresh version of each miss.
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.section
            key={current.id}
            className="exercise-card"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: settings.reducedMotion ? 0 : 0.22 }}
          >
            <span className="eyebrow">{current.instruction}</span>
            <h1 ref={headingRef} tabIndex={-1}>
              {current.prompt}
            </h1>
            <ExerciseRenderer
              exercise={current}
              answer={session.currentAnswer}
              disabled={session.currentResult !== null}
              settings={settings}
              onAnswer={setAnswer}
              resolveAudioAsset={resolveAudioAsset}
              resolveDialogue={(dialogueId) =>
                dialogueId ? dialoguesById[dialogueId] : undefined
              }
              resolveSpeaker={(speakerId) =>
                speakerId ? speakersById[speakerId] : undefined
              }
              nextAudioAsset={resolveAudioAsset(next?.audioRef)}
            />
            {hint && session.currentResult === null && (
              <details
                className="hint"
                onToggle={(event) => {
                  if (event.currentTarget.open) markHintUsed();
                }}
              >
                <summary>
                  <Lightbulb size={17} /> Need a hint? (-1 first-try XP)
                </summary>
                <p>{hint}</p>
              </details>
            )}
          </motion.section>
        </AnimatePresence>
      </main>

      <footer
        className={`lesson-footer ${session.currentResult === true ? "feedback-correct" : session.currentResult === false ? "feedback-wrong" : ""}`}
      >
        <div className="feedback-wrap">
          {session.currentResult !== null && (
            <div className="feedback-copy" role="status" aria-live="assertive">
              <span className="feedback-icon">
                {session.currentResult ? (
                  <CheckCircle2 size={28} />
                ) : (
                  <XCircle size={28} />
                )}
              </span>
              <div>
                <strong>
                  {session.currentResult
                    ? "เก่งมาก! Nice work."
                    : selfMarkedForReview
                      ? "Good self-check — this one will return."
                      : "Not quite — here's the useful answer."}
                </strong>
                <p>
                  {!session.currentResult && <b>{correctPresentation}. </b>}
                  {session.currentResult
                    ? current.feedback.correct
                    : current.feedback.incorrect}{" "}
                  {current.explanation}
                  {current.feedback.pronunciation
                    ? ` Pronunciation: ${current.feedback.pronunciation}.`
                    : ""}
                </p>
                {current.audioRef && (
                  <span className="feedback-audio">
                    <button onClick={() => replayFeedback(false)}>
                      <Play size={14} fill="currentColor" /> Replay
                    </button>
                    <button onClick={() => replayFeedback(true)}>
                      <Play size={14} fill="currentColor" /> Slow
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
          <Button
            full
            disabled={session.currentResult === null && !hasAnswer}
            onClick={
              session.currentResult === null ? checkAnswer : continueLesson
            }
          >
            {session.currentResult === null
              ? "Check answer"
              : session.exerciseIndex === session.exerciseQueue.length - 1
                ? "See results"
                : "Continue"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
