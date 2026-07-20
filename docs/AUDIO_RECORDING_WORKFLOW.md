# Audio recording workflow

Course 1 has a structured manifest in `src/content/audioManifest.ts`. It expands
every normalized audio asset into two required takes: normal and slow. Each entry
contains a stable recording ID, exact Thai, Romanization, speaker description,
gender/voice context, delivery speed, emotional tone, lesson context, suggested
filename, lesson usage, recording status, and performance notes.

At this course version the manifest contains 492 takes. They are deliberately
marked `needs-recording`; normalized browser speech fallback keeps lessons
functional while original recordings are produced. Ordinary playback does not
depend on a live paid API.

## Recording sequence

1. Run `npm run validate:course` and resolve every content error before a script
   reaches a speaker.
2. Give the speaker only entries assigned to their normalized speaker ID. Include
   the lesson situation and the adjacent dialogue so delivery has context.
3. Record the normal take first as connected, ordinary speech. Preserve natural
   reductions and light particles; do not perform a spelling exercise.
4. Record the slow take separately. Clarify syllable boundaries but preserve
   tones, vowel length, emotion, and connected phrasing.
5. Record dialogue composites with both characters when possible, while keeping
   every turn-level clip available for replay.
6. Export mono MP3 files using each manifest entry's `suggestedFilename`. Retain
   lossless masters and signed contributor permission outside the web bundle.
7. Replace the matching audio asset's placeholder sources with the normal and
   slow public paths, set `kind` to `bundled`, and add license/provenance.
8. Re-run validation, listen to both speeds, and complete the affected lesson
   with the network unavailable.

## Performance direction

- Normal means relaxed conversation, not a race and not classroom dictation.
- Slow means learner practice, not distorted vowels or isolated robotic words.
- Match the stored speaker's particle and social role.
- Preserve a warm baseline. Playful clips may smile; emergency clips should be
  calm, direct, and clear rather than theatrical.
- Record the exact Thai transcript. A changed particle or omitted word requires a
  content decision, not an undocumented studio improvisation.

## Quality control

The content validator checks that every asset has exactly one normal and one slow
manifest entry, every suggested filename is unique, every recording is connected
to a real lesson, and referenced bundled files exist. Human review must also
confirm intelligibility, naturalness, loudness consistency, clipping, background
noise, transcript accuracy, and the absence of accidental English prompting in
the exported clip.
