"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/router";
import { ArrowRight, Check, CircleAlert, ExternalLink, Eye, FileWarning, Mic2, Play, RefreshCw, RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotionConfig } from "framer-motion";
import { AppLink } from "@/components/AppLink";
import { LocalAudioButton, PhraseAudioButton } from "@/components/PhraseAudioButton";
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
  const previewLesson = previewId ? lessons.find((lesson) => lesson.id === previewId && lesson.contentStatus === "draft") : undefined;
  const replayLesson = replayId ? lessons.find((lesson) => lesson.id === replayId) : undefined;
  const hydrated = useStudyStore((state) => state.hydrated);
  const progress = useStudyStore((state) => state.lessonProgress);

  if (!clientReady) return <StudyEmpty title="Opening your session…" body="Reading the exact stage and fixed queue stored in this browser." />;
  if (previewLesson) return <DraftPreview lesson={previewLesson} />;
  if (replayLesson) {
    if (!hydrated) return <StudyEmpty title="Opening the library…" body="Checking that this replay is available in your local record." />;
    if (progress.some((entry) => entry.lessonId === replayLesson.id && entry.status === "mastered")) return <Replay lesson={replayLesson} />;
    return <StudyEmpty title="Replay unavailable" body="Only mastered, published lessons can be replayed. Draft media has its own clearly marked preview." />;
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
  const [mediaError, setMediaError] = useState(lesson.media.availability !== "available");
  const [retryKey, setRetryKey] = useState(0);
  const [watchComplete, setWatchComplete] = useState(false);
  const watchedSeconds = useRef(0);
  const lastTime = useRef(0);
  const completeVideo = useStudyStore((state) => state.completeVideo);

  function resetPlayback() {
    watchedSeconds.current = 0;
    lastTime.current = 0;
    setWatchComplete(false);
  }

  function noteProgress(video: HTMLVideoElement) {
    const delta = video.currentTime - lastTime.current;
    if (!video.seeking && delta > 0 && delta < 1.5) watchedSeconds.current += delta;
    lastTime.current = video.currentTime;
  }

  function finishPlayback(video: HTMLVideoElement) {
    const required = Math.max(1, Math.min(video.duration - 1, video.duration * 0.82));
    setWatchComplete(watchedSeconds.current >= required);
  }

  return <section className="study-grid">
    <div className="video-column">
      {!mediaError ? <video key={retryKey} className="lesson-video portrait-video" controls playsInline preload="metadata" poster={assetPath(lesson.media.posterSrc)} onLoadedMetadata={resetPlayback} onTimeUpdate={(event) => noteProgress(event.currentTarget)} onEnded={(event) => finishPlayback(event.currentTarget)} onError={() => setMediaError(true)}>
        <source src={assetPath(lesson.media.videoSrc)} type="video/mp4" />
      </video> : <div className="media-fallback media-failed portrait-fallback" role="alert"><div className="frame-corners" /><span className="fallback-play"><CircleAlert size={23} /></span><p>{lesson.media.fallbackMessage}</p><small>Playback unavailable · study can continue deliberately</small></div>}
      {mediaError ? <div className="video-error-action"><p>The local video may be offline, unsupported, or temporarily unavailable. Retry it, or deliberately continue this introduction without media.</p><div className="inline-actions"><button className="secondary-button" onClick={() => { setMediaError(false); setRetryKey((value) => value + 1); }}>Retry video <RefreshCw size={17} /></button><button className="secondary-button" onClick={() => completeVideo(true)}>Continue without video <ArrowRight size={17} /></button></div></div>
        : <div className="watch-note"><Play size={17} /><span>Watch the complete clip once. Cue cards open when playback ends.</span></div>}
      {watchComplete && <button className="primary-button" onClick={() => completeVideo(false)}>Open cue cards <ArrowRight size={17} /></button>}
    </div>
  </section>;
}

