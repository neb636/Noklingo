import {
  Brain,
  ChevronRight,
  Clock3,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import { course } from "@/src/content/course";
import { Mascot, NokLogo } from "@/src/components/Mascot";
import { Button } from "@/src/components/ui";
import { reviewOverview } from "@/src/engine/review";
import { useAppStore } from "@/src/store/useAppStore";

export function PracticeRoute() {
  const progress = useAppStore((state) => state.progress);
  const startLesson = useAppStore((state) => state.startLesson);
  const startReview = useAppStore((state) => state.startReview);
  const overview = reviewOverview(course, progress);
  const reviewMinutes = Math.max(2, Math.ceil(overview.readyCount * 0.55));

  return (
    <div className="page-shell practice-page">
      <header className="mobile-brand">
        <NokLogo />
      </header>
      <section className="page-title-row">
        <div>
          <span className="eyebrow">Practice studio</span>
          <h1>Turn shaky phrases into easy ones.</h1>
          <p>
            Nok mixes recent mistakes, weak phrases, and older material that is
            due today.
          </p>
        </div>
        <Mascot size="medium" mood="curious" />
      </section>

      <section className="review-hero">
        <div className="review-hero-icon">
          <Brain size={34} />
        </div>
        <div>
          <span className="eyebrow">Generated smart review</span>
          <h2>{overview.readyCount} focused exercises are ready</h2>
          <p>
            {overview.mistakeCount
              ? `${overview.mistakeCount} unresolved ${overview.mistakeCount === 1 ? "mistake" : "mistakes"} will return in a changed format.`
              : overview.dueCount
                ? `${overview.dueCount} learned ${overview.dueCount === 1 ? "item is" : "items are"} due for recall.`
                : "A balanced starter review is ready; future sessions adapt to every answer."}
          </p>
          <div className="review-meta">
            <span>
              <Clock3 size={16} /> about {reviewMinutes} min
            </span>
            <span>
              <Sparkles size={16} /> XP by answer quality
            </span>
          </div>
        </div>
        <Button onClick={startReview}>
          Start review <ChevronRight size={19} />
        </Button>
      </section>

      <section className="section-block">
        <div className="section-title">
          <div>
            <span className="eyebrow">Strengthen next</span>
            <h2>Skills based on your recalls</h2>
          </div>
          <Target size={25} />
        </div>
        <div className="weak-grid">
          {overview.weakSkills.map((skill, index) => (
            <article className="weak-card" key={skill.id}>
              <span
                className={`weak-icon weak-${["coral", "sun", "teal"][index]}`}
              >
                <RotateCcw size={21} />
              </span>
              <div>
                <strong>{skill.title}</strong>
                <small>{skill.detail}</small>
                <div className="strength-track">
                  <i style={{ width: `${skill.strength}%` }} />
                </div>
                <span>{skill.strength}% strong</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-title">
          <div>
            <span className="eyebrow">Replay</span>
            <h2>Recent sessions</h2>
          </div>
        </div>
        <div className="recent-lessons">
          {progress.activities.length ? (
            progress.activities.slice(0, 4).map((activity) => (
              <button
                key={activity.id}
                onClick={() =>
                  activity.mode === "review"
                    ? startReview()
                    : startLesson(activity.lessonId)
                }
              >
                <span>
                  <strong>{activity.title}</strong>
                  <small>
                    {activity.accuracy}% accuracy · {activity.xp} XP
                    {!activity.passed ? " · retry recommended" : ""}
                  </small>
                </span>
                <ChevronRight size={20} />
              </button>
            ))
          ) : (
            <div className="inline-empty">
              <p>
                Your completed sessions will show up here. A generated review is
                available even before your first lesson.
              </p>
              <Button tone="secondary" onClick={startReview}>
                Try a short review
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
