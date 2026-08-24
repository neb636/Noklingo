# Phrase-audio recording workflow

Phrase audio reinforces verified video lesson cue cards. It is optional while an
allowed local speech fallback exists, but release-critical listening questions
must never depend on an unavailable or unsuitable fallback.

## Before recording

Finalize the video transcript and cue card first. Confirm the exact Thai,
Romanization, natural meaning, speaker identity, preferred particle, situation,
and permission to distribute the recording. A script change after recording
requires a new take.

Do not extract audio from a social video or another product unless Noklingo has
explicit rights to do so. This project does not scrape or download source media.

## Recording and delivery

1. Record a relaxed normal-speed take in context.
2. Optionally record a separate slow take for pronunciation support. Preserve
   tones, vowel length, particles, and connected speech.
3. Trim excess silence and noise without clipping consonants.
4. Export mono MP3 at consistent loudness; retain lossless masters and contributor
   releases outside the web bundle.
5. Name files using the stable speaker and item IDs:

   ```text
   public/audio/<speaker-id>/<item-id>--normal.mp3
   public/audio/<speaker-id>/<item-id>--slow.mp3
   ```

6. Connect the files to the knowledge item without changing its durable ID.
7. Run `npm run validate:curriculum`, compare the take to the verified cue card, and
   test normal, slow, replay, disabled-audio, and unavailable-audio behavior.

Normal speed should sound conversational, not rushed. Slow speed should clarify
sound chunks without becoming robotic or changing the word.

## Quality control

Human review must confirm transcript accuracy, naturalness, intelligibility,
speaker/particle consistency, loudness, clipping, background noise, filename,
license/provenance, and exact case-sensitive path. A changed Thai line or particle
invalidates both normal and slow takes until re-recorded.

The runtime resolves public paths through the shared asset-prefix helper. The
service worker may cache a successfully requested complete audio response, but it
does not bulk-cache lesson videos and never stores partial range responses.
