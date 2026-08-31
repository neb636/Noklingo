# NokLingo repository analysis

**Snapshot:** 2026-08-29  
**Repository:** `/Users/nblanchard/repos/Noklingo`  
**Scope:** source, content, media, scripts, build output, tests, CI, and current agent/editor configuration.

## Executive summary

NokLingo is a compact but unusually content-heavy offline-first Thai-learning PWA. The application is a static Next/Vinext export with no backend, authentication, or server-side user data. Runtime learning state lives in Zustand and Dexie/IndexedDB; the curriculum is bundled JSON plus local media.

The most important current fact is the publication gap:

- 23 lesson plans exist in `src/content/draft-reels.json`.
- 102 cue cards exist in `src/content/draft-cue-cards.json`.
- All 23 lessons and all 102 cards are still marked `draft`.
- `src/content/lesson-packages.json` has zero reviewed lessons and zero reviewed cards.
- Consequently, `studyLessons` is empty and the Today screen sends users to the draft Lesson Library rather than to scored learning.
- Pronunciation work is further along: the aggregate manifest has 102 complete Thai/English pairs, with 74 automatically matched and 28 manually overridden. Those assets support draft previews but do not satisfy the reviewed-curriculum publication gate by themselves.

The codebase is in good shape for a small static product: `npm run check` passes, the curriculum validator is substantial, the learning engine has focused tests, and the static finalizer validates emitted routes and internal asset references. The largest risks are architectural rather than basic correctness: persistence rewrites the entire IndexedDB snapshot on every store update, curriculum validation has a circular dependency and validates the whole curriculum repeatedly, and quiz answer schemas are permissive while grading logic is duplicated.

The repository is also carrying a large local-media/tooling footprint. The rough working-tree footprint is 4.2 GB, dominated by the 2.9 GB Whisper cache, 662 MB of `node_modules`, and a 215 MB Python virtualenv. Those are not source-code problems, but they materially affect editor indexing and agent context.

## Verification baseline

The current worktree had uncommitted changes in `.gitignore`, `package.json`, and `package-lock.json`, plus untracked agent files. Those files were treated as existing work and were not rewritten while regenerating this report.

Checks run against the current repository:

