import {
  BookOpen,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  Play,
  RotateCcw,
} from "lucide-react";
import { NokLogo } from "@/src/components/Mascot";
import { Button } from "@/src/components/ui";
import { curriculum } from "@/src/content/curriculum";
import { useAppStore } from "@/src/store/useAppStore";

const dateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const durationLabel = (seconds: number | undefined) => {
  if (!seconds) return "Short video";
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min video`;
};

export function LibraryRoute() {
  const lessonProgress = useAppStore((state) => state.lessonProgress);
  const activeSession = useAppStore((state) => state.activeSession);
  const replayLesson = useAppStore((state) => state.replayLesson);
  const resumeSession = useAppStore((state) => state.resumeSession);
  const startToday = useAppStore((state) => state.startToday);
  const notice = useAppStore((state) => state.notice);
  const dismissNotice = useAppStore((state) => state.dismissNotice);
  const today = dateKey();
  const firstUnmasteredIndex = curriculum.lessons.findIndex(
    (lesson) => lessonProgress[lesson.id]?.status !== "mastered",
  );
  const masteredCount = curriculum.lessons.filter(
    (lesson) => lessonProgress[lesson.id]?.status === "mastered",
  ).length;

  return (
    <div className="page-shell library-page">
      <header className="mobile-brand">
        <NokLogo />
      </header>
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button onClick={dismissNotice} aria-label="Dismiss notice">
            ×
          </button>
        </div>
      )}
      <div className="page-title">
        <span className="eyebrow">Your library</span>
        <h1>Revisit the Thai you’ve earned.</h1>
        <p>
          Replay mastered lessons whenever you like. Replays never change your
          mastery score, review schedule, or streak.
        </p>
      </div>

      <div className="library-summary">
        <BookOpen size={24} />
        <strong>
          {masteredCount} of {curriculum.lessons.length} lessons mastered
        </strong>
        <span>
          One active lesson · future videos stay private until unlocked
        </span>
      </div>

      <section className="library-grid" aria-label="Video lessons">
        {curriculum.lessons.map((lesson, index) => {
          const progress = lessonProgress[lesson.id];
          const mastered = progress?.status === "mastered";
          const active = !mastered && index === firstUnmasteredIndex;
          const locked = !mastered && !active;
          const resumable = activeSession?.lessonId === lesson.id;
          const masteryDue =
            progress?.status === "awaiting-mastery" &&
            Boolean(
              progress.nextEligibleMasteryDate &&
              progress.nextEligibleMasteryDate <= today,
            );
          const waiting =
            progress?.status === "awaiting-mastery" && !masteryDue;

          return (
            <article
              className={`library-card ${mastered ? "library-card-mastered" : active ? "library-card-active" : "library-card-locked"}`}
              key={lesson.id}
            >
              <div className="library-card-art" aria-hidden="true">
                <span>{String(lesson.order).padStart(2, "0")}</span>
                {mastered ? (
                  <CheckCircle2 size={31} />
                ) : active ? (
                  <Play size={31} fill="currentColor" />
                ) : (
                  <LockKeyhole size={29} />
                )}
              </div>

              <div className="library-card-copy">
                <div className="library-card-meta">
                  <span>
                    {resumable
                      ? activeSession?.mode === "review"
                        ? "Review in progress"
                        : "In progress"
                      : mastered
                        ? "Mastered"
                        : masteryDue
                          ? "Mastery due"
                          : waiting
                            ? "Returns tomorrow"
                            : active
                              ? "Ready"
                              : "Locked"}
                  </span>
                  {!locked && (
                    <small>
                      <Clock3 size={14} />{" "}
                      {durationLabel(lesson.media.durationSeconds)}
                    </small>
                  )}
                </div>
                <h2>{lesson.title}</h2>
                <p>
                  {locked
                    ? "Master the previous lesson to unlock this video."
                    : lesson.description}
                </p>
                <div className="library-tags" aria-label="Lesson topics">
                  {lesson.tags.slice(0, 3).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>

              <div className="library-card-action">
                {resumable ? (
                  <Button onClick={resumeSession}>
                    {activeSession?.mode === "review"
                      ? "Resume review"
                      : "Resume"}{" "}
                    <Play size={16} fill="currentColor" />
                  </Button>
                ) : mastered ? (
                  <Button
                    tone="secondary"
                    onClick={() => replayLesson(lesson.id)}
                  >
                    <RotateCcw size={17} /> Replay
                  </Button>
                ) : active && !waiting ? (
                  <Button onClick={startToday}>
                    {masteryDue ? "Start mastery" : "Start lesson"}
                    <Play size={16} fill="currentColor" />
                  </Button>
                ) : waiting ? (
                  <span className="library-waiting-label">
                    <Clock3 size={16} /> Memory check pending
                  </span>
                ) : (
                  <span className="library-locked-label">
                    <LockKeyhole size={16} /> Complete lesson {index}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
