# Noklingo audio assets

Noklingo is listening-first, so audio is course data rather than decoration. The
audio layer supports multiple speakers, normal and slow variants, bundled files,
on-demand caching, explicit replay, and a documented fallback when a recording
is unavailable. Normal operation must not require a paid API.

## Directory and filename convention

Put human recordings under a directory named for the stable speaker ID:

```text
public/audio/
  speaker-nok/
    phrase-hello--normal.mp3
    phrase-hello--slow.mp3
  speaker-somchai/
    phrase-not-spicy-please--normal.mp3
    phrase-not-spicy-please--slow.mp3
```

Use:

```text
public/audio/<speaker-id>/<phrase-or-vocabulary-id>--<speed>.mp3
```

- IDs and filenames use lowercase kebab case.
- `--normal` is required for a human-recorded asset.
- `--slow` is optional but recommended for new or pronunciation-heavy phrases.
- Normal and slow clips must contain the same words and politeness particle.
- Never overwrite a clip with different words while retaining the same content
  ID. Add a new content/audio ID when the spoken content changes.

Course data uses public references such as:

```text
/audio/speaker-nok/phrase-hello--normal.mp3
```

The audio resolver applies the deployment base path, so authors should not embed
a GitHub Pages repository name or environment-specific host.

## Audio-asset records

Files are connected to normalized course content through an audio-asset record in
`src/content/courseData.ts`. The exact schema lives in `src/domain/schemas.ts`; a
typical record identifies:

- stable audio ID;
- speaker ID;
- `bundled`, `cached`, or `tts-placeholder` kind;
- normal `src` and optional `slowSrc` file references;
- optional exact Thai `fallbackText` for permitted TTS fallback;
- exact Thai transcript;
- canonical Romanization; and
- provenance or license information when needed.

Example:

```ts
{
  id: "audio-hello-nok",
  speakerId: "speaker-nok",
  src: "/audio/speaker-nok/phrase-hello-polite-feminine--normal.mp3",
  slowSrc: "/audio/speaker-nok/phrase-hello-polite-feminine--slow.mp3",
  transcriptThai: "สวัสดีค่ะ",
  romanization: "sà-wàt-dee kha",
  kind: "bundled",
  license: "Original Noklingo recording; contributor release on file",
}
```

A phrase, vocabulary item, dialogue turn, or listening exercise connects to this
record with `audioRef: "audio-hello-nok"`, not a duplicated filename. This keeps
speaker, transcript, Romanization, and speed variants connected and lets
validation detect broken references. The phrase/vocabulary record supplies the
semantic relationship; the audio asset itself stays reusable.

## Speakers and politeness

Create a normalized speaker record before adding that person's audio. Its
`defaultPoliteParticle` stores `khrap`, `kha`, or `none`; the learner-facing
accented spelling remains on the phrase/audio record. The speaker also documents
display name, gender/voice context, role, and description.
The spoken particle follows the speaker, not the listener:

- a speaker using the traditionally masculine particle records `ครับ`
  (`khrap`);
- a speaker using the traditionally feminine statement particle records `ค่ะ`
  (`kha`); and
- question `คะ` remains a distinct Thai transcript even though the beginner
  Romanization also uses `kha`.

The demonstration course should use at least two speakers and should not reuse one
voice while labeling it as different characters. Respect a contributor's chosen
identity and particle in their speaker record.

## Recording guidance

The complete Course 1 assignment list is generated in
`src/content/audioManifest.ts`. Each audio asset produces a normal and slow
manifest entry with its exact script, speaker direction, lesson context, status,
and suggested filename. Follow that manifest rather than inventing filenames from
the examples below.

Use original recordings from a contributor who has agreed to their use in
Noklingo. Do not copy recordings from another language-learning product, video,
film, or commercial phrasebook.

For each phrase:

1. Verify the Thai script, natural meaning, Romanization, speaker context, and
   politeness particle before recording.
2. Record the normal clip at a relaxed, natural conversational pace.
3. Record the slow clip as a separate take. Keep natural tones and connected
   speech; slow down without stretching vowels into a different word.
4. Trim long leading/trailing silence and obvious handling noise. Keep a small
   natural margin so playback does not clip consonants.
