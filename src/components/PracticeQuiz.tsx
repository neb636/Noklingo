"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Volume2, X } from "lucide-react";
import type { CueCard, VideoLesson } from "@/domain/schemas";
import { buildPracticeQuiz } from "@/engine/practice-quiz";
import { withPreferredParticle } from "@/lib/language-display";
import { useStudyStore } from "@/state/study-store";
import { ConceptAudioButton, ThaiAudioButton } from "./PhraseAudioButton";

export function PracticeQuiz({
  lesson,
  lessonCards,
  allCards,
  seed,
  onClose,
  onComplete,
}: {
  lesson: VideoLesson;
  lessonCards: CueCard[];
  allCards: CueCard[];
  seed: string;
  onClose: () => void;
  onComplete: (score: number, total: number) => void;
}) {
  const questions = useMemo(() => buildPracticeQuiz(lessonCards, allCards, seed), [lessonCards, allCards, seed]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const promptRef = useRef<HTMLDivElement>(null);
  const settings = useStudyStore((state) => state.settings);
  const question = questions[questionIndex];
  const promptCard = allCards.find((card) => card.id === question?.promptCardId);
  const selectedCorrectly = selectedId === question?.correctChoiceId;

  useEffect(() => {
    promptRef.current?.focus();
  }, [questionIndex]);

  if (!question || !promptCard) {
    return <section className="practice-quiz-screen"><QuizTopBar title={lesson.title} progress={1} count="0 / 0" onClose={onClose} /><div className="lesson-empty-state"><span>✨</span><h1>No quiz yet</h1><p>Add cue cards to create this lesson’s practice quiz.</p></div></section>;
  }

  function checkAnswer() {
    if (!selectedId || checked) return;
    if (selectedId === question.correctChoiceId) setScore((value) => value + 1);
    setChecked(true);
  }

  function continueQuiz() {
    if (!checked) return;
    if (questionIndex === questions.length - 1) {
      onComplete(score, questions.length);
      return;
    }
    setQuestionIndex((value) => value + 1);
    setSelectedId(undefined);
    setChecked(false);
  }

  return (
    <section className="practice-quiz-screen">
      <QuizTopBar title={`Lesson ${lesson.order}`} progress={(questionIndex + 1) / questions.length} count={`${questionIndex + 1} / ${questions.length}`} onClose={onClose} />
      <div className="practice-quiz-main">
        <div ref={promptRef} className="practice-question-prompt" tabIndex={-1}>
          <p className="quiz-instruction">Choose the correct translation</p>
          {settings.showThaiScript && <h1 className="quiz-prompt thai" lang="th">{withPreferredParticle(promptCard.thai, settings.politeParticle)}</h1>}
          {settings.showRomanization && <p className="quiz-prompt-romanization">{withPreferredParticle(promptCard.romanization, settings.politeParticle)}</p>}
          <div className="quiz-audio-replay">
            <ThaiAudioButton key={question.id} card={promptCard} autoPlayDelayMs={1000} autoPlayKey={question.id} displayLabel="Hear again" />
          </div>
        </div>

        <div className="quiz-choice-grid" role="group" aria-label="Answer choices">
          {question.choiceCardIds.map((choiceId) => {
            const card = allCards.find((item) => item.id === choiceId);
            if (!card) return null;
            const selected = selectedId === card.id;
            const correct = checked && card.id === question.correctChoiceId;
            const incorrect = checked && selected && !correct;
            return <button
              type="button"
              key={card.id}
              className={`visual-choice${selected ? " selected" : ""}${correct ? " correct" : ""}${incorrect ? " incorrect" : ""}`}
              aria-pressed={selected}
              aria-label={`${card.naturalMeaning}${correct ? ", correct answer" : incorrect ? ", incorrect answer" : ""}`}
              disabled={checked}
              onClick={() => setSelectedId(card.id)}
            >
              <span className="visual-choice-emoji" aria-hidden="true">{card.emoji}</span>
              <b>{card.naturalMeaning}</b>
              {correct && <span className="choice-status" aria-label="Correct answer"><Check size={16} /></span>}
            </button>;
          })}
        </div>

        {checked && <div className={`quiz-feedback-card ${selectedCorrectly ? "correct" : "incorrect"}`} role="status">
          <div><span>{selectedCorrectly ? "Correct — nice work" : "Incorrect — keep this one"}</span><strong>{promptCard.emoji} {promptCard.naturalMeaning}</strong></div>
          <ConceptAudioButton card={promptCard} compact />
        </div>}
        <p className="sr-only" aria-live="polite">{checked ? selectedCorrectly ? "Correct answer." : `Incorrect. The correct answer is ${promptCard.naturalMeaning}.` : `Question ${questionIndex + 1} of ${questions.length}.`}</p>
      </div>
      <footer className="quiz-action-bar">
        <button type="button" className="gradient-button" disabled={!selectedId} onClick={checked ? continueQuiz : checkAnswer}>
          {checked ? questionIndex === questions.length - 1 ? "See results" : "Continue" : "Check answer"}
        </button>
        {!checked && <span><Volume2 size={15} /> Practice only · not scored</span>}
      </footer>
    </section>
  );
}

function QuizTopBar({ title, progress, count, onClose }: { title: string; progress: number; count: string; onClose: () => void }) {
  return <header className="quiz-topbar"><button type="button" className="plain-icon-button" onClick={onClose} aria-label="Close quiz"><X size={22} /></button><div><span><i style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} /></span><small>{title}</small></div><b>{count}</b></header>;
}
