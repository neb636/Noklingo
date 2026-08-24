"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Captions, Check, CircleAlert, Eye, EyeOff, Play, RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cueCards, firstLesson } from "@/domain/seed";
import { assetPath } from "@/lib/asset-path";
import { PhraseAudioButton } from "@/components/PhraseAudioButton";
import { useStudyStore } from "@/state/study-store";
import { AppLink } from "@/components/AppLink";

const steps = ["Watch", "Notice", "Retrieve", "Check"] as const;

export default function StudyPage() {
  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [showNotes, setShowNotes] = useState(true);
  const reduce = useReducedMotion();
  const beginLesson = useStudyStore((state) => state.beginLesson);
  const recordRecall = useStudyStore((state) => state.recordRecall);
  const answers = useStudyStore((state) => state.quizAnswers);
  const answerQuiz = useStudyStore((state) => state.answerQuiz);
  const completeLesson = useStudyStore((state) => state.completeLesson);
  const settings = useStudyStore((state) => state.settings);

  useEffect(() => { beginLesson(firstLesson.id); }, [beginLesson]);
  const allAnswered = firstLesson.quizBank.every((question) => answers[question.id] !== undefined);
  const transition = reduce ? { duration: 0 } : { duration: 0.22 };

  function next() {
    setStep((value) => Math.min(steps.length - 1, value + 1));
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div className="page study-page">
      <header className="study-header">
        <div>
          <p className="eyebrow">Lesson 01 · draft</p>
          <h1>{firstLesson.title}</h1>
          <p>{firstLesson.objective}</p>
        </div>
        <ol className="stepper" aria-label="Study steps">
          {steps.map((label, index) => (
            <li key={label} className={index === step ? "active" : index < step ? "done" : ""}>
              <button onClick={() => index <= step && setStep(index)} aria-current={index === step ? "step" : undefined}>
                <span>{index < step ? <Check size={13} /> : index + 1}</span>{label}
              </button>
            </li>
          ))}
        </ol>
      </header>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={reduce ? false : { opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? {} : { opacity: 0, x: -8 }} transition={transition}>
          {step === 0 && (
            <section className="study-grid">
              <div className="video-column">
                {firstLesson.media.availability === "available" ? (
                  <video className="lesson-video" controls playsInline poster={assetPath(firstLesson.media.posterSrc)}>
                    <source src={assetPath(firstLesson.media.videoSrc)} type="video/mp4" />
                    <track default={settings.captionsByDefault} kind="captions" src={assetPath(firstLesson.media.captionsSrc)} srcLang="th" label="Thai and English" />
                  </video>
                ) : (
                  <div className="media-fallback" role="img" aria-label="Video awaiting licensed media">
                    <div className="frame-corners" />
                    <span className="fallback-play"><Play size={22} fill="currentColor" /></span>
                    <p>{firstLesson.media.fallbackMessage}</p>
                    <small>Local media slot · {firstLesson.media.durationSeconds} sec</small>
                  </div>
                )}
                <div className="watch-note"><CircleAlert size={17} /><span>First watch: follow the exchange without trying to memorize it.</span></div>
              </div>
              <div className="transcript-panel">
                <div className="panel-heading">
                  <div><span className="eyebrow">Working transcript</span><h2>What to listen for</h2></div>
                  <button className="text-button" onClick={() => setShowNotes(!showNotes)}>{showNotes ? <EyeOff size={16} /> : <Eye size={16} />}{showNotes ? "Hide English" : "Show English"}</button>
                </div>
                <div className="transcript-lines">
                  {firstLesson.transcript.map((line) => (
                    <article key={line.id} className="transcript-line">
                      <div className="line-time">{Math.floor(line.startSeconds / 60)}:{String(Math.floor(line.startSeconds % 60)).padStart(2, "0")}</div>
                      <div><span className="speaker">{line.speaker}</span><p className="thai">{line.thai}</p><p className="romanization">{line.romanization}</p>{showNotes && <p className="translation">{line.naturalEnglish}</p>}</div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}

          {step === 1 && (
            <section>
              <div className="section-lead"><p className="eyebrow">Cue cards</p><h2>Three phrases worth noticing</h2><p>Read for use, not word-for-word equivalence.</p></div>
              <div className="cue-grid">
                {cueCards.map((card, index) => (
                  <article className="cue-card tactile-card" key={card.id}>
                    <div className="card-index">0{index + 1}</div>
                    <PhraseAudioButton card={card} compact />
                    <p className="thai cue-thai">{card.thai}</p>
                    <p className="romanization">{card.romanization}</p>
                    <h3>{card.naturalMeaning}</h3>
                    <p>{card.usage}</p>
                    <span className="draft-label">Language draft</span>
                  </article>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <div className="section-lead"><p className="eyebrow">First retrieval</p><h2>Pause before you reveal</h2><p>Say the natural meaning aloud or quietly to yourself. Then turn the card.</p></div>
              <div className="recall-stack">
                {cueCards.map((card) => {
                  const open = revealed[card.id];
                  return (
                    <article key={card.id} className={`recall-card ${open ? "revealed" : ""}`}>
                      <div><p className="thai">{card.thai}</p><p className="romanization">{card.romanization}</p></div>
                      {!open ? (
                        <button className="secondary-button" onClick={() => setRevealed((value) => ({ ...value, [card.id]: true }))}>Reveal meaning</button>
                      ) : (
                        <div className="recall-answer">
                          <h3>{card.naturalMeaning}</h3><p>{card.usage}</p>
                          <div className="recall-buttons" aria-label="How did the phrase feel?">
                            <button onClick={() => recordRecall(card.id, "again")}>Need another look</button>
                            <button onClick={() => recordRecall(card.id, "effortful")}>Came back slowly</button>
                            <button onClick={() => recordRecall(card.id, "remembered")}>Remembered</button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="quiz-section">
              <div className="section-lead"><p className="eyebrow">Quick check</p><h2>Two useful distinctions</h2><p>Choose once. The correction appears immediately.</p></div>
              {firstLesson.quizBank.map((question, questionIndex) => {
                const selected = answers[question.id];
                return (
                  <fieldset className="quiz-card" key={question.id}>
                    <legend><span>0{questionIndex + 1}</span>{question.prompt}</legend>
                    <div className="choice-list">
                      {question.choices.map((choice, index) => {
                        const answered = selected !== undefined;
                        const stateClass = answered && index === question.correctIndex ? "correct" : answered && selected === index ? "incorrect" : "";
                        return <button type="button" key={choice} disabled={answered} className={stateClass} onClick={() => answerQuiz(question.id, index)}><span>{String.fromCharCode(65 + index)}</span><b className="thai">{choice}</b>{stateClass === "correct" && <Check size={17} />}</button>;
                      })}
                    </div>
                    {selected !== undefined && <p className="explanation">{question.explanation}</p>}
                  </fieldset>
                );
              })}
              {allAnswered && <AppLink className="primary-button result-link" href="/results/" onClick={() => completeLesson(firstLesson.id)}>Review this attempt <ArrowRight size={18} /></AppLink>}
            </section>
          )}
        </motion.div>
      </AnimatePresence>

      {step < 3 && <footer className="study-footer"><span>{step + 1} of {steps.length}</span><button className="primary-button" onClick={next}>{step === 0 ? <Captions size={17} /> : <RotateCcw size={17} />}{step === 0 ? "Notice the phrases" : step === 1 ? "Try from memory" : "Check understanding"}<ArrowRight size={18} /></button></footer>}
    </div>
  );
}
