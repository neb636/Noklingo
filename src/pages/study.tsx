"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { ArrowRight, Check, Eye, Mic2, RotateCcw, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotionConfig } from "framer-motion";
import { AppLink } from "@/components/AppLink";
import { LessonExperience } from "@/components/LessonExperience";
import { LessonVideoScreen } from "@/components/LessonVideoScreen";
import { ConceptAudioButton, LocalAudioButton } from "@/components/PhraseAudioButton";
import { cueCards, lessons } from "@/domain/seed";
import type { ActiveStudySession, QuizQuestion, SessionQueueEntry, VideoLesson } from "@/domain/schemas";
import { writeSnapshot } from "@/data/db";
import { assetPath } from "@/lib/asset-path";
import { useClientReady } from "@/lib/use-client-ready";
import { withPreferredParticle } from "@/lib/language-display";
import { answerFor } from "@/engine/learning-engine";
import { activeCard, activeQuestion, snapshotFromState, useStudyStore } from "@/state/study-store";

export default function StudyPage() {
  const router = useRouter();
  const clientReady = useClientReady();
  const previewId = typeof router.query.preview === "string" ? router.query.preview : undefined;
  const replayId = typeof router.query.replay === "string" ? router.query.replay : undefined;
  const previewLesson = previewId ? lessons.find((lesson) => lesson.id === previewId) : undefined;
  const replayLesson = replayId ? lessons.find((lesson) => lesson.id === replayId) : undefined;
  const hydrated = useStudyStore((state) => state.hydrated);
  const progress = useStudyStore((state) => state.lessonProgress);

  if (!clientReady) return <StudyEmpty title="Opening your session…" body="Reading the exact stage and fixed queue stored in this browser." />;
  if (previewLesson) return <LessonExperience lesson={previewLesson} />;
  if (replayLesson) {
    if (!hydrated) return <StudyEmpty title="Opening the library…" body="Checking that this replay is available in your local record." />;
    if (progress.some((entry) => entry.lessonId === replayLesson.id && entry.status === "mastered")) return <LessonExperience lesson={replayLesson} />;
    return <StudyEmpty title="Replay unavailable" body="Only mastered lessons can be replayed. Browse the lesson library to watch any short lesson." />;
  }
  if (previewId || replayId) return <StudyEmpty title="Lesson not found" body="This preview does not match the bundled curriculum." />;
  return <DurableStudy />;
}

