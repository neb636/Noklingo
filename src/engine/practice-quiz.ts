import type { CueCard } from "@/domain/schemas";
import { deterministicShuffle } from "./deterministic";

export interface PracticeQuestion {
  id: string;
  promptCardId: string;
  choiceCardIds: string[];
  correctChoiceId: string;
}

const MAX_CHOICES = 4;

function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("en-US");
}

function normalizedEmoji(card: CueCard): string | undefined {
  const emoji = card.emoji.normalize("NFKC").trim();
  return emoji || undefined;
}

interface SelectionState {
  cardIds: Set<string>;
  meanings: Set<string>;
  thai: Set<string>;
  emojis: Set<string>;
}

function isEligible(card: CueCard, state: SelectionState): boolean {
  return !state.cardIds.has(card.id)
    && !state.meanings.has(normalizeText(card.naturalMeaning))
    && !state.thai.has(normalizeText(card.thai));
}

function remember(card: CueCard, state: SelectionState): void {
  state.cardIds.add(card.id);
  state.meanings.add(normalizeText(card.naturalMeaning));
  state.thai.add(normalizeText(card.thai));
  const emoji = normalizedEmoji(card);
  if (emoji) state.emojis.add(emoji);
}

/**
 * Selects from a pre-shuffled pool. Semantic uniqueness is mandatory; emoji
 * diversity is a preference and never reduces the number of available choices.
 */
function takeDistractors(
  pool: readonly CueCard[],
  count: number,
  state: SelectionState,
): CueCard[] {
  const remaining = [...pool];
  const selected: CueCard[] = [];

  while (selected.length < count) {
    const eligible = remaining.filter((card) => isEligible(card, state));
    if (!eligible.length) break;

    const distinctEmoji = eligible.find((card) => {
      const emoji = normalizedEmoji(card);
      return emoji !== undefined && !state.emojis.has(emoji);
    });
    const next = distinctEmoji ?? eligible[0];

    selected.push(next);
    remember(next, state);
    const selectedIndex = remaining.findIndex((card) => card.id === next.id);
    if (selectedIndex >= 0) remaining.splice(selectedIndex, 1);
  }

  return selected;
}

export function buildPracticeQuiz(
  lessonCards: readonly CueCard[],
  allCards: readonly CueCard[],
  seed: string,
): PracticeQuestion[] {
  const lessonCardIds = new Set(lessonCards.map((card) => card.id));
  const targets = deterministicShuffle(lessonCards, `${seed}:question-order`);

  return targets.map((target) => {
    const state: SelectionState = {
      cardIds: new Set(),
      meanings: new Set(),
      thai: new Set(),
      emojis: new Set(),
    };
    remember(target, state);

    const lessonPool = deterministicShuffle(
      lessonCards.filter((card) => card.id !== target.id),
      `${seed}:${target.id}:lesson-distractors`,
    );
    const globalPool = deterministicShuffle(
      allCards.filter((card) => !lessonCardIds.has(card.id)),
      `${seed}:${target.id}:global-distractors`,
    );

    const lessonDistractors = takeDistractors(lessonPool, MAX_CHOICES - 1, state);
    const globalDistractors = takeDistractors(
      globalPool,
      MAX_CHOICES - 1 - lessonDistractors.length,
      state,
    );
    const choices = deterministicShuffle(
      [target, ...lessonDistractors, ...globalDistractors],
      `${seed}:${target.id}:choice-order`,
    );

    return {
      id: `practice-${target.id}`,
      promptCardId: target.id,
      choiceCardIds: choices.map((card) => card.id),
      correctChoiceId: target.id,
    };
  });
}