function CueCardStage({ card, session }: { card: (typeof cueCards)[number]; session: ActiveStudySession }) {
  const settings = useStudyStore((state) => state.settings);
  const advance = useStudyStore((state) => state.advanceCard);
  return <section className="single-card-stage"><div className="section-lead"><p className="eyebrow">Cue card {session.cardIndex + 1} of {session.cardOrder.length}</p><h2>Notice the phrase in context</h2><p>Read for natural use rather than word-for-word equivalence.</p></div>
    <article className="cue-card tactile-card focused-card"><PhraseAudioButton card={card} compact />{settings.showThaiScript && <p className="thai cue-thai">{withPreferredParticle(card.thai, settings.politeParticle)}</p>}{settings.showRomanization && <p className="romanization">{withPreferredParticle(card.romanization, settings.politeParticle)}</p>}<h3>{card.naturalMeaning}</h3><p>{card.usage}</p>{card.literalNote && <p className="card-note"><b>Literal note</b> {card.literalNote}</p>}{card.culturalNote && <p className="card-note"><b>Context</b> {card.culturalNote}</p>}<span className="draft-label">{card.verificationStatus} language</span></article>
    <footer className="study-footer"><span>{session.cardIndex + 1} of {session.cardOrder.length}</span><button className="primary-button" onClick={advance}>{session.cardIndex === session.cardOrder.length - 1 ? "Begin diagnostic" : "Next cue card"}<ArrowRight size={18} /></button></footer>
  </section>;
}

function RetrievalStage({ card, session }: { card: (typeof cueCards)[number]; session: ActiveStudySession }) {
  const settings = useStudyStore((state) => state.settings);
  const reveal = useStudyStore((state) => state.revealCard);
  const advance = useStudyStore((state) => state.advanceCard);
  return <section className="retrieval-focus"><div className="section-lead"><p className="eyebrow">Retrieval {session.cardIndex + 1} of {session.cardOrder.length}</p><h2>Find the Thai before looking</h2><p>Use the situation and meaning as your prompt. Say your answer aloud if useful.</p></div>
    <article className={`recall-card retrieval-large ${session.cardRevealed ? "revealed" : ""}`}><div><span className="eyebrow">Meaning and context</span><h2>{card.naturalMeaning}</h2><p>{card.usage}</p></div>
      {!session.cardRevealed ? <button className="secondary-button" onClick={reveal}>Reveal Thai <Eye size={17} /></button> : <div className="recall-answer"><span className="speaking-label"><Mic2 size={15} /> Self-guided speaking · unscored</span>{settings.showThaiScript && <p className="thai">{withPreferredParticle(card.thai, settings.politeParticle)}</p>}{settings.showRomanization && <p className="romanization">{withPreferredParticle(card.romanization, settings.politeParticle)}</p>}<PhraseAudioButton card={card} /><button className="primary-button" onClick={advance}>{session.cardIndex === session.cardOrder.length - 1 ? "Begin mastery check" : "Next retrieval"}<ArrowRight size={17} /></button></div>}
    </article>
  </section>;
}

function QuizStage({ session, entry, question }: { session: ActiveStudySession; entry: SessionQueueEntry; question?: QuizQuestion }) {
  if (!question) return <StudyEmpty title="This queue is stale" body="The bundled curriculum no longer contains one of its questions. Return to Today to rebuild it." />;
  const delayed = session.mode === "mastery";
  const answer = answerFor(session, entry.queueId);
  return <section className="quiz-section"><div className="section-lead"><p className="eyebrow">{session.mode === "introduction" ? "Diagnostic" : entry.source === "review" ? "Older review" : "Active lesson"} · {session.questionIndex + 1} of {session.queue.length}</p><h2>{delayed ? "Answer the complete queue" : session.mode === "introduction" ? "A short first-pass check" : "Recall, correct, continue"}</h2><p>{delayed ? "Corrections stay hidden until every answer is complete." : session.mode === "introduction" ? "Each answer teaches immediately; mastery still begins tomorrow." : "Use the correction now, before this phrase is scheduled again."}</p></div>{session.feedbackQueueId === entry.queueId && answer ? <AnswerFeedback entry={entry} question={question} correct={answer.correct} /> : <QuestionCard key={entry.queueId} entry={entry} question={question} />}</section>;
}

