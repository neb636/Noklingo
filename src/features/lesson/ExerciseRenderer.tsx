import {
  type ComponentType,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Mic, Play, RotateCcw, Volume2 } from "lucide-react";
import type {
  AudioAsset,
  Dialogue,
  Exercise,
  ExerciseAnswer,
  ExerciseType,
  Settings,
  Speaker,
} from "@/src/domain/types";
import {
  audioGuide,
  type AudioAssetResolver,
  type AudioPlaybackSpeed,
} from "@/src/lib/audio";

export type DialogueResolver = (
  dialogueId: string | undefined,
) => Dialogue | undefined;
export type SpeakerResolver = (
  speakerId: string | undefined,
) => Speaker | undefined;

export type ExerciseRendererProps = {
  exercise: Exercise;
  answer: ExerciseAnswer | null;
  disabled: boolean;
  settings: Settings;
  onAnswer: (answer: ExerciseAnswer) => void;
  resolveAudioAsset?: AudioAssetResolver;
  resolveDialogue?: DialogueResolver;
  resolveSpeaker?: SpeakerResolver;
  nextAudioAsset?: AudioAsset;
};

type Renderer = ComponentType<ExerciseRendererProps>;

const choiceTypes = new Set<ExerciseType>([
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

const asStringArray = (answer: ExerciseAnswer | null) =>
  Array.isArray(answer) ? answer : [];

const asPairRecord = (answer: ExerciseAnswer | null) =>
  answer && typeof answer === "object" && !Array.isArray(answer) ? answer : {};

const sameTokenInventory = (answer: string[], tokens: string[]) => {
  if (answer.length !== tokens.length) return false;
  const remaining = new Map<string, number>();
  for (const token of tokens) {
    remaining.set(token, (remaining.get(token) ?? 0) + 1);
  }
  for (const token of answer) {
    const count = remaining.get(token) ?? 0;
    if (count === 0) return false;
    remaining.set(token, count - 1);
  }
  return true;
};

export function isExerciseAnswerComplete(
  exercise: Exercise,
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
    const entries = Object.entries(answer);
    if (entries.length !== pairs.length) return false;
    const validLeft = new Set(pairs.map((pair) => pair.left));
    const validRight = new Set(pairs.map((pair) => pair.right));
    const selectedRight = entries.map(([, right]) => right);
    return (
      entries.every(
        ([left, right]) => validLeft.has(left) && validRight.has(right),
      ) && new Set(selectedRight).size === selectedRight.length
    );
  }

  if (choiceTypes.has(exercise.type)) {
    return (
      typeof answer === "string" &&
      Boolean(answer) &&
      Boolean(exercise.choices?.some((choice) => choice.id === answer))
    );
  }

  return typeof answer === "string" && answer.trim().length > 0;
}

export const exerciseRendererRegistry = {
  "listen-meaning": ChoiceExercise,
  "listen-phrase": ChoiceExercise,
  "english-to-phrase": ChoiceExercise,
  "phrase-order": PhraseOrder,
  "missing-word": MissingWord,
  "matching-pairs": MatchingPairs,
  "conversation-response": ChoiceExercise,
  "dialogue-comprehension": DialogueComprehension,
  "speaking-practice": SpeakingPractice,
  "mistake-correction": ChoiceExercise,
  "personalized-translation": ChoiceExercise,
} satisfies Record<ExerciseType, Renderer>;

export function ExerciseRenderer(props: ExerciseRendererProps) {
  const { exercise, nextAudioAsset } = props;
  const ExerciseComponent = exerciseRendererRegistry[exercise.type];

  useEffect(() => {
    if (nextAudioAsset) audioGuide.preload(nextAudioAsset);
    return () => audioGuide.stop();
  }, [exercise.id, nextAudioAsset]);

  return <ExerciseComponent {...props} />;
}

function AudioControls({
  asset,
  audioRef,
  settings,
  label,
  large = false,
}: {
  asset: AudioAsset | undefined;
  audioRef: string | undefined;
  settings: Settings;
  label: string;
  large?: boolean;
}) {
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!audioRef && !asset) return null;

  const play = async (speed: AudioPlaybackSpeed) => {
    setBusy(true);
    setUnavailable(false);
    const played = await audioGuide.play(
      asset,
      settings.audioEnabled,
      settings.volume,
      speed,
    );
    setBusy(false);
    setUnavailable(!played);
  };
  const disabled = busy || !settings.audioEnabled || !asset;

  return (
    <div className="audio-controls" role="group" aria-label={label}>
      <button
        type="button"
        className={large ? "audio-button audio-button-large" : "audio-button"}
        disabled={disabled}
        onClick={() => void play("normal")}
        aria-label={`${label} at normal speed`}
      >
        {large ? <Volume2 size={30} /> : <Play size={18} fill="currentColor" />}
      </button>
      <button
        type="button"
        className="audio-speed-button"
        disabled={disabled}
        onClick={() => void play("slow")}
        aria-label={`${label} slowly`}
      >
        <Play size={14} fill="currentColor" /> Slow
      </button>
      {(unavailable || (audioRef && !asset)) && (
        <span className="audio-status" role="status">
          Audio is unavailable. Use the Romanization shown on screen.
        </span>
      )}
      {!settings.audioEnabled && (
        <span className="sr-only">Lesson audio is turned off in Settings.</span>
      )}
    </div>
  );
}

