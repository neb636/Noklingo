import {
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Target,
} from "lucide-react";
import { NokLogo } from "@/src/components/Mascot";
import { ProgressBar, StatCard } from "@/src/components/ui";
import { curriculum } from "@/src/content/curriculum";
import { useAppStore } from "@/src/store/useAppStore";

const dateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const statusLabel = (status: string | undefined) => {
  if (status === "mastered") return "Mastered";
  if (status === "awaiting-mastery") return "Mastery pending";
  if (status === "introduced") return "Introduced";
  return "Not started";
};

export function ProgressRoute() {
  const lessonProgress = useAppStore((state) => state.lessonProgress);
  const itemReviewStates = useAppStore((state) => state.itemReviewStates);
  const attempts = useAppStore((state) => state.attempts);
  const streak = useAppStore((state) => state.streak);
  const today = dateKey();
  const masteredCount = curriculum.lessons.filter(
    (lesson) => lessonProgress[lesson.id]?.status === "mastered",
  ).length;
  const dueCount = Object.values(itemReviewStates).filter(
    (review) =>
      review.dueDate <= today &&
      lessonProgress[review.lessonId]?.status === "mastered",
  ).length;
  const delayedAttempts = attempts.filter(
    (attempt) => attempt.mode === "mastery",
  );
  const recentDelayedAttempts = delayedAttempts.slice(-5);
  const recentAccuracy = recentDelayedAttempts.length
    ? Math.round(
        recentDelayedAttempts.reduce(
          (sum, attempt) => sum + attempt.activeAccuracy,
          0,
        ) / recentDelayedAttempts.length,
      )
    : 0;
  const curriculumPercent = Math.round(
    (masteredCount / Math.max(1, curriculum.lessons.length)) * 100,
  );

  return (
    <div className="page-shell progress-page v3-progress-page">
      <header className="mobile-brand">
        <NokLogo />
      </header>
      <div className="page-title">
        <span className="eyebrow">Your progress</span>
        <h1>What you can recall is what you know.</h1>
        <p>
          Progress here reflects delayed mastery and spaced review—not points
          collected on the day you first saw a phrase.
        </p>
      </div>

      <div className="stats-grid">
        <StatCard
          icon={<CheckCircle2 size={24} />}
          value={masteredCount}
          label="Lessons mastered"
          accent="teal"
        />
        <StatCard
          icon={<Clock3 size={24} />}
          value={dueCount}
          label="Phrases due"
          accent="sun"
        />
        <StatCard
          icon={<Flame size={24} />}
          value={streak.current}
          label="Day streak"
          accent="coral"
        />
        <StatCard
          icon={<Target size={24} />}
          value={recentDelayedAttempts.length ? `${recentAccuracy}%` : "—"}
          label="Recent mastery"
          accent="teal"
        />
      </div>

      <section className="panel mastery-overview-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Curriculum mastery</span>
            <h2>{curriculumPercent}% truly learned</h2>
          </div>
          <BookOpenCheck size={26} />
        </div>
        <ProgressBar
          value={curriculumPercent}
          label="Curriculum mastery progress"
        />
        <p>
          {masteredCount} of {curriculum.lessons.length} lessons have passed the
          next-day 90% gate.
        </p>
      </section>

      <div className="progress-columns">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Lesson by lesson</span>
              <h2>Mastery status</h2>
            </div>
            <CheckCircle2 size={26} />
          </div>
          <div className="mastery-lesson-list">
            {curriculum.lessons.map((lesson) => {
              const progress = lessonProgress[lesson.id];
              const best = progress?.bestDelayedAccuracy ?? 0;
              return (
                <div className="mastery-lesson-row" key={lesson.id}>
                  <span
                    className={`mastery-status-dot mastery-status-${progress?.status ?? "unseen"}`}
                    aria-hidden="true"
                  />
                  <div>
                    <strong>{lesson.title}</strong>
                    <small>{statusLabel(progress?.status)}</small>
                  </div>
                  <b>
                    {progress?.status === "mastered" || best > 0
                      ? `${best}%`
                      : "—"}
                  </b>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Latest study</span>
              <h2>Recent sessions</h2>
            </div>
            <CalendarDays size={26} />
          </div>
          <div className="activity-list v3-activity-list">
            {attempts.length ? (
              attempts
                .slice(-7)
                .reverse()
                .map((attempt) => {
                  const lesson = curriculum.lessons.find(
                    (candidate) => candidate.id === attempt.lessonId,
                  );
                  const date = new Intl.DateTimeFormat(undefined, {
                    month: "short",
                    day: "numeric",
                  }).format(new Date(attempt.completedAt));
                  const displayAccuracy =
                    attempt.mode === "review"
                      ? Math.round(
                          (attempt.reviewCorrect /
                            Math.max(1, attempt.reviewTotal)) *
                            100,
                        )
                      : attempt.activeAccuracy;
                  return (
                    <div className="activity-row" key={attempt.id}>
                      <span className="activity-dot">
                        {attempt.passed ? (
                          <CheckCircle2 size={17} />
                        ) : (
                          <Clock3 size={17} />
                        )}
                      </span>
                      <div>
                        <strong>{lesson?.title ?? "Thai study"}</strong>
                        <small>
                          {date} ·{" "}
                          {attempt.mode === "introduction"
                            ? "First pass"
                            : attempt.mode === "review"
                              ? "Spaced review"
                              : "Mastery check"}
                          {attempt.reviewTotal > 0
                            ? ` · ${attempt.reviewTotal} older review`
                            : ""}
                        </small>
                      </div>
                      <b>{displayAccuracy}%</b>
                    </div>
                  );
                })
            ) : (
              <div className="inline-empty">
                <p>Your first completed study session will appear here.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="panel review-health-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Review health</span>
            <h2>Your spaced-repetition queue</h2>
          </div>
          <Clock3 size={26} />
        </div>
        <div className="review-health-grid">
          <div>
            <strong>{Object.keys(itemReviewStates).length}</strong>
            <span>Tracked phrases</span>
          </div>
          <div>
            <strong>{dueCount}</strong>
            <span>Due now</span>
          </div>
          <div>
            <strong>{streak.longest}</strong>
            <span>Longest streak</span>
          </div>
        </div>
      </section>
    </div>
  );
}
