# Thai Study

Thai Study is a private-use, offline-first notebook for learning conversational
Thai from short, authorized video lessons. Its learning loop is intentionally
quiet:

> watch → notice → make a first pass → retrieve tomorrow → return later

There are no points, hearts, achievements, checkpoint statistics, or course
path. The interface presents one relevant action at a time.

## Learning behavior

- A first introduction requires a completed local video playback, or an
  explicit media-error bypass, before 5–10 cue cards and a short diagnostic.
- The diagnostic never grants mastery. A mastery check first becomes available
  on the next local calendar day.
- A mastery session begins with meaning/context retrieval cards and ends with
  ten active-lesson questions. Nine correct answers are required.
- Up to three due questions from older mastered lessons may be interleaved.
  They never affect the ten-question gate or relock a lesson.
- Review intervals follow roughly 2, 5, 12, and 30 days, then adapt. A missed
  review returns tomorrow.
- Video, cue-card, retrieval, and quiz progress is durable. The fixed question
  queue, shuffled choices, current position, and answers are stored in
  IndexedDB.
- Replays are disposable and never change progress, review schedules,
  consistency, or attempts.

Local calendar helpers avoid elapsed-hour calculations, so eligibility and
consistency remain stable across daylight-saving transitions and missed days.

## Stack and local data

- Next.js 16 and React 19, statically exported through Vinext/Vite
- Zustand for live client state
- Dexie/IndexedDB for durable version-2 data
- Zod for curriculum, persistence, import, and export contracts
- Framer Motion, Howler, and Lucide
- A scoped service worker for the shell and safe complete assets

The version-2 IndexedDB schema replaces the incompatible foundation prototype
record and shows one concise notice when that reset occurs. Export and import
accept only the current schema. A stale imported session is discarded without
destroying otherwise valid progress.

## First video and authorized media

The first lesson keeps this authoring/source note:

<https://www.instagram.com/learnthai_irl/reel/Db-0OFPSuuJ/>

The repository does not scrape Instagram, embed the Reel at runtime, or claim a
guessed transcript is verified. To save an authorized copy locally:

1. Use Instagram's visible **Download** action if the creator enabled it, or ask
   the creator for the original MP4. This is the acquisition step; the app has
   no downloader.
2. Put the untouched file at
   `content-inbox/<lesson-id>/source.mp4`. The entire inbox is gitignored.
3. Add `lesson.json`, `captions.vtt`, and an optional `audio/` directory using
   the reviewed-package contract in
   [docs/CURRICULUM_AUTHORING.md](docs/CURRICULUM_AUTHORING.md).
4. Validate without changing the repository:

   ```bash
   npm run lesson:import -- content-inbox/<lesson-id>
   ```

5. After review, normalize and install the package:

   ```bash
   npm run lesson:import -- content-inbox/<lesson-id> --apply
   ```

The importer requires `ffmpeg`. It writes an H.264/AAC fast-start MP4, poster,
captions, and phrase audio below `public/lessons/<lesson-id>/`, then updates the
ordered JSON curriculum registry. Until that completes, lesson one remains
visibly marked as draft and its explicit “Continue without video” route keeps
the engine testable without pretending media exists.

## Add future daily lessons

Use the same reviewed-package pipeline for every new Reel:

1. Record the source URL and permission scope.
2. Acquire the authorized original or creator-enabled download manually.
3. Produce a timestamped transcript and WebVTT captions.
4. Have the Thai, romanization, natural meaning, and cultural notes reviewed.
5. Author 5–10 cue cards and at least ten deterministic scored questions with
   complete cue-card coverage.
6. Bundle phrase/listening audio, validate, preview locally, and commit the
   generated lesson assets and registry update.

This deliberately automates normalization and validation, not acquisition or
language judgment. It remains dependable if Instagram changes its page markup,
and it prevents a daily post from becoming curriculum before review.

## Run and verify

Node.js 22+ and `ffmpeg` are recommended.

```bash
npm install
npm run dev
```

Run the full release gate:

```bash
npm run check
```

This runs curriculum validation, TypeScript, ESLint, Vitest, and the static
production build. The site is emitted to `dist/client/`.

## GitHub Pages and privacy

The workflow deploys below `/<repository-name>` and passes public assets through
the shared prefix helper. Video files are same-origin and never eagerly
requested for locked lessons. MP4 and byte-range responses remain outside the
service-worker cache; playback failure always has a deliberate study fallback.

Access control is not implemented in this release. Ordinary personal GitHub
Pages sites and their bundled MP4 files are public, even when the source
repository is private. Do not deploy media whose permission is limited to local
use until a real authenticated hosting boundary is selected. A client-side
password prompt would not protect static files.
