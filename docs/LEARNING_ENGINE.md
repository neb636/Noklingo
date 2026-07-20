# Noklingo learning engine

This document defines how Noklingo turns validated course data into short,
listening-first Thai lessons. It is both an implementation guide and a product
contract: changes to grading, XP, progression, review timing, or persistence
should update this document and the corresponding tests in the same change.

Noklingo teaches practical spoken Thai to an English-speaking beginner. Thai
script is retained for source accuracy, audio lookup, and optional detail views,
but completing a lesson must never depend on reading or typing Thai script.

## Design principles

- Keep a lesson to roughly three to seven minutes and show one task at a time.
- Introduce at most a few new concepts, then reuse older material in a new
  context or modality.
- Start with recognition and progress toward recall, speaking, or dialogue.
- Give corrective feedback immediately without turning each miss into a grammar
  lecture.
- Treat listening and natural conversation as the core skills. Romanization is
  a scaffold; Thai literacy is not a prerequisite.
- Make generation and scheduling deterministic so an author or test can explain
  why an item appeared.
- Keep domain logic pure. React renders an engine decision; it does not make the
  decision.

## Architecture

The engine is split into layers with one-way dependencies:

1. `src/content/course.ts` contains the normalized demonstration course. Stable
   IDs connect vocabulary, phrases, speakers, audio, dialogues, lessons, units,
   checkpoints, and review metadata.
2. `src/domain/schemas.ts` defines the Zod schemas and inferred TypeScript types.
   Course data and imported local data cross this runtime-validation boundary.
3. `src/domain/courseValidation.ts` performs semantic checks that a field schema
   cannot express, such as reference integrity, unique answer options, valid
   prerequisites, and possible progression.
4. Modules in `src/engine/` are pure functions for grading, scoring, lesson
   generation, progression, and review scheduling. They accept data and an
   explicit clock or seed and return data; they do not read the DOM, IndexedDB,
   or global time.
5. `exerciseRendererRegistry` maps each exercise discriminator to its React
   renderer. `ExerciseRenderer` and `isExerciseAnswerComplete` use the registry
   rather than a growing conditional component.
6. Zustand coordinates the active route and lesson session. Dexie stores local
   schema version 2 data: profile, settings, progress, attempts, mistakes,
   review state, milestones, and a resumable session snapshot.

This separation lets authoring validation and engine tests run in Node without a
browser, while renderers can be tested with small, already-validated fixtures.

## Content loading and validation

Course startup has two gates:

1. Zod validates shape, required fields, discriminated exercise payloads,
   numeric ranges, IDs, and enum values.
2. Semantic validation builds ID indexes and checks relationships and teaching
   rules.

The application must not silently repair malformed shipped content. Development
and CI run:

```bash
npm run validate:course
```

Errors include a stable path and an actionable message, for example:

```text
lessons.restaurant-order.exercises[3].correctAnswer:
choice "very-spicy" does not exist in this exercise
```

See [Course authoring](./COURSE_AUTHORING.md) for the complete validation list
and author workflow.

## Lesson generation

Authored lessons may provide a complete exercise sequence or a generation plan.
The generator resolves either form into a frozen session sequence before the
lesson begins. A resumed lesson uses that stored sequence; it is never regenerated
halfway through.

A normal generated lesson should satisfy these constraints:

- Target three to seven minutes using authored `estimatedSeconds` values.
- Introduce no more than three new vocabulary or phrase concepts.
- Begin with an easy recognition task.
- Include at least one listening task and one conversational task.
- Mix new material with prerequisite or previously learned material.
- Move from recognition toward recall or production.
- End with harder retrieval, speaking, conversation response, or dialogue
  comprehension.
- Insert a mistake-correction task before completion when the learner missed a
  concept and still has a viable recovery path.
- Do not repeat the same prompt and answer with only reordered choices. Variation
  must change context, speaker, intent, wording, sentence structure, or modality.

Generation is deterministic for the same course version, learner state, session
ID, and seed. Choice order may vary, but the chosen distractors and shuffle order
are stored in the session snapshot so resume behavior is stable.

## Attempt grading and feedback

The grader returns a structured result rather than only a boolean. At minimum it
records correctness, whether the answer was accepted as an alternative, the
attempt number, hint use, response time when available, the canonical answer,
and concise feedback.

Answer normalization is exercise-specific:

