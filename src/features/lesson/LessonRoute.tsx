import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Heart, Lightbulb, X, XCircle } from "lucide-react";
import { course } from "@/src/content/course";
import { Button, ProgressBar } from "@/src/components/ui";
import { ExerciseRenderer } from "@/src/features/lesson/ExerciseRenderer";
import { useAppStore } from "@/src/store/useAppStore";

export function LessonRoute() {
  const session = useAppStore((state) => state.activeSession);
  const settings = useAppStore((state) => state.settings);
  const setAnswer = useAppStore((state) => state.setAnswer);
  const checkAnswer = useAppStore((state) => state.checkAnswer);
  const continueLesson = useAppStore((state) => state.continueLesson);
  const exitLesson = useAppStore((state) => state.exitLesson);
  const navigate = useAppStore((state) => state.navigate);

  const lesson = session ? course.lessons[session.lessonId] : null;
  const current =
    session && lesson ? lesson.exercises[session.exerciseIndex] : null;

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.shiftKey) return;
      const target = event.target as HTMLElement;
      if (target.tagName === "BUTTON") return;
      if (session?.currentResult !== null) continueLesson();
      else if (session?.currentAnswer !== null) checkAnswer();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    checkAnswer,
    continueLesson,
    session?.currentAnswer,
    session?.currentResult,
  ]);

  if (!session || !lesson || !current) {
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
      lesson.exercises.length) *
    100;
  const hasAnswer =
    session.currentAnswer !== null &&
    (!Array.isArray(session.currentAnswer) || session.currentAnswer.length > 0);

  const confirmExit = () => {
    if (
      window.confirm(
        "Leave this lesson? Your progress is saved on this device.",
      )
    )
      exitLesson();
  };

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
        >
          <Heart size={23} fill="currentColor" />
          <strong>{session.hearts}</strong>
        </div>
      </header>

      <main className="lesson-stage">
        <div className="lesson-meta">
          <span>{lesson.eyebrow}</span>
          <span>
            {session.exerciseIndex + 1} of {lesson.exercises.length}
          </span>
        </div>
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
            <h1>{current.prompt}</h1>
            {current.romanization &&
              current.type === "fill-blank" &&
              settings.romanization !== "never" && (
                <p className="prompt-romanization">{current.romanization}</p>
              )}
            <ExerciseRenderer
              exercise={current}
              answer={session.currentAnswer}
              disabled={session.currentResult !== null}
              settings={settings}
              onAnswer={setAnswer}
            />
            {current.hint && session.currentResult === null && (
              <details className="hint">
                <summary>
                  <Lightbulb size={17} /> Need a hint?
                </summary>
                <p>{current.hint}</p>
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
            <div className="feedback-copy">
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
                    : "Almost! Give it another look."}
                </strong>
                <p>
                  {current.explanation ??
                    (session.currentResult
                      ? "That’s the one."
                      : `Answer: ${Array.isArray(current.correctAnswer) ? current.correctAnswer.join(" ") : current.correctAnswer}`)}
                </p>
              </div>
            </div>
          )}
          <Button
            full
            disabled={!hasAnswer}
            onClick={
              session.currentResult === null ? checkAnswer : continueLesson
            }
          >
            {session.currentResult === null
              ? "Check answer"
              : session.exerciseIndex === lesson.exercises.length - 1
                ? "See results"
                : "Continue"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
