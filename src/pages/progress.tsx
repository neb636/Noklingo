"use client";

import { CalendarClock, CircleCheck, History, Languages } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { cueCards, studyLessons } from "@/domain/seed";
import { compareLocalDates, formatLocalDate, localDateKey } from "@/engine/local-date";
import { useStudyStore } from "@/state/study-store";

export default function ProgressPage() {
  const { lessonProgress, reviewStates, attempts, completedSessions, streak } = useStudyStore();
  const today = localDateKey();
  const due = reviewStates.filter((item) => compareLocalDates(item.dueDate, today) <= 0);
  const delayed = attempts.filter((item) => item.source !== "diagnostic").slice(-20);
  const correct = delayed.filter((item) => item.correct).length;
  const accuracy = delayed.length ? Math.round((correct / delayed.length) * 100) : 0;
  const mastered = lessonProgress.filter((item) => item.status === "mastered").length;
  const recentSessions = completedSessions.filter((session) => session.mode !== "introduction").slice(-8);

  return <div className="page">
    <PageHeader eyebrow="Learning record" title="What is holding, and what should return." intro="A compact view of delayed recall—not time spent, points, or taps made. All records remain in this browser." />
    <section className="metric-grid">
      <article><CircleCheck size={19} /><span>Mastered lessons</span><strong>{mastered}<small> of {studyLessons.length}</small></strong><p>Mastery requires a delayed 9/10 active score.</p></article>
      <article><CalendarClock size={19} /><span>Due items</span><strong>{due.length}</strong><p>{due.length ? "Ready for another retrieval." : "Nothing is overdue."}</p></article>
      <article><History size={19} /><span>Consistency</span><strong>{streak.currentDays}<small> {streak.currentDays === 1 ? "day" : "days"}</small></strong><p>Longest run: {streak.longestDays} day{streak.longestDays === 1 ? "" : "s"}.</p></article>
      <article><Languages size={19} /><span>Recent delayed recall</span><strong>{delayed.length ? accuracy : "—"}<small>{delayed.length ? "%" : ""}</small></strong><p>{delayed.length ? `${correct} of ${delayed.length} recent answers.` : "Begins with the first mastery check."}</p></article>
    </section>

    <div className="progress-grid">
      <section className="chart-card"><div className="panel-heading"><div><p className="eyebrow">Recent delayed-recall accuracy</p><h2>Completed queues</h2></div><span>{recentSessions.length ? "Newest at right" : "No delayed sessions yet"}</span></div>
        <div className="bar-chart" aria-label="Accuracy for recent delayed sessions">{(recentSessions.length ? recentSessions : Array.from({ length: 6 }, () => undefined)).map((session, index) => {
          const total = session ? session.activeTotal + session.reviewTotal : 0;
          const sessionCorrect = session ? session.activeCorrect + session.reviewCorrect : 0;
          const height = total ? Math.round((sessionCorrect / total) * 100) : 0;
          return <div key={session?.id ?? index}><i style={{ height: `${Math.max(4, height)}%` }} /><span>{session ? `${sessionCorrect}/${total}` : "—"}</span></div>;
        })}</div><p className="chart-caption">Active mastery and spaced-review answers only. Day-one diagnostics are excluded.</p>
      </section>
      <section className="mastery-card"><p className="eyebrow">Lesson mastery</p><h2>Published curriculum</h2><div className="mastery-list">{studyLessons.map((lesson) => {
        const progress = lessonProgress.find((item) => item.lessonId === lesson.id);
        return <div key={lesson.id}><span>{String(lesson.order).padStart(2, "0")}</span><div><b>{lesson.title}</b><small>{progress?.status?.replace("-", " ") ?? "not introduced"}{progress?.masteredDate ? ` · ${formatLocalDate(progress.masteredDate)}` : ""}</small></div></div>;
      })}</div></section>
    </div>

    <section className="due-list"><div className="panel-heading"><div><p className="eyebrow">Review schedule</p><h2>Knowledge items</h2></div><span>{reviewStates.length} scheduled</span></div>{reviewStates.length ? [...reviewStates].sort((a, b) => compareLocalDates(a.dueDate, b.dueDate)).map((review) => {
      const card = cueCards.find((item) => item.id === review.itemId);
      return <div key={review.itemId}><span className="thai">{card?.thai}</span><span>{card?.naturalMeaning}</span><time>{compareLocalDates(review.dueDate, today) <= 0 ? "Due now" : formatLocalDate(review.dueDate)}</time></div>;
    }) : <p className="empty-copy">Items receive their first spaced-review date after delayed mastery.</p>}</section>
    <p className="privacy-note">Stored locally in IndexedDB. Replays and browsing never appear in this record.</p>
  </div>;
}
