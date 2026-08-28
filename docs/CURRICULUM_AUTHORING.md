# Curriculum authoring

Draft Reels live in `src/content/draft-reels.json`; their screenshot-derived
cue cards live in `src/content/draft-cue-cards.json`. A draft preview is always
unscored: watch the local clip, then step through its cue cards.

Create non-overwriting review packages for every draft with:

```
npm run lesson:scaffold-all -- content-inbox --apply
```

Each package includes the agreed cards, final asset paths, source MP4, a review
checklist, and an audio timestamp template. It remains draft until a reviewer
fills the missing editorial fields and explicitly verifies it.

Cue cards copy the visible on-screen Thai, romanization, and English. Keep the
original display wording, do not infer unseen text, and mark every draft card
with `"verificationStatus": "draft"`. Every lesson also requires a nonblank
`"topicEmoji"`, and every cue card requires a nonblank `"emoji"`. Choose a
clear pictorial summary of the topic or phrase and preserve these values when a
draft is copied into a review package.

## Publishing a lesson

Move the lesson and its cards into `src/content/lesson-packages.json` only after
qualified review. A verified package needs:

- an authorized source record;
- a confirmed local MP4 and poster;
- reviewed topic and cue-card emoji metadata;
- 1–10 verified cue cards with usage text and bundled Thai and English audio;
- at least two valid, verified scored variants per card and at least four
  questions per lesson, including the required interaction types.

The day-one diagnostic uses one question per card. The delayed mastery queue
uses `min(10, max(4, cue cards × 2))` questions. Publication therefore requires
at least `max(4, cue cards × 2)` reviewed questions in the bank even when only
ten are drawn for a larger lesson. Every card needs both a receptive variant
(listening or meaning recognition) and a contextual/productive variant
(situation response or phrase construction).

Import a reviewed package with:

```
npm run lesson:import -- content-inbox/<lesson-id>
npm run lesson:import -- content-inbox/<lesson-id> --apply
```

The package input contains `lesson.json`, `source.mp4`, and exactly one audio
source: either an `audio/` directory or `audio-clips.json`. The clip manifest
groups both source ranges by cue-card ID:

```json
{
  "clips": [{
    "cueCardId": "phrase-name",
    "thai": { "output": "phrase-name-th.m4a", "startSeconds": 1.2, "endSeconds": 2.1 },
    "english": { "output": "phrase-name-en.m4a", "startSeconds": 2.5, "endSeconds": 3.2 }
  }]
}
```

It must exactly cover the Thai and English paths declared by the cards and the
Thai paths reused by quiz questions. The importer creates `intro.mp4` and
`poster.jpg`, extracts every language range in one FFmpeg pass, validates media
and curriculum rules, then updates the reviewed registry.

To validate or install every reviewed package below one intake directory in a
single release batch:

```
npm run lesson:import-all -- content-inbox
npm run lesson:import-all -- content-inbox --apply
```

## Generate instructor pronunciation locally

Pronunciation audio is derived from the local lesson MP4, never synthesized in
the browser. The generator transcribes mixed Thai and English locally, matches
each cue card's Thai text and English meaning independently, aligns the pair in
cue-card order regardless of which language the source says first, and extracts
separate `-th.m4a` and `-en.m4a` files in one FFmpeg pass. It is deliberately
conservative: ambiguous or low-confidence matches remain ungenerated instead
of guessing.

Install FFmpeg and create the local Python environment once:

```bash
# macOS with Homebrew
brew install ffmpeg
npm run pronunciation:setup
```

The first generation download fetches the open `large-v3` Whisper model into
`tools/pronunciation-generator/.cache/`; no paid transcription API is used.

Generate one existing draft, inspect its diagnostics, or generate all drafts:

```bash
npm run pronunciation:generate -- common-verbs
npm run pronunciation:generate -- --all
npm run pronunciation:generate -- waking-up --dry-run --verbose
```

Use `--force` after changing a video or model; ordinary cue-card edits reuse the
MP4-hash transcript cache. Draft clips are written below
`public/lessons/drafts/<lesson-id>/audio/`, with matching/debug data in the
draft's `pronunciation-manifest.json` and the app's generated pronunciation
index. The app only enables each language asset for a `matched` or `overridden`
result. Thai-only drafts remain playable; verified lessons require both assets.

Tune padding, duration, and conservative matching thresholds in
`tools/pronunciation-generator/config.json`.

For a reviewed intake package, generate directly from the package after
scaffolding it:

```bash
npm run pronunciation:generate -- --package content-inbox/<lesson-id>
```

This writes `audio-clips.json` and `pronunciation-manifest.json` in the package.
The existing `lesson:import --apply` command then extracts and installs the
final `audio/` assets from `source.mp4`. It will still reject the package until
every card has both language assets, listening questions reuse their card's
Thai asset, and all editorial/publication requirements are met.

When a repeated phrase cannot be selected safely, retain the diagnosis and add a
reviewed manual override to that cue card:

```json
"pronunciationOverrides": {
  "thai": {
    "startSeconds": 12.4,
    "endSeconds": 13.5,
    "matchText": "ร้อน"
  },
  "english": {
    "startSeconds": 13.8,
    "endSeconds": 14.4,
    "matchText": "hot"
  }
}
```

To audit or apply the one-time repository migration, use
`npm run pronunciation:migrate -- --apply`. It writes
`dual-audio-migration-report.json`, verifies every generated asset, and removes
legacy combined clips only after a Thai replacement exists.

The original MP4 and cue-card definition remain the source of truth. The audio,
cache, and manifests can be regenerated. If a phrase is not clearly visible in
a screenshot, leave it out until a reviewer can confirm it from the clip.
