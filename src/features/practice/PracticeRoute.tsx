import {
  Brain,
  ChevronRight,
  Clock3,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import { Mascot, NokLogo } from "@/src/components/Mascot";
import { Button } from "@/src/components/ui";
import { useAppStore } from "@/src/store/useAppStore";

const weakSkills = [
  {
    title: "Polite particles",
    detail: "ครับ / ค่ะ",
    strength: 42,
    color: "coral",
  },
  {
    title: "Listening for tones",
    detail: "Hear the difference",
    strength: 58,
    color: "sun",
  },
  {
    title: "Food requests",
    detail: "Useful phrases",
    strength: 71,
    color: "teal",
  },
];

export function PracticeRoute() {
  const progress = useAppStore((state) => state.progress);
  const startLesson = useAppStore((state) => state.startLesson);
  const lastCompleted = progress.activities[0];
  const practiceLesson = lastCompleted?.lessonId ?? "hello-there";

  return (
    <div className="page-shell practice-page">
      <header className="mobile-brand">
        <NokLogo />
      </header>
      <section className="page-title-row">
        <div>
          <span className="eyebrow">Practice studio</span>
          <h1>Turn shaky phrases into easy ones.</h1>
          <p>Nok builds quick reviews from your recent mistakes.</p>
        </div>
        <Mascot size="medium" mood="curious" />
      </section>

      <section className="review-hero">
        <div className="review-hero-icon">
          <Brain size={34} />
        </div>
        <div>
          <span className="eyebrow">Smart review</span>
          <h2>
            {progress.mistakeExerciseIds.length
              ? `${progress.mistakeExerciseIds.length} phrases are ready`
              : "Your first review is ready"}
          </h2>
          <p>
            A focused mix of listening, recall, and speaking. About 3 minutes.
          </p>
          <div className="review-meta">
            <span>
              <Clock3 size={16} /> 3 min
            </span>
            <span>
              <Sparkles size={16} /> +10 XP
            </span>
          </div>
        </div>
        <Button onClick={() => startLesson(practiceLesson)}>
          Start review <ChevronRight size={19} />
        </Button>
      </section>

      <section className="section-block">
        <div className="section-title">
          <div>
            <span className="eyebrow">Strengthen next</span>
            <h2>Skills to revisit</h2>
          </div>
          <Target size={25} />
        </div>
        <div className="weak-grid">
          {weakSkills.map((skill) => (
            <article className="weak-card" key={skill.title}>
              <span className={`weak-icon weak-${skill.color}`}>
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
            <h2>Recent lessons</h2>
          </div>
        </div>
        <div className="recent-lessons">
          {progress.activities.length ? (
            progress.activities.slice(0, 3).map((activity) => (
              <button
                key={activity.id}
                onClick={() => startLesson(activity.lessonId)}
              >
                <span>
                  <strong>{activity.title}</strong>
                  <small>
                    {activity.accuracy}% accuracy · {activity.xp} XP
                  </small>
                </span>
                <ChevronRight size={20} />
              </button>
            ))
          ) : (
            <div className="inline-empty">
              <p>
                Complete a lesson and it will appear here for quick practice.
              </p>
              <Button
                tone="secondary"
                onClick={() => startLesson("hello-there")}
              >
                Try the first lesson
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
