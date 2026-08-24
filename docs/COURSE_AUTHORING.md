# Video lesson authoring guide

Noklingo curriculum is validated data, not page-specific UI. A lesson may ship
only when its supplied video, transcript, cue cards, and scored answers have been
verified together. Never guess dialogue from an unclear recording.

The runtime schemas are the source of truth for exact field names. This guide
defines the authoring and release contract.

## Lesson package

Use a durable lowercase-kebab-case lesson ID and this asset layout:

```text
public/lessons/<lesson-id>/
  intro.mp4
  poster.jpg
  captions.vtt
```

- Encode `intro.mp4` as H.264 video with AAC audio for Safari and PWA support.
- Use an accurately framed poster; do not rely on a remote thumbnail.
- Provide WebVTT captions with timestamps matching the video.
- Keep the structured `TranscriptLine` records in curriculum data. Each line
  includes its time range, speaker, Thai, Romanization, natural English, and any
  necessary literal/context note.
- Store public references as `/lessons/<lesson-id>/intro.mp4`, and likewise for
  poster and captions. Runtime code resolves them through `publicAssetPath` and
  `NEXT_PUBLIC_ASSET_PREFIX`. Do not add a hostname or `/Noklingo` prefix.

Every cue card references a usable phrase-audio asset. A browser speech fallback
may stand in while a human recording is being prepared, but scored listening
questions in a verified lesson require bundled same-origin audio. Follow
[the audio convention](../public/audio/README.md).

## Required lesson data

Each ordered `VideoLesson` provides:

- a stable ID, order, title, and learner-facing objective;
- `LessonMedia` references for MP4, poster, WebVTT captions, and duration;
- a timestamped verified transcript;
- references to 5-10 `KnowledgeItem` cue cards; and
- a quiz bank with at least ten usable active-lesson questions.

A release-ready lesson sets `media.availability` to `bundled`,
`transcriptStatus` to `verified`, and every transcript line's `sourceStatus` to
`verified`. Expected-local media and draft-placeholder lines are authoring
scaffolds, not permission to present unverified dialogue as finished course
material.

Each cue card provides Thai, Romanization, natural meaning, usage/context, source
transcript-line references, phrase audio, and optional literal or
cultural notes. The source references must point to lines where that exact phrase
or concept is established.

IDs are persistence keys. Do not rename a shipped lesson or item just to improve
wording. Create a new ID when the underlying communicative intent changes.

## Quiz bank

Provide at least two genuinely scored variants for every cue-card item. Reordered
choices alone are not a second variant: change context, prompt, modality, speaker,
or recall direction.

Across the active bank, include all of these forms:

- listening comprehension;
- situation and natural-response choice;
- meaning recognition; and
- phrase recall or construction.

Use stable option IDs and canonical answers. Distractors should be plausible for
the learner's level but unambiguously wrong in the stated context. A question is
invalid when its answer depends on missing audio, an unverified transcript line,
unintroduced knowledge, or Thai literacy that the course has not taught.

The engine draws ten active questions for delayed mastery. Ensure the bank can
cover all cue-card items without placing two near-identical variants in the same
attempt. Older review questions are drawn separately and do not count toward the
9/10 gate.

## Verification rule

Before authoring cards or questions, obtain the locally usable MP4 and a verified
transcript from the content owner. Noklingo does not include an Instagram/video
scraper, downloader, or automatic speech-recognition pipeline.

A human reviewer must confirm:

1. the transcript matches the audible dialogue, speaker, particles, and timing;
2. Thai, Romanization, and natural meaning agree;
3. captions match the verified transcript and remain readable at normal speed;
4. each cue card reflects language genuinely present or explicitly taught;
5. every accepted answer is reachable and every distractor is clearly wrong;
6. usage, formality, regionality, and safety notes are accurate; and
7. Noklingo has permission to distribute the video, poster, captions, and audio.

Record unresolved or inaudible dialogue as a content blocker. Do not smooth it
over by inventing a likely phrase.

## Authoring workflow

1. Add and locally play the MP4, poster, and WebVTT files.
2. Enter the verified timestamped transcript and link it to the media.
3. Select 5-10 practical concepts and author their cue cards.
4. Add two or more scored variants per item and confirm the modality mix.
5. Run `npm run validate:curriculum` and resolve every content path it reports.
6. Complete the full vertical slice from a clean v3 profile: video, cards,
   diagnostic, simulated next-day cards, mastery, Results, and Library replay.
7. Test media error handling and the deliberate **Continue without video** path.
8. Verify mobile Safari/PWA playback, captions, audio settings, dark mode, and
   reduced motion before marking the lesson release-ready.

Validation should reject missing media references, malformed transcript ranges,
broken source references, duplicate IDs, fewer than 5 or more than 10 cards,
insufficient variants, fewer than ten active questions, missing modality
coverage, duplicate choices, and unreachable answers.

## Content corrections

Text, timing, meaning, or pronunciation corrections may retain an ID when the
underlying concept is unchanged. If the spoken intent changes materially, add a
new knowledge-item ID and update references so existing review history remains
interpretable. Recheck captions and re-record any phrase audio affected by a
Thai-script or particle change.