function ExerciseAudio({
  exercise,
  settings,
  resolveAsset,
  large,
  label = "Play Thai audio",
}: {
  exercise: Exercise;
  settings: Settings;
  resolveAsset?: AudioAssetResolver;
  large?: boolean;
  label?: string;
}) {
  return (
    <AudioControls
      asset={resolveAsset?.(exercise.audioRef)}
      audioRef={exercise.audioRef}
      settings={settings}
      large={large}
      label={label}
    />
  );
}

function PhrasePreview({
  exercise,
  settings,
  resolveAsset,
}: {
  exercise: Exercise;
  settings: Settings;
  resolveAsset?: AudioAssetResolver;
}) {
  if (!exercise.romanization && !(settings.showThaiScript && exercise.thai)) {
    return exercise.audioRef ? (
      <ExerciseAudio
        exercise={exercise}
        settings={settings}
        resolveAsset={resolveAsset}
      />
    ) : null;
  }

  return (
    <div className="thai-display phrase-preview">
      {exercise.romanization && (
        <span className="romanization" lang="en">
          {exercise.romanization}
        </span>
      )}
      {settings.showThaiScript && exercise.thai && (
        <small className="thai-script-detail" lang="th">
          {exercise.thai}
        </small>
      )}
      <ExerciseAudio
        exercise={exercise}
        settings={settings}
        resolveAsset={resolveAsset}
      />
    </div>
  );
}

function choicePrimary(
  exercise: Exercise,
  choice: NonNullable<Exercise["choices"]>[number],
) {
  if (
    exercise.type === "listen-meaning" ||
    exercise.type === "dialogue-comprehension"
  ) {
    return choice.meaning ?? choice.label;
  }
  return choice.romanization ?? choice.label;
}