function AnswerFeedback({ entry, question, correct }: { entry: SessionQueueEntry; question: QuizQuestion; correct: boolean }) {
  const card = cueCards.find((item) => item.id === entry.itemId);
  const continueAfterFeedback = useStudyStore((state) => state.continueAfterFeedback);
  return <article className={`quiz-card answer-feedback ${correct ? "correct" : "incorrect"}`} role="status">
    <p className="eyebrow">{correct ? "Recalled accurately" : "Keep this correction"}</p>
    {card && <><p className="thai correction-answer" lang="th">{card.thai}</p><p className="romanization">{card.romanization}</p><h3>{card.naturalMeaning}</h3><PhraseAudioButton card={card} /></>}
    <p>{question.explanation}</p>
    <button className="primary-button" onClick={continueAfterFeedback}>Continue <ArrowRight size={17} /></button>
  </article>;
}

function QuestionCard({ entry, question }: { entry: SessionQueueEntry; question: QuizQuestion }) {
  const answerChoice = useStudyStore((state) => state.answerChoice);
  const settings = useStudyStore((state) => state.settings);
  if (question.interactionType === "phrase-construction") return <ConstructionQuestion entry={entry} question={question} />;
  if (question.interactionType === "matching") return <MatchingQuestion entry={entry} question={question} />;
  const order = entry.choiceOrder ?? question.choices?.map((_, index) => index) ?? [];
  return <fieldset className="quiz-card"><legend><span>{interactionLabel(question.interactionType)}</span>{question.prompt}</legend>{question.interactionType === "listening" && <LocalAudioButton src={question.audioSrc} label="listening question audio" />}
    <div className="choice-list">{order.map((originalIndex, displayIndex) => { const choice = withPreferredParticle(question.choices?.[originalIndex] ?? "", settings.politeParticle); const thai = /\p{Script=Thai}/u.test(choice); return <button type="button" key={`${originalIndex}-${choice}`} onClick={() => answerChoice(displayIndex)}><span>{String.fromCharCode(65 + displayIndex)}</span><b className={thai ? "thai" : ""} lang={thai ? "th" : undefined}>{choice}</b></button>; })}</div>
  </fieldset>;
}

function ConstructionQuestion({ entry, question }: { entry: SessionQueueEntry; question: QuizQuestion }) {
  const [selected, setSelected] = useState<string[]>([]);
  const submit = useStudyStore((state) => state.answerConstruction);
  const tokens = (entry.tokenOrder ?? []).map((index) => question.constructionTokens?.[index]).filter((token): token is string => Boolean(token));
  return <fieldset className="quiz-card construction-card"><legend><span>Phrase construction</span>{question.prompt}</legend><div className="construction-answer">{selected.length ? selected.map((token, index) => <button key={`${token}-${index}`} onClick={() => setSelected((value) => value.filter((_, itemIndex) => itemIndex !== index))} className="thai" lang="th">{token}</button>) : <p>Choose tokens in order.</p>}</div><div className="token-bank">{tokens.map((token, index) => <button key={`${token}-${index}`} className="thai" lang="th" disabled={selected.filter((item) => item === token).length >= tokens.filter((item) => item === token).length} onClick={() => setSelected((value) => [...value, token])}>{token}</button>)}</div><button className="primary-button" disabled={selected.length !== question.correctConstruction?.length} onClick={() => submit(selected)}>Save answer <ArrowRight size={17} /></button></fieldset>;
}

