# Thai Study

Thai Study is an offline-first web foundation for learning conversational Thai
from short, licensed video clips. Its study loop is deliberately simple:

> watch a real clip → notice useful phrases → make a first pass  
> → retrieve them tomorrow → keep them alive with spaced review

The current product label is text-only and temporary. The visual direction is
an editorial film notebook: generous spacing, highly readable Thai, tactile
paper surfaces, accessible keyboard focus, dark mode, and no game mechanics.

## What is included

- Today: one clear next study action
- Study: clip, working transcript, cue cards, retrieval cards, and quiz
- Results: outcome, corrections, and the next delayed-recall cue
- Library: ordered video lessons, replays, and clearly locked future work
- Progress: mastery, reviews due, study rhythm, and recent recall accuracy
- Settings: audio, captions, display, reduced motion, and local data tools

All requested domain contracts live in `src/domain/schemas.ts` and are parsed by
Zod. Zustand owns the live client state; Dexie writes lesson progress, review
states, attempts, sessions, settings, and study-rhythm state to separate
IndexedDB tables. Export/import uses the same versioned Zod schema.

The checked-in Thai lesson copy is labeled **draft** in both code and UI. It
must be reviewed by a qualified Thai language editor before release.

## Local media convention

Put reviewed lesson files at:

```text
public/lessons/<lesson-id>/intro.mp4
public/lessons/<lesson-id>/poster.jpg
public/lessons/<lesson-id>/captions.vtt
```

- Encode video as H.264 with AAC audio in an MP4 container.
- Use WebVTT for captions.
- Set `media.availability` to `available` only when all referenced files exist.
- Keep phrase recordings under `public/audio/` (or a lesson subdirectory) and
  reference them with a root-relative local path.
- Pass video, poster, caption, and audio paths through `assetPath()` in
  `src/lib/asset-path.ts`. It safely adds the GitHub Pages repository prefix and
  leaves absolute, data, and blob URLs unchanged.

The draft `coffee-order` lesson includes only a clearly marked draft VTT file.
No fake footage is supplied; the media panel uses the schema's fallback message
until licensed material is added.

## Run locally

Requires Node.js 22+.

```bash
npm install
npm run dev
```

Vinext runs the Next.js Pages Router on Vite. The application uses Next.js 16,
React 19, and TypeScript. To verify everything:

```bash
npm run typecheck
npm run lint
npm run build
# or all three
npm run check
```

The static site is written to `dist/client/` (Vinext also writes its build-time
server bundle beside it; only `dist/client/` is deployed).

Vinext's non-trailing static export produces `<route>.html`. The automatic
`postbuild` finalizer validates that each file contains rendered Next data (and
is not a redirect), then copies it to `<route>/index.html` for clean Pages URLs.

## GitHub Pages and the asset prefix

The included workflow deploys `dist/client/` and sets:

```text
NEXT_PUBLIC_BASE_PATH=/<repository-name>
```

For a local prefix test, copy `.env.example` to `.env.local` and set the same
value. `next.config.ts` applies it as the generated-asset prefix. The shared
path helper applies it to public media, PWA files, and hard navigations. Native,
prefix-aware page navigation is intentional here: it remains reliable on
GitHub Pages while Vinext's current static prerenderer does not emit usable page
content when Next's `basePath` option is enabled.

## Offline behavior

`public/sw.js` is registered only in production and is scoped to the configured
Pages prefix. It precaches the exported route shell and caches same-origin,
complete scripts, styles, fonts, images, captions, and audio as they are used.
Navigation is network-first with cached-page fallback.

The worker deliberately does **not** cache MP4 requests, requests containing a
`Range` header, HTTP 206 responses, or responses with `Content-Range`. Video is
never eagerly downloaded. This avoids treating a byte range as a complete file
while keeping the notebook, study records, captions, and safe assets available
offline after first use.

There is no account, backend, analytics, cloud database, or paid media API.
