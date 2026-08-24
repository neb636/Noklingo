# Noklingo v3 learning engine

This document is the product contract for progression, daily eligibility,
mastery, spaced review, streaks, and persistence. UI code renders these engine
decisions; it must not recreate them independently.

## Core model

An ordered curriculum contains `VideoLesson` records. Each lesson connects one
verified video and transcript to 5-10 reviewable `KnowledgeItem` cue cards and a
bank of scored quiz variants.

Durable learner state consists of:

- `LessonProgress`: `unseen`, `introduced`, `awaiting-mastery`, or `mastered`,
  plus introduction date, next eligible mastery date, best delayed accuracy, and
  attempt history;
- one `ItemReviewState` per knowledge item, including due date, interval stage,
  successes, and lapses;
- `DailyStudySession`: introduction or mastery mode, current stage and position,
  a frozen quiz queue, answers, and resumable state;
- study streak and settings; and
- immutable attempt records used by Results and Progress.

All eligibility and due dates use local `YYYY-MM-DD` day keys. UTC timestamps may
also be recorded for history, but rolling 24-hour arithmetic never decides
whether tomorrow has arrived.

## Today states

The engine derives exactly one primary state:

1. **Mastery due** when the active introduced lesson is eligible today.
2. **Waiting** when that lesson's next eligible date is later than today.
3. **New lesson ready** when no lesson awaits mastery and the next ordered lesson
   is unlocked.
4. **Curriculum complete** when every lesson is mastered and no active lesson
   remains.

Only one not-yet-mastered lesson is active. Older due items are folded into the
mastery quiz rather than exposed as a separate practice route.

## Introduction session

An introduction freezes its card and diagnostic-question order so resume does
not reshuffle the session.

1. Play the lesson's same-origin MP4 with native controls and `playsInline`.
2. Require one completed playback before first-time cards. If the file fails,
   explain the problem and expose an intentional **Continue without video**
   action; a missing asset must not permanently block learning.
3. Show each cue card with Thai, optional Romanization and Thai-script display,
   natural meaning, usage/context, phrase audio, and optional literal or cultural
   note.
4. Run the short diagnostic quiz.
5. Mark the lesson `awaiting-mastery`, schedule every introduced item for the
   next local day, record the attempt, and update the streak.

The diagnostic is for introduction, not mastery. A score of 100% still cannot
unlock the next lesson on day one.

## Delayed mastery session

A mastery session is allowed only on or after `nextEligibleMasteryDate`. It
begins with retrieval-oriented card prompts and freezes a queue containing:

- exactly ten scored questions for the active lesson; and
- zero to three questions for older due items, interleaved deterministically.

The active questions cover the lesson's cue cards and a mix of listening,
situation/response, meaning recognition, and phrase recall. Older questions are
tagged with their source item and excluded from the active score denominator.

Do not reveal correctness question by question. Grade and disclose the complete
mastery attempt only after submission, so one variant cannot teach a later
scored variant in the same queue.

The gate is exact:

```text
active accuracy = correct active questions / 10
pass = active accuracy >= 0.90
```

- **9/10 or 10/10:** mark the lesson mastered, update item schedules, record the
  attempt and streak, and make the next lesson available immediately.
- **0-8/10:** keep the lesson awaiting mastery, show corrections and missed cue
  cards, and set the next eligible mastery date to tomorrow. There is no same-day
  retry.

The learner may begin the newly unlocked lesson's introduction on the pass day.
That completion does not increment the streak twice.

## Spaced review

Review state belongs to knowledge items, not whole lessons. A mastered lesson is
never relocked because an older item was missed.

For a correct delayed recall, advance through approximate intervals of 2, 5, 12,
and 30 days. After that, continue adapting outward from the item's successful
history. For an incorrect older-item answer, record a lapse and make the item due
the next local day.

When more than three older items are due, choose deterministically by overdue
date, weakness/lapses, then stable item ID. Avoid two near-identical variants of
the same item in one queue. Only questions actually attempted update review
state.

## Streaks and Library replay

Completing either an introduction or mastery session is qualifying study.
Multiple qualifying completions on one local day count once. Consecutive local
day keys increment the streak; a forward gap resets it to one. Calendar-date
arithmetic avoids DST-length days, and travel never rewrites historical day keys.

Library replay is deliberately read-only. It can show the active lesson and all
mastered lessons, including video and cards, but it does not record attempts,
schedule reviews, change mastery, or update the streak. Future lessons remain
locked and their videos cannot be previewed.

## Persistence and resume

IndexedDB schema v3 is authoritative for learner data. Save after meaningful
stage navigation and each submitted answer so a refresh resumes the same stage,
position, fixed queue, and prior answers.

Imports must pass the v3 runtime schema before replacing local data. Reject older
exports with a clear version-incompatibility message. On first v3 launch, discard
v2 learner data and show the one-time redesign notice; do not attempt to translate
XP, hearts, paths, checkpoints, or old completion records.

## Required test boundaries

- A perfect day-one diagnostic does not master or unlock.
- Mastery is unavailable before tomorrow across DST changes and missed days.
- 9/10 active questions passes; 8/10 fails and blocks retry until tomorrow.
- Older questions do not change the active 10-question percentage.
- Older successes and lapses schedule correctly without relocking lessons.
- Review selection and answer order are deterministic for a frozen session.
- Introduction and mastery resume at every stage after reload.
- A qualifying completion updates the streak at most once per local day.
- Library replay has no durable learning side effects.
- v2 data resets once; v3 round-trips; incompatible imports are rejected.