- Choice exercises grade stable option IDs, not display labels.
- Romanized free responses normalize case, repeated whitespace, and benign
  punctuation. They do not erase tone-bearing letters or merge semantically
  distinct politeness particles.
- Phrase ordering compares ordered token IDs, which permits repeated display
  tokens.
- Matching compares the complete mapping of stable pair IDs.
- Speaking recognition checks the canonical Thai transcript and accepted speech
  variants. When recognition is unavailable, the learner can replay the model
  and self-assess as `confident` or `needs-practice`. A needs-practice response
  completes the interaction without pretending it was recognized recall and
  brings the concept back sooner.

First-attempt accuracy is immutable. An incorrect first submission remains a
mistake for accuracy, mastery, and review scheduling even when the learner gets
the retry right. A successful retry confirms recovery and lets the lesson
continue, but earns less XP than first-attempt recall. Repeated taps or a browser
speech-recognition failure do not create extra scored attempts.

Feedback is immediate:

- Correct: confirm the answer and, when useful, reinforce natural meaning or
  pronunciation.
- Incorrect: show the canonical response, natural meaning, a short explanation,
  pronunciation guidance when relevant, and a replay control when audio exists.
- Retry: change the wording, context, answer order, speaker, or modality whenever
  possible.

## XP and accuracy

XP rewards completion and retrieval quality; it is not a substitute for mastery.
The scoring module owns all constants so UI code never recreates the formula.

- A correct first attempt earns full exercise XP.
- A correct retry earns reduced recovery XP. The first miss still counts against
  accuracy.
- Opening a hint reduces the XP available for that exercise, but never blocks
  completion and never costs a heart by itself.
- A self-assessed speaking response can earn completion XP, but not the same
  confidence/mastery gain as a successfully recognized response.
- A completed lesson receives its configured completion reward. A perfect,
  no-hint lesson may receive a small bonus.
- The checkpoint completion reward is awarded only on a passing attempt.

The current constants are deliberately small and live in the engine:

- correct first attempt: **2 XP**;
- difficulty 4–5 first attempt: **+1 XP**;
- opened hint: **-1 XP**, with a minimum of 1 for a correct first attempt;
- correct retry or mistake-correction task: **1 XP**;
- incorrect or `needs-practice` speaking attempt: **0 exercise XP**;
- authored lesson completion: its `completionXp` value (5–8 in the demo);
- generated review completion: **3 XP**; and
- 100% first-attempt accuracy with no hints: **+3 XP**.

A failed checkpoint keeps correctly earned exercise XP but receives no checkpoint
completion reward, no perfect bonus, and no unlock.

Accuracy is:

```text
exercises correct on the first scored attempt / scored exercises attempted
```

Practice and retry attempts remain in history even though they do not rewrite
the original first-attempt result. The completion screen reports XP, first-pass
accuracy, mistakes, elapsed time, and any newly unlocked node.

## Hearts, failure, and recovery

A standard lesson begins with five hearts. A wrong scored answer costs one heart;
hints, self-assessment, and unsupported speech recognition do not. Hearts cannot
drop below zero.

At zero hearts, the learner enters recovery rather than losing the session:

1. The engine grants two recovery hearts so the session is never discarded.
2. Short mistake-correction tasks based on concepts missed in the current lesson
   are appended to the frozen queue.
3. Those corrections use changed wording, option order, or modality and award
   only recovery XP.
4. The learner may exit; the version 2 session snapshot preserves position,
   answers, remaining hearts, generated order, and the recovery queue.

If no valid recovery exercise can be generated, the session ends as incomplete
without awarding the lesson completion reward or unlocking dependents. Completed
exercises and mistakes are still retained for review. A learner can restart the
lesson with a fresh heart pool.

## Lesson and checkpoint completion

A normal lesson is complete when every authored exercise has a scored result and
each queued correction has been attempted. The engine caps in-session correction
at two variants per missed exercise so one stubborn phrase cannot create an
infinite lesson. An unresolved concept remains a mistake and becomes urgent
review material. Exiting early saves a resumable session and does not mark the
lesson complete.

Prerequisites are explicit stable IDs. A lesson unlocks only when all of its
prerequisites are complete. A unit unlocks when its prerequisite node or unit is
complete; array order alone is not treated as a prerequisite.