| Check | Result |
|---|---|
| `npm run validate:curriculum` | Pass — curriculum contracts valid |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm test` | Pass — 12 files, 56 tests |
| `npm run build` | Pass — 29 prerendered routes |
| Static finalizer | Pass — 64 offline shell assets prepared |

## 1. Dead weight, cleanup candidates, and local noise

“Dead” here means no current runtime or tool reference was found. Items labelled “candidate” still need a product/source-of-truth decision before deletion.

### High-confidence cleanup candidates

| Item | Evidence | Recommendation |
|---|---|---|
| Legacy public branding files: `public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png`, `public/icon.svg`, `public/noklingo-app-icon.png`, `public/noklingo-logo-v1.png`, `public/noklingo-mascot-logo.png`, `public/noklingo-mascot-logo-black.png` | Current app HTML, manifest, and static finalizer use the `noklingo-*` files listed in [`_app.tsx`](../src/pages/_app.tsx#L27) and [`finalize-static.mjs`](../scripts/finalize-static.mjs#L53). No current source reference was found for the legacy variants. | Confirm visually once, then remove the unused variants and keep one documented brand set. They are currently copied into `dist` simply because everything under `public` is copied. |
| `pronunciation-qa-report.json` | No current source, script, or documentation reference was found. | Move it to generated reports or delete it after confirming it is not an external review handoff. |
| `insta/.DS_Store` | Finder metadata; not part of the media pipeline. | Remove and keep covered by `.gitignore`. |
| `curriculumIssues` export in [`seed.ts`](../src/domain/seed.ts#L26) | The value is created but has no consumer. | Remove the export or expose a deliberate diagnostics API that uses it. |
| `isLessonStudyReady` alias in [`curriculum-validation.ts`](../src/domain/curriculum-validation.ts#L234) | It is a second name for `lessonIsReleaseReady` and has no consumer. | Remove the alias and standardize on one term. |
| `firstLesson` in [`seed.ts`](../src/domain/seed.ts#L28) | Used only by `engine.test.ts` and `db.test.ts` as a fixture. | Move fixture selection into test helpers if production modules should expose only application data. This is low priority. |

### Duplicate or misplaced media

All 23 `public/lessons/drafts/*/intro.mp4` files are byte-for-byte duplicates of MP4s in `insta/`. This is not automatically deletable: `insta/` may be the creator/source archive while `public/lessons/drafts/` is the deployable copy. The duplication is nevertheless worth eliminating because it adds roughly 44 MB and creates ambiguity about which copy is authoritative.

Choose one of these models:

1. Keep `insta/` as an untracked/local source archive and generate/copy into `public` during an explicit intake step.
2. Keep the deployable copies in `public` and remove raw duplicates from the repository after confirming licensing and backup policy.
3. Keep both only if the raw archive is intentionally versioned; document that `public/lessons/drafts` is generated and verify hashes during import.

Do not delete either set until the source/licensing decision is explicit. The importer and authoring documentation correctly warn that bundled GitHub Pages media is public.

### Operational but noisy

| Path | Current role | Cleanup/context action |
|---|---|---|
| `public/lessons/drafts/*/pronunciation-manifest.json` | Per-lesson review/debug manifests used by the pronunciation review workflow. | Not dead, but they are not the app’s primary runtime index. Keep only if reviewers need them publicly; otherwise move them to intake/review artifacts and keep `src/content/pronunciation-manifest.json` as the runtime index. |
| `dual-audio-migration-report.json` | Generated directly by [`migrate-dual-audio.ts`](../scripts/migrate-dual-audio.ts#L41) and read again by its verification path. | Keep during migration. Afterwards, move generated output under `reports/generated/` and update the script. |
| `content-inbox/` | Staging area for reviewed lesson packages; ignored and currently about 43 MB. | Not dead. Exclude from editor/agent scanning and keep it out of source control. |
| `tools/pronunciation-generator/.cache/` | Local `large-v3` Whisper model/cache; about 2.9 GB. | Reproducible local state. Keep ignored and excluded from AI indexing. |
| `tools/pronunciation-generator/.venv/` | Local Python dependencies; about 215 MB. | Reproducible local state. Keep ignored and excluded from AI indexing. |
| `node_modules/`, `dist/`, `.next/`, `.vinext/` | Dependencies and build/runtime output. | Keep ignored and exclude from scanning. `dist` is useful for release inspection but not as source context. |
| `.playwright/`, `.playwright-cli/`, `.pw-sockets/` | Browser QA session, socket, and artifact state. | The current `.gitignore` already covers the first two; add `.pw-sockets/` if it is not intentionally shared. Exclude all three from editor/agent scanning. |

The newly present `.claude/skills/playwright-cli/` and project-specific `.agents/skills/browser-qa/` overlap. The project-specific skill is better aligned with this repository because it names the Luna workflow and NokLingo constraints. Keep one canonical QA contract and make the other an adapter or remove it.

### Things that are not dead

- `src/content/draft-reels.json` and `src/content/draft-cue-cards.json` are real curriculum inputs even though they are not publishable.
- `public/lessons/drafts` is intentionally used by the Library and unscored lesson preview flow.
- `src/content/pronunciation-manifest.json`, pronunciation domain code, audio analysis, review UI, and generator scripts form a coherent local authoring pipeline.
- `public/index.html` is a required root redirect for the static deployment, and `public/sw.js` is required for the PWA shell.
- The empty reviewed registry is an intentional publication gate, not a missing file.
- `@vitejs/plugin-rsc` and `react-server-dom-webpack` are not directly imported by application files, but they are tied to Vinext/React server-runtime behavior. Do not remove them without a dependency/build experiment.
- `@playwright/cli` is now present in `package.json` and the lockfile. It is useful for the required browser workflow, but it is not yet backed by a repository Playwright config or an `npm run` browser-test command.

## 2. Current state, pages, and component hierarchy

### Data and publication flow

```text
draft-reels.json + draft-cue-cards.json
                │
                ▼
        src/domain/seed.ts
   parse and combine draft/reviewed data
                │
       ┌────────┴────────┐
       ▼                 ▼
  lessons/cueCards   studyLessons
  Library previews   verified + fully valid only
                           │
                           ▼
                  Today / durable study engine

