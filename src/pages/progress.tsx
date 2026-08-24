"use client";

import { CalendarClock, CircleCheck, History, Languages } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useStudyStore } from "@/state/study-store";

export default function ProgressPage() {
  const { lessonProgress, reviewStates, attempts, sessions, streak } = useStudyStore((state) => state);
  const now = new Date();
  const due = reviewStates.filter((item) => new Date(item.dueAt) <= now).length;
  const remembered = attempts.filter((item) => item.result === "remembered").length;
  const accuracy = attempts.length ? Math.round((remembered / attempts.length) * 100) : 0;
  const mastered = lessonProgress.filter((item) => item.status === "mastered").length;
  const recent = [...attempts].slice(-12);
  const bars = recent.length ? recent.map((attempt) => attempt.result === "remembered" ? 86 : attempt.result === "effortful" ? 58 : 30) : [0, 0, 0, 0, 0, 0, 0];

  return (
    <div className="page">
      <PageHeader eyebrow="Learning record" title="What is holding, and what should return." intro="A compact view of recall—not time spent or taps made. All records remain on this device." />
      <section className="metric-grid">
        <article><CircleCheck size={19} /><span>Mastered lessons</span><strong>{mastered}<small> of 3</small></strong><p>Mastery requires successful delayed recall.</p></article>
        <article><CalendarClock size={19} /><span>Due reviews</span><strong>{due}</strong><p>{due ? "Ready for another retrieval." : "Nothing is overdue."}</p></article>
        <article><History size={19} /><span>Study rhythm</span><strong>{streak.currentDays}<small> {streak.currentDays === 1 ? "day" : "days"}</small></strong><p>{sessions.length ? `${sessions.length} recorded session${sessions.length === 1 ? "" : "s"}.` : "Begins with your first completed session."}</p></article>
        <article><Languages size={19} /><span>Recent recall</span><strong>{accuracy}<small>%</small></strong><p>Comfortable responses across recent attempts.</p></article>
      </section>

      <div className="progress-grid">
        <section className="chart-card">
          <div className="panel-heading"><div><p className="eyebrow">Recent recall accuracy</p><h2>Last twelve attempts</h2></div><span>{attempts.length ? "Local record" : "No attempts yet"}</span></div>
          <div className="bar-chart" aria-label={`Recent comfortable recall ${accuracy} percent`}>
            {bars.map((height, index) => <div key={index}><i style={{ height: `${Math.max(4, height)}%` }} /><span>{index + 1}</span></div>)}
          </div>
          <div className="chart-legend"><span><i className="high" />Comfortable</span><span><i className="mid" />Effortful</span><span><i className="low" />Needs another look</span></div>
        </section>
        <section className="mastery-card">
          <p className="eyebrow">Lesson state</p><h2>Ordered by introduction</h2>
          <div className="mastery-list">
            <div><span>01</span><div><b>Ordering a coffee</b><small>{lessonProgress[0]?.status?.replace("-", " ") ?? "unseen"}</small></div><i className="mastery-meter"><em style={{ width: attempts.length ? "62%" : "8%" }} /></i></div>
            <div className="muted"><span>02</span><div><b>Asking the price</b><small>not introduced</small></div><i className="mastery-meter"><em style={{ width: "0%" }} /></i></div>
            <div className="muted"><span>03</span><div><b>Confirming a destination</b><small>not introduced</small></div><i className="mastery-meter"><em style={{ width: "0%" }} /></i></div>
          </div>
        </section>
      </div>
      <p className="privacy-note">Your learning record is stored in this browser using IndexedDB. It is never sent anywhere.</p>
    </div>
  );
}
