# Noklingo

Noklingo is an offline-first, single-learner web app for practical spoken Thai.
It uses short, game-like lessons built around listening, useful conversation,
retrieval practice, immediate feedback, mistake recovery, and spaced review.

The learner sees consistent Romanization and natural English meaning. Thai script
is preserved underneath for linguistic and audio accuracy, but reading or typing
Thai is never required to complete an exercise.

## What the engine supports

- Data-driven courses, units, lessons, dialogues, vocabulary, phrases, speakers,
  audio, checkpoints, and review plans
- Eleven reusable exercise families covering listening, recognition, recall,
  phrase building, conversation, dialogue comprehension, speaking, mistake
  correction, and personalized practice
- Immediate corrective feedback with canonical answers, short explanations,
  pronunciation help, and audio replay
- First-attempt accuracy, retry-aware XP, hint handling, five-heart recovery,
  resumable sessions, milestones, and an 80% checkpoint threshold
- Explicit prerequisites and deterministic lesson generation
- A deterministic SM-2-inspired review scheduler that mixes recent mistakes,
  weak concepts, older due material, listening, recall, and conversation
- Local-calendar daily XP and streak behavior that remains sensible across DST
  changes and travel
- Multiple speakers, normal/slow human recordings, browser TTS placeholders,
  targeted preload, caching, and accessible missing-audio fallback
- Fully local version 2 persistence through Zustand and Dexie, with export,
  import, and reset but no account or cloud dependency

The scheduler is an original, documented approximation designed to create
familiar successful language-app behavior; it does not claim to reproduce a
proprietary algorithm.

## Development

Requires Node.js 22.13 or later.

```bash
npm install
npm run validate:course
npm run dev
```

Run the complete local gate before merging:

```bash
npm run validate:course
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

`validate:course` parses content with Zod and then checks cross-references,
prerequisites, answer reachability, audio files, Romanization, lesson composition,
and progression. It reports an author-facing content path for each error.

## Documentation

- [Learning engine](docs/LEARNING_ENGINE.md) describes lesson generation,
  grading, XP, hearts and recovery, progression, checkpoints, review scheduling,
  streak dates, and local persistence.
- [Course authoring](docs/COURSE_AUTHORING.md) explains how to add vocabulary,
  phrases, speakers, dialogues, exercises, lessons, units, audio, accepted answer
  variants, checkpoints, and review metadata.
- [Audio assets](public/audio/README.md) defines the recording and filename
  convention, multiple-speaker and slow-audio support, caching, fallbacks, and the
  workflow for replacing TTS with human voices.

## Architecture

- `app/` contains the Vinext application entry and global styling.
- `src/content/course.ts` contains the normalized demonstration course, separate
  from rendering and learner state.
- `src/domain/schemas.ts` defines Zod runtime schemas and the TypeScript domain
  contracts inferred from them.
- `src/domain/courseValidation.ts` performs semantic authoring validation such as
  duplicate-ID, broken-reference, audio, prerequisite, progression, answer, and
  lesson-variety checks.
- `src/engine/` contains pure grading, scoring, progression, lesson-generation,
  and review-scheduling logic. An explicit clock and seed keep it testable and
  deterministic.
- `src/features/lesson/` contains the exercise renderer registry and lesson
  player. The UI renders engine results instead of owning learning rules.
- `src/store/` uses Zustand to coordinate routes and the active session.
- `src/lib/db.ts` stores version 2 learner data and resumable sessions in
  IndexedDB through Dexie.
- `src/lib/audio.ts` resolves speaker assets, plays normal or slow audio through
  Howler, handles TTS placeholders, and preloads only the next likely clips.
- `public/sw.js` caches the application shell and successful same-origin assets
  for later offline use.

The browser flow is:

```text
normalized content
  -> Zod parsing
  -> semantic validation
  -> pure learning engine
  -> exercise registry and learner UI
  -> Zustand session coordination
  -> Dexie version 2 persistence
```

Noklingo uses Vinext because it provides the Vite-based runtime required by the
hosting surface. There is no backend, authentication, cloud sync, or paid audio
API. Learner data remains on the device and can be exported, imported, or reset
from Settings.

## Demonstration course

The polished sample slice covers a first welcome, food/restaurant Thai, and
casual conversation. It includes multiple speakers, a real checkpoint, generated
review, mistake-based variations, and every major exercise family. Content is
intentionally small: it demonstrates the reusable engine rather than pretending
to be a complete Thai curriculum.

Seed content may use `tts:` browser speech while original human audio is being
recorded. TTS availability varies and is not treated as a guaranteed offline
voice. Human files can replace placeholders through normalized audio records
without changing renderers or scoring.

## Deployment

GitHub Actions publishes the static site to GitHub Pages whenever `main` is
updated. Set **Settings → Pages → Build and deployment → Source** to
**Deploy from a branch**, then select the `gh-pages` branch and `/ (root)` after
the first deployment creates that branch.

Pull requests receive a canary at
`https://<owner>.github.io/Noklingo/pr-preview/pr-<number>/`; the workflow updates
that URL as a PR comment and removes the preview when the pull request closes.