function MatchingQuestion({ entry, question }: { entry: SessionQueueEntry; question: QuizQuestion }) {
  const pairs = question.matchingPairs ?? [];
  const right = (entry.pairOrder ?? pairs.map((_, index) => index)).map((index) => pairs[index]?.right).filter(Boolean);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const submit = useStudyStore((state) => state.answerMatching);
  return <fieldset className="quiz-card"><legend><span>Matching</span>{question.prompt}</legend><div className="matching-list">{pairs.map((pair) => <label key={pair.left}><span>{pair.left}</span><select value={answers[pair.left] ?? ""} onChange={(event) => setAnswers((value) => ({ ...value, [pair.left]: event.target.value }))}><option value="">Choose…</option>{right.map((choice) => <option key={choice}>{choice}</option>)}</select></label>)}</div><button className="primary-button" disabled={Object.keys(answers).length !== pairs.length} onClick={() => submit(pairs.map((pair) => ({ left: pair.left, right: answers[pair.left] })))}>Save answer <ArrowRight size={17} /></button></fieldset>;
}

function DraftPreview({ lesson }: { lesson: VideoLesson }) {
  const [mediaError, setMediaError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [stage, setStage] = useState<"video" | "cards">("video");
  const [cardIndex, setCardIndex] = useState(0);
  const [watchComplete, setWatchComplete] = useState(false);
  const settings = useStudyStore((state) => state.settings);
  const cards = cueCards.filter((card) => lesson.cueCardIds.includes(card.id));
  const card = cards[cardIndex];

  return <div className="page study-page draft-preview-page">
    <header className="study-header">
      <div><p className="eyebrow">Editorial draft · lesson plan {String(lesson.order).padStart(2, "0")}</p><h1>{lesson.title}</h1><p>{lesson.objective.replace(/^Draft plan —\s*/, "")}</p></div>
      <AppLink href="/library/" className="secondary-button">Return to Library</AppLink>
    </header>
    <div className="draft-integrity-note" role="note"><FileWarning size={20} aria-hidden="true" /><div><b>Local media, not verified curriculum</b><p>Watch the short clip, then review the screenshot-derived phrase cards. This preview records no progress or scored questions; locally generated instructor pronunciation is available only where the matcher is confident.</p></div></div>
    {stage === "video" ? <section className="draft-video-stage">
      <div className="draft-video-column">
        {!mediaError ? <video key={retryKey} className="lesson-video portrait-video draft-video" controls playsInline preload="metadata" poster={assetPath(lesson.media.posterSrc)} onEnded={() => setWatchComplete(true)} onError={() => setMediaError(true)}>
          <source src={assetPath(lesson.media.videoSrc)} type="video/mp4" />
        </video> : <div className="media-fallback media-failed portrait-fallback" role="alert"><div className="frame-corners" /><span className="fallback-play"><CircleAlert size={23} /></span><p>{lesson.media.fallbackMessage}</p><small>Local draft media unavailable</small></div>}
        <div className="draft-media-meta"><span>{formatDuration(lesson.media.durationSeconds)} · 720 × 1280 portrait MP4</span><span>{cards.length} screenshot-derived cards</span></div>
        {!mediaError && <div className="inline-actions">{watchComplete ? <button className="primary-button" onClick={() => setStage("cards")}>Open cue cards <ArrowRight size={17} /></button> : <span className="watch-note"><Play size={17} />Cue cards open when the clip ends.</span>}</div>}
        {mediaError && <div className="inline-actions"><button className="secondary-button" onClick={() => { setMediaError(false); setRetryKey((value) => value + 1); }}>Retry local video <RefreshCw size={17} /></button><button className="primary-button" onClick={() => setStage("cards")}>Review cue cards without video <ArrowRight size={17} /></button></div>}
        {lesson.source && <a className="source-note draft-source-note" href={lesson.source.url} target="_blank" rel="noreferrer">Source attribution only · not verification <ExternalLink size={12} /></a>}
      </div>
    </section> : card ? <section className="single-card-stage draft-card-stage"><div className="section-lead"><p className="eyebrow">Draft cue card {cardIndex + 1} of {cards.length}</p><h2>Recall the phrase from the clip</h2><p>These fields were transcribed from the on-screen lesson text.</p></div>
      <article className="cue-card tactile-card focused-card"><span className="draft-label">screenshot-derived · draft</span><PhraseAudioButton card={card} compact />{settings.showThaiScript && <p className="thai cue-thai" lang="th">{withPreferredParticle(card.thai, settings.politeParticle)}</p>}{settings.showRomanization && <p className="romanization">{withPreferredParticle(card.romanization, settings.politeParticle)}</p>}<h3>{card.naturalMeaning}</h3></article>
      <footer className="study-footer"><button className="secondary-button" onClick={() => setStage("video")}>Watch again</button><span>{cardIndex + 1} of {cards.length}</span><button className="primary-button" onClick={() => setCardIndex((value) => value === cards.length - 1 ? 0 : value + 1)}>{cardIndex === cards.length - 1 ? "Start cards again" : "Next cue card"}<ArrowRight size={18} /></button></footer>
    </section> : <StudyEmpty title="No cue cards yet" body="This draft does not have screenshot-derived lesson text." />}
  </div>;
}

function Replay({ lesson }: { lesson: VideoLesson }) {
  const [stage, setStage] = useState<"video" | "cards">("video");
  const [mediaError, setMediaError] = useState(lesson.media.availability !== "available");
  const settings = useStudyStore((state) => state.settings);
  const cards = cueCards.filter((card) => lesson.cueCardIds.includes(card.id));
  return <div className="page study-page"><header className="study-header"><div><p className="eyebrow">Disposable replay · no progress recorded</p><h1>{lesson.title}</h1><p>Video and cue cards only. Review dates, attempts, mastery, and consistency will not change.</p></div><AppLink href="/library/" className="secondary-button">Return to Library</AppLink></header>
    {stage === "video" ? <section>{mediaError ? <div className="media-fallback media-failed portrait-fallback replay-video" role="alert"><CircleAlert size={24} /><p>{lesson.media.fallbackMessage}</p><small>Replay media unavailable</small></div> : <video className="lesson-video portrait-video replay-video" controls playsInline preload="metadata" poster={assetPath(lesson.media.posterSrc)} onError={() => setMediaError(true)}><source src={assetPath(lesson.media.videoSrc)} type="video/mp4" /></video>}<div className="page-actions"><button className="primary-button" onClick={() => setStage("cards")}>Replay cue cards <ArrowRight size={17} /></button></div></section>
      : <section><div className="cue-grid">{cards.map((card, index) => <article className="cue-card tactile-card" key={card.id}><span className="card-index">{String(index + 1).padStart(2, "0")}</span><PhraseAudioButton card={card} compact />{settings.showThaiScript && <p className="thai cue-thai">{withPreferredParticle(card.thai, settings.politeParticle)}</p>}{settings.showRomanization && <p className="romanization">{withPreferredParticle(card.romanization, settings.politeParticle)}</p>}<h3>{card.naturalMeaning}</h3><p>{card.usage}</p></article>)}</div></section>}
  </div>;
}

function StudyEmpty({ title, body }: { title: string; body: string }) {
  return <div className="page"><section className="queue-complete tactile-card"><RotateCcw size={24} /><h1>{title}</h1><p>{body}</p><AppLink href="/today/" className="primary-button">Return to Today <ArrowRight size={17} /></AppLink></section></div>;
}

function interactionLabel(type: QuizQuestion["interactionType"]) {
  return ({ listening: "Listening", "situation-response": "Situation / response", "meaning-recognition": "Meaning recognition", "phrase-construction": "Phrase construction", matching: "Matching", "self-guided-speaking": "Speaking" })[type];
}

function formatDuration(seconds: number) {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}
