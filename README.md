# Thai Study

Thai Study is an offline-first, static PWA for learning conversational Thai
from short, authorized video lessons. Its learning loop is intentionally quiet:

> watch → notice → make a first pass → retrieve tomorrow → return later

There are no points, hearts, achievements, checkpoint statistics, or course
path. The interface presents one relevant action at a time.

## Current curriculum state

The repository contains 23 locally bundled Reel plans in an editorially useful
order. Every draft has a same-origin MP4, poster, confirmed duration, and
screenshot-derived cue cards.

All 23 remain explicitly `draft`. Draft previews play the short clip and then
step through the visible Thai, romanization, and English captured from the
lesson screenshots. An Instagram URL is attribution, not evidence that the
language has been independently verified.

The reviewed registry is currently empty, so there are zero active study
lessons. Today shows an editorial hold and Library exposes the ordered local
draft previews. This is intentional: the app does not invent Thai, synthesize
substitute phrase audio, or publish unreviewed language merely to make the
study loop appear populated.

The draft inventory lives in `src/content/draft-reels.json` and its cards in
`src/content/draft-cue-cards.json`; reviewed lessons and cue cards live in
`src/content/lesson-packages.json`. A reviewed lesson with the same stable ID
replaces its draft plan after it passes the publication gate.

Draft cue cards can additionally use locally generated excerpts of the original
instructor audio. This remains an authoring step: FFmpeg and a local Whisper
model generate normal `.m4a` assets, while the shipped application only plays
the result. See [curriculum authoring](docs/CURRICULUM_AUTHORING.md#generate-instructor-pronunciation-locally).

## Publication gate

A release-ready `VideoLesson` must have all of the following:

- an authorized same-origin local MP4 and poster with confirmed duration;
- 1–10 verified cue cards with usage text and bundled local phrase audio;
- at least two valid scored question variants for every cue-card item and at
  least four valid scored questions overall;
- scored coverage of listening, situation/response, meaning recognition, and
  phrase recall through phrase construction;
- explicit bundled local audio for every listening question.

Validation also rejects missing assets, invalid or orphaned references,
duplicate lesson/order/cue-card/question IDs, duplicate cue-card entries,
unreachable or ambiguous answers, insufficient cue-card coverage, and questions
that depend on unavailable media or unverified language. See
[the curriculum authoring guide](docs/CURRICULUM_AUTHORING.md) for the package
contract and review workflow.

## Learning behavior

Once a lesson passes that gate:

- A first introduction requires completed local video playback, or an explicit
  media-error bypass, before 1–10 cue cards and one immediate-feedback
  diagnostic question per phrase.
- The diagnostic never grants mastery. A mastery check first becomes available
  on the next local calendar day.
- A mastery session begins with meaning/context retrieval cards and ends with
  an adaptive 4–10 question check. Every phrase must be recalled and no more
  than one answer may be missed.
- Up to three due questions from older mastered lessons may be interleaved.
  They do not affect the adaptive mastery gate or relock a lesson.
- Review intervals follow roughly 2, 5, 12, and 30 days, then adapt. A missed
  review returns tomorrow.
- Video, cue-card, retrieval, and quiz progress is durable. The exact question
  queue, shuffled choices, current position, and answers are stored locally.
- Replays are disposable and never change progress, review schedules,
  consistency, or attempts.

Local calendar helpers avoid elapsed-hour calculations, so eligibility and
consistency remain stable across daylight-saving transitions and missed days.

## Stack, persistence, and offline behavior

- Next.js 16 and React 19, statically exported through Vinext/Vite
- Zustand for live client state
- Dexie/IndexedDB for durable schema-v3 data
- Zod for curriculum, persistence, import, and export contracts
- Framer Motion, Howler, and Lucide
- A prefix-scoped, versioned service worker for the application shell and safe
  complete assets

Schema v3 is intentionally incompatible with earlier prototypes. The first v3
launch clears old progress **and settings** instead of attempting a migration,
then shows one concise redesign notice. Export emits only a v3 snapshot. Import
rejects malformed, v1, or v2 files with a plain-language message and changes
nothing.

Valid v3 imports and resumed records are reconciled against the bundled
curriculum version. Progress, reviews, attempts, and completed sessions that
still point to published curriculum are retained. An active session is kept
only when its lesson, cards, question IDs, exact queue, shuffle permutations,
answers, and stage remain valid; otherwise that active session is discarded
without destroying the rest of the valid record.

Service-worker caches use the v3 product namespace, deployment scope, and a
content-derived build revision. Activation removes older owned caches. The
hashed application shell is precached, while MP4 and byte-range responses stay
network-only so a partial video response can never be mistaken for a complete
offline asset. Video failure has an explicit retry/fallback path.

## Author a reviewed lesson

Acquire media only through an authorized manual transfer or a creator-enabled
download. The application and lesson importer do not fetch Instagram media.

1. Put the reviewed package in `content-inbox/<lesson-id>/` using the structure
   in [docs/CURRICULUM_AUTHORING.md](docs/CURRICULUM_AUTHORING.md).
2. Validate without changing the repository:

   ```bash
   npm run lesson:import -- content-inbox/<lesson-id>
   ```

3. Correct every reported editorial, reference, answer, or media issue.
4. Normalize and install the accepted package:

   ```bash
   npm run lesson:import -- content-inbox/<lesson-id> --apply
   ```

The importer requires `ffmpeg` and `ffprobe`. It emits H.264/AAC fast-start
video, a JPEG poster, and local audio under
`public/lessons/<lesson-id>/`, then updates the ordered reviewed registry.

## Run and build

Node.js 22+ is recommended. `ffmpeg` and `ffprobe` are additionally required
for reviewed lesson imports.

```bash
npm install
npm run dev
```

Run the release checks without automated tests:

```bash
npm run check:release
```

`check:release` validates curriculum and assets, type-checks, lints, and builds
the static site. The broader `npm run check` command additionally runs Vitest.
The production artifact is written to `dist/client/`.

To reproduce a GitHub Pages project-site build below `/Noklingo`:

```bash
NEXT_PUBLIC_BASE_PATH=/Noklingo npm run build
```

Use the actual repository name in place of `Noklingo`. The finalizer validates
that emitted routes, manifest URLs, icons, service-worker precache entries, and
other internal references remain inside that prefix. The Pages workflow sets
the prefix automatically.

Before release, manually exercise the vertical slice at desktop and narrow
mobile breakpoints, including iPhone Safari/PWA behavior, light and dark modes,
reduced motion, media-failure recovery, offline shell navigation, and
horizontal-overflow checks.

## GitHub Pages and media visibility

Access control is not implemented. A normal GitHub Pages project and every
bundled MP4 are public even when the source repository is private. Do not deploy
media whose permission is limited to local use. A client-side password prompt
would not protect static assets; restricted media needs authenticated hosting.
