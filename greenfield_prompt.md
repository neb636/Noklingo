# Greenfield prompts: offline Thai video study app

Use these three prompts in order for a clean build. They deliberately contain
no Noklingo, Duolingo, mascot, migration, or existing-codebase requirements.

The source reference for the first lesson is [this Instagram Reel](https://www.instagram.com/learnthai_irl/reel/Db-0OFPSuuJ/). It is a research/content reference only: do not scrape, download, embed Instagram at runtime, or infer its dialogue. The shipped app must use a locally supplied and licensed MP4 plus a verified transcript.

## Prompt 1 — product, stack, and visual foundation

```text
Build a new, offline-first web app for learning conversational Thai from short
videos. This is a greenfield project: do not reuse a previous app’s brand,
mascot, colors, UI vocabulary, course-path model, XP, hearts, badges,
achievements, checkpoints, or migration code.

Use this stack:
- Next.js 16, React 19, TypeScript, and static export through Vinext/Vite.
- Zustand for client state, Dexie/IndexedDB for durable local data, and Zod for
  runtime schemas.
- Framer Motion for restrained transitions, Howler plus browser speech fallback
  for audio, Lucide for icons, and CSS modules or a maintainable global CSS
  system.
- A static GitHub Pages deployment under an asset prefix, with an offline-first
  PWA service worker. No account, backend, analytics, cloud database, or paid
  media API.

Create an original, calm visual direction: think editorial film notes plus a
useful language notebook. It should feel warm, precise, and adult—not like a
game. Use a temporary text-only product label such as “Thai Study”; keep it
easy to replace later. Do not use a mascot. Prioritize strong typography,
generous space, readable Thai, subtle tactile cards, accessible focus states,
dark mode, and reduced motion. Avoid gamification language such as “win,”
“level,” “streak flame,” “XP,” “hearts,” or “daily goal.”

Implement these routes and responsive navigation:
- Today: the one clear next study action.
- Study: video, cue cards, retrieval cards, and quiz.
- Results: delayed-recall outcome and corrections.
- Library: available lesson replays and locked future lessons.
- Progress: mastery, due reviews, consistency, and recent recall accuracy.
- Settings: audio, display, accessibility, local-data export/import/reset.

The product’s learning promise is:

    watch a real clip → notice useful phrases → make a first pass
    → retrieve them tomorrow → keep them alive with spaced review

Model the curriculum as ordered video lessons, not units or a path. Establish
these Zod-backed domain contracts and seed data only with clearly labeled draft
content until real media arrives:
- VideoLesson: id, order, title, objective, description, media, transcript,
  cue-card ids, and quiz bank.
- LessonMedia: local MP4, poster, WebVTT captions, duration, availability, and
  a user-facing fallback message.
- TranscriptLine: timestamp range, speaker, Thai, romanization, natural English,
  optional literal/context notes, and verification status.
- KnowledgeItem/CueCard: Thai, romanization, natural meaning, usage/context,
  transcript references, and phrase audio.
- LessonProgress: unseen, introduced, awaiting-mastery, or mastered.
- ItemReviewState, StudyAttempt, DailyStudySession, settings, and streak state.

Store lesson media at:

    public/lessons/<lesson-id>/intro.mp4
    public/lessons/<lesson-id>/poster.jpg
    public/lessons/<lesson-id>/captions.vtt

Use H.264/AAC MP4 and WebVTT. Add one asset-path helper that safely prepends the
GitHub Pages prefix to video, poster, captions, and local audio files. Build a
scoped service worker that caches the app shell and safe complete assets, but
does not cache MP4 range responses or eagerly download video files.

Deliver this foundation with a clean README explaining the new product,
local-media convention, and how to run it. Typecheck, lint, and build it before
you stop.
```

## Prompt 2 — implement the learning loop and every user state

```text
Continue the greenfield Thai video-study app. Implement the complete learning
engine and UI. Preserve the offline-first stack and the calm, non-gamified
visual direction. Do not introduce course paths, XP, hearts, badges, a mascot,
or a separate “Practice” tab.

Learning flow

1. Today shows exactly the relevant primary action:
   - resume an unfinished session;
   - start a new lesson;
   - take a mastery check that is due;
   - wait until tomorrow for an eligible mastery check;
   - start due standalone review after the curriculum is complete; or
   - view a completed curriculum.

2. A new lesson has three stages:
   - Watch its local MP4 in a native responsive <video controls playsInline>
     player. Require one completed playback before first-time cue cards open.
     If video playback fails, show a clear error and a deliberate “Continue
     without video” action so missing media never blocks study.
   - Review 5–10 cue cards. Each card shows Thai script, romanization, natural
     meaning, usage/context, phrase audio, and optional literal/cultural notes.
   - Complete a short diagnostic quiz. This is a first pass only: even 100%
     schedules the lesson for tomorrow and never grants mastery today.

3. Beginning on the next local calendar day, the learner sees retrieval-style
   cue cards first (prompt from meaning/context, reveal Thai), then a fixed
   ten-question delayed mastery quiz. A learner needs 9/10 active-lesson
   questions correct to master the lesson. An 8/10 or lower result shows
   corrections and missed cards, then blocks another attempt until the next
   local calendar day.

4. A passed mastery check immediately unlocks the next video. The learner may
   complete that next lesson’s introduction on the same day, but not its mastery
   check.

5. Add spaced review. Interleave up to three due questions from older mastered
   lessons into a mastery session (about 20–25% of a 13-question session). Old
   review never affects the active lesson’s 9/10 gate and never relocks a
   mastered lesson. On successful delayed recall, schedule approximately 2, 5,
   12, and 30 days, then grow the interval adaptively; on failure schedule the
   item tomorrow. When all lessons are mastered, Today may launch a standalone
   review session with up to ten due questions.

6. Do not show per-answer correctness while a delayed mastery or spaced-review
   queue is in progress. Reveal results only after its fixed queue is complete.

7. Library rules:
   - Show the active/resumable lesson and mastered lessons.
   - Allow mastered lessons to replay video and cards.
   - Keep future lessons locked and do not preload or preview their videos.
   - Replays never change mastery, review dates, attempts, or consistency.

8. Consistency rules:
   - Increment the study streak at most once per local calendar day after an
     introduction or mastery session—not browsing, replaying, or standalone
     review.
   - Use local calendar-date helpers that remain correct across DST and missed
     days.

Implement deterministic question selection and deterministic choice shuffling.
Retain useful interaction types: listening, situation/response, meaning
recognition, phrase recall/construction, matching, and self-guided speaking.
Only deterministic interactions count toward mastery; speech recognition is out
of scope.

Make sessions fully resumable at video, card, retrieval, and quiz stages. Keep
the fixed queue and answers in IndexedDB. Replays must be disposable and never
persist as progress.

Build polished responsive screens for Today, Study, Results, Library, Progress,
and Settings. Progress must show lesson mastery, due items, consistency, and
recent delayed-recall accuracy—not points, achievements, percentages by unit,
or checkpoint statistics. Settings must include sound, volume, Romanization,
Thai script, dark mode, reduced motion, preferred polite particle, export,
import, and reset.

Use a content source note for the first lesson:
https://www.instagram.com/learnthai_irl/reel/Db-0OFPSuuJ/

This URL is attribution and authoring context only. Runtime playback must use a
locally supplied MP4. Never build an Instagram scraper, downloader, or automatic
transcriber. Until a verified MP4 and transcript are supplied, mark the lesson
as draft and make any placeholder content visibly non-release-ready.
```

## Prompt 3 — content safety, persistence, tests, and release quality

```text
Finish the greenfield Thai video-study app as a production-quality static PWA.
Do not add legacy learning-game mechanics or invent dialogue for missing video.

Authoring and media rules
- A release-ready VideoLesson must have a same-origin local MP4, poster, WebVTT
  captions, confirmed duration, timestamped verified transcript, 5–10 cue
  cards, phrase audio, and at least two scored quiz variants per cue-card item.
- Require at least ten valid active questions spanning listening,
  situation/response, meaning recognition, and phrase recall.
- A verified listening question must reference bundled local audio. Reject
  missing media, invalid transcript references, duplicate ids, duplicate queue
  entries, unreachable answers, insufficient cue-card coverage, and quizzes
  that depend on unavailable media or unverified dialogue.
- Keep draft lessons explicitly draft. Do not present inferred speech, guessed
  timestamps, or an Instagram URL as verified curriculum content.
- Keep the source reference in authoring metadata/documentation:
  https://www.instagram.com/learnthai_irl/reel/Db-0OFPSuuJ/
  Do not retrieve or distribute it automatically.

Persistence rules
- Version persistence and service-worker caches for this product.
- On first launch of the new schema, discard incompatible old data and show one
  concise redesign notice. Do not migrate old progress or settings.
- Export/import only the current schema. Reject incompatible imports with a
  plain-language message.
- Reconcile imported/resumed sessions against the bundled curriculum: preserve
  exact valid queues, but discard a stale active session without destroying
  otherwise valid progress.

Add automated tests for:
- a perfect day-one diagnostic not unlocking the next lesson;
- local date/DST behavior, missed days, and blocked pre-eligibility attempts;
- 9/10 passing and 8/10 failing with next-day retry;
- deterministic question/choice variation and cue-card coverage;
- old-review questions excluded from the mastery percentage;
- old-review failures rescheduling without relocking mastery;
- session resume at every stage, replay isolation, streak rules, reset,
  current export/import, and incompatible-import rejection;
- all Today states, video-error fallback, cue-card navigation, delayed feedback,
  Results corrections, and Library locking.

Manually verify the vertical slice on desktop and iPhone Safari/PWA at mobile
and desktop breakpoints. Verify dark mode, reduced motion, no horizontal
overflow, caption rendering, media failure fallback, and a GitHub Pages static
build below an asset prefix. Document the curriculum authoring workflow and all
quality commands in the README.
```