5. Export mono MP3 at a consistent sample rate and loudness with the other course
   files. Preserve the lossless source outside the web bundle when available.
6. Name both files using the convention above, add the audio-asset record, and run
   validation.
7. Test normal, slow, replay, offline cached playback, and audio-disabled UI on a
   real phone as well as desktop.

Do not combine a multi-turn dialogue into the only available source recording.
Store turn-level clips so a learner can replay one phrase; a dialogue may also
provide an optional assembled exchange.

## Placeholder TTS and human replacement

During authoring, an audio asset can omit `src`, use
`kind: "tts-placeholder"`, and provide the exact Thai `fallbackText` routed to
browser speech synthesis:

```ts
{
  id: "audio-hello-nok",
  speakerId: "speaker-nok",
  fallbackText: "สวัสดีค่ะ",
  transcriptThai: "สวัสดีค่ะ",
  romanization: "sà-wàt-dee kha",
  kind: "tts-placeholder",
}
```

Legacy direct `tts:` references may be resolved during migration, but new course
content should reference a normalized audio-asset ID.

TTS is a placeholder, not the target voice architecture. Browser voices vary by
device, may not honor a requested speaker, and may be unavailable offline. Do not
describe a TTS clip as a particular human speaker, and do not depend on TTS for a
release-critical listening or checkpoint item unless the content explicitly
permits the fallback.

To replace a placeholder with human audio:

1. Create or choose the speaker record.
2. Record normal and, ideally, slow variants using the exact stored Thai phrase.
3. Add the files using the stable naming convention.
4. Update the existing audio-asset record with `src`, optional `slowSrc`,
   `kind: "bundled"`, and provenance while retaining its audio ID.
5. Confirm that phrase, vocabulary, dialogue, and exercise `audioRef` values still
   point to that stable audio ID.
6. Run `npm run validate:course` and complete the exercise with the network
   disabled.

Because exercises reference content/audio IDs, replacing a placeholder does not
require a renderer or scoring change.

## Playback, preload, and caching

The audio service resolves an asset and requested `normal` or `slow` speed, then
uses Howler for bundled files. It exposes play, stop, and targeted preload
behavior. Only the current clip and the next likely one or two clips should be
preloaded; loading the entire course wastes memory and bandwidth.

The service worker caches successful same-origin audio responses after they are
requested. A cached clip can play offline on later visits. TTS speech is provided
by the browser/operating system and is not stored by the service worker.

Starting a new clip stops the current clip. Route changes and lesson exit also
stop active speech and audio. Replay must always restart the requested clip from
the beginning rather than layering another copy on top.

## Missing-audio fallback

Missing audio must be visible and non-destructive:

1. For a requested slow clip without `slowSrc`, play the human `src` at a reduced
   playback rate.
2. If the human source cannot load, use `fallbackText` or, when it is absent, the
   exact `transcriptThai` with browser speech.
3. If neither source playback nor browser speech succeeds, the audio service
   returns failure; disable replay and show a concise accessible message. Do not
   leave a working-looking silent button.
4. A non-listening exercise may continue with Romanization and meaning. An
   exercise whose answer depends on hearing the clip cannot be scored fairly and
   should offer retry/skip without charging a heart.

Content validation treats a missing required normal file, broken speaker/phrase
reference, or transcript mismatch as an error. A missing optional slow clip is a
warning.

## Accessibility

- Every play control needs a contextual label such as “Play Nok saying hello,”
  not only “audio.”
- Expose separate normal and slow controls when a slow variant exists.
- Keep replay available in incorrect-answer feedback.
- Never autoplay unexpectedly, and honor the learner's audio-enabled and volume
  settings.
- Provide Romanization and natural meaning outside an audio-only control when
  feedback is shown.
- Speech-practice failure caused by browser support or microphone permission must
  offer self-assessment and must not cost a heart.

## Validation checklist

Run:

```bash
npm run validate:course
```

Before merging audio, also verify:

- the speaker, phrase/vocabulary, and audio IDs all resolve;
- normal files exist at the exact case-sensitive path;
- slow references, when supplied, exist;
- Thai transcripts match what was recorded, including `khrap`/`kha` context;
- listening and dialogue exercises have accessible labels;
- human recordings have documented permission/provenance; and
- normal, slow, fallback, cache, and offline behavior work without a paid service.
