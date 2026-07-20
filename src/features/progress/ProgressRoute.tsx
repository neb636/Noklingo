import {
  Award,
  BookOpenCheck,
  CalendarDays,
  Flame,
  Star,
  Trophy,
} from "lucide-react";
import { course } from "@/src/content/course";
import { NokLogo } from "@/src/components/Mascot";
import { ProgressBar, StatCard } from "@/src/components/ui";
import { unitPercent } from "@/src/lib/progress";
import { useAppStore } from "@/src/store/useAppStore";

export function ProgressRoute() {
  const progress = useAppStore((state) => state.progress);

  return (
    <div className="page-shell progress-page">
      <header className="mobile-brand">
        <NokLogo />
      </header>
      <div className="page-title">
        <span className="eyebrow">Your progress</span>
        <h1>Small lessons. Real momentum.</h1>
        <p>
          Every phrase you finish is one less thing to hesitate over in
          Thailand.
        </p>
      </div>

      <div className="stats-grid">
        <StatCard
          icon={<Star size={24} />}
          value={progress.totalXp}
          label="Total XP"
          accent="sun"
        />
        <StatCard
          icon={<Flame size={24} />}
          value={progress.currentStreak}
          label="Day streak"
          accent="coral"
        />
        <StatCard
          icon={<Trophy size={24} />}
          value={progress.longestStreak}
          label="Longest streak"
          accent="teal"
        />
        <StatCard
          icon={<BookOpenCheck size={24} />}
          value={progress.completedLessonIds.length}
          label="Lessons done"
          accent="sun"
        />
      </div>

      <div className="progress-columns">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Course map</span>
              <h2>Unit progress</h2>
            </div>
            <Award size={26} />
          </div>
          <div className="unit-list">
            {course.units.map((unit) => {
              const percent = unitPercent(course, unit.id, progress);
              return (
                <div className="unit-list-row" key={unit.id}>
                  <span className={`unit-number unit-number-${unit.color}`}>
                    {unit.number}
                  </span>
                  <div>
                    <div>
                      <strong>{unit.title}</strong>
                      <span>{percent}%</span>
                    </div>
                    <ProgressBar
                      value={percent}
                      label={`${unit.title} progress`}
                    />
                    <small>
                      {
                        unit.nodes.filter(
                          (node) =>
                            node.lessonId &&
                            progress.completedLessonIds.includes(node.lessonId),
                        ).length
                      }{" "}
                      of {unit.nodes.filter((node) => node.lessonId).length}{" "}
                      lessons
                    </small>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Latest wins</span>
              <h2>Recent activity</h2>
            </div>
            <CalendarDays size={26} />
          </div>
          <div className="activity-list">
            {progress.activities.length ? (
              progress.activities.slice(0, 6).map((activity) => {
                const date = new Intl.DateTimeFormat(undefined, {
                  month: "short",
                  day: "numeric",
                }).format(new Date(activity.completedAt));
                return (
                  <div className="activity-row" key={activity.id}>
                    <span className="activity-dot">
                      <Star size={17} fill="currentColor" />
                    </span>
                    <div>
                      <strong>{activity.title}</strong>
                      <small>
                        {date} · {activity.accuracy}% accurate
                        {!activity.passed ? " · checkpoint retry" : ""}
                      </small>
                    </div>
                    <b>+{activity.xp} XP</b>
                  </div>
                );
              })
            ) : (
              <div className="inline-empty">
                <p>
                  Your completed lessons will show up here. Your first win is
                  close.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="panel milestone-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Milestones</span>
            <h2>Useful wins, not busywork</h2>
          </div>
          <Trophy size={26} />
        </div>
        <div className="milestone-grid">
          {course.achievements.map((achievement) => {
            const unlocked = progress.unlockedAchievementIds.includes(
              achievement.id,
            );
            return (
              <article
                className={`milestone-card ${unlocked ? "unlocked" : ""}`}
                key={achievement.id}
              >
                <Star size={20} fill={unlocked ? "currentColor" : "none"} />
                <div>
                  <strong>{achievement.title}</strong>
                  <small>{achievement.description}</small>
                </div>
                <span>{unlocked ? "Earned" : "Ahead"}</span>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
