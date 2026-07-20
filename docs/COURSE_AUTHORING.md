# Course authoring guide

Noklingo course content is data, not UI code. Authors define normalized concepts
and references in `src/content/courseData.ts`; Zod and semantic validation reject a
course that the lesson player cannot safely teach.

This guide uses abbreviated objects to emphasize authoring decisions. The schemas
in `src/domain/schemas.ts` are the source of truth for exact field names and
required values.

## Before editing

Keep these constraints in mind:

- The target learner wants listening comprehension and practical spoken Thai,
  not Thai literacy drills.
- Store Thai script for accuracy, but always supply learner-facing Romanization
  and natural English meaning.
- Never make reading or typing Thai script necessary to answer an exercise.
- Prefer a natural phrase a Thai speaker would actually use over a word-for-word
  English mapping.
- Teach politeness and formality in context, including who is speaking.
- Reuse normalized vocabulary, phrase, speaker, dialogue, and audio IDs rather
  than copying slightly different inline objects.
- IDs are durable persistence keys. Use lowercase kebab case, make them unique,
  and do not rename a shipped ID merely to improve its wording.

## Normalized course structure

`src/content/courseData.ts` assembles one validated course from separate
collections. `src/content/course.ts` re-exports the stable public content API so
app and test imports do not change when authoring files are reorganized.
The important relationships are:

```text
speaker ───────┐
               ├─> audio asset ─┐
vocabulary ─┐  │                │
            ├─> phrase ─────────┼─> exercise ─> lesson ─> unit
            │  │                │                   └───> checkpoint
            │  └─> dialogue ────┘
            └──────────────────────────────> review metadata
```

A reference is a stable ID, not an array position. This lets a phrase be reused
with multiple speakers and lets the review scheduler track one concept across
different exercise modalities.

The course currently declares `schemaVersion: 1`. That content format version is
independent of learner persistence `version: 2`; changing one does not implicitly
migrate the other.

At export, pass the assembled object through `parseCourse` from
`src/domain/courseValidation.ts`. `parseCourse` first runs `CourseSchema`, then
semantic validation, and throws `CourseAuthoringError` with author-facing paths
when errors exist. Do not export an unchecked `as Course` assertion.

## Recommended authoring order

References make the safest workflow dependency-first:

1. Add speakers and audio placeholders.
2. Add vocabulary, phrases, notes, and audio references.
3. Add dialogue turns using those speaker/phrase/audio IDs.
4. Add skills that group reviewable vocabulary and phrases.
5. Author exercises, then lessons with explicit prerequisite lessons.
6. Add lesson/checkpoint/review nodes to a unit and add the unit ID to its section.
7. Add checkpoint and achievement records where needed.
8. Run `npm run validate:course`, then play the new path from a clean profile.

Course 1 uses compact `lessonSeeds` plus deterministic builders. Add or correct
the seed rather than copying a generated exercise object. Each seed supplies one
anchor vocabulary record, two phrase records, a communicative objective,
recurring speakers, a dialogue question, and a cultural note. The builder creates
the eight required exercise modalities and interleaves the prior lesson's item.
Checkpoint builders clone a balanced modality set from the preceding block and
must never introduce new IDs.

## Reproducible development progress

In the local development build, add one of these one-shot query parameters to
reproduce a learner state without clicking through prerequisite lessons:

- `?devProgress=welcome-checkpoint-ready`
- `?devProgress=after-welcome-checkpoint`
- `?devProgress=review-ready`

The app consumes and removes the parameter during hydration, writes the seeded
state to IndexedDB, and then behaves like a normal persisted learner profile.
Production builds ignore the parameter.

## Romanization standard

Noklingo uses a practical learner-facing system rather than RTGS or full IPA.
Apply it consistently throughout display text, answer tokens, hints, and accepted
alternatives.

### Tone marks

Put the tone mark on the principal vowel of the syllable:

| Tone    | Mark       | Example |
| ------- | ---------- | ------- |
| Mid     | unmarked   | `dee`   |
| Low     | grave      | `phèt`  |
| Falling | circumflex | `mâi`   |
| High    | acute      | `láew`  |
| Rising  | caron      | `mǎi`   |

Tone guidance can add a short explanation or optional IPA, but the learner-facing
Romanization remains readable on its own.

### Spelling and segmentation

