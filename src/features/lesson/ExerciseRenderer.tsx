import { useMemo, useState } from "react";
import { Mic, Play, RotateCcw, Volume2 } from "lucide-react";
import type { Exercise, ExerciseAnswer, Settings } from "@/src/domain/types";
import { audioGuide } from "@/src/lib/audio";

type Props = {
  exercise: Exercise;
  answer: ExerciseAnswer | null;
  disabled: boolean;
  settings: Settings;
  onAnswer: (answer: ExerciseAnswer) => void;
};

const showRomanization = (settings: Settings) =>
  settings.romanization !== "never";

export function ExerciseRenderer({
  exercise,
  answer,
  disabled,
  settings,
  onAnswer,
}: Props) {
  if (exercise.type === "word-order") {
    return (
      <WordOrder
        exercise={exercise}
        answer={Array.isArray(answer) ? answer : []}
        disabled={disabled}
        onAnswer={onAnswer}
      />
    );
  }
  if (exercise.type === "fill-blank") {
    return (
      <FillBlank
        exercise={exercise}
        answer={typeof answer === "string" ? answer : ""}
        disabled={disabled}
        onAnswer={onAnswer}
      />
    );
  }
  if (exercise.type === "matching") {
    return (
      <Matching
        exercise={exercise}
        answer={
          answer && typeof answer === "object" && !Array.isArray(answer)
            ? answer
            : {}
        }
        disabled={disabled}
        onAnswer={onAnswer}
      />
    );
  }
  if (exercise.type === "speaking") {
    return (
      <Speaking
        exercise={exercise}
        answer={typeof answer === "string" ? answer : ""}
        disabled={disabled}
        settings={settings}
        onAnswer={onAnswer}
      />
    );
  }
  return (
    <ChoiceExercise
      exercise={exercise}
      answer={typeof answer === "string" ? answer : ""}
      disabled={disabled}
      settings={settings}
      onAnswer={onAnswer}
    />
  );
}

function AudioButton({
  exercise,
  settings,
  large = false,
}: {
  exercise: Exercise;
  settings: Settings;
  large?: boolean;
}) {
  return (
    <button
      className={large ? "audio-button audio-button-large" : "audio-button"}
      onClick={() =>
        audioGuide.play(
          exercise.audioRef ??
            (exercise.thai ? `tts:${exercise.thai}` : undefined),
          settings.audioEnabled,
          settings.volume,
        )
      }
      aria-label="Play Thai audio"
    >
      {large ? <Volume2 size={30} /> : <Play size={18} fill="currentColor" />}
    </button>
  );
}