A checkpoint draws from the skills and concepts declared by its blueprint. It
mixes listening, recall, and conversation, does not introduce new material, and
passes at **80% first-attempt accuracy**. Passing completes the checkpoint and
unlocks its dependents. A failed checkpoint records attempts and mistakes,
schedules weak concepts for review, and can be retried without erasing the prior
result.

Mastery or strength is stored per reviewable concept, not hard-coded in the UI.
Lesson completion may establish a concept, but repeated successful review is
what makes it strong.

## Review scheduler

Noklingo uses an understandable, deterministic approximation of SM-2. It is not
claimed to reproduce any proprietary language-learning algorithm.

Each reviewable concept stores at least:

- local-calendar `dueDate` and optional UTC `lastReviewedAt`
- current interval in days
- ease factor
- successful review count
- lapse and recent-failure counts
- last outcome and current strength
- whether the concept is new, learning, or in review

An attempt is converted to a quality score from 0 to 5. Correct first-attempt,
unhinted recall receives the strongest result. A hinted answer, slow response,
retry, or self-assessed speaking result receives less credit. An incorrect answer
is a lapse.

The scheduling approximation follows these rules:

- Quality below 3 resets the active interval to one day and returns the item
  soon; cumulative success history remains available for analytics.
- The first stable success uses a one-day interval; the second uses roughly
  three days.
- Later successes multiply the previous interval by the ease factor, adjusted
  for authored vocabulary and exercise difficulty.
- Ease never falls below 1.3. Recent lapses shorten the interval even when the
  latest response is correct.
- New items and current mistakes can be due within the current session; stable
  items expand toward progressively longer intervals.

When equivalent items compete for a slot, selection sorts by urgency, weakness,
due time, then stable ID. Any modality choice or shuffle uses the explicit session
seed. This makes a generated review reproducible in a test.

A review session mixes, as available:

1. unresolved recent mistakes;
2. due weak vocabulary or phrases;
3. older established material that is due;
4. listening tasks;
5. recall or phrase-building tasks; and
6. conversation or dialogue tasks.

It avoids serving multiple near-identical variants of one concept back to back.
Completing review updates each concept independently; it does not mark an entire
unit complete.

## Streaks and local calendar dates

Streaks use local calendar days, not rolling 24-hour windows. At completion, the
engine derives and stores a local `YYYY-MM-DD` day key. Attempt/activity records
also keep their UTC timestamps; version 2 does not need to persist a time-zone
identifier to decide whether two completed activities belong to the same stored
local day.

- More than one qualifying activity on the same local day leaves the streak
  unchanged.
- Activity on the local day after the last qualifying day increments the streak.
- A gap of one or more local calendar days resets the current streak to one.
- Day arithmetic uses calendar dates, so daylight-saving transitions do not
  create 23- or 25-hour streak bugs.
- Travel does not rewrite historical day keys. The device time zone at the time
  of the new qualifying activity determines its new day key.
- If westward travel produces a new key equal to or earlier than the stored last
  practice key, record the activity but do not increment or reset the streak;
  streak day comparison resumes when the local date moves forward.

A completed lesson, passed checkpoint, or completed generated review qualifies.
Starting or resuming without completion does not.

## Local persistence and resume

Zustand owns short-lived UI coordination; Dexie is authoritative for durable
local data. Version 2 persistence includes the active session and the learning
records needed by deterministic review. Writes occur after scored attempts and
meaningful navigation, not only at lesson completion.

The version 2 migration preserves version 1 profile, settings, XP, completed
lessons, activity, and current session data where possible, then initializes new
attempt, mistake, review, milestone, and checkpoint records with conservative
defaults. Imports are parsed with the persisted-data Zod schema before they can
replace current data.

There is no account, backend, or cloud sync. Exported data can contain the
learner's name, learning history, and personalized prompts, so the Settings UI
should describe it as private personal data.

## Testing expectations

Pure engine modules should have unit tests for boundary cases and deterministic
fixtures. At minimum, cover:

- every exercise grader, accepted variants, and incomplete answers;
- first-attempt versus retry accuracy and XP;
- hint and speaking self-assessment penalties;
- heart depletion, recovery, exit, and resume;
- prerequisite graphs, unlocks, checkpoint scores around 80%, and impossible
  progression;
- scheduler lapses, interval growth, time-zone and daylight-saving boundaries;
- deterministic generation and modality/variety constraints;
- version 1 to version 2 persistence migration; and
- every registered exercise renderer.

Run the complete local gate before merging:

```bash
npm run validate:course
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```
