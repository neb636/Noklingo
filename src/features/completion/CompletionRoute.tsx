import { motion } from "framer-motion";
import {
  Check,
  Clock3,
  Crown,
  Crosshair,
  LockOpen,
  Sparkles,
  Star,
} from "lucide-react";
import { Mascot, NokLogo } from "@/src/components/Mascot";
import { Button } from "@/src/components/ui";
import { useAppStore } from "@/src/store/useAppStore";

export function CompletionRoute() {
  const completion = useAppStore((state) => state.completion);
  const navigate = useAppStore((state) => state.navigate);
  const startLesson = useAppStore((state) => state.startLesson);
  const startReview = useAppStore((state) => state.startReview);

  if (!completion) {
    return (
      <div className="empty-state">
        <h1>All caught up</h1>
        <Button onClick={() => navigate("home")}>Back to the path</Button>
      </div>
    );
  }

  const minuteLabel =
    completion.seconds < 60
      ? `${completion.seconds}s`
      : `${Math.floor(completion.seconds / 60)}m ${completion.seconds % 60}s`;

  return (
    <div className="completion-page">
      <header>
        <NokLogo />
      </header>
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, index) => (
          <i key={index} />
        ))}
      </div>
      <motion.div
        className="completion-content"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 16 }}
      >
        <div className="completion-mascot">
          <span className="sunburst" />
          <Mascot size="large" mood="proud" />
        </div>
        <span className="eyebrow">
          <Sparkles size={16} />{" "}
          {completion.mode === "checkpoint"
            ? completion.passed
              ? "Checkpoint passed"
              : "Checkpoint needs another pass"
            : completion.mode === "review"
              ? "Review complete"
              : "Lesson complete"}
        </span>
        <h1>
          {completion.passed
            ? `${completion.lessonTitle} is in the bag!`
            : `${completion.accuracy}% — close, and useful.`}
        </h1>
        <p>
          {completion.passed
            ? "Nok noticed that effort. Your spoken Thai just got a little more useful."
            : `This checkpoint needs ${completion.requiredAccuracy ?? 80}%. A short targeted review will bring the missed ideas back before your retry.`}
        </p>

        <div className="xp-pile">
          <Star size={28} fill="currentColor" />
          <strong>+{completion.xp}</strong>
          <span>XP earned</span>
        </div>

        <div className="result-grid">
          <div>
            <span className="result-icon teal">
              <Crosshair size={22} />
            </span>
            <strong>{completion.accuracy}%</strong>
            <small>Accuracy</small>
          </div>
          <div>
            <span className="result-icon coral">
              <Check size={22} />
            </span>
            <strong>{completion.mistakes}</strong>
            <small>Mistakes</small>
          </div>
          <div>
            <span className="result-icon sun">
              <Clock3 size={22} />
            </span>
            <strong>{minuteLabel}</strong>
            <small>Time</small>
          </div>
        </div>

        {completion.unlockedTitle && (
          <div className="unlock-card">
            <span>
              <LockOpen size={23} />
            </span>
            <div>
              <small>New lesson unlocked</small>
              <strong>{completion.unlockedTitle}</strong>
            </div>
            <Crown size={25} />
          </div>
        )}

        {completion.newAchievementTitles.length > 0 && (
          <div className="achievement-callout">
            <Crown size={22} />
            <div>
              <small>Milestone unlocked</small>
              <strong>{completion.newAchievementTitles.join(" · ")}</strong>
            </div>
          </div>
        )}

        <div className="completion-actions">
          <Button
            full
            onClick={() =>
              completion.passed ? navigate("home") : startReview()
            }
          >
            {completion.passed ? "Back to my path" : "Review missed ideas"}
          </Button>
          <Button
            tone="secondary"
            full
            onClick={() =>
              completion.mode === "review"
                ? startReview()
                : startLesson(completion.lessonId)
            }
          >
            {completion.passed ? "Practice again" : "Retry checkpoint"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
