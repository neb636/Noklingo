# Curriculum authoring

Draft Reels live in `src/content/draft-reels.json`; their screenshot-derived
cue cards live in `src/content/draft-cue-cards.json`. A draft preview is always
unscored: watch the local clip, then step through its cue cards.

Cue cards copy the visible on-screen Thai, romanization, and English. Keep the
original display wording, do not infer unseen text, and mark every draft card
with `"verificationStatus": "draft"`.

## Publishing a lesson

Move the lesson and its cards into `src/content/lesson-packages.json` only after
qualified review. A verified package needs:

- an authorized source record;
- a confirmed local MP4 and poster;
- 5–10 verified cue cards with usage text and bundled phrase audio;
- at least ten valid, verified scored questions, including the required
  interaction types.

Import a reviewed package with:

```
npm run lesson:import -- content-inbox/<lesson-id>
npm run lesson:import -- content-inbox/<lesson-id> --apply
```

The package input contains `lesson.json`, `source.mp4`, and `audio/`. The
importer creates `intro.mp4` and `poster.jpg`, copies audio, validates media and
curriculum rules, then updates the reviewed registry.

There are deliberately no machine transcripts, captions, WebVTT files, or
timestamp-based references in this workflow. If a phrase is not clearly visible
in a screenshot, leave it out until a reviewer can confirm it from the clip.
