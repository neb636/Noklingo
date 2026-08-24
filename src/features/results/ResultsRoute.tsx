import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import { Mascot, NokLogo } from "@/src/components/Mascot";
import { Button } from "@/src/components/ui";
import { curriculum } from "@/src/content/curriculum";
import { useAppStore } from "@/src/store/useAppStore";

const friendlyDate = (value: string | undefined) => {
  if (!value) return "tomorrow";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(year, month - 1, day, 12));
};

export function ResultsRoute() {
  const completion = useAppStore((state) => state.completion);
  const settings = useAppStore((state) => state.settings);
  const finishResults = useAppStore((state) => state.finishResults);
  const navigate = useAppStore((state) => state.navigate);

  if (!completion) {
    return (
      <div className="empty-state">
        <h1>No results to show.</h1>
        <Button onClick={() => navigate("today")}>Back to Today</Button>
      </div>
    );
  }

  const lesson = curriculum.lessons.find(
    (candidate) => candidate.id === completion.attempt.lessonId,
  );
  const nextLesson = completion.nextLessonId
    ? curriculum.lessons.find(
        (candidate) => candidate.id === completion.nextLessonId,
      )
    : undefined;
  const missedItems = [...new Set(completion.missedItemIds)].flatMap(
    (itemId) => {
      const item = curriculum.knowledgeItems.find(
        (candidate) => candidate.id === itemId,
      );
      return item ? [item] : [];
    },
  );
  const isIntroduction = completion.attempt.mode === "introduction";
  const isReview = completion.attempt.mode === "review";
  const passed = !isIntroduction && !isReview && completion.passed;

  const heading = isIntroduction
    ? "Your first pass is complete."
    : isReview
      ? "Your spaced review is complete."
      : passed
        ? `${lesson?.title ?? "This lesson"} is mastered.`
        : `${completion.activeCorrect} of ${completion.activeTotal} — close, and useful.`;
  const body = isIntroduction
    ? `Come back ${friendlyDate(completion.nextEligibleMasteryDate)} to retrieve these phrases and earn mastery. Today’s score never skips the memory step.`
    : isReview
      ? `${completion.reviewCorrect} of ${completion.reviewTotal} older phrases came back correctly. Misses return tomorrow; successful recalls move farther out.`
      : passed
        ? nextLesson
          ? `${nextLesson.title} is unlocked now. You can watch it today or come back when you’re ready.`
          : "You passed the 90% delayed-recall gate and completed the curriculum."
        : `You need 9 of 10 active-lesson questions. Review the misses below; your next attempt opens ${friendlyDate(completion.nextEligibleMasteryDate)}.`;

  return (
    <div
      className={`completion-page results-page ${passed ? "results-passed" : ""}`}
    >
      <header>
        <NokLogo />
      </header>

      {passed && !settings.reducedMotion && (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 14 }).map((_, index) => (
            <i key={index} />
          ))}
        </div>
      )}

      <motion.div
        className="completion-content results-content"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: settings.reducedMotion ? 0 : 0.25,
          type: "spring",
          stiffness: 180,
          damping: 17,
        }}
      >
        <div className="completion-mascot">
          {passed && <span className="sunburst" />}
          <Mascot
            size="large"
            mood={
              passed
                ? "proud"
                : isIntroduction || isReview
                  ? "happy"
                  : "curious"
            }
          />
        </div>

        <span className="eyebrow">
          {isReview ? (
            <>
              <RotateCcw size={16} /> Review schedule refreshed
            </>
          ) : isIntroduction ? (
            <>
              <CalendarClock size={16} /> Tomorrow is the real test
            </>
          ) : passed ? (
            <>
              <Sparkles size={16} /> Mastery check passed
            </>
          ) : (
            <>
              <RotateCcw size={16} /> Try again tomorrow
            </>
          )}
        </span>
        <h1>{heading}</h1>
        <p>{body}</p>

        <div className="result-grid v3-result-grid">
          <div>
            <span className="result-icon teal">
              <Target size={22} />
            </span>
            <strong>{completion.accuracy}%</strong>
            <small>{isReview ? "Review accuracy" : "Active accuracy"}</small>
          </div>
          <div>
            <span className="result-icon coral">
              <Check size={22} />
            </span>
            <strong>
              {isReview
                ? "—"
                : `${completion.activeCorrect}/${completion.activeTotal}`}
            </strong>
            <small>{isReview ? "No mastery gate" : "Lesson questions"}</small>
          </div>
          <div>
            <span className="result-icon sun">
              <BookOpenCheck size={22} />
            </span>
            <strong>
              {completion.reviewTotal
                ? `${completion.reviewCorrect}/${completion.reviewTotal}`
                : "—"}
            </strong>
            <small>Older review</small>
          </div>
        </div>

        {!isIntroduction && passed && nextLesson && (
          <div className="unlock-card">
            <span>
              <CheckCircle2 size={23} />
            </span>
            <div>
              <small>Next video unlocked</small>
              <strong>{nextLesson.title}</strong>
            </div>
            <ArrowRight size={24} />
          </div>
        )}

        {missedItems.length > 0 && (
          <section className="results-corrections">
            <div className="results-corrections-heading">
              <span className="eyebrow">Cue cards to revisit</span>
              <h2>Keep these close for next time</h2>
            </div>
            <div className="results-missed-list">
              {missedItems.map((item) => (
                <article key={item.id}>
                  {settings.showThaiScript && (
                    <strong lang="th">{item.thai}</strong>
                  )}
                  {settings.romanization !== "never" && (
                    <span>{item.romanization}</span>
                  )}
                  <p>{item.meaning}</p>
                  <small>{item.usageNotes}</small>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="completion-actions results-actions">
          <Button full onClick={finishResults}>
            {passed && nextLesson
              ? "Go to next lesson"
              : isIntroduction || isReview
                ? "Back to Today"
                : "Finish for today"}
            <ArrowRight size={18} />
          </Button>
          <Button tone="secondary" full onClick={() => navigate("library")}>
            Open library
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