function ChoiceExercise({
  exercise,
  answer,
  disabled,
  settings,
  onAnswer,
}: Props & { answer: string }) {
  const isListening = exercise.type === "listen-choice";
  return (
    <div className="exercise-content">
      {isListening && (
        <AudioButton exercise={exercise} settings={settings} large />
      )}
      {exercise.thai && !isListening && (
        <div className="thai-display">
          <span>{exercise.thai}</span>
          {showRomanization(settings) && exercise.romanization && (
            <small>{exercise.romanization}</small>
          )}
          {exercise.audioRef && (
            <AudioButton exercise={exercise} settings={settings} />
          )}
        </div>
      )}
      <div className="choice-grid">
        {exercise.choices?.map((choice, index) => (
          <button
            key={choice.id}
            className={`choice-card ${answer === choice.id ? "selected" : ""}`}
            disabled={disabled}
            onClick={() => onAnswer(choice.id)}
          >
            <span className="choice-key">{index + 1}</span>
            <span className="choice-copy">
              <strong>{choice.label}</strong>
              {choice.thai && <span>{choice.thai}</span>}
              {showRomanization(settings) && choice.romanization && (
                <small>{choice.romanization}</small>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

type RendererBase = Pick<Props, "exercise" | "disabled" | "onAnswer">;

function WordOrder({
  exercise,
  answer,
  disabled,
  onAnswer,
}: RendererBase & { answer: string[] }) {
  const remaining = (exercise.tokens ?? []).filter(
    (token) => !answer.includes(token),
  );
  return (
    <div className="exercise-content">
      <div
        className={`word-answer ${answer.length ? "has-answer" : ""}`}
        aria-label="Your phrase"
      >
        {answer.length === 0 && (
          <span className="answer-placeholder">
            Tap the words in the right order
          </span>
        )}
        {answer.map((token) => (
          <button
            key={token}
            disabled={disabled}
            onClick={() => onAnswer(answer.filter((item) => item !== token))}
          >
            {token}
          </button>
        ))}
      </div>
      <div className="word-bank">
        {remaining.map((token) => (
          <button
            key={token}
            disabled={disabled}
            onClick={() => onAnswer([...answer, token])}
          >
            {token}
          </button>
        ))}
      </div>
      {answer.length > 0 && !disabled && (
        <button className="clear-answer" onClick={() => onAnswer([])}>
          <RotateCcw size={16} /> Start over
        </button>
      )}
    </div>
  );
}

function FillBlank({
  answer,
  disabled,
  onAnswer,
}: RendererBase & { answer: string }) {
  return (
    <div className="exercise-content fill-content">
      <label className="fill-label">
        <span className="sr-only">Type the missing Thai phrase</span>
        <input
          autoFocus
          lang="th"
          value={answer}
          disabled={disabled}
          onChange={(event) => onAnswer(event.target.value)}
          placeholder="พิมพ์ภาษาไทย…"
          autoComplete="off"
        />
      </label>
      <p className="thai-keyboard-note">
        Thai keyboard unavailable? Your device’s language settings can add one.
      </p>
    </div>
  );
}

function Matching({
  exercise,
  answer,
  disabled,
  onAnswer,
}: RendererBase & { answer: Record<string, string> }) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const rightItems = useMemo(
    () => [...(exercise.pairs ?? [])].reverse(),
    [exercise.pairs],
  );
  const assignedRight = Object.values(answer);
  return (
    <div className="matching-grid">
      <div>
        {exercise.pairs?.map((pair) => (
          <button
            key={pair.left}
            className={`${selectedLeft === pair.left ? "selected" : ""} ${answer[pair.left] ? "paired" : ""}`}
            disabled={disabled}
            onClick={() => setSelectedLeft(pair.left)}
          >
            {pair.left}
          </button>
        ))}
      </div>
      <div>
        {rightItems.map((pair) => (
          <button
            key={pair.right}
            className={assignedRight.includes(pair.right) ? "paired" : ""}
            disabled={disabled || !selectedLeft}
            onClick={() => {
              if (!selectedLeft) return;
              onAnswer({ ...answer, [selectedLeft]: pair.right });
              setSelectedLeft(null);
            }}
          >
            {pair.right}
          </button>
        ))}
      </div>
    </div>
  );
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  start: () => void;
  onresult:
    | ((event: {
        results: {
          [index: number]: { [index: number]: { transcript: string } };
        };
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function Speaking({
  exercise,
  answer,
  disabled,
  settings,
  onAnswer,
}: RendererBase & { answer: string; settings: Settings }) {
  const [listening, setListening] = useState(false);
  const supported =
    typeof window !== "undefined" &&
    Boolean(
      (
        window as typeof window & {
          webkitSpeechRecognition?: new () => SpeechRecognitionLike;
        }
      ).webkitSpeechRecognition,
    );

  const listen = () => {
    const Recognition = (
      window as typeof window & {
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      }
    ).webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "th-TH";
    recognition.interimResults = false;
    recognition.onresult = (event) => onAnswer(event.results[0][0].transcript);
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  };

  return (
    <div className="exercise-content speaking-content">
      <div className="speak-phrase">
        <strong>{exercise.thai}</strong>
        {showRomanization(settings) && <span>{exercise.romanization}</span>}
        <AudioButton exercise={exercise} settings={settings} />
      </div>
      {supported ? (
        <button
          className={`mic-button ${listening ? "listening" : ""}`}
          disabled={disabled || listening}
          onClick={listen}
        >
          <Mic size={34} />
          <span>
            {listening ? "Listening…" : answer ? "Try again" : "Tap to speak"}
          </span>
        </button>
      ) : (
        <div className="speech-fallback">
          <Mic size={28} />
          <p>
            Speech checking isn’t supported here, but speaking aloud still
            counts.
          </p>
          <button
            disabled={disabled}
            onClick={() => onAnswer(exercise.correctAnswer as string)}
          >
            I said it aloud
          </button>
        </div>
      )}
      {answer && (
        <p className="heard-text">
          {supported ? (
            <>
              I heard: <strong>{answer}</strong>
            </>
          ) : (
            "Nice work — keep your voice relaxed."
          )}
        </p>
      )}
    </div>
  );
}
