"use client";

import { ArrowRight, Check, Clock3, RotateCcw } from "lucide-react";
import { cueCards, firstLesson } from "@/domain/seed";
import { PageHeader } from "@/components/PageHeader";
import { useStudyStore } from "@/state/study-store";
import { AppLink } from "@/components/AppLink";

export default function ResultsPage() {
  const answers = useStudyStore((state) => state.quizAnswers);
  const attempts = useStudyStore((state) => state.attempts.filter((attempt) => attempt.lessonId === firstLesson.id));
  const answered = firstLesson.quizBank.filter((question) => answers[question.id] !== undefined);
  const correct = answered.filter((question) => answers[question.id] === question.correctIndex).length;
  const remembered = attempts.filter((attempt) => attempt.result === "remembered").length;
  const needsReturn = cueCards.length - new Set(attempts.filter((attempt) => attempt.result === "remembered").map((attempt) => attempt.itemId)).size;

  return (
    <div className="page">
      <PageHeader eyebrow="Attempt notes" title="A clear first pass." intro="Recognition today is only the beginning. These phrases are now scheduled to return after some forgetting has had time to happen." />

      <section className="result-summary tactile-card">
        <div className="result-mark"><Check size={28} /></div>
        <div><p className="eyebrow">Lesson 01 · recorded locally</p><h2>{firstLesson.title}</h2><p>{correct} of {answered.length || firstLesson.quizBank.length} checks correct · {remembered} phrases recalled comfortably</p></div>
        <div className="next-review"><Clock3 size={18} /><span><small>Next recall</small>Tomorrow</span></div>
      </section>

      <div className="results-grid">
        <section className="result-panel">
          <div className="panel-heading"><div><p className="eyebrow">Corrections</p><h2>What to carry forward</h2></div><span>{needsReturn} to revisit</span></div>
          <div className="correction-list">
            {firstLesson.quizBank.map((question) => {
              const selected = answers[question.id];
              const isCorrect = selected === question.correctIndex;
              return (
                <article key={question.id}>
                  <span className={`status-dot ${isCorrect ? "right" : "review"}`} />
                  <div><p>{question.prompt}</p><p className="thai correction-answer">{question.choices[question.correctIndex]}</p><small>{selected === undefined ? "No response saved in this browser view. " : isCorrect ? "Answered accurately. " : "Return to this distinction. "}{question.explanation}</small></div>
                </article>
              );
            })}
          </div>
        </section>
        <aside className="tomorrow-card">
          <p className="eyebrow">Why wait?</p>
          <h2>Tomorrow, look away first.</h2>
          <p>Delayed recall shows whether a phrase can be found, not merely recognized. The review will begin with meaning and ask you to bring back the Thai.</p>
          <div className="mini-schedule"><span>Today<small>First pass</small></span><i /><span>Tomorrow<small>Retrieve</small></span><i /><span>Later<small>Keep alive</small></span></div>
        </aside>
      </div>

      <div className="page-actions"><AppLink href="/study/" className="secondary-button"><RotateCcw size={17} /> Revisit lesson</AppLink><AppLink href="/today/" className="primary-button">Return to Today <ArrowRight size={18} /></AppLink></div>
    </div>
  );
}
