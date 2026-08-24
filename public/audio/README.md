# Noklingo phrase audio

Phrase audio is a required cue-card aid and a source for authored listening
questions. Normal operation must not require a paid audio API.

## File convention

```text
public/audio/<speaker-id>/<knowledge-item-id>--normal.mp3
public/audio/<speaker-id>/<knowledge-item-id>--slow.mp3
```

- Use durable lowercase-kebab-case IDs.
- A human-recorded asset requires `--normal`; `--slow` is optional.
- Normal and slow takes must contain the same verified words and particle.
- Never replace a stable ID with audio for a different communicative concept.
- Retain recording permission and provenance with the content handoff.

Curriculum data stores a public path such as:

```text
/audio/speaker-nok/hello-polite--normal.mp3
```

`publicAssetPath` applies `NEXT_PUBLIC_ASSET_PREFIX` for local development,
GitHub Pages, and preview deployments. Do not put a hostname or `/Noklingo`
prefix into authored paths.

## Recording contract

Record only after the video transcript and cue card are verified. The file must
match the item's Thai script, Romanization, speaker, situation, and politeness
particle. Use original or properly licensed recordings; do not copy audio from a
video, film, language product, or social post without distribution rights.

See [the recording workflow](../../docs/AUDIO_RECORDING_WORKFLOW.md) for delivery
and review steps.

## Fallback and playback

An item may use the existing local/browser speech fallback until human audio is
supplied. Verified scored listening questions must instead use bundled local
audio. Treat fallback speech as a scaffold, not a named character performance:
voices vary by device and may be unavailable offline. A listening question must offer a fair
recovery path when its required audio cannot play.

Starting a clip stops current playback. Replay restarts from the beginning.
Honor sound, volume, and reduced-motion settings, never autoplay unexpectedly,
and label controls with the phrase or speaker context.

The service worker may cache complete, successful same-origin audio after use.
Range requests and partial responses bypass runtime caching. Lesson MP4s are not
eagerly added to the app cache.

## Check before merging

- Paths and IDs resolve with exact case.
- The recording matches verified Thai and the intended particle.
- Normal, optional slow, fallback, replay, and unavailable states work.
- Listening questions remain reachable and accessible.
- Permission/provenance is recorded.
- `npm run validate:curriculum` passes.