- Use `kh`, `ph`, and `th` for aspirated consonants; do not alternate between
  `kh` and `k` for the same Thai sound.
- Use the course's established learner distinctions such as `bp` and `dt` where
  they prevent a misleading English pronunciation.
- Join syllables inside one lexical item with hyphens and separate words with a
  single space: `sà-wàt-dee khrap`.
- Use lowercase except for a proper name. Do not put explanatory parentheses in
  the Romanization field.
- Keep punctuation outside the canonical answer unless it changes intent.
- Do not put Thai characters, an English translation, or an audio filename in a
  Romanization field.

### `khrap` and `kha`

Politeness particles vary with the speaker's identity and conversational intent,
not the listener's gender:

- `ครับ` is displayed consistently as `khrap` when used by a speaker who chooses
  that particle.
- Statement `ค่ะ` and question/attention `คะ` are displayed as `kha` in the
  beginner-facing course. Their distinct Thai source forms, sentence intent, and
  tone guidance remain stored so a future pronunciation view can show the finer
  distinction without changing exercise answers.

Speaker records and phrase usage notes should say which form is modeled. Do not
present `khrap` and `kha` as universally interchangeable accepted answers unless
the prompt explicitly lets the learner answer using their own preferred
particle. A learner setting may choose a preferred particle; authored dialogue
still follows each character's speaker context.

## Add a speaker

Create a speaker before authoring audio or dialogue turns for that voice. Include
a stable ID, display name, gender/voice context, role, preferred politeness form,
and a short description useful to authors. Politeness values use ASCII IDs in
data; accented Romanization belongs in learner-facing phrase text.

```ts
{
  id: "speaker-nok",
  name: "Nok",
  gender: "female",
  role: "neighbor and guide",
  description: "Warm, informal Bangkok voice; normal speaking pace",
  defaultPoliteParticle: "kha",
}
```

Gender context documents the modeled voice and politeness choice; it is not a
rule for how every person must speak. Use multiple speakers across the sample
course so the learner hears natural variation in pitch, pace, and particle use.

## Add a vocabulary item

Add one record to the vocabulary collection. A useful vocabulary record includes:

- Thai source form;
- canonical Romanization;
- natural English meaning and optional literal meaning;
- tone or pronunciation guidance;
- formality and speaker/politeness context;
- usage notes;
- topic and pedagogical tags;
- audio references where a standalone recording exists; and
- review difficulty metadata.

```ts
{
  id: "vocab-spicy",
  thai: "เผ็ด",
  romanization: "phèt",
  meaning: "spicy",
  toneGuidance: "Short vowel; low tone",
  formality: "neutral",
  usageNotes: "Common in food questions and requests.",
  topics: ["food", "restaurant"],
  tags: ["adjective", "beginner"],
  difficulty: 2,
  reviewPriority: 1,
  partOfSpeech: "adjective",
  audioRef: "audio-spicy-nok",
}
```

Do not create a second vocabulary ID solely because the item appears in a new
unit. Add a genuinely distinct sense or usage only when it needs separate
meaning, feedback, or review behavior.

## Add a phrase

A phrase is a reusable spoken utterance, not just a display string. Reference its
source vocabulary and any audio variants.

```ts
{
  id: "phrase-not-spicy-please",
  thai: "ไม่เผ็ดครับ",
  romanization: "mâi phèt khrap",
  meaning: "Not spicy, please.",
  literalMeaning: "not spicy [polite particle]",
  vocabularyIds: ["vocab-not", "vocab-spicy", "vocab-khrap"],
  audioRef: "audio-not-spicy-somchai",
  speakerGender: "male",
  politenessContext: "A polite request by a speaker who uses khrap.",
  formality: "polite",
  toneGuidance: "Keep mâi and phèt distinct; do not stress khrap heavily.",
  usageNotes: "A direct, normal request at a restaurant.",
  topics: ["food", "restaurant"],
  tags: ["request", "travel"],
  difficulty: 2,
  reviewPriority: 1.2,
  acceptedRomanizations: ["mai pet khrap"],
  grammarNoteIds: [],
  culturalNoteIds: [],
}
```

Use `meaning` for the response an English speaker needs to understand.
Use `literalMeaning` only when it reveals useful Thai structure; it should not
replace the natural meaning in exercises.

## Add audio