pronunciation-manifest.json ──► pronunciation-audio.ts ──► local Howler audio
```

`seed.ts` parses the three curriculum registries with Zod, lets a reviewed lesson replace its matching draft lesson, and exports the combined arrays. The Library uses `lessons`, so draft lessons are visible as exploratory previews. The learning engine uses `studyLessons`, so only verified and fully valid lessons can enter scored study.

Current content state:

| Registry or asset set | Current state |
|---|---|
| Draft lessons | 23, all `contentStatus: "draft"` |
| Draft cue cards | 102, all `verificationStatus: "draft"` |
| Reviewed lessons/cards | 0 / 0 |
| Video-only draft lessons | 2 (`country-names`, `coffee-order`) |
| Draft intro videos/posters | 23 / 23 |
| Draft audio files | 233 `.m4a` files |
| Per-lesson pronunciation manifests | 23 |
| Aggregate pronunciation clips | 102; every pair is `complete`, 74 matched and 28 overridden per language |
| Publishable study lessons | 0 |

### Route map

| Route | Role | Main dependencies |
|---|---|---|
| `/` | Static `public/index.html` redirect. Sends first-time users to `/welcome/`, returning users to `/today/` using localStorage. | `public/index.html` |
| `/welcome` | First-run introduction and entry point into Today. | `AppLink`, localStorage welcome key |
| `/today` | Chooses the next learning action from durable state: resume, introduction, mastery, wait, review, complete, or draft library. | `selectTodayAction`, Zustand, Dexie write |
| `/library` | Shows all bundled lessons, including draft previews. | `lessons`, `cueCards`, poster assets |
| `/lessons/[lessonId]` | Static per-lesson preview route. `getStaticPaths` emits one route per combined lesson. | `LessonExperience` |
| `/study` | Durable introduction, retrieval, diagnostic, mastery, and standalone-review session UI. | Zustand session, learning engine, local audio/video |
| `/results` | Reads the last completed durable session and shows corrections/next step. | Zustand, learning engine, local date helpers |
| `/settings` | Audio/display preferences, export/import, and destructive local reset. | Zod snapshot schema, Dexie, Zustand |

The build is static: Vinext prerenders the core pages and 23 lesson routes, then `scripts/finalize-static.mjs` creates directory `index.html` copies, validates internal references, and prepares the service-worker shell.

### Component hierarchy

```text
src/pages/_app.tsx
└── AppProviders
    ├── MotionConfig
    ├── hydration/stale-session notices
    ├── IndexedDB hydration + persistence subscription
    └── route shell
        ├── focused route: Welcome / Study / LessonPage
        └── AppShell
            ├── desktop sidebar
            ├── mobile navigation
            └── Today / Library / Results / Settings page

LessonPage
└── LessonExperience
    ├── LessonVideoScreen
    ├── CueCardCarousel
    │   └── PhraseAudioButton / ThaiAudioButton
    ├── PracticeQuiz
    │   └── PhraseAudioButton / ConceptAudioButton
    └── unscored PracticeComplete

StudyPage
├── LessonExperience for introduction video/cards
├── retrieval stage
├── durable quiz stage
│   ├── choice question
│   ├── phrase construction
│   └── matching
└── results/empty states
```

`LessonExperience` and `/study` are intentionally separate product modes. The former is an unscored, disposable preview available from the Library; the latter is the durable curriculum flow that changes progress, reviews, attempts, and streaks.

### State and persistence lifecycle

```text
AppProviders mounts
      │
      ├─ readSnapshot(defaultSnapshot)
      │       └─ Zod parse + curriculum reconciliation
      │
      ├─ hydrate Zustand
      │
      └─ subscribe to all store changes
              └─ snapshotFromState → writeSnapshot → Dexie tables

Today selects action
      └─ start* builds deterministic queue/session
              └─ write snapshot and navigate to /study

Study answers question
      └─ store updates activeSession/answers
              └─ persistence subscription writes local record

finishSession
      └─ creates completed session, attempts, progress, review states, streak
              └─ /results reads last completed session
