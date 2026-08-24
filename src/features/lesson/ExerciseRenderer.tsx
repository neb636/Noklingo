import { useEffect, useMemo } from "react";
import { Play, RotateCcw, Volume2 } from "lucide-react";
import type {
  AudioAsset,
  Exercise,
  ExerciseAnswer,
  QuizItem,
  Settings,
} from "@/src/domain/types";
import { audioGuide, type AudioAssetResolver } from "@/src/lib/audio";

type RenderableExercise = Exercise | QuizItem;

export type ExerciseRendererProps = {
  exercise: RenderableExercise;
  answer: ExerciseAnswer | null;
  disabled: boolean;
  settings: Settings;
  onAnswer: (answer: ExerciseAnswer) => void;
  resolveAudioAsset?: AudioAssetResolver;
  nextAudioAsset?: AudioAsset;
};

const choiceTypes = new Set<RenderableExercise["type"]>([
  "listen-meaning",
  "listen-phrase",
  "english-to-phrase",
  "missing-word",
  "conversation-response",
  "dialogue-comprehension",
  "mistake-correction",
  "personalized-translation",
]);

const asString = (answer: ExerciseAnswer | null) =>
  typeof answer === "string" ? answer : "";
const asArray = (answer: ExerciseAnswer | null) =>
  Array.isArray(answer) ? answer : [];
const asRecord = (answer: ExerciseAnswer | null) =>
  answer && typeof answer === "object" && !Array.isArray(answer) ? answer : {};

const sameTokenInventory = (answer: string[], tokens: string[]) => {
  if (answer.length !== tokens.length) return false;
  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  for (const token of answer) {
    const remaining = counts.get(token) ?? 0;
    if (!remaining) return false;
    counts.set(token, remaining - 1);
  }
  return true;
};

export function isExerciseAnswerComplete(
  exercise: RenderableExercise,
  answer: ExerciseAnswer | null,
) {
  if (answer === null) return false;
  if (exercise.type === "phrase-order") {
    return (
      Array.isArray(answer) && sameTokenInventory(answer, exercise.tokens ?? [])
    );
  }
  if (exercise.type === "matching-pairs") {
    if (typeof answer !== "object" || Array.isArray(answer)) return false;
    const pairs = exercise.pairs ?? [];
    return (
      Object.keys(answer).length === pairs.length &&
      pairs.every((pair) => typeof answer[pair.left] === "string") &&
      new Set(Object.values(answer)).size === pairs.length
    );
  }
  if (choiceTypes.has(exercise.type)) {
    return (
      typeof answer === "string" &&
      Boolean(exercise.choices?.some(({ id }) => id === answer))
    );
  }
  return typeof answer === "string" && answer.trim().length > 0;
}

function AudioControls({
  asset,
  settings,
}: {
  asset: AudioAsset | undefined;
  settings: Settings;
}) {
  if (!asset) return null;
  const play = (slow = false) =>
    void audioGuide.play(
      asset,
      settings.audioEnabled,
      settings.volume,
      slow ? "slow" : "normal",
    );
  return (
    <div className="audio-controls" role="group" aria-label="Phrase audio">
      <button
        type="button"
        className="audio-button audio-button-large"
        disabled={!settings.audioEnabled}
        onClick={() => play(false)}
        aria-label="Play Thai phrase"
      >
        <Volume2 size={28} />
      </button>
      <button
        type="button"
        className="audio-speed-button"
        disabled={!settings.audioEnabled}
        onClick={() => play(true)}
      >
        <Play size={14} fill="currentColor" /> Slow
      </button>
    </div>
  );
}

function PhraseContext({
  exercise,
  settings,
}: {
  exercise: RenderableExercise;
  settings: Settings;
}) {
  return (
    <>
      {exercise.context && (
        <p className="exercise-context">{exercise.context}</p>
      )}
      {(exercise.romanization || exercise.thai) && (
        <div className="thai-display phrase-preview">
          {settings.romanization !== "never" && exercise.romanization && (
            <span className="romanization">{exercise.romanization}</span>
          )}
          {settings.showThaiScript && exercise.thai && (
            <small className="thai-script-detail" lang="th">
              {exercise.thai}
            </small>
          )}
        </div>
      )}
    </>
  );
}