Add or choose the speaker first, place the recording under `public/audio/`, then
add an audio-asset record and reference its ID from vocabulary, phrase, dialogue,
or exercise data.

```ts
{
  id: "audio-not-spicy-somchai",
  speakerId: "speaker-somchai",
  src: "/audio/speaker-somchai/phrase-not-spicy-please--normal.mp3",
  slowSrc: "/audio/speaker-somchai/phrase-not-spicy-please--slow.mp3",
  transcriptThai: "ไม่เผ็ดครับ",
  romanization: "mâi phèt khrap",
  kind: "bundled",
  license: "Original Noklingo recording; contributor release on file",
}
```

See [Audio assets](../public/audio/README.md) for file naming, recording,
fallback, caching, and human-voice replacement rules. Listening and dialogue
exercises must resolve playable audio or explicitly opt into an allowed TTS
placeholder; ordinary missing audio is an authoring error.

## Add a dialogue

A dialogue contains ordered turns. Each turn references a speaker and normally a
phrase plus audio asset. Keep the exchange short enough to replay comfortably.

```ts
{
  id: "dialogue-spice-level",
  title: "How spicy?",
  context: "Street-food stall",
  turns: [
    {
      speakerId: "speaker-nok",
      phraseId: "phrase-want-spicy-question",
      thai: "เอาเผ็ดไหมคะ",
      romanization: "ao phèt mǎi kha",
      meaning: "Would you like it spicy?",
      audioRef: "audio-want-spicy-nok",
    },
    {
      speakerId: "speaker-somchai",
      phraseId: "phrase-not-spicy-please",
      thai: "ไม่เผ็ดครับ",
      romanization: "mâi phèt khrap",
      meaning: "Not spicy, please.",
      audioRef: "audio-not-spicy-somchai",
    },
  ],
  difficulty: 2,
  tags: ["food", "restaurant"],
  formality: "polite",
  usageNotes: "A normal service exchange; use your own particle in production.",
  comprehensionQuestions: [
    {
      id: "question-spice-level",
      prompt: "How does the customer want the food?",
      correctAnswer: "Not spicy",
      explanation: "The customer answers mâi phèt.",
    },
  ],
}
```

Do not hide all meaning in one long subtitle. Each referenced phrase should have
its own natural meaning and Romanization so the player can reveal accessible
detail after an attempt.

## Add an exercise

Every exercise has common teaching metadata plus a payload selected by its
discriminated `type` schema.

Common metadata includes:

- stable ID, type, instruction, and prompt;
- canonical correct answer and plausible distractors where applicable;
- optional audio and hint;
- concise explanation and feedback;
- difficulty and estimated duration;
- source vocabulary, phrase, or dialogue IDs;
- accepted alternatives where appropriate;
- topic and review tags; and
- explicit accessibility labels for audio and controls.

The registry supports these learning tasks:

| Task                      | `type`                     | Authoring requirement                                           |
| ------------------------- | -------------------------- | --------------------------------------------------------------- |
| Listen and choose meaning | `listen-meaning`           | Audio plus natural-English choices                              |
| Listen and choose phrase  | `listen-phrase`            | Audio plus Romanized phrase choices                             |
| English to Thai phrase    | `english-to-phrase`        | English intent plus Romanized Thai choices                      |
| Phrase ordering           | `phrase-order`             | Romanized tokens in canonical order                             |
| Missing word              | `missing-word`             | Romanized context and answer choices                            |
| Matching pairs            | `matching-pairs`           | Stable pair IDs; learner-facing Romanization/English            |
| Conversation response     | `conversation-response`    | A spoken or written turn plus natural responses                 |
| Dialogue comprehension    | `dialogue-comprehension`   | Dialogue reference plus a focused question                      |
| Speaking practice         | `speaking-practice`        | Model audio, expected phrase, speech variants, self-assessment  |
| Mistake correction        | `mistake-correction`       | Source concept and a variation strategy, not a copied prompt    |
| Personalized translation  | `personalized-translation` | Safe profile placeholders and a practical family/travel context |

Use the exact discriminator names from `src/domain/schemas.ts`. For a choice task,
the correct answer is the stable choice ID:

