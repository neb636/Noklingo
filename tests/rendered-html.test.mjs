import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the branded Noklingo app shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Noklingo — Remember the Thai you learn<\/title>/i);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /rel="apple-touch-icon"/);
  assert.match(html, /apple-touch-icon\.png/);
  assert.match(html, /Getting today’s Thai ready/);
  assert.match(html, /og-course-one\.png/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|Starter Project/);
});

test("keeps curriculum, persistence, and PWA support separated", async () => {
  const [page, curriculum, database, serviceWorker, manifest, app] =
    await Promise.all([
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(
        new URL("../src/content/curriculum.ts", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../src/lib/db.ts", import.meta.url), "utf8"),
      readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
      readFile(
        new URL("../public/manifest.webmanifest", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../src/features/app/NoklingoApp.tsx", import.meta.url),
        "utf8",
      ),
    ]);

  assert.match(page, /<NoklingoApp \/>/);
  assert.match(curriculum, /lesson\.everyday-thai/);
  assert.match(curriculum, /sourceStatus: "draft-placeholder"/);
  assert.match(curriculum, /intro\.mp4/);
  assert.match(database, /this\.version\(3\)/);
  assert.match(database, /previous learning system.*cannot be imported/is);
  assert.match(serviceWorker, /noklingo-shell-v3/);
  assert.match(serviceWorker, /headers\.has\("Range"\)/);
  assert.match(app, /TodayRoute/);
  assert.match(app, /StudyRoute/);
  assert.match(app, /LibraryRoute/);
  assert.match(app, /ResultsRoute/);
  assert.match(manifest, /"display": "standalone"/);
  assert.match(manifest, /"sizes": "192x192"/);
  assert.match(manifest, /"sizes": "512x512"/);

  await assert.rejects(
    access(
      new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url),
    ),
  );
  await assert.rejects(
    access(new URL("../app/chatgpt-auth.ts", import.meta.url)),
  );
  await assert.rejects(access(new URL("../db/index.ts", templateRoot)));
});

test("ships the v3 learner-facing safeguards and locked library flow", async () => {
  const [today, study, results, library] = await Promise.all([
    readFile(
      new URL("../src/features/today/TodayRoute.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/features/study/StudyRoute.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/features/results/ResultsRoute.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/features/library/LibraryRoute.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  for (const state of [
    "resume",
    "mastery",
    "waiting",
    "new",
    "review",
    "complete",
  ]) {
    assert.match(today, new RegExp(`${state}:`));
  }
  assert.match(study, /<video/);
  assert.match(study, /playsInline/);
  assert.match(study, /Continue without video/);
  assert.match(study, /Answers are reviewed together\s+after the\s+quiz/);
  assert.match(results, /You need 9 of 10 active-lesson questions/);
  assert.match(results, /Cue cards to revisit/);
  assert.match(library, /future videos stay private until unlocked/);
  assert.match(
    library,
    /Master this lesson before replaying it|Master the previous lesson/,
  );
});