function ChoiceQuestion(props: ExerciseRendererProps) {
  const { exercise, answer, disabled, settings, onAnswer, resolveAudioAsset } =
    props;
  const listening = exercise.type.startsWith("listen-");
  return (
    <div className="exercise-content">
      {!listening && <PhraseContext exercise={exercise} settings={settings} />}
      {listening && (
        <AudioControls
          asset={resolveAudioAsset?.(exercise.audioRef)}
          settings={settings}
        />
      )}
      <div
        className="choice-grid"
        role="group"
        aria-label={exercise.accessibilityLabel}
      >
        {exercise.choices?.map((choice, index) => {
          const selected = asString(answer) === choice.id;
          const primary =
            exercise.type === "listen-meaning"
              ? (choice.meaning ?? choice.label)
              : (choice.romanization ?? choice.label);
          const secondary =
            choice.meaning && choice.meaning !== primary
              ? choice.meaning
              : choice.label !== primary
                ? choice.label
                : undefined;
          return (
            <button
              type="button"
              key={choice.id}
              className={`choice-card ${selected ? "selected" : ""}`}
              disabled={disabled}
              onClick={() => onAnswer(choice.id)}
              aria-pressed={selected}
            >
              <span className="choice-key" aria-hidden="true">
                {index + 1}
              </span>
              <span className="choice-copy">
                <strong>{primary}</strong>
                {secondary && <span>{secondary}</span>}
                {settings.showThaiScript && choice.thai && (
                  <small lang="th">{choice.thai}</small>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PhraseOrderQuestion(props: ExerciseRendererProps) {
  const { exercise, answer, disabled, onAnswer } = props;
  const selected = asArray(answer);
  const instances = useMemo(
    () =>
      (exercise.tokens ?? []).map((value, index) => ({
        id: `${exercise.id}-${index}`,
        value,
      })),
    [exercise.id, exercise.tokens],
  );
  const used = new Map<string, number>();
  selected.forEach((token) => used.set(token, (used.get(token) ?? 0) + 1));
  const seen = new Map<string, number>();
  const remaining = instances.filter(({ value }) => {
    const count = (seen.get(value) ?? 0) + 1;
    seen.set(value, count);
    return count > (used.get(value) ?? 0);
  });
  return (
    <div className="exercise-content">
      <div className="word-answer" aria-label="Your phrase">
        {selected.length ? (
          selected.map((token, index) => (
            <button
              type="button"
              key={`${token}-${index}`}
              disabled={disabled}
              onClick={() => onAnswer(selected.filter((_, i) => i !== index))}
            >
              {token}
            </button>
          ))
        ) : (
          <span className="answer-placeholder">Choose the words in order</span>
        )}
      </div>
      <div className="word-bank" aria-label="Available words">
        {remaining.map(({ id, value }) => (
          <button
            type="button"
            key={id}
            disabled={disabled}
            onClick={() => onAnswer([...selected, value])}
          >
            {value}
          </button>
        ))}
      </div>
      {selected.length > 0 && !disabled && (
        <button className="clear-answer" onClick={() => onAnswer([])}>
          <RotateCcw size={15} /> Start over
        </button>
      )}
    </div>
  );
}

function MatchingQuestion(props: ExerciseRendererProps) {
  const { exercise, answer, disabled, onAnswer } = props;
  const matches = asRecord(answer);
  return (
    <div className="matching-grid">
      {(exercise.pairs ?? []).map((pair) => (
        <label key={pair.id}>
          <span>{pair.left}</span>
          <select
            disabled={disabled}
            value={matches[pair.left] ?? ""}
            onChange={(event) =>
              onAnswer({ ...matches, [pair.left]: event.target.value })
            }
          >
            <option value="">Choose a match</option>
            {(exercise.pairs ?? []).map((option) => (
              <option key={option.id} value={option.right}>
                {option.right}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

function SpeakingQuestion(props: ExerciseRendererProps) {
  const { exercise, answer, disabled, settings, onAnswer, resolveAudioAsset } =
    props;
  return (
    <div className="exercise-content speaking-content">
      <PhraseContext exercise={exercise} settings={settings} />
      <AudioControls
        asset={resolveAudioAsset?.(exercise.audioRef)}
        settings={settings}
      />
      <p>Repeat the phrase aloud, then honestly mark how it felt.</p>
      <div className="speaking-self-assessment">
        {[
          ["confident", "I said it comfortably"],
          ["needs-practice", "I need more practice"],
        ].map(([value, label]) => (
          <button
            type="button"
            key={value}
            disabled={disabled}
            className={answer === value ? "selected" : ""}
            onClick={() => onAnswer(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ExerciseRenderer(props: ExerciseRendererProps) {
  const { exercise, nextAudioAsset } = props;
  useEffect(() => {
    if (nextAudioAsset) audioGuide.preload(nextAudioAsset);
    return () => audioGuide.stop();
  }, [exercise.id, nextAudioAsset]);

  if (choiceTypes.has(exercise.type)) return <ChoiceQuestion {...props} />;
  if (exercise.type === "phrase-order")
    return <PhraseOrderQuestion {...props} />;
  if (exercise.type === "matching-pairs")
    return <MatchingQuestion {...props} />;
  if (exercise.type === "speaking-practice")
    return <SpeakingQuestion {...props} />;
  return <ChoiceQuestion {...props} />;
}
