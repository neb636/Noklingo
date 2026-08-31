"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Volume2 } from "lucide-react";
import { cueCards } from "@/domain/seed";
import type { MixedReviewSession } from "@/domain/schemas";
import { mixedReviewQuestions } from "@/engine/mixed-review";
import { withPreferredParticle } from "@/lib/language-display";
import { useQuizSounds } from "@/lib/use-quiz-sounds";
import { useStudyStore } from "@/state/study-store";
import { ConceptAudioButton, ThaiAudioButton } from "./PhraseAudioButton";
import { QuizTopBar } from "./PracticeQuiz";

export function MixedReviewQuiz({ session, onClose }: { session: MixedReviewSession; onClose: () => void }) {
  const [selection, setSelection] = useState<{ questionId: string; cardId: string }>();
  const promptRef = useRef<HTMLDivElement>(null);
  const settings = useStudyStore((state) => state.settings);
  const answerMixedReview = useStudyStore((state) => state.answerMixedReview);
  const continueMixedReviewQuiz = useStudyStore((state) => state.continueMixedReviewQuiz);
  const quizSounds = useQuizSounds(true);
  const questions = mixedReviewQuestions(session);
  const question = questions[session.questionIndex];
  const promptCard = cueCards.find((card) => card.id === question?.promptCardId);
  const storedAnswer = session.answers[session.questionIndex];
  const checked = session.feedbackCardId === question?.promptCardId;
  const selectedId = selection?.questionId === question?.id ? selection.cardId : undefined;
  const effectiveSelectedId = checked ? storedAnswer?.selectedCardId : selectedId;
  const selectedCorrectly = checked && storedAnswer?.correct === true;

  useEffect(() => {
    promptRef.current?.focus();
  }, [session.questionIndex]);

  if (!question || !promptCard) return null;

  function checkAnswer() {
    if (!selectedId || checked) return;
    answerMixedReview(selectedId);
    quizSounds.play(selectedId === question.correctChoiceId ? "correct" : "incorrect");
  }

  return <section className="practice-quiz-screen">
    <QuizTopBar title="Mixed review" progress={(session.questionIndex + 1) / questions.length} count={`${session.questionIndex + 1} / ${questions.length}`} onClose={onClose} />
    <div className="practice-quiz-main">
      <div ref={promptRef} className="practice-question-prompt" tabIndex={-1}>
        <p className="quiz-instruction">Choose the correct translation</p>
        {settings.showThaiScript && <h1 className="quiz-prompt thai" lang="th">{withPreferredParticle(promptCard.thai, settings.politeParticle)}</h1>}
        {settings.showRomanization && <p className="quiz-prompt-romanization">{withPreferredParticle(promptCard.romanization, settings.politeParticle)}</p>}
        <div className="quiz-audio-replay"><ThaiAudioButton key={question.id} card={promptCard} autoPlayDelayMs={1000} autoPlayKey={question.id} displayLabel="Hear again" /></div>
      </div>

      <div className="quiz-choice-grid" role="group" aria-label="Answer choices">
        {question.choiceCardIds.map((choiceId) => {
          const card = cueCards.find((item) => item.id === choiceId);
          if (!card) return null;
          const selected = effectiveSelectedId === card.id;
          const correct = checked && card.id === question.correctChoiceId;
          const incorrect = checked && selected && !correct;
          return <button
            type="button"
            key={card.id}
            className={`visual-choice${selected ? " selected" : ""}${correct ? " correct" : ""}${incorrect ? " incorrect" : ""}`}
            aria-pressed={selected}
            aria-label={`${card.naturalMeaning}${correct ? ", correct answer" : incorrect ? ", incorrect answer" : ""}`}
            disabled={checked}
            onClick={() => setSelection({ questionId: question.id, cardId: card.id })}
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
      <p className="sr-only" aria-live="polite">{checked ? selectedCorrectly ? "Correct answer." : `Incorrect. The correct answer is ${promptCard.naturalMeaning}.` : `Question ${session.questionIndex + 1} of ${questions.length}.`}</p>
    </div>
    <footer className="quiz-action-bar">
      <button type="button" className="gradient-button" disabled={!effectiveSelectedId} onClick={checked ? continueMixedReviewQuiz : checkAnswer}>
        {checked ? session.questionIndex === questions.length - 1 ? "Finish review" : "Continue" : "Check answer"}
      </button>
      {!checked && <span><Volume2 size={15} /> Practice only · not scored</span>}
    </footer>
  </section>;
}
