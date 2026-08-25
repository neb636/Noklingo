# Reviewed lesson package workflow

Draft media intake and verified curriculum are deliberately separate.

- `src/content/draft-reels.json` contains local preview plans. Draft lessons are
  never eligible for study, mastery, or spaced review.
- `src/content/lesson-packages.json` is the reviewed registry. Only a lesson
  that passes the complete publication gate becomes active.
- `src/domain/schemas.ts` is the field-level contract.
- `src/domain/curriculum-validation.ts` is the authoritative cross-record and
  media-integrity gate.

Machine transcription can help a reviewer locate speech. It cannot establish
Thai spelling, romanization, meaning, speaker identity, dialogue completeness,
or timing accuracy. Keep it in `draftTranscript` and keep machine WebVTT marked
`machine-draft` until a qualified reviewer checks it against the media.

## Intake package

Create a gitignored `content-inbox/<lesson-id>/` directory:

```text
content-inbox/<lesson-id>/
├── source.mp4
├── captions.vtt
├── lesson.json
└── audio/
    ├── <cue-card-id>.m4a
    ├── <listening-question-id>.m4a
    └── ...
```

Acquire `source.mp4` only through an authorized manual transfer or the visible
Instagram Download action when the creator enables it. Keep the source in the
inbox. The importer normalizes distributable assets into `public/lessons/`; it
does not download or scrape source media.

The `audio/` directory is required. Every cue card needs phrase audio, and every
listening question must explicitly reference bundled local audio. One recording
may be reused by multiple declared paths only when the package actually
contains the referenced assets and the content is appropriate for each prompt.

## `lesson.json`

