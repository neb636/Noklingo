import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Captions,
  Check,
  Eye,
  EyeOff,
  Headphones,
  Play,
  Volume2,
  X,
} from "lucide-react";
import { Button, ProgressBar } from "@/src/components/ui";
import { curriculum } from "@/src/content/curriculum";
import type { AudioAsset, ExerciseAnswer } from "@/src/domain/types";
import {
  ExerciseRenderer,
  isExerciseAnswerComplete,
} from "@/src/features/lesson/ExerciseRenderer";
import { audioGuide } from "@/src/lib/audio";
import { publicAssetPath } from "@/src/lib/assets";
import { useAppStore } from "@/src/store/useAppStore";

const stageLabel = (stage: string) => {
  if (stage === "video") return "Watch";
  if (stage === "cue-cards" || stage === "cards") return "Cue cards";
  if (stage === "retrieval-cards") return "Recall";
  if (stage === "complete") return "Done";
  return "Quiz";
};

const prefixedAudio = (asset: AudioAsset | undefined) =>
  asset
    ? {
        ...asset,
        src: asset.src ? publicAssetPath(asset.src) : undefined,
        slowSrc: asset.slowSrc ? publicAssetPath(asset.slowSrc) : undefined,
      }
    : undefined;

export function StudyRoute() {
  const session = useAppStore((state) => state.activeSession);
  const settings = useAppStore((state) => state.settings);
  const navigate = useAppStore((state) => state.navigate);
  const markVideoComplete = useAppStore((state) => state.markVideoComplete);
  const skipUnavailableVideo = useAppStore(
    (state) => state.skipUnavailableVideo,
  );
  const nextCard = useAppStore((state) => state.nextCard);
  const previousCard = useAppStore((state) => state.previousCard);
  const setQuizAnswer = useAppStore((state) => state.setQuizAnswer);
  const submitQuiz = useAppStore((state) => state.submitQuiz);
  const notice = useAppStore((state) => state.notice);
  const dismissNotice = useAppStore((state) => state.dismissNotice);
  const [videoError, setVideoError] = useState(false);
  const [revealState, setRevealState] = useState({
    cardId: "",
    revealed: false,
  });
  const [draftState, setDraftState] = useState<{
    quizId: string;
    answer: ExerciseAnswer | null;
  }>({ quizId: "", answer: null });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardHeadingRef = useRef<HTMLHeadingElement>(null);

  const lesson = session
    ? curriculum.lessons.find((candidate) => candidate.id === session.lessonId)
    : undefined;
  const knowledgeById = useMemo(
    () => new Map(curriculum.knowledgeItems.map((item) => [item.id, item])),
    [],
  );
  const audioById = useMemo(
    () => new Map(curriculum.audioAssets.map((asset) => [asset.id, asset])),
    [],
  );

  const stage = session ? String(session.stage) : "";
  const isCardStage = ["cards", "cue-cards", "retrieval-cards"].includes(stage);
  const cardIds = session?.cardItemIds ?? lesson?.cueCardItemIds ?? [];
  const currentCardId = cardIds[session?.cardIndex ?? 0];
  const currentCard = currentCardId
    ? knowledgeById.get(currentCardId)
    : undefined;
  const queueItem = session?.quizQueue[session.quizIndex];
  const currentQuestion = queueItem?.quizItem;
  const revealed = revealState.cardId === currentCardId && revealState.revealed;
  const draftAnswer =
    draftState.quizId === currentQuestion?.id ? draftState.answer : null;
  const quizComplete = Boolean(
    session && session.answers.length === session.quizQueue.length,
  );

  useEffect(() => {
    headingRef.current?.focus();
  }, [session?.quizIndex, session?.stage]);

  useEffect(() => {
    cardHeadingRef.current?.focus();
  }, [revealed, session?.cardIndex, session?.stage]);

  useEffect(
    () => () => {
      audioGuide.stop();
    },
    [],
  );

  if (!session || !lesson) {
    return (
      <div className="empty-state">
        <h1>No study session is open.</h1>
        <p>Today will choose the right next step for you.</p>
        <Button onClick={() => navigate("today")}>Back to Today</Button>
      </div>
    );
  }

  const sessionMode = String(session.mode);
  const isReplay = sessionMode === "replay";
  const isReview = sessionMode === "review";
  const isSubmissionReady =
    !isReplay &&
    ((stage === "quiz" && (!currentQuestion || quizComplete)) ||
      stage === "complete");
  const isRetrieval = stage === "retrieval-cards";
  const totalSteps = Math.max(
    1,
    (sessionMode === "introduction" || isReplay ? 1 : 0) +
      cardIds.length +
      (isReplay ? 0 : session.quizQueue.length),
  );
  const completedSteps =
    stage === "complete"
      ? totalSteps
      : (stage !== "video" && (sessionMode === "introduction" || isReplay)
          ? 1
          : 0) +
        (stage === "quiz" ? cardIds.length : session.cardIndex) +
        (stage === "quiz" ? session.quizIndex : 0);
  const progressPercent = (completedSteps / totalSteps) * 100;

  const exitDestination = isReplay ? "library" : "today";
  const exitStudy = () => {
    if (
      isReplay ||
      window.confirm(
        "Leave for now? Your exact place is saved, so you can resume from Today.",
      )
    ) {
      navigate(exitDestination);
    }
  };

  const playCardAudio = (slow = false) => {
    if (!currentCard?.audioRef) return;
    const asset = prefixedAudio(audioById.get(currentCard.audioRef));
    void audioGuide.play(
      asset,
      settings.audioEnabled,
      settings.volume,
      slow ? "slow" : "normal",
    );
  };

  const resolveQuestionAudio = (audioRef: string | undefined) =>
    audioRef ? prefixedAudio(audioById.get(audioRef)) : undefined;

  return (
    <div className="lesson-page study-page">
      <header className="lesson-topbar study-topbar">
        <button
          className="icon-button"
          onClick={exitStudy}
          aria-label={`Exit to ${exitDestination}`}
        >
          <X size={25} />
        </button>
        <ProgressBar value={progressPercent} label="Study session progress" />
        <span className="study-stage-label">{stageLabel(stage)}</span>
      </header>

      {notice && (
        <div className="study-inline-notice" role="alert">
          <span>{notice}</span>
          <button onClick={dismissNotice} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}

      {stage === "video" && (
        <section className="video-study-stage" aria-labelledby="video-title">
          <div className="study-heading">
            <span className="eyebrow">
              <Play size={15} fill="currentColor" /> Watch first
            </span>
            <h1 id="video-title">{lesson.title}</h1>
            <p>{lesson.objective}</p>
          </div>

          <div className="lesson-video-shell">
            {!videoError ? (
              <video
                className="lesson-video"
                controls
                playsInline
                preload="metadata"
                poster={
                  lesson.media.posterSrc
                    ? publicAssetPath(lesson.media.posterSrc)
                    : undefined
                }
                onEnded={markVideoComplete}
                onError={() => setVideoError(true)}
              >
                <source
                  src={publicAssetPath(lesson.media.src)}
                  type="video/mp4"
                />
                {lesson.media.captionsSrc && (
                  <track
                    default
                    kind="captions"
                    src={publicAssetPath(lesson.media.captionsSrc)}
                    srcLang="th"
                    label="Thai and English"
                  />
                )}
                Your browser does not support the lesson video.
              </video>
            ) : (
              <div className="video-unavailable" role="alert">
                <span>
                  <EyeOff size={30} />
                </span>
                <h2>This video isn’t available on this device.</h2>
                <p>{lesson.media.fallbackMessage}</p>
                <Button onClick={skipUnavailableVideo}>
                  Continue without video <ArrowRight size={18} />
                </Button>
              </div>
            )}
          </div>

          <div className="video-requirement-note">
            <Captions size={19} />
            <p>
              Watch to the end once to open the cue cards. Captions are included
              when the source lesson provides them.
            </p>
          </div>
        </section>
      )}

      {isCardStage && currentCard && (
        <section className="card-study-stage" aria-label="Cue cards">
          <div className="lesson-meta">
            <span>
              {isReview
                ? "Spaced review"
                : isRetrieval
                  ? "Bring it back from memory"
                  : lesson.title}
            </span>
            <span>
              Card {session.cardIndex + 1} of {cardIds.length}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.article
              key={currentCard.id}
              className={`cue-card ${isRetrieval ? "cue-card-retrieval" : ""}`}
              initial={{ opacity: 0, x: 26 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -26 }}
              transition={{ duration: settings.reducedMotion ? 0 : 0.2 }}
            >
              <span className="eyebrow">
                {isRetrieval ? "Recall before revealing" : "Useful Thai"}
              </span>

              {isRetrieval && !revealed ? (
                <div className="cue-card-prompt">
                  <Eye size={31} />
                  <h1 ref={cardHeadingRef} tabIndex={-1}>
                    {currentCard.meaning}
                  </h1>
                  <p>How would you say this naturally in Thai?</p>
                  <Button
                    onClick={() =>
                      setRevealState({
                        cardId: currentCard.id,
                        revealed: true,
                      })
                    }
                  >
                    Reveal the phrase
                  </Button>
                </div>
              ) : (
                <div className="cue-card-content">
                  <div className="cue-card-phrase">
                    {settings.showThaiScript && (
                      <strong lang="th">{currentCard.thai}</strong>
                    )}
                    <h1 ref={cardHeadingRef} tabIndex={-1}>
                      {settings.romanization !== "never"
                        ? currentCard.romanization
                        : currentCard.meaning}
                    </h1>
                    {settings.romanization !== "never" && (
                      <p>{currentCard.meaning}</p>
                    )}
                  </div>

                  {currentCard.audioRef && (
                    <div className="cue-card-audio" aria-label="Phrase audio">
                      <button
                        className="audio-button"
                        onClick={() => playCardAudio(false)}
                        disabled={!settings.audioEnabled}
                        aria-label="Play phrase"
                      >
                        <Volume2 size={21} />
                      </button>
                      <button
                        className="audio-speed-button"
                        onClick={() => playCardAudio(true)}
                        disabled={!settings.audioEnabled}
                      >
                        <Play size={13} fill="currentColor" /> Slow
                      </button>
                    </div>
                  )}

                  <dl className="cue-card-notes">
                    <div>
                      <dt>When to use it</dt>
                      <dd>{currentCard.usageNotes}</dd>
                    </div>
                    {currentCard.context && (
                      <div>
                        <dt>In context</dt>
                        <dd>{currentCard.context}</dd>
                      </div>
                    )}
                    {currentCard.literalMeaning && (
                      <div>
                        <dt>Literally</dt>
                        <dd>{currentCard.literalMeaning}</dd>
                      </div>
                    )}
                    {currentCard.culturalNote && (
                      <div>
                        <dt>Cultural note</dt>
                        <dd>{currentCard.culturalNote}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </motion.article>
          </AnimatePresence>

          <nav className="cue-card-actions" aria-label="Cue card navigation">
            <Button
              tone="secondary"
              onClick={previousCard}
              disabled={session.cardIndex === 0}
            >
              <ArrowLeft size={18} /> Previous
            </Button>
            <Button onClick={nextCard} disabled={isRetrieval && !revealed}>
              {session.cardIndex === cardIds.length - 1
                ? isReplay
                  ? "Finish replay"
                  : "Start quiz"
                : "Next card"}
              <ArrowRight size={18} />
            </Button>
          </nav>
        </section>
      )}

      {stage === "quiz" && currentQuestion && !quizComplete && (
        <>
          <section className="lesson-stage quiz-study-stage" aria-label="Quiz">
            <div className="lesson-meta">
              <span>
                {sessionMode === "mastery"
                  ? "Mastery check"
                  : isReview
                    ? "Spaced review"
                    : "First check"}
              </span>
              <span>
                Question {session.quizIndex + 1} of {session.quizQueue.length}
              </span>
            </div>

            <section className="exercise-card study-question-card">
              <span className="eyebrow">
                {queueItem.scope === "review" ? (
                  <>
                    <BookOpenCheck size={15} /> Older phrase
                  </>
                ) : currentQuestion.quizKind === "listening" ? (
                  <>
                    <Headphones size={15} /> Listening
                  </>
                ) : (
                  currentQuestion.quizKind.replaceAll("-", " ")
                )}
              </span>
              <h1 ref={headingRef} tabIndex={-1}>
                {currentQuestion.prompt}
              </h1>
              <ExerciseRenderer
                exercise={currentQuestion}
                answer={draftAnswer}
                disabled={false}
                settings={settings}
                onAnswer={(answer) =>
                  setDraftState({ quizId: currentQuestion.id, answer })
                }
                resolveAudioAsset={resolveQuestionAudio}
                nextAudioAsset={resolveQuestionAudio(
                  session.quizQueue[session.quizIndex + 1]?.quizItem.audioRef,
                )}
              />
              <div className="deferred-feedback-note">
                <EyeOff size={17} /> Answers are reviewed together after the
                quiz, so each question stays a fair test.
              </div>
            </section>
          </section>

          <footer className="lesson-footer study-footer">
            <div className="feedback-wrap">
              <div className="quiz-lock-copy">
                <Check size={20} />
                <span>Your place and answers save automatically.</span>
              </div>
              <Button
                full
                disabled={
                  !isExerciseAnswerComplete(currentQuestion, draftAnswer)
                }
                onClick={() => {
                  if (draftAnswer !== null) setQuizAnswer(draftAnswer);
                }}
              >
                Lock answer <ArrowRight size={18} />
              </Button>
            </div>
          </footer>
        </>
      )}

      {isSubmissionReady && (
        <section
          className="quiz-ready-stage"
          aria-labelledby="quiz-ready-title"
        >
          <span className="quiz-ready-icon">
            <Check size={34} />
          </span>
          <span className="eyebrow">Answers locked</span>
          <h1 id="quiz-ready-title">Ready to see how it went?</h1>
          <p>
            {isReview
              ? "Each phrase will update its own spaced-review schedule."
              : "Your active lesson and older review questions are scored separately."}
          </p>
          <Button onClick={submitQuiz}>See my results</Button>
        </section>
      )}

      {stage === "complete" && isReplay && (
        <section
          className="quiz-ready-stage replay-finished-stage"
          aria-labelledby="replay-finished-title"
        >
          <span className="quiz-ready-icon">
            <Check size={34} />
          </span>
          <span className="eyebrow">Replay complete</span>
          <h1 id="replay-finished-title">
            A useful refresh, with no scores attached.
          </h1>
          <p>Your mastery, review schedule, and streak have not changed.</p>
          <Button onClick={() => navigate("library")}>Back to library</Button>
        </section>
      )}
    </div>
  );
}