```

Durable records are schema version 3. Settings, lesson progress, review states, attempts, completed sessions, active sessions, streak, and last-result metadata are stored locally. Import/export passes through `AppSnapshotSchema` and curriculum reconciliation.

## 3. Main code pain points and anti-patterns

Only the three highest-impact examples are listed below.

### 1. Whole-store persistence plus full-table replacement

In [`AppProviders.tsx`](../src/components/AppProviders.tsx#L25), the app subscribes to every Zustand state update, serializes a complete snapshot, and queues `writeSnapshot`. In [`db.ts`](../src/data/db.ts#L108), every write clears five tables and bulk-inserts the complete snapshot again.

Why this is the worst persistence issue:

- A small preference change can rewrite all progress, attempts, sessions, and review rows.
- A quiz answer can trigger a full multi-table transaction even when only the active session changed.
- The initial write at line 32 is not put on the same `writeChain` as later writes, so a fast state update can race with the initial snapshot write.
- Repeated writes make IndexedDB failures harder to attribute and increase the cost of future larger curricula.

Better direction: make persistence event-driven or diff-based. At minimum, put the initial write on the same queue and debounce/coalesce changes. Longer term, persist normalized table deltas or write one versioned snapshot record atomically, rather than clearing and rebuilding every table for every mutation.

### 2. Circular curriculum dependency and repeated whole-curriculum validation

[`seed.ts`](../src/domain/seed.ts#L1) imports `lessonIsReleaseReady` and `validateCurriculum` from `curriculum-validation.ts`; [`curriculum-validation.ts`](../src/domain/curriculum-validation.ts#L11) imports default lessons and cards back from `seed.ts`. The cycle happens to work under the current bundler, but it makes module initialization and future refactors fragile.

The cost is compounded by this implementation:

- `studyLessons` calls `lessonIsReleaseReady` once per lesson.
- `lessonIsReleaseReady` calls `validateCurriculum(curriculum, cards)` for the entire curriculum, not just the candidate lesson.
- `isSessionCompatible` repeats the same whole-curriculum readiness check while reconciling sessions.

This makes a per-lesson question read like a global publication check and couples low-level validation to bundled runtime data. Better direction: move pure validation into a dependency-free module; pass explicit data from callers; compute one immutable validation report; then expose `readyLessonIds` or per-lesson issue maps from that report.

### 3. Permissive answer shapes and duplicated, incomplete grading

[`QuizQuestionSchema`](../src/domain/schemas.ts#L26) makes every answer representation optional: choices, construction tokens, correct construction, matching pairs, and audio can coexist or all be absent. The actual interaction rules are deferred to `questionIssues` in [`curriculum-validation.ts`](../src/domain/curriculum-validation.ts#L54), while `SessionAnswerSchema` also permits several answer forms and stores a client-computed `correct` boolean.

The most concrete correctness risk is matching. Both [`gradeMatching`](../src/engine/learning-engine.ts#L198) and the persisted compatibility check use an `every(expected).some(answer)` comparison. They check array length, but do not enforce a one-to-one mapping. A forged or malformed answer with duplicate pairs can therefore satisfy the length check while not representing a valid permutation. The same grading rules are duplicated in the live engine and persistence validator.

Better direction: use a discriminated Zod union keyed by interaction type, make answer payloads type-specific, recompute correctness from the question and queue permutation, and validate matching as a bijection with unique left/right entries. Treat any stored `correct` field as derived data rather than trusted input.

### Secondary friction worth addressing later

- `LessonVideoScreen.tsx` is 336 lines and contains several intertwined playback, gesture, retry, error, and presentation concerns; extract a small media state machine before adding more playback modes.
- `study.tsx` is 172 lines with several dense inline JSX question renderers. Separate choice, construction, and matching question components would make accessibility and state ownership easier to reason about.
- `TodayPage`, `StudyPage`, and `ResultsPage` use broad `useStudyStore()` selections in places. Narrow selectors would reduce unrelated rerenders and make component dependencies explicit.
- Many hot paths repeatedly call `find` over lessons/cards/questions. At the current 23/102 scale this is acceptable, but a derived curriculum index would remove repeated lookup logic.
- CI workflows run `npm run build`, whose prebuild hook validates and typechecks, but they do not run the full lint/test suite. A green deployment is therefore weaker than a green local `npm run check`.
- Playwright CLI is now installed, but there is no `playwright.config.*`, browser test directory, or `npm run check:browser` wrapper. The browser QA skill is present, but a new machine still has to infer the exact server/session workflow.

## 4. Agentic configuration improvements

The goal should be to make the repository’s local instructions a reliable map: short root rules, linked deep documentation, deterministic checks, and explicit danger boundaries.

### Root `AGENTS.md`

The existing file is a good start: it defines the Sol/Terra parent and Luna browser-QA roles, requires typechecking, and discourages generic UI tests. Add a short project map rather than turning the file into a second README:

```md
## Project map
- `src/domain/`: schemas, curriculum validation, pronunciation algorithms
- `src/engine/`: deterministic queues, mastery/review rules, local dates
- `src/state/`: Zustand snapshot and session transitions
- `src/data/`: Dexie persistence and import/export boundary
- `src/pages/` and `src/components/`: static route UI
- `src/content/`: source curriculum registries; draft and reviewed are distinct
- `public/lessons/drafts/`: preview media and generated draft audio
- `scripts/` and `tools/`: authoring/review pipeline, not browser runtime