```ts
{
  id: "exercise-listen-spice",
  type: "listen-meaning",
  instruction: "Listen and choose the meaning",
  prompt: "What did Nok ask?",
  speakerId: "speaker-nok",
  audioRef: "audio-want-spicy-nok",
  choices: [
    { id: "some-spice", label: "Do you want it spicy?" },
    { id: "need-bill", label: "Would you like the bill?" },
    { id: "take-away", label: "Is this takeaway?" },
  ],
  correctAnswer: "some-spice",
  acceptedAnswers: [],
  hintIds: ["hint-question-particle"],
  explanation: "ไหม (mǎi) turns the phrase into a yes/no question.",
  difficulty: 2,
  estimatedSeconds: 20,
  sourceItemIds: ["phrase-want-spicy-question"],
  tags: ["listening", "restaurant"],
  feedback: {
    correct: "Right — Nok is asking about the spice level.",
    incorrect: "Listen again for phèt and the question ending mǎi.",
    pronunciation: "mǎi rises at the end of the question.",
  },
  accessibilityLabel: "Listen to Nok and choose the English meaning",
}
```

Distractors should be believable for the learner's current level but unambiguously
wrong in context. Avoid jokes that make the answer obvious, and do not repeat the
same question later with only shuffled options.

### Accepted answer variants

The canonical answer is the form shown in corrective feedback. Accepted variants
are genuine equivalent learner responses, not a list of punctuation and case
permutations already handled by normalization.

- Keep Thai script variants separate from learner-facing Romanized input and
  browser speech-transcript variants.
- Do not add a different politeness particle unless the prompt permits that
  speaker context.
- Do not accept an unnatural literal translation merely because each word is
  individually correct.
- Do not repeat the canonical answer in `acceptedAnswers`.
- Add a test when an accepted variant depends on non-obvious normalization.

For speaking, include common recognition transcripts only when they represent the
same Thai phrase. For personalization, accepted answers may resolve a safe
placeholder such as a family name, but the canonical pattern must still be
gradable without storing personal data in course content.

## Add a lesson

A lesson embeds validated exercise records. The pure generator may derive
mistake/review variations from them, but the authored source remains immutable.
Give the lesson explicit prerequisites and concept coverage rather than relying
on file order.

```ts
{
  id: "lesson-order-food",
  unitId: "unit-restaurant",
  kind: "lesson",
  title: "Order at the stall",
  eyebrow: "At the food stall",
  description: "Order one dish and answer the spice question.",
  icon: "Soup",
  completionXp: 20,
  estimatedMinutes: 4,
  skillIds: ["skill-ordering-food", "skill-spice-level"],
  prerequisiteLessonIds: ["lesson-food-basics"],
  introducedItemIds: [
    "phrase-order-one",
    "phrase-want-spicy-question",
  ],
  exercises: [
    exerciseListenDish,
    exerciseChooseOrder,
    exerciseListenSpice,
    exerciseOrderNotSpicy,
    exerciseConversationSpice,
    exerciseDialogueSpice,
  ],
  tags: ["food", "restaurant", "conversation"],
}
```

Before adding the lesson to a unit, verify that it:

- targets three to seven minutes;
- introduces no more than three concepts;
- starts with recognition;
- contains listening and conversation;
- reuses prerequisite material;
- increases difficulty gradually;
- ends with retrieval, speaking, or dialogue; and
- can generate a meaningful variation for mistakes.

## Add a unit, checkpoint, or review node

A unit owns an ordered presentation path, while prerequisites define what is
actually unlockable.

```ts
{
  id: "unit-restaurant",
  sectionId: "section-starter",
  number: 2,
  title: "At the restaurant",
  description: "Order, adjust spice, and pay naturally.",
  skillIds: ["skill-ordering-food", "skill-spice-level"],
  prerequisiteCheckpointIds: ["checkpoint-welcome"],
  nodes: [
    {
      id: "node-food-basics",
      type: "lesson",
      title: "Food basics",
      lessonId: "lesson-food-basics",
    },
    {
      id: "node-order",
      type: "lesson",
      title: "Order at the stall",
      lessonId: "lesson-order-food",
    },
    {
      id: "node-food-review",
      type: "review",
      title: "Restaurant smart review",
    },
    {
      id: "node-food-checkpoint",
      type: "checkpoint",
      title: "Restaurant checkpoint",
      lessonId: "lesson-restaurant-checkpoint",
    },
  ],
}
```

