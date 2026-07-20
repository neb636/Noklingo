import { motion } from "framer-motion";
import {
  BookOpenCheck,
  Check,
  ChevronRight,
  Flame,
  LockKeyhole,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { course, findNextLessonId } from "@/src/content/course";
import { Mascot, NokLogo } from "@/src/components/Mascot";
import { Button, ProgressBar } from "@/src/components/ui";
import { isLessonUnlocked, unitPercent } from "@/src/lib/progress";
import { useAppStore } from "@/src/store/useAppStore";

export function HomeRoute() {
  const progress = useAppStore((state) => state.progress);
  const profile = useAppStore((state) => state.profile);
  const activeSession = useAppStore((state) => state.activeSession);
  const startLesson = useAppStore((state) => state.startLesson);
  const resumeLesson = useAppStore((state) => state.resumeLesson);
  const navigate = useAppStore((state) => state.navigate);
  const notice = useAppStore((state) => state.notice);
  const dismissNotice = useAppStore((state) => state.dismissNotice);
  const nextLessonId = findNextLessonId(progress.completedLessonIds);
  const nextLesson = course.lessons[nextLessonId];
  const dailyPercent = Math.round((progress.todayXp / profile.dailyGoal) * 100);

  return (
    <div className="page-shell home-page">
      <header className="mobile-brand">
        <NokLogo />
      </header>
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button onClick={dismissNotice} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <section className="home-hero">
        <div>
          <span className="eyebrow">Today’s Thai</span>
          <h1>Sà-wàt-dee! Ready for a quick win?</h1>
          <p>
            Next up: <strong>{nextLesson.title}</strong> · about 4 minutes
          </p>
          <Button onClick={() => startLesson(nextLessonId)}>
            Continue learning <ChevronRight size={20} />
          </Button>
        </div>
        <div className="hero-goal-card">
          <div
            className="goal-ring"
            style={
              {
                "--progress": `${Math.min(100, dailyPercent) * 3.6}deg`,
              } as React.CSSProperties
            }
          >
            <div>
              <Flame size={25} fill="currentColor" />
              <strong>{progress.todayXp}</strong>
              <span>/{profile.dailyGoal} XP</span>
            </div>
          </div>
          <div>
            <strong>
              {dailyPercent >= 100 ? "Goal crushed!" : "Daily goal"}
            </strong>
            <small>
              {dailyPercent >= 100
                ? "Nok is impressed."
                : `${Math.max(0, profile.dailyGoal - progress.todayXp)} XP to go`}
            </small>
          </div>
        </div>
      </section>

      {activeSession && (
        <button className="resume-card" onClick={resumeLesson}>
          <span className="resume-icon">
            <BookOpenCheck size={24} />
          </span>
          <span>
            <strong>
              Resume {course.lessons[activeSession.lessonId].title}
            </strong>
            <small>
              Exercise {activeSession.exerciseIndex + 1} of{" "}
              {course.lessons[activeSession.lessonId].exercises.length} · your
              place is saved
            </small>
          </span>
          <ChevronRight size={22} />
        </button>
      )}

      <div className="path-heading">
        <div>
          <span className="eyebrow">Your learning path</span>
          <h2>Speak a little more every day</h2>
        </div>
        <div className="path-streak">
          <Flame size={20} fill="currentColor" />
          <strong>{progress.currentStreak}</strong>
          <span>day streak</span>
        </div>
      </div>

      <div className="course-path">
        {course.units.map((unit) => {
          const percent = unitPercent(unit.id, progress.completedLessonIds);
          return (
            <section className={`unit unit-${unit.color}`} key={unit.id}>
              <header className="unit-header">
                <div>
                  <span>Unit {unit.number}</span>
                  <h3>{unit.title}</h3>
                  <p>{unit.description}</p>
                </div>
                <div className="unit-progress">
                  <strong>{percent}%</strong>
                  <ProgressBar
                    value={percent}
                    label={`${unit.title} progress`}
                  />
                </div>
              </header>
              <div className="path-nodes">
                {unit.nodes.map((node, index) => {
                  const completed = node.lessonId
                    ? progress.completedLessonIds.includes(node.lessonId)
                    : percent === 100;
                  const unlocked = node.lessonId
                    ? isLessonUnlocked(
                        node.lessonId,
                        progress.completedLessonIds,
                      )
                    : percent === 100;
                  const active = node.lessonId === nextLessonId && !completed;
                  const NodeIcon =
                    node.type === "checkpoint"
                      ? Trophy
                      : node.type === "review"
                        ? RotateCcw
                        : active
                          ? Star
                          : completed
                            ? Check
                            : unlocked
                              ? Sparkles
                              : LockKeyhole;
                  return (
                    <motion.div
                      className="path-row"
                      key={node.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="path-label path-label-left">
                        {index % 2 === 0 && (
                          <>
                            <strong>{node.title}</strong>
                            <small>
                              {node.type === "lesson"
                                ? course.lessons[node.lessonId!].eyebrow
                                : node.type}
                            </small>
                          </>
                        )}
                      </div>
                      <button
                        className={`path-node ${completed ? "completed" : active ? "active" : unlocked ? "available" : "locked"} path-node-${node.type}`}
                        disabled={!unlocked}
                        onClick={() =>
                          node.lessonId
                            ? startLesson(node.lessonId)
                            : navigate("practice")
                        }
                        aria-label={`${node.title}, ${completed ? "completed" : unlocked ? "available" : "locked"}`}
                      >
                        <NodeIcon
                          size={node.type === "lesson" ? 26 : 30}
                          strokeWidth={2.6}
                          fill={active ? "currentColor" : "none"}
                        />
                      </button>
                      <div className="path-label path-label-right">
                        {index % 2 !== 0 && (
                          <>
                            <strong>{node.title}</strong>
                            <small>
                              {node.type === "lesson"
                                ? course.lessons[node.lessonId!].eyebrow
                                : node.type}
                            </small>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <section className="home-nok-card">
        <Mascot size="medium" mood="curious" />
        <div>
          <span className="eyebrow">Nok’s tip</span>
          <h3>Hear it, say it, use it.</h3>
          <p>
            Thai tones click faster when your mouth joins the lesson. Try
            repeating every phrase out loud.
          </p>
        </div>
      </section>
    </div>
  );
}