The file contains one `VideoLesson` plus its `CueCard` records. This abridged
example illustrates the relationships; it is not release-ready until it has
5–10 cards and the complete quiz coverage described below.

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
      "label": "Creator · authorized local source",
      "url": "https://www.instagram.com/example/reel/shortcode/",
      "permissionStatus": "authorized"
    },
    "media": {
      "videoSrc": "/lessons/stable-kebab-case-id/intro.mp4",
      "posterSrc": "/lessons/stable-kebab-case-id/poster.jpg",
      "captionsSrc": "/lessons/stable-kebab-case-id/captions.vtt",
      "durationSeconds": 30.125,
      "durationStatus": "confirmed",
      "captionsStatus": "reviewed",
      "availability": "available",
      "fallbackMessage": "The local lesson video could not be played."
    },
    "transcript": [
      {
        "id": "stable-kebab-case-id-line-1",
        "startSeconds": 1.2,
        "endSeconds": 3.8,
        "speaker": "A",
        "thai": "…",
        "romanization": "…",
        "naturalEnglish": "…",
        "verificationStatus": "verified"
      }
    ],
    "cueCardIds": ["stable-kebab-case-id-item-1"],
    "quizBank": [
      {
        "id": "stable-kebab-case-id-listen-1",
        "itemId": "stable-kebab-case-id-item-1",
        "interactionType": "listening",
        "prompt": "What did you hear?",
        "choices": ["…", "…"],
        "correctIndex": 0,
        "audioSrc": "/lessons/stable-kebab-case-id/audio/stable-kebab-case-id-listen-1.m4a",
        "explanation": "A concise reviewed correction.",
        "scored": true,
        "verificationStatus": "verified"
      }
    ]
  },
  "cueCards": [
    {
      "id": "stable-kebab-case-id-item-1",
      "lessonId": "stable-kebab-case-id",
      "thai": "…",
      "romanization": "…",
      "naturalMeaning": "…",
      "usage": "…",
      "transcriptReferences": ["stable-kebab-case-id-line-1"],
      "phraseAudioSrc": "/lessons/stable-kebab-case-id/audio/stable-kebab-case-id-item-1.m4a",
      "verificationStatus": "verified"
    }
  ]
}
```

All public asset values are same-origin paths beginning with `/`. Do not put an
Instagram/CDN URL in a media or audio field. Stable lesson, transcript, card,
and question IDs become persistence keys and must not be repurposed after
publication.

## Hard publication gate

A verified lesson is rejected unless every requirement below passes.

### Source and video

- `contentStatus` is `verified` and the source permission is `authorized`.
- The media availability is `available`.
- `videoSrc` is a bundled local `.mp4`; `posterSrc` is a bundled local image;
  and `captionsSrc` is a bundled local `.vtt` beginning with `WEBVTT`.
- `durationStatus` is `confirmed`, and the declared duration matches the media
  probe. Transcript and caption times do not exceed it.
- `captionsStatus` is `reviewed`. `machine-draft` and `unavailable` cannot ship
  as verified curriculum.

### Reviewed dialogue and cue cards

- The timestamped transcript is nonempty, reflects the actual clip, and every
  line has `verificationStatus: "verified"`.
- Thai, tone-aware romanization, natural meaning, speaker attribution, register,
  particles, and cultural/context notes have been reviewed rather than inferred.
- The lesson has 5–10 cue cards. Every listed card exists, belongs to this
  lesson, is verified, and references one or more real transcript-line IDs.
- Every cue card declares bundled local phrase audio (`.m4a`, `.mp3`, `.wav`,
  or `.ogg`) and that file exists.

### Scored practice

- The quiz bank has at least ten valid scored questions.
- Every cue-card item has at least two valid scored variants. With the minimum
  five cue cards, this is also what makes ten the absolute question minimum.
- The scored bank spans all four required skills: `listening`,
  `situation-response`, `meaning-recognition`, and phrase recall through
  `phrase-construction`.
- Every scored question and all language it depends on are verified.
- Every listening question declares its own bundled local `audioSrc`. Browser
  speech synthesis, video-only audio, and a missing file do not satisfy this.
- Choice questions have unique choices and a reachable `correctIndex`.
  Construction answers can be formed from the supplied tokens, and matching
  pairs are unambiguous.
- `self-guided-speaking` may be included only with `scored: false`; speech
  recognition is not part of the scoring contract.

### Identity and reachability

Validation rejects duplicate lesson IDs, lesson orders, cue-card IDs, question
IDs, transcript-line IDs, and duplicate cue-card entries. It also rejects
orphan cards, cross-lesson card ownership, invalid transcript references,
questions for unreachable cards, missing declared assets, and invalid WebVTT.

At runtime, resumed or imported sessions receive a similarly strict check:
queue IDs and lesson/question pairs must be unique, answers must follow queue
order and recompute correctly, shuffle arrays must be real permutations, and
the mode, stage, counts, source ownership, and exact bundled IDs must still be
valid. Invalid active sessions are discarded rather than repaired into a
different quiz.

## Validate and install

The importer requires `ffmpeg` and `ffprobe`. Start with a dry run, which reads
and probes the package without changing the repository:

```bash
npm run lesson:import -- content-inbox/<lesson-id>
```

After every issue is corrected, apply the package:

```bash
npm run lesson:import -- content-inbox/<lesson-id> --apply
```

The apply step:

1. normalizes the source to H.264 video, AAC audio, and fast-start MP4;
2. creates the lesson poster;
3. copies the reviewed WebVTT and declared audio;
4. probes the generated media and confirms every declared local asset;
5. validates the resulting combined reviewed registry; and
6. updates `src/content/lesson-packages.json` only after those checks pass.

A package with the same stable ID supersedes the corresponding draft plan in
the application. Keep its order intentional and unique.

## Editorial checklist

1. Record the source URL, creator, permission scope, publication date, and
   proposed curriculum order.
2. Save the authorized original as `source.mp4`; confirm it includes both H.264
   video and AAC audio.
3. Transcribe and timestamp only audible speech. Do not reconstruct omitted
   dialogue or infer a phrase from the post topic.
4. Review captions and every transcript field against the clip with a qualified
   Thai-language reviewer.
5. Select 5–10 useful cue-card items, add valid transcript references, and
   record or cut authorized phrase audio.
6. Author two or more scored variants per item, at least ten overall, spanning
   all four required question types. Bundle explicit listening audio.
7. Dry-run the importer, fix every issue, apply, then run
   `npm run check:release`.
8. Manually preview the vertical slice on desktop and iPhone Safari/PWA-sized
   layouts. Check captions, dark mode, reduced motion, media failure, offline
   shell behavior, keyboard focus, and horizontal overflow.
9. Build below the intended static prefix and inspect the emitted artifact:

   ```bash
   NEXT_PUBLIC_BASE_PATH=/Noklingo npm run build
   ```

10. Publish only when the permission scope covers the visibility of the target
    host. GitHub Pages serves bundled media publicly.

Future automation may create intake reminders, media probes, or draft notes. It
must not scrape Reels, silently promote machine transcription, or treat source
attribution as verification.
