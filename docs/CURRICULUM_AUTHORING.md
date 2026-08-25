# Reviewed lesson package workflow

Each lesson begins in the gitignored `content-inbox/<lesson-id>/` directory:

```text
content-inbox/<lesson-id>/
├── source.mp4
├── captions.vtt
├── lesson.json
└── audio/
    ├── <cue-card-id>.m4a
    └── ...
```

Acquire `source.mp4` only through an authorized manual transfer or the visible
Instagram Download action when the creator enables it. Keep the original in
the inbox; the importer writes normalized distributable assets elsewhere.

## `lesson.json`

The file contains one `VideoLesson` and its `CueCard` records:

```json
{
  "lesson": {
    "id": "stable-kebab-case-id",
    "order": 4,
    "title": "A short descriptive title",
    "objective": "What the learner can understand or say",
    "description": "One-sentence exchange context",
    "contentStatus": "verified",
    "source": {
      "label": "Learn Thai IRL · Instagram Reel",
      "url": "https://www.instagram.com/learnthai_irl/reel/.../",
      "permissionStatus": "authorized"
    },
    "media": {
      "videoSrc": "/lessons/stable-kebab-case-id/intro.mp4",
      "posterSrc": "/lessons/stable-kebab-case-id/poster.jpg",
      "captionsSrc": "/lessons/stable-kebab-case-id/captions.vtt",
      "durationSeconds": 30,
      "availability": "available",
      "fallbackMessage": "The local video could not be played."
    },
    "transcript": [],
    "cueCardIds": [],
    "quizBank": []
  },
  "cueCards": []
}
```

Use the Zod contracts in `src/domain/schemas.ts` as the complete field-level
reference. IDs are durable persistence keys and must never be repurposed after
release.

## Editorial requirements

A verified package must include:

- an authorized same-origin MP4, a poster, WebVTT captions, and confirmed
  duration;
- a timestamped transcript whose lines are marked verified;
- 5–10 verified cue cards with Thai, tone-aware romanization, natural meaning,
  usage/context, transcript references, and phrase audio when available;
- at least ten scored deterministic questions, with every cue card represented;
- listening, situation/response, meaning recognition, and phrase construction
  across the bank;
- local audio for every verified listening question;
- explanations that correct the distinction without turning the results into a
  score game.

Self-guided speaking is permitted only with `scored: false`. Speech recognition
is intentionally unsupported. Matching and construction must contain one
unambiguous deterministic solution.

## Daily publication checklist

1. Record source, permission, publication date, and proposed order.
2. Save the authorized MP4 into the inbox.
3. Transcribe and time the actual speech; do not infer missing dialogue.
4. Select the smallest useful set of cue cards.
5. Review Thai spelling, tones, romanization, register, particles, and cultural
   notes with a qualified reviewer.
6. Record or cut authorized phrase audio and author question variants.
7. Run the importer without `--apply`, correct every reported issue, then apply.
8. Run `npm run check` and preview desktop and mobile layouts.
9. Commit the registry and normalized public assets only when permission covers
   the intended hosting visibility.

Future automation should stop at creating an intake reminder or draft package.
It must not scrape Reels, download changing CDN URLs, or publish automatic
transcription as verified curriculum.