## Source-of-truth rules
- Do not treat draft content as publishable.
- Do not invent Thai text or substitute remote audio.
- Reviewed lessons require the validator and local media gate.
- Static GitHub Pages media is public; confirm permission before publishing.
- Raw MP4s, audio, manifests, and reports may be generated/duplicated; verify hashes and references before deleting.

## Definition of done
- `npm run validate:curriculum`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `NEXT_PUBLIC_BASE_PATH=/Noklingo npm run build` for release-path changes
- Browser QA for meaningful UI changes via `.agents/skills/browser-qa/SKILL.md`
```

Also link the canonical deep references from `AGENTS.md`:

- `docs/CURRICULUM_AUTHORING.md`
- a new `docs/ARCHITECTURE.md` for route/state/component ownership;
- a new `docs/LEARNING_ENGINE.md` for session stages, mastery, review intervals, and deterministic queue rules;
- a new `docs/RELEASE_CHECKLIST.md` for media permission, static output, Pages base paths, and PWA checks;
- a new `docs/AGENT_WORKFLOW.md` for safe dry-run/apply commands and when to request confirmation.

Keep `AGENTS.md` stable and navigational. Put changing content counts and generated artifact details in the linked reports/docs.

### Project skills

Keep `.agents/skills/browser-qa/SKILL.md` as the canonical project skill. It is appropriately scoped and already calls out snapshots, edge states, console/network checks, isolated sessions, and close-out.

Useful additional skills:

| Skill | Trigger | What it should enforce |
|---|---|---|
| `lesson-content-review` | Lesson JSON, screenshots, transcript, or intake package changes | Draft-vs-reviewed rules, no inferred Thai, source permission, cue-card/question coverage, and dry-run importer first. |
| `static-release-check` | Build, service worker, asset-path, Pages, or PWA changes | Base-path build, finalizer, route/manifest/SW reference checks, and public-media warning. |
| `state-schema-change` | `schemas.ts`, Dexie tables, snapshot version, or reconciliation changes | Version bump decision, import/export compatibility, stale-session handling, migration tests, and reset semantics. |
| `repo-cleanup-audit` | Deleting assets, generated reports, media, or folders | Reference scan, hash comparison, generator output check, licensing/source decision, and no broad deletion without confirmation. |

Each skill should be short, executable, and link to one source of truth. Do not maintain the generic `.claude/skills/playwright-cli` instructions and the NokLingo browser skill as competing definitions of UI completion.

### MCPs and external tools

No new MCP is required for the core development loop. The repository already has deterministic local commands, machine-readable JSON, Vitest, TypeScript, and a browser CLI. Adding an MCP that mirrors curriculum files would add another source of truth.

Optional additions only when the workflow justifies them:

- GitHub connector/MCP, read-only by default, for workflow logs, Pages deployment status, PR checks, and preview diagnosis. Keep comments, pushes, and deployment writes confirmation-gated.
- Browser/CDP connector only if the environment cannot reliably run the installed Playwright CLI. Avoid two competing browser workflows.
- Figma connector only if Figma becomes an actual design input.
- A custom curriculum MCP is premature. First expose stable scripts such as `lesson:readiness`, curriculum validation, and finalizer reports.

Add a small `check:browser` script once browser tests exist. It should start the app with a known port, run the focused smoke suite, collect console/request failures, and cleanly stop the server. That is more reproducible for agents than a prose-only instruction to guess a port.

### Zed configuration and scan exclusions

Zed project instructions should remain `AGENTS.md`; project-local skills belong under `.agents/skills/`. Zed’s project scan exclusions are separate from Git ignore rules. Add a project `.zed/settings.json` only if you want the scan policy shared with collaborators.

Use a `file_scan_exclusions` list for heavy/generated paths. Because defining this setting can replace defaults, retain Zed’s standard exclusions and add the repository-specific entries:

```json
{
  "file_scan_exclusions": [
    "**/.git",
    "**/.svn",
    "**/.hg",
    "**/.bzr",
    "**/_darcs",
    "**/.DS_Store",
    "**/.classpath",
    "**/.settings",
    "**/node_modules",
    "**/.next",
    "**/.vinext",
    "**/dist",
    "**/.npm-cache",
    "**/.playwright",
    "**/.playwright-cli",
    "**/.pw-sockets",
    "**/content-inbox",
    "**/tools/pronunciation-generator/.cache",
    "**/tools/pronunciation-generator/.venv",
    "**/insta/*.mp4",
    "**/public/lessons/drafts/**/*.mp4",
    "**/public/lessons/drafts/**/*.m4a"
  ]
}
```

Keep these in scan scope:

- `AGENTS.md` and `.agents/skills/`;
- `README.md`, `docs/`, `package.json`, workflows, and config;
- `src/`, `scripts/`, and the JSON source registries;
- small manifests/reports needed to understand content generation.

### Codex ignore policy

There is no repository-specific Codex config or dedicated Codex ignore file currently. Use `.gitignore` as the shared baseline, and keep Codex-specific behavior in `AGENTS.md` and project skills. If local Codex state is created in the repository, ignore it rather than allowing it into context or commits.

The current `.gitignore` already covers `node_modules`, build output, `content-inbox`, the pronunciation virtualenv/cache, and both `.playwright/` and `.playwright-cli/`. Consider adding the remaining local/noisy paths:

```gitignore
/.codex/
/.claude/
/.pw-sockets/
/insta/*.mp4
/reports/generated/
/AGENTS.override.md
```

Decide the `.claude/` rule based on intent: keep it tracked if it is a shared Claude workflow; ignore it if it is a personal duplicate of `.agents/skills`. Do not ignore the shared `.agents/skills/browser-qa/` skill unless it is intentionally personal.

Do not ignore the following, because agents need them as context or they are product inputs:

- `AGENTS.md`, `README.md`, and `docs/`;
- `src/`, `src/content/`, and `scripts/`;
- reviewed/draft media that is intentionally shipped;
- `.agents/skills/` when the Luna workflow is shared;
- release workflows and package lockfiles.

### Safe command policy

Agents should be able to run read-only inspection, validation, dry-run imports, typecheck, lint, tests, and builds automatically. Require explicit confirmation before:

- `lesson:import --apply` or `lesson:import-all --apply`;
- pronunciation migration with `--apply`;
- deleting raw media, generated manifests, reports, or whole folders;
- changing permission/licensing metadata for public media;
- resetting local study data in a real browser profile;
- pushing, deploying, or modifying GitHub Pages artifacts.

## Recommended order of improvements

1. Consolidate `.agents` and `.claude` browser instructions; add a reproducible `check:browser` path.
2. Add the root project map and the four focused docs listed above.
3. Refactor validation into a pure module with one cached curriculum report.
4. Fix persistence write ordering, then reduce full-snapshot rewrites.
5. Replace permissive question/answer schemas with discriminated unions and bijective matching validation.
6. Decide the authoritative MP4 location and remove only verified duplicates.
7. Add CI lint and unit-test execution before build/deploy, then add browser smoke coverage.

This sequence improves agent context and correctness without blocking the immediate curriculum-review work that is currently keeping all scored lessons unpublished.
