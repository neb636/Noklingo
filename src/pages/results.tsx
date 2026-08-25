"use client";

import { ArrowRight, Check, Clock3, RotateCcw, X } from "lucide-react";
import { AppLink } from "@/components/AppLink";
import { PageHeader } from "@/components/PageHeader";
import { cueCards, lessons, studyLessons } from "@/domain/seed";
import type { CompletedStudySession, SessionQueueEntry } from "@/domain/schemas";
import { findQuestion } from "@/engine/learning-engine";
import { addLocalDays, formatLocalDate } from "@/engine/local-date";
import { lastCompletedSession, useStudyStore } from "@/state/study-store";

export default function ResultsPage() {
  const state = useStudyStore();
  const session = lastCompletedSession(state);
  if (!state.hydrated) return <ResultsEmpty title="Opening results…" />;
  if (!session) return <ResultsEmpty title="No completed session yet" />;

  const lesson = lessons.find((item) => item.id === session.lessonId);
  const isIntro = session.mode === "introduction";
  const isMastery = session.mode === "mastery";
  const passed = session.passed === true;
  const heading = isIntro ? "A clear first pass." : isMastery ? passed ? "The lesson is holding." : "Let this settle, then return." : "Older phrases checked.";
  const intro = isIntro
    ? "Today established recognition. Mastery remains deliberately unavailable until a local calendar day has passed."
    : isMastery ? "All corrections appeared together after the fixed queue was complete." : "This review changed only the due dates of older items.";

  return <div className="page">
    <PageHeader eyebrow="Session results" title={heading} intro={intro} />
    <section className={`result-summary tactile-card ${isMastery && !passed ? "result-failed" : ""}`}>
      <div className="result-mark">{isMastery && !passed ? <X size={27} /> : <Check size={28} />}</div>
      <div><p className="eyebrow">{lesson ? `Lesson ${String(lesson.order).padStart(2, "0")}` : "Standalone review"} · stored locally</p><h2>{lesson?.title ?? "Due review"}</h2><p>{summaryLine(session)}</p></div>
      <div className="next-review"><Clock3 size={18} /><span><small>Next step</small>{nextStep(session)}</span></div>
    </section>

    <div className="results-grid">
      <section className="result-panel"><div className="panel-heading"><div><p className="eyebrow">Corrections</p><h2>What to carry forward</h2></div><span>{session.answers.filter((answer) => !answer.correct).length} missed</span></div><CorrectionList session={session} source="active" /></section>
      <aside className="tomorrow-card"><p className="eyebrow">{isIntro ? "Why wait?" : passed ? "What changed" : "Next attempt"}</p><h2>{isIntro ? "Tomorrow, look away first." : passed ? "The next lesson is open." : "Try again tomorrow."}</h2><p>{isIntro ? "Delayed recall shows whether a phrase can be found rather than merely recognized." : passed ? "A passing active score unlocks the next published video immediately. Older review questions were kept outside the gate." : "Corrections and missed cards are here now. Another mastery queue stays blocked until the next local calendar day."}</p>
        {session.reviewTotal > 0 && <div className="review-result"><b>Older review</b><span>{session.reviewCorrect} of {session.reviewTotal} recalled</span><small>These answers never changed the active lesson gate.</small></div>}
      </aside>
    </div>

    {session.reviewTotal > 0 && <section className="result-panel review-corrections"><div className="panel-heading"><div><p className="eyebrow">Spaced review</p><h2>Older lesson items</h2></div></div><CorrectionList session={session} source="review" /></section>}
    <div className="page-actions">{lesson && <AppLink href={`/study/?replay=${encodeURIComponent(lesson.id)}`} className="secondary-button"><RotateCcw size={17} /> Replay without recording</AppLink>}<AppLink href="/today/" className="primary-button">Return to Today <ArrowRight size={18} /></AppLink></div>
  </div>;
}

function CorrectionList({ session, source }: { session: CompletedStudySession; source: SessionQueueEntry["source"] }) {
  const entries = session.queue.filter((entry) => entry.source === source);
  if (!entries.length) return <p className="empty-copy">No questions in this part of the session.</p>;
  return <div className="correction-list">{entries.map((entry) => {
    const answer = session.answers.find((item) => item.queueId === entry.queueId);
    const question = findQuestion(entry);
    const card = cueCards.find((item) => item.id === entry.itemId);
    return <article key={entry.queueId}><span className={`status-dot ${answer?.correct ? "right" : "review"}`} /><div><p>{question?.prompt ?? "Question no longer present"}</p><p className="thai correction-answer">{card?.thai}</p><small>{answer?.correct ? "Recalled accurately. " : "Needs another retrieval. "}{question?.explanation}</small></div></article>;
  })}</div>;
}

function summaryLine(session: CompletedStudySession) {
  if (session.mode === "introduction") return `${session.activeCorrect} of ${session.activeTotal} diagnostic answers correct · mastery still begins tomorrow`;
  if (session.mode === "mastery") return `${session.activeCorrect} of 10 active-lesson answers correct${session.reviewTotal ? ` · ${session.reviewTotal} older reviews kept separate` : ""}`;
  return `${session.reviewCorrect} of ${session.reviewTotal} due items recalled`;
}

function nextStep(session: CompletedStudySession) {
  if (session.mode === "introduction" || (session.mode === "mastery" && !session.passed)) return formatLocalDate(addLocalDays(session.localDate, 1));
  if (session.mode === "mastery" && session.passed) {
    const mastered = new Set(useStudyStore.getState().lessonProgress.filter((item) => item.status === "mastered").map((item) => item.lessonId));
    return studyLessons.some((lesson) => !mastered.has(lesson.id)) ? "Next lesson" : "Curriculum complete";
  }
  return "When another item is due";
}

function ResultsEmpty({ title }: { title: string }) {
  return <div className="page"><PageHeader eyebrow="Session results" title={title} intro="Complete a learning or review session to see its delayed feedback here." /><AppLink href="/today/" className="primary-button">Return to Today <ArrowRight size={17} /></AppLink></div>;
}