After adding the unit, include `"unit-restaurant"` in the owning section's
`unitIds`. Every `sectionId`, skill, prerequisite checkpoint, lesson, and
checkpoint reference must resolve. Presentation order comes from section/unit
arrays and node order; unlock authority comes from explicit prerequisites.

A checkpoint record connects a checkpoint lesson to its pass rule and unlocks:

```ts
{
  id: "checkpoint-restaurant",
  title: "Restaurant checkpoint",
  lessonId: "lesson-restaurant-checkpoint",
  passingAccuracy: 80,
  unlocksUnitIds: ["unit-casual-conversation"],
}
```

The checkpoint lesson uses `kind: "checkpoint"`, covers its declared skills,
and introduces no items. A review path node may omit `lessonId`; the engine uses
the unit's covered concepts and the learner's due state to build a
`ReviewSession` rather than replaying an unrelated completed lesson. An authored
review lesson uses `kind: "review"` when a fixed source exercise pool is useful.

## Add review metadata

Review metadata describes the concept, not a learner's schedule. Authors may set:

- intrinsic difficulty;
- concept and topic tags;
- valid listening, recall, speaking, and conversation modalities;
- prerequisite concept IDs;
- mistake-variation sources; and
- optional selection weight for safety-critical or especially useful phrases.

Do not author `dueDate`, repetitions, ease, strength, or lapse count in course data.
Those belong to each learner's version 2 review state and are updated by the
SM-2-inspired scheduler.

An exercise should reference the normalized concepts it tests. Without source
references, an incorrect attempt cannot become a useful mistake record or update
the right review state.

## Add a new exercise type

Adding a type is a cross-layer change, not just a new component:

1. Add a discriminated Zod payload to `src/domain/schemas.ts`; infer its
   TypeScript type rather than maintaining a parallel handwritten shape.
2. Add semantic validation for references, correct-answer reachability, duplicate
   options, and any type-specific accessibility requirement.
3. Add pure grading and answer-normalization tests in `src/engine/`.
4. Register the renderer in `exerciseRendererRegistry` and define answer
   completeness through `isExerciseAnswerComplete`.
5. Teach lesson and review generation which modalities and difficulty transitions
   the type satisfies.
6. Add immediate-feedback, keyboard, screen-reader, audio-disabled, and reduced-
   motion coverage as applicable.
7. Add at least one polished demonstration exercise and run course validation.

There should be no silent default renderer. An unregistered validated type is a
development error.

## Validation reference

Run:

```bash
npm run validate:course
```

The command exits nonzero on errors and prints author warnings separately. It
checks at least:

- duplicate IDs across every normalized collection;
- malformed fields and invalid ID/enum/range values;
- broken unit, lesson, exercise, vocabulary, phrase, dialogue, speaker, audio,
  checkpoint, and review references;
- missing required audio and nonexistent local audio files;
- invalid, cyclic, or impossible prerequisite graphs;
- path nodes that can never unlock;
- missing correct answers or choice IDs that cannot be selected;
- duplicate choice labels/IDs, answer tokens, pairs, or accepted alternatives;
- Romanization that is empty, contains Thai script, or violates canonical
  spacing and tone-mark rules;
- dialogue turns without speakers, phrases, or usable audio;
- source concepts missing from reviewable exercises;
- lesson duration, new-concept limits, required listening/conversation, ending
  difficulty, and poor modality variety;
- exact prompt duplication masquerading as mistake variation;
- checkpoints below the required exercise mix or with a threshold other than
  80%; and
- review plans that cannot produce listening, recall, and conversation tasks.

It also validates `src/content/audioManifest.ts`: every audio asset must have one
normal and one slow recording take, unique suggested filenames, real lesson
usage, and explicit `recorded` or `needs-recording` status.

Warnings cover optional improvements such as a missing slow recording, sparse
pronunciation guidance, or overused distractors. A shipped course must have no
errors; warnings should be reviewed rather than automatically ignored.

## Author checklist

Before opening a pull request:

1. Listen to every new clip at normal and slow speed.
2. Confirm Thai script, Romanization, natural meaning, speaker particle, and
   context with a fluent Thai speaker.
3. Complete the lesson without using Thai script.
4. Intentionally miss each new exercise and verify corrective feedback and replay.
5. Test accepted alternatives and speaking self-assessment.
6. Check prerequisite unlocks, resume behavior, and review source references.
7. Run the full gate:

```bash
npm run validate:course
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```