function ChoiceList({
  exercise,
  answer,
  disabled,
  settings,
  onAnswer,
}: Pick<
  ExerciseRendererProps,
  "exercise" | "disabled" | "settings" | "onAnswer"
> & { answer: string }) {
  return (
    <div
      className="choice-grid"
      role="group"
      aria-label={exercise.accessibilityLabel}
    >
      {exercise.choices?.map((choice, index) => {
        const primary = choicePrimary(exercise, choice);
        const secondary =
          choice.meaning && choice.meaning !== primary
            ? choice.meaning
            : choice.label !== primary
              ? choice.label
              : undefined;
        const selected = answer === choice.id;
        return (
          <button
            type="button"
            key={choice.id}
            className={`choice-card ${selected ? "selected" : ""}`}
            disabled={disabled}
            onClick={() => onAnswer(choice.id)}
            aria-pressed={selected}
            aria-label={choice.accessibilityLabel}
          >
            <span className="choice-key" aria-hidden="true">
              {index + 1}
            </span>
            <span className="choice-copy">
              <strong>{primary}</strong>
              {secondary && <span>{secondary}</span>}
              {settings.showThaiScript && choice.thai && (
                <small className="thai-script-detail" lang="th">
                  {choice.thai}
                </small>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ChoiceExercise(props: ExerciseRendererProps) {
  const {
    exercise,
    answer,
    disabled,
    settings,
    onAnswer,
    resolveAudioAsset: resolveAsset,
  } = props;
  const listening =
    exercise.type === "listen-meaning" || exercise.type === "listen-phrase";

  return (
    <div className="exercise-content">
      {exercise.context && (
        <p className="exercise-context">{exercise.context}</p>
      )}
      {listening ? (
        <ExerciseAudio
          exercise={exercise}
          settings={settings}
          resolveAsset={resolveAsset}
          large
        />
      ) : (
        <PhrasePreview
          exercise={exercise}
          settings={settings}
          resolveAsset={resolveAsset}
        />
      )}
      <ChoiceList
        exercise={exercise}
        answer={asString(answer)}
        disabled={disabled}
        settings={settings}
        onAnswer={onAnswer}
      />
    </div>
  );
}

type TokenInstance = { id: string; value: string };

function remainingTokenInstances(instances: TokenInstance[], answer: string[]) {
  const used = new Map<string, number>();
  for (const token of answer) used.set(token, (used.get(token) ?? 0) + 1);
  const seen = new Map<string, number>();
  return instances.filter((instance) => {
    const count = (seen.get(instance.value) ?? 0) + 1;
    seen.set(instance.value, count);
    return count > (used.get(instance.value) ?? 0);
  });
}

function PhraseOrder({
  exercise,
  answer,
  disabled,
  onAnswer,
}: ExerciseRendererProps) {
  const orderedAnswer = asStringArray(answer);
  const tokenInstances = useMemo(
    () =>
      (exercise.tokens ?? []).map((value, index) => ({
        id: `${exercise.id}-token-${index}`,
        value,
      })),
    [exercise.id, exercise.tokens],
  );
  const remaining = remainingTokenInstances(tokenInstances, orderedAnswer);
  const removeAt = (index: number) =>
    onAnswer(orderedAnswer.filter((_, answerIndex) => answerIndex !== index));

  return (
    <div className="exercise-content">
      {exercise.context && (
        <p className="exercise-context">{exercise.context}</p>
      )}
      <div
        className={`word-answer ${orderedAnswer.length ? "has-answer" : ""}`}
        role="group"
        aria-label="Your Romanized phrase"
      >
        {orderedAnswer.length === 0 && (
          <span className="answer-placeholder">
            Choose the Romanized words in the right order
          </span>
        )}
        {orderedAnswer.map((token, index) => (
          <button
            type="button"
            key={`answer-${index}-${token}`}
            disabled={disabled}
            onClick={() => removeAt(index)}
            aria-pressed="true"
            aria-label={`Remove ${token} from position ${index + 1}`}
          >
            {token}
          </button>
        ))}
      </div>
      <div className="word-bank" role="group" aria-label="Available words">
        {remaining.map((token) => (
          <button
            type="button"
            key={token.id}
            disabled={disabled}
            onClick={() => onAnswer([...orderedAnswer, token.value])}
            aria-label={`Add ${token.value}`}
          >
            {token.value}
          </button>
        ))}
      </div>
      {orderedAnswer.length > 0 && !disabled && (
        <button
          type="button"
          className="clear-answer"
          onClick={() => onAnswer([])}
        >
          <RotateCcw size={16} /> Start over
        </button>
      )}
    </div>
  );
}

function MissingWord({
  exercise,
  answer,
  disabled,
  settings,
  onAnswer,
}: ExerciseRendererProps) {
  const selectedAnswer = asString(answer);
  return (
    <div className="exercise-content fill-content">
      {exercise.context && (
        <p className="exercise-context">{exercise.context}</p>
      )}
      {exercise.romanization && (
        <p className="prompt-romanization" lang="en">
          {exercise.romanization}
        </p>
      )}
      {settings.showThaiScript && exercise.thai && (
        <details className="thai-script-detail">
          <summary>Show Thai script</summary>
          <p lang="th">{exercise.thai}</p>
        </details>
      )}
      <div
        className="word-bank missing-word-options"
        role="group"
        aria-label={exercise.accessibilityLabel}
      >
        {exercise.choices?.map((choice) => {
          const selected = selectedAnswer === choice.id;
          return (
            <button
              type="button"
              key={choice.id}
              className={selected ? "selected" : ""}
              disabled={disabled}
              onClick={() => onAnswer(choice.id)}
              aria-pressed={selected}
              aria-label={choice.accessibilityLabel}
            >
              {choice.romanization ?? choice.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MatchingPairs({
  exercise,
  answer,
  disabled,
  onAnswer,
}: ExerciseRendererProps) {
  const [selection, setSelection] = useState<{
    exerciseId: string;
    left: string | null;
  }>({ exerciseId: exercise.id, left: null });
  const selectedLeft =
    selection.exerciseId === exercise.id ? selection.left : null;
  const pairs = exercise.pairs ?? [];
  const pairAnswer = asPairRecord(answer);
  const rightItems = [...pairs].reverse();
  const assignedRight = new Set(Object.values(pairAnswer));

  const assign = (right: string) => {
    if (!selectedLeft) return;
    const next = Object.fromEntries(
      Object.entries(pairAnswer).filter(
        ([left, assigned]) => left !== selectedLeft && assigned !== right,
      ),
    );
    onAnswer({ ...next, [selectedLeft]: right });
    setSelection({ exerciseId: exercise.id, left: null });
  };

  return (
    <div className="exercise-content">
      <div
        className="matching-grid"
        role="group"
        aria-label={exercise.accessibilityLabel}
      >
        <div role="group" aria-label="Romanized Thai phrases">
          {pairs.map((pair) => {
            const selected = selectedLeft === pair.left;
            const paired = Boolean(pairAnswer[pair.left]);
            return (
              <button
                type="button"
                key={`${pair.id}-left`}
                className={`${selected ? "selected" : ""} ${paired ? "paired" : ""}`}
                disabled={disabled}
                onClick={() =>
                  setSelection({
                    exerciseId: exercise.id,
                    left: selected ? null : pair.left,
                  })
                }
                aria-pressed={selected}
                aria-label={
                  pair.leftAccessibilityLabel ??
                  `${pair.left}${paired ? `, paired with ${pairAnswer[pair.left]}` : ""}`
                }
              >
                {pair.left}
              </button>
            );
          })}
        </div>
        <div role="group" aria-label="English meanings">
          {rightItems.map((pair) => {
            const paired = assignedRight.has(pair.right);
            return (
              <button
                type="button"
                key={`${pair.id}-right`}
                className={paired ? "paired" : ""}
                disabled={disabled || !selectedLeft}
                onClick={() => assign(pair.right)}
                aria-pressed={paired}
                aria-label={pair.rightAccessibilityLabel ?? pair.right}
              >
                {pair.right}
              </button>
            );
          })}
        </div>
      </div>
      {Object.keys(pairAnswer).length > 0 && !disabled && (
        <button
          type="button"
          className="clear-answer"
          onClick={() => {
            onAnswer({});
            setSelection({ exerciseId: exercise.id, left: null });
          }}
        >
          <RotateCcw size={16} /> Clear pairs
        </button>
      )}
    </div>
  );
}

function DialogueComprehension(props: ExerciseRendererProps) {
  const {
    exercise,
    answer,
    disabled,
    settings,
    onAnswer,
    resolveAudioAsset: resolveAsset,
    resolveDialogue,
    resolveSpeaker,
  } = props;
  const dialogue = resolveDialogue?.(exercise.dialogueId);

  return (
    <div className="exercise-content dialogue-content">
      {(exercise.context || dialogue?.context) && (
        <p className="exercise-context">
          {exercise.context ?? dialogue?.context}
        </p>
      )}
      <ExerciseAudio
        exercise={exercise}
        settings={settings}
        resolveAsset={resolveAsset}
        large
        label="Play the full dialogue"
      />
      {dialogue ? (
        <div
          className="dialogue-exchange"
          role="group"
          aria-label={`${dialogue.title} transcript`}
        >
          {dialogue.turns.map((turn, index) => {
            const speaker = resolveSpeaker?.(turn.speakerId);
            return (
              <div className="dialogue-turn" key={`${turn.speakerId}-${index}`}>
                <strong>{speaker?.name ?? `Speaker ${index + 1}`}</strong>
                <p lang="en">{turn.romanization}</p>
                {settings.showThaiScript && (
                  <small className="thai-script-detail" lang="th">
                    {turn.thai}
                  </small>
                )}
                <AudioControls
                  asset={resolveAsset?.(turn.audioRef)}
                  audioRef={turn.audioRef}
                  settings={settings}
                  label={`Play ${speaker?.name ?? `speaker ${index + 1}`} line`}
                />
              </div>
            );
          })}
        </div>
      ) : exercise.dialogueId ? (
        <p className="audio-status" role="status">
          The dialogue transcript is unavailable.
        </p>
      ) : null}
      <ChoiceList
        exercise={exercise}
        answer={asString(answer)}
        disabled={disabled}
        settings={settings}
        onAnswer={onAnswer}
      />
    </div>
  );
}

type SpeechRecognitionResultEventLike = {
  results: {
    [index: number]: { [index: number]: { transcript: string } };
  };
};

type SpeechRecognitionErrorEventLike = { error?: string };

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous?: boolean;
  start: () => void;
  stop?: () => void;
  abort?: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const speechRecognitionConstructor = () => {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
};

function SelfAssessment({
  answer,
  disabled,
  onAnswer,
}: {
  answer: string;
  disabled: boolean;
  onAnswer: (answer: ExerciseAnswer) => void;
}) {
  return (
    <div
      className="speaking-self-assessment choice-grid"
      role="group"
      aria-label="How did that speaking attempt feel?"
    >
      <button
        type="button"
        className={`choice-card ${answer === "confident" ? "selected" : ""}`}
        disabled={disabled}
        onClick={() => onAnswer("confident")}
        aria-pressed={answer === "confident"}
      >
        <span className="choice-copy">
          <strong>I felt confident</strong>
          <span>I sounded close to the model.</span>
        </span>
      </button>
      <button
        type="button"
        className={`choice-card ${answer === "needs-practice" ? "selected" : ""}`}
        disabled={disabled}
        onClick={() => onAnswer("needs-practice")}
        aria-pressed={answer === "needs-practice"}
      >
        <span className="choice-copy">
          <strong>I need more practice</strong>
          <span>Bring this phrase back again soon.</span>
        </span>
      </button>
    </div>
  );
}

function SpeakingPractice({
  exercise,
  answer,
  disabled,
  settings,
  onAnswer,
  resolveAudioAsset: resolveAsset,
}: ExerciseRendererProps) {
  const [listening, setListening] = useState(false);
  const [manualAssessment, setManualAssessment] = useState(false);
  const [status, setStatus] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const Recognition = speechRecognitionConstructor();
  const supported = Boolean(Recognition);
  const spokenAnswer = asString(answer);

  useEffect(
    () => () => {
      recognitionRef.current?.abort?.();
      recognitionRef.current = null;
    },
    [],
  );

  const listen = () => {
    if (!Recognition) {
      setManualAssessment(true);
      return;
    }
    recognitionRef.current?.abort?.();
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = "th-TH";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        onAnswer(transcript);
        setStatus(
          settings.showThaiScript
            ? `Speech heard: ${transcript}`
            : "Speech captured. Compare it with the model and try again if needed.",
        );
      } else {
        setManualAssessment(true);
        setStatus(
          "No speech was detected. Please assess the attempt yourself.",
        );
      }
    };
    recognition.onerror = () => {
      setListening(false);
      setManualAssessment(true);
      setStatus(
        "Speech checking is unavailable right now. Please assess the attempt yourself.",
      );
    };
    recognition.onend = () => setListening(false);
    setListening(true);
    setStatus("Listening for Thai speech.");
    try {
      recognition.start();
    } catch {
      setListening(false);
      setManualAssessment(true);
      setStatus(
        "Speech checking could not start. Please assess the attempt yourself.",
      );
    }
  };

  return (
    <div className="exercise-content speaking-content">
      <PhrasePreview
        exercise={exercise}
        settings={settings}
        resolveAsset={resolveAsset}
      />
      {supported && !manualAssessment ? (
        <>
          <button
            type="button"
            className={`mic-button ${listening ? "listening" : ""}`}
            disabled={disabled || listening}
            onClick={listen}
            aria-pressed={listening}
          >
            <Mic size={34} />
            <span>
              {listening
                ? "Listening…"
                : spokenAnswer
                  ? "Try again"
                  : "Tap to speak"}
            </span>
          </button>
          {!disabled && (
            <button
              type="button"
              className="clear-answer"
              onClick={() => setManualAssessment(true)}
            >
              Assess myself instead
            </button>
          )}
        </>
      ) : (
        <div className="speech-fallback">
          <Mic size={28} />
          <p>
            Say the phrase aloud, compare it with the model, then choose an
            honest self-assessment.
          </p>
          <SelfAssessment
            answer={spokenAnswer}
            disabled={disabled}
            onAnswer={onAnswer}
          />
        </div>
      )}
      {spokenAnswer &&
        settings.showThaiScript &&
        spokenAnswer !== "confident" &&
        spokenAnswer !== "needs-practice" && (
          <p className="heard-text">
            Speech heard: <strong lang="th">{spokenAnswer}</strong>
          </p>
        )}
      {status && (
        <p className="heard-text" role="status" aria-live="polite">
          {status}
        </p>
      )}
    </div>
  );
}
