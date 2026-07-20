# Noklingo

Noklingo is an offline-first, single-user web app for learning useful conversational Thai in short, game-like lessons.

## Development

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build
```

## Deployment

GitHub Actions publishes the static site to GitHub Pages whenever `main` is
updated. Set **Settings → Pages → Build and deployment → Source** to
**Deploy from a branch**, then select the `gh-pages` branch and `/ (root)` after
the first deployment creates that branch.

Pull requests from branches in this repository receive a canary at
`https://<owner>.github.io/Noklingo/pr-preview/pr-<number>/`; the workflow adds
and maintains that URL as a PR comment, then removes the preview when the PR
closes.

## Architecture

- `app/` contains the Vite-powered Vinext entry and global styling.
- `src/content/` contains data-driven units, lessons, and exercises. New curriculum content does not require lesson-player changes.
- `src/domain/` owns course, exercise, session, progress, and settings contracts.
- `src/features/` separates learner routes and the reusable lesson engine.
- `src/store/` uses Zustand for live UI and lesson state.
- `src/lib/db.ts` stores the authoritative personal profile, progress, settings, and active lesson snapshot in IndexedDB through Dexie.
- `src/lib/audio.ts` routes seed `tts:` references to browser speech and future audio files through Howler.
- `public/sw.js` caches the application shell and successful same-origin assets for offline use.

The project uses Vinext because it is the Vite-based runtime required by the hosting surface; its file routing replaces React Router while retaining the requested React/Vite foundation. No backend, authentication, cloud sync, or account system is used. All learner data remains on the device and can be exported, imported, or reset in Settings.

## Course content

The seed course has two units, six lessons, a checkpoint, and a review node. It demonstrates listening, Thai-to-English and English-to-Thai choices, phrase ordering, fill-in, matching, conversation response, speaking, and mistake-review exercises. Seed audio uses browser Thai speech as a documented placeholder; original audio files can be added under `public/audio/` and referenced directly from course data.