function DurableStudy() {
  const state = useStudyStore();
  const session = state.activeSession;
  const reduce = useReducedMotionConfig();
  const lesson = lessons.find((item) => item.id === session?.lessonId);
  const card = activeCard(session);
  const active = activeQuestion(session);

  async function finish() {
    useStudyStore.getState().finishSession();
    await writeSnapshot(snapshotFromState(useStudyStore.getState()));
    window.location.assign(assetPath("/results/"));
  }

  if (!state.hydrated) return <StudyEmpty title="Opening your session…" body="Reading the exact stage and fixed queue stored in this browser." />;
  if (!session) return <StudyEmpty title="No unfinished session" body="Today will choose the next useful action from your local learning record." />;

  const label = session.mode === "introduction" ? "First pass" : session.mode === "mastery" ? "Delayed mastery" : "Spaced review";
  const steps = session.mode === "introduction" ? ["Watch", "Cue cards", "Diagnostic"] : session.mode === "mastery" ? ["Retrieve", "Mastery"] : ["Due review"];
  const stepIndex = session.mode === "introduction" ? session.stage === "video" ? 0 : session.stage === "cue-cards" ? 1 : 2 : session.stage === "retrieval-cards" ? 0 : 1;

  return (
    <div className="page study-page">
      <header className="study-header">
        <div><p className="eyebrow">{label}{lesson ? ` · Lesson ${String(lesson.order).padStart(2, "0")}` : ""}</p><h1>{lesson?.title ?? "Due review"}</h1><p>{lesson?.objective ?? "Keep older phrases available through deliberate recall."}</p></div>
        <ol className="stepper" aria-label="Study steps">{steps.map((step, index) => <li key={step} className={index === stepIndex ? "active" : index < stepIndex ? "done" : ""}><span><i>{index < stepIndex ? <Check size={13} /> : index + 1}</i>{step}</span></li>)}</ol>
      </header>

      <AnimatePresence mode="wait">
        <motion.div key={`${session.stage}-${session.cardIndex}-${session.questionIndex}`} initial={reduce ? false : { opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? {} : { opacity: 0, x: -8 }} transition={{ duration: reduce ? 0 : 0.2 }}>
          {session.stage === "video" && lesson && <VideoStage lesson={lesson} />}
          {session.stage === "cue-cards" && card && <CueCardStage card={card} session={session} />}
          {session.stage === "retrieval-cards" && card && <RetrievalStage card={card} session={session} />}
          {(session.stage === "diagnostic" || session.stage === "mastery-quiz") && active && <QuizStage session={session} entry={active.entry} question={active.question} />}
          {(session.stage === "diagnostic" || session.stage === "mastery-quiz") && !active && (
            <section className="queue-complete tactile-card">
              <Check size={24} /><p className="eyebrow">Fixed queue complete</p>
              <h2>{session.mode === "introduction" ? "Your first pass is ready to record." : "All answers are in."}</h2>
              <p>{session.mode === "introduction" ? "This diagnostic cannot grant mastery today. The lesson will return tomorrow." : "No answer was marked while the queue was moving. Results and corrections are ready together."}</p>
              <button className="primary-button" onClick={() => void finish()}>See results <ArrowRight size={18} /></button>
            </section>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function VideoStage({ lesson }: { lesson: VideoLesson }) {
  const fullscreenRef = useRef<HTMLElement>(null);
  const completeVideo = useStudyStore((state) => state.completeVideo);
  return <section ref={fullscreenRef} className="durable-video-host"><LessonVideoScreen lesson={lesson} fullscreenTargetRef={fullscreenRef} onClose={() => window.location.assign(assetPath("/today/"))} onContinue={(bypassed) => completeVideo(Boolean(bypassed))} requireCompletedWatch /></section>;
}

function CueCardStage({ card, session }: { card: (typeof cueCards)[number]; session: ActiveStudySession }) {
  const settings = useStudyStore((state) => state.settings);
  const advance = useStudyStore((state) => state.advanceCard);
  return <section className="single-card-stage"><div className="section-lead"><p className="eyebrow">Cue card {session.cardIndex + 1} of {session.cardOrder.length}</p><h2>Notice the phrase in context</h2><p>Read for natural use rather than word-for-word equivalence.</p></div>
    <article className="cue-card tactile-card focused-card"><ConceptAudioButton card={card} compact /><span className="cue-emoji" aria-hidden="true">{card.emoji}</span><h3>{card.naturalMeaning}</h3>{settings.showThaiScript && <p className="thai cue-thai">{withPreferredParticle(card.thai, settings.politeParticle)}</p>}{settings.showRomanization && <p className="romanization">{withPreferredParticle(card.romanization, settings.politeParticle)}</p>}<p>{card.usage}</p>{card.literalNote && <p className="card-note"><b>Literal note</b> {card.literalNote}</p>}{card.culturalNote && <p className="card-note"><b>Context</b> {card.culturalNote}</p>}<span className="draft-label">{card.verificationStatus} language</span></article>
    <footer className="study-footer"><span>{session.cardIndex + 1} of {session.cardOrder.length}</span><button className="primary-button" onClick={advance}>{session.cardIndex === session.cardOrder.length - 1 ? "Begin diagnostic" : "Next cue card"}<ArrowRight size={18} /></button></footer>
  </section>;
}

function RetrievalStage({ card, session }: { card: (typeof cueCards)[number]; session: ActiveStudySession }) {
  const settings = useStudyStore((state) => state.settings);
  const reveal = useStudyStore((state) => state.revealCard);
  const advance = useStudyStore((state) => state.advanceCard);
  return <section className="retrieval-focus"><div className="section-lead"><p className="eyebrow">Retrieval {session.cardIndex + 1} of {session.cardOrder.length}</p><h2>Find the Thai before looking</h2><p>Use the situation and meaning as your prompt. Say your answer aloud if useful.</p></div>
    <article className={`recall-card retrieval-large ${session.cardRevealed ? "revealed" : ""}`}><div><span className="eyebrow">Meaning and context</span><h2>{card.naturalMeaning}</h2><p>{card.usage}</p></div>
      {!session.cardRevealed ? <button className="secondary-button" onClick={reveal}>Reveal Thai <Eye size={17} /></button> : <div className="recall-answer"><span className="speaking-label"><Mic2 size={15} /> Self-guided speaking · unscored</span>{settings.showThaiScript && <p className="thai">{withPreferredParticle(card.thai, settings.politeParticle)}</p>}{settings.showRomanization && <p className="romanization">{withPreferredParticle(card.romanization, settings.politeParticle)}</p>}<ConceptAudioButton card={card} /><button className="primary-button" onClick={advance}>{session.cardIndex === session.cardOrder.length - 1 ? "Begin mastery check" : "Next retrieval"}<ArrowRight size={17} /></button></div>}
    </article>
  </section>;
}

function QuizStage({ session, entry, question }: { session: ActiveStudySession; entry: SessionQueueEntry; question?: QuizQuestion }) {
  if (!question) return <StudyEmpty title="This queue is stale" body="The bundled curriculum no longer contains one of its questions. Return to Today to rebuild it." />;
  const delayed = session.mode === "mastery";
  const answer = answerFor(session, entry.queueId);
  const progress = Math.min(1, (session.questionIndex + 1) / Math.max(1, session.queue.length));
  return <section className="quiz-section durable-quiz-screen">
    <header className="quiz-topbar"><button type="button" className="plain-icon-button" onClick={() => window.location.assign(assetPath("/today/"))} aria-label="Close quiz"><X size={22} /></button><div><span><i style={{ width: `${progress * 100}%` }} /></span><small>{session.mode === "introduction" ? "Diagnostic" : entry.source === "review" ? "Older review" : "Active lesson"}</small></div><b>{session.questionIndex + 1} / {session.queue.length}</b></header>
    <div className="durable-quiz-content"><div className="section-lead"><h2>{delayed ? "Answer the complete queue" : session.mode === "introduction" ? "A short first-pass check" : "Recall, correct, continue"}</h2><p>{delayed ? "Corrections stay hidden until every answer is complete." : session.mode === "introduction" ? "Each answer teaches immediately; mastery still begins tomorrow." : "Use the correction now, before this phrase is scheduled again."}</p></div>{session.feedbackQueueId === entry.queueId && answer ? <AnswerFeedback entry={entry} question={question} correct={answer.correct} /> : <QuestionCard key={entry.queueId} entry={entry} question={question} />}</div>
  </section>;
}

function AnswerFeedback({ entry, question, correct }: { entry: SessionQueueEntry; question: QuizQuestion; correct: boolean }) {
  const card = cueCards.find((item) => item.id === entry.itemId);
  const continueAfterFeedback = useStudyStore((state) => state.continueAfterFeedback);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { feedbackRef.current?.focus(); }, []);
  return <article className={`quiz-card answer-feedback ${correct ? "correct" : "incorrect"}`} role="status">
    <p ref={feedbackRef} tabIndex={-1} className="eyebrow">{correct ? "Recalled accurately" : "Keep this correction"}</p>
    {card && <><p className="thai correction-answer" lang="th">{card.thai}</p><p className="romanization">{card.romanization}</p><h3>{card.naturalMeaning}</h3><ConceptAudioButton card={card} /></>}
    <p>{question.explanation}</p>
    <button className="primary-button" onClick={continueAfterFeedback}>Continue <ArrowRight size={17} /></button>
  </article>;
}

function QuestionCard({ entry, question }: { entry: SessionQueueEntry; question: QuizQuestion }) {
  const answerChoice = useStudyStore((state) => state.answerChoice);
  const settings = useStudyStore((state) => state.settings);
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const questionRef = useRef<HTMLFieldSetElement>(null);
  useEffect(() => { questionRef.current?.focus(); }, []);
  if (question.interactionType === "phrase-construction") return <ConstructionQuestion entry={entry} question={question} />;
  if (question.interactionType === "matching") return <MatchingQuestion entry={entry} question={question} />;
  const order = entry.choiceOrder ?? question.choices?.map((_, index) => index) ?? [];
  return <fieldset ref={questionRef} tabIndex={-1} className="quiz-card durable-question-card"><legend><span>{interactionLabel(question.interactionType)}</span>{question.prompt}</legend>{question.interactionType === "listening" && <LocalAudioButton src={question.audioSrc} label="listening question audio" />}
    <div className="choice-list durable-choice-grid">{order.map((originalIndex, displayIndex) => { const choice = withPreferredParticle(question.choices?.[originalIndex] ?? "", settings.politeParticle); const thai = /\p{Script=Thai}/u.test(choice); return <button type="button" className={selectedIndex === displayIndex ? "selected" : ""} aria-pressed={selectedIndex === displayIndex} key={`${originalIndex}-${choice}`} onClick={() => setSelectedIndex(displayIndex)}><span>{String.fromCharCode(65 + displayIndex)}</span><b className={thai ? "thai" : ""} lang={thai ? "th" : undefined}>{choice}</b></button>; })}</div>
    <button type="button" className="gradient-button durable-check-button" disabled={selectedIndex === undefined} onClick={() => selectedIndex !== undefined && answerChoice(selectedIndex)}>Check answer</button>
  </fieldset>;
}

function ConstructionQuestion({ entry, question }: { entry: SessionQueueEntry; question: QuizQuestion }) {
  const [selected, setSelected] = useState<string[]>([]);
  const submit = useStudyStore((state) => state.answerConstruction);
  const questionRef = useRef<HTMLFieldSetElement>(null);
  useEffect(() => { questionRef.current?.focus(); }, []);
  const tokens = (entry.tokenOrder ?? []).map((index) => question.constructionTokens?.[index]).filter((token): token is string => Boolean(token));
  return <fieldset ref={questionRef} tabIndex={-1} className="quiz-card construction-card"><legend><span>Phrase construction</span>{question.prompt}</legend><div className="construction-answer">{selected.length ? selected.map((token, index) => <button key={`${token}-${index}`} onClick={() => setSelected((value) => value.filter((_, itemIndex) => itemIndex !== index))} className="thai" lang="th">{token}</button>) : <p>Choose tokens in order.</p>}</div><div className="token-bank">{tokens.map((token, index) => <button key={`${token}-${index}`} className="thai" lang="th" disabled={selected.filter((item) => item === token).length >= tokens.filter((item) => item === token).length} onClick={() => setSelected((value) => [...value, token])}>{token}</button>)}</div><button className="primary-button" disabled={selected.length !== question.correctConstruction?.length} onClick={() => submit(selected)}>Save answer <ArrowRight size={17} /></button></fieldset>;
}

function MatchingQuestion({ entry, question }: { entry: SessionQueueEntry; question: QuizQuestion }) {
  const pairs = question.matchingPairs ?? [];
  const right = (entry.pairOrder ?? pairs.map((_, index) => index)).map((index) => pairs[index]?.right).filter(Boolean);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const submit = useStudyStore((state) => state.answerMatching);
  const questionRef = useRef<HTMLFieldSetElement>(null);
  useEffect(() => { questionRef.current?.focus(); }, []);
  return <fieldset ref={questionRef} tabIndex={-1} className="quiz-card"><legend><span>Matching</span>{question.prompt}</legend><div className="matching-list">{pairs.map((pair) => <label key={pair.left}><span>{pair.left}</span><select value={answers[pair.left] ?? ""} onChange={(event) => setAnswers((value) => ({ ...value, [pair.left]: event.target.value }))}><option value="">Choose…</option>{right.map((choice) => <option key={choice}>{choice}</option>)}</select></label>)}</div><button className="primary-button" disabled={Object.keys(answers).length !== pairs.length} onClick={() => submit(pairs.map((pair) => ({ left: pair.left, right: answers[pair.left] })))}>Save answer <ArrowRight size={17} /></button></fieldset>;
}

function StudyEmpty({ title, body }: { title: string; body: string }) {
  return <div className="page"><section className="queue-complete tactile-card"><RotateCcw size={24} /><h1>{title}</h1><p>{body}</p><AppLink href="/today/" className="primary-button">Return to Today <ArrowRight size={17} /></AppLink></section></div>;
}

function interactionLabel(type: QuizQuestion["interactionType"]) {
  return ({ listening: "Listening", "situation-response": "Situation / response", "meaning-recognition": "Meaning recognition", "phrase-construction": "Phrase construction", matching: "Matching", "self-guided-speaking": "Speaking" })[type];
}
