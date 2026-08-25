# Bundled lesson media

This directory contains two distinct asset classes.

## Draft preview assets

`drafts/<lesson-id>/` contains the 24 supplied local Reel previews in the order
defined by `src/content/draft-reels.json`:

```text
drafts/<lesson-id>/intro.mp4
drafts/<lesson-id>/poster.jpg
drafts/<lesson-id>/captions.vtt   # present for 12 machine-caption drafts only
```

All 24 have a confirmed media duration. Twelve have machine-generated WebVTT
and matching `draftTranscript` notes; the other twelve have no captions or
transcript notes. These files are available only through the clearly labeled
draft preview. They are not cue-card, quiz, mastery, or review content.

Machine captions remain unverified even when their timing looks plausible. Do
not relabel them as reviewed, infer omitted speech, or use the Instagram source
URL as proof of dialogue.

## Reviewed lesson assets

A release-ready lesson installed by `scripts/import-lesson.ts` uses:

```text
<lesson-id>/intro.mp4
<lesson-id>/poster.jpg
<lesson-id>/captions.vtt
<lesson-id>/audio/<declared-local-audio-files>
```

The reviewed registry is `src/content/lesson-packages.json`. It currently has
zero active lessons. A file placed in this directory does not become curriculum
by itself: every asset must be declared by a schema-valid lesson package, and
the complete cross-record publication gate must pass.

Unreferenced or historical files are inert and must not be interpreted as
reviewed curriculum.

## Static hosting behavior

All curriculum media paths are same-origin and are expanded through the shared
asset-prefix helper, so they work at the site root and below a GitHub Pages
project prefix. The service worker may cache safe complete images, captions,
and audio, but it deliberately excludes MP4 and byte-range responses. Video
playback therefore stays network-driven and exposes an explicit failure path.

Everything below `public/` is copied into the static artifact and is publicly
addressable on ordinary GitHub Pages. Only install media whose authorization
covers that visibility.

See `docs/CURRICULUM_AUTHORING.md` for the verified package format and the full
publication checklist.
