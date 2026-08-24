# Noklingo

Noklingo is a local-first web app for learning practical spoken Thai from short
videos. Version 3 replaces the old path-and-points course with one focused loop:

```text
video -> cue cards -> diagnostic quiz -> next-day mastery -> spaced review
```

The existing mascot, illustrations, playful styling, phrase audio, dark mode,
reduced-motion support, and local data ownership remain. XP, hearts, units,
checkpoints, prerequisite nodes, and a separate practice mode do not.

## How learning works

- **Today** presents one clear state: a new lesson, a mastery check that is due,
  a wait-until-tomorrow message, or curriculum completion.
- A new lesson starts with its local video, continues through 5-10 cue cards,
  and ends with a short diagnostic quiz.
- The diagnostic introduces and schedules the material. Even a perfect score
  cannot master the lesson on the same day.
- Starting on the next local calendar day, the learner reviews the cards and
  takes a fresh quiz with ten active-lesson questions. At least 9/10 must be
  correct to master the lesson.
- Up to three due questions from older lessons may be interleaved. They update
  those items' review schedules but never affect the active lesson's 90% score.
- A failed mastery check shows corrections and becomes eligible again tomorrow.
  A pass unlocks the next lesson immediately.
- Successful delayed recalls expand through approximately 2, 5, 12, and 30 day
  intervals. A lapse returns the item tomorrow.
- Completing an introduction or mastery session counts once toward the daily
  streak. Library replay does not change progress, review dates, or streaks.

Thai script is retained for accuracy, while Romanization and natural English
meaning keep the course approachable for beginners. Reading or typing Thai is
not a prerequisite.

## Development

Requires Node.js 22.13 or later.

```bash
npm install
npm run validate:curriculum
npm run dev
```

Run the local quality gate before merging:

```bash
npm run validate:curriculum
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

The content validator checks the curriculum shape and semantic requirements,
including IDs, media references, transcript links, cue-card count, quiz coverage,
and reachable answers.

## Lesson media

Each authored lesson uses same-origin files in this layout:

```text
public/lessons/<lesson-id>/
  intro.mp4
  poster.jpg
  captions.vtt
```

Use an H.264/AAC MP4 for Safari and installed-PWA compatibility. Captions must be
WebVTT, and their text and timestamps must agree with the verified transcript in
curriculum data. Do not infer, invent, scrape, or automatically download source
dialogue. A lesson is release-ready only after its supplied video and transcript
have been verified by a human reviewer.

Content stores public paths such as `/lessons/greetings/intro.mp4`. The
`publicAssetPath` helper applies `NEXT_PUBLIC_ASSET_PREFIX` at runtime, so never
hard-code `/Noklingo` or a deployment hostname into curriculum data.

The service worker caches the shell and requested small same-origin assets. It
does not bulk-cache lesson MP4s, and video range requests go directly to the host
so partial responses cannot be mistaken for complete files.

## Local data

Version 3 stores settings, streak state, lesson progress, item review state,
attempt history, and a resumable study session in IndexedDB. There is no account,
backend, or cloud sync. Settings supports v3 export, import, and reset.

Version 2 progress is intentionally not migrated: the learning model is
incompatible. First launch resets old data and explains the redesign, and v2
exports are rejected rather than partially imported.

## Documentation

- [Learning engine](docs/LEARNING_ENGINE.md)
- [Lesson authoring](docs/COURSE_AUTHORING.md)
- [Curriculum overview](docs/COURSE_OVERVIEW.md)
- [Thai content and verification](docs/THAI_CONTENT_STYLE.md)
- [Audio recording workflow](docs/AUDIO_RECORDING_WORKFLOW.md)
- [Audio asset convention](public/audio/README.md)

## Deployment

GitHub Actions publishes the static build to GitHub Pages. Configure Pages to
deploy the `gh-pages` branch at `/ (root)` after the first deployment creates it.
Pull requests receive a temporary preview below the repository's Pages path.

Noklingo uses Vinext for its Vite-based static runtime. Production remains a
client-only application with no authentication or paid media API.
