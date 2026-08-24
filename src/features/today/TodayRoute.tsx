import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Flame,
  PlayCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Mascot, NokLogo } from "@/src/components/Mascot";
import { Button } from "@/src/components/ui";
import { curriculum } from "@/src/content/curriculum";
import { useAppStore } from "@/src/store/useAppStore";

const dateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const friendlyDate = (value: string | undefined) => {
  if (!value) return "tomorrow";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(year, month - 1, day, 12));
};

export function TodayRoute() {
  const lessonProgress = useAppStore((state) => state.lessonProgress);
  const itemReviewStates = useAppStore((state) => state.itemReviewStates);
  const streak = useAppStore((state) => state.streak);
  const activeSession = useAppStore((state) => state.activeSession);
  const notice = useAppStore((state) => state.notice);
  const dismissNotice = useAppStore((state) => state.dismissNotice);
  const startToday = useAppStore((state) => state.startToday);
  const resumeSession = useAppStore((state) => state.resumeSession);
  const navigate = useAppStore((state) => state.navigate);

  const today = dateKey();
  const masteredCount = curriculum.lessons.filter(
    (lesson) => lessonProgress[lesson.id]?.status === "mastered",
  ).length;
  const nextLesson = curriculum.lessons.find(
    (lesson) => lessonProgress[lesson.id]?.status !== "mastered",
  );
  const nextProgress = nextLesson ? lessonProgress[nextLesson.id] : undefined;
  const isMasteryDue =
    nextProgress?.status === "awaiting-mastery" &&
    Boolean(
      nextProgress.nextEligibleMasteryDate &&
      nextProgress.nextEligibleMasteryDate <= today,
    );
  const isWaiting =
    nextProgress?.status === "awaiting-mastery" && !isMasteryDue;
  const dueReviewCount = Object.values(itemReviewStates).filter(
    (review) =>
      review.dueDate <= today &&
      lessonProgress[review.lessonId]?.status === "mastered",
  ).length;
  const activeLesson = activeSession
    ? curriculum.lessons.find((lesson) => lesson.id === activeSession.lessonId)
    : undefined;
  const activeIsReview = activeSession?.mode === "review";

  const state = activeSession
    ? "resume"
    : !nextLesson
      ? dueReviewCount > 0
        ? "review"
        : "complete"
      : isMasteryDue
        ? "mastery"
        : isWaiting
          ? "waiting"
          : "new";

  const hero = {
    resume: {
      eyebrow: "Pick up where you left off",
      title: activeIsReview
        ? "Spaced review"
        : (activeLesson?.title ?? "Your lesson is waiting"),
      body: `Resume at ${String(activeSession?.stage ?? "your saved place").replaceAll("-", " ")}. Nothing was lost.`,
      action: "Resume session",
      icon: RotateCcw,
    },
    mastery: {
      eyebrow: "Mastery check ready",
      title: nextLesson?.title ?? "Bring yesterday’s Thai back",
      body: "Recall the cue cards, then score at least 9 out of 10 active questions to master this lesson.",
      action: "Start mastery check",
      icon: BookOpenCheck,
    },
    waiting: {
      eyebrow: "Let memory do its work",
      title: "You’re done for today.",
      body: `Your mastery check for ${nextLesson?.title ?? "this lesson"} opens ${friendlyDate(nextProgress?.nextEligibleMasteryDate)}.`,
      action: "Browse my library",
      icon: CalendarClock,
    },
    new: {
      eyebrow: "New lesson ready",
      title: nextLesson?.title ?? "A fresh lesson is ready",
      body:
        nextLesson?.objective ??
        "Watch, notice the useful phrases, and make a first pass through them.",
      action: "Watch today’s lesson",
      icon: PlayCircle,
    },
    review: {
      eyebrow: "Spaced review ready",
      title: `${dueReviewCount} phrase${dueReviewCount === 1 ? " is" : "s are"} due today.`,
      body: "Retrieve the older cue cards, then refresh their review schedule with a focused quiz. Nothing can relock a mastered lesson.",
      action: "Start spaced review",
      icon: RotateCcw,
    },
    complete: {
      eyebrow: "Curriculum complete",
      title: "You’ve mastered every lesson here.",
      body: "Keep your Thai warm by replaying any lesson from your library.",
      action: "Open my library",
      icon: CheckCircle2,
    },
  }[state];
  const HeroIcon = hero.icon;

  const primaryAction = () => {
    if (state === "resume") resumeSession();
    else if (state === "waiting") navigate("library");
    else if (state === "complete") navigate("library");
    else startToday();
  };

  return (
    <div className="page-shell today-page">
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

      <section className={`today-hero today-hero-${state}`}>
        <div className="today-hero-copy">
          <span className="eyebrow">{hero.eyebrow}</span>
          <h1>{hero.title}</h1>
          <p>{hero.body}</p>
          <Button onClick={primaryAction}>
            {hero.action} <ArrowRight size={19} />
          </Button>
        </div>
        <div className="today-hero-visual" aria-hidden="true">
          <span className="today-state-icon">
            <HeroIcon size={31} />
          </span>
          <Mascot
            size="large"
            mood={
              state === "complete"
                ? "proud"
                : state === "waiting"
                  ? "curious"
                  : "happy"
            }
          />
        </div>
      </section>

      <div className="today-summary-grid">
        <article className="today-summary-card">
          <span className="summary-icon summary-icon-coral">
            <Flame size={23} fill="currentColor" />
          </span>
          <div>
            <strong>{streak.current} day streak</strong>
            <small>
              {streak.lastStudyDate === today
                ? "Today counts — nice work"
                : "Introductions and mastery checks count"}
            </small>
          </div>
        </article>
        <article className="today-summary-card">
          <span className="summary-icon summary-icon-teal">
            <CheckCircle2 size={23} />
          </span>
          <div>
            <strong>
              {masteredCount} of {curriculum.lessons.length} mastered
            </strong>
            <small>Delayed recall, not first-day familiarity</small>
          </div>
        </article>
        <article className="today-summary-card">
          <span className="summary-icon summary-icon-sun">
            <Clock3 size={23} />
          </span>
          <div>
            <strong>{dueReviewCount} older phrases due</strong>
            <small>Mixed into your next check automatically</small>
          </div>
        </article>
      </div>

      <section className="today-how-it-works">
        <div className="section-title">
          <div>
            <span className="eyebrow">The daily rhythm</span>
            <h2>Learn it today. Prove it tomorrow.</h2>
          </div>
          <Sparkles size={26} />
        </div>
        <ol className="learning-loop">
          <li>
            <span>1</span>
            <div>
              <strong>Watch</strong>
              <small>Meet useful Thai in a real video.</small>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>Notice</strong>
              <small>Explore the phrases with focused cue cards.</small>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>Recall</strong>
              <small>Return tomorrow and retrieve them from memory.</small>
            </div>
          </li>
        </ol>
      </section>
    </div>
  );
}
