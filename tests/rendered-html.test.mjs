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
  assert.match(
    html,
    /<title>Noklingo — Speak Thai, little by little<\/title>/i,
  );
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /Warming up your Thai/);
  assert.match(html, /og\.png/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|Starter Project/);
});

test("keeps curriculum, persistence, and PWA support separated", async () => {
  const [page, course, database, serviceWorker, manifest] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/content/course.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/db.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    readFile(
      new URL("../public/manifest.webmanifest", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(page, /<NoklingoApp \/>/);
  assert.match(course, /warm-welcome/);
  assert.match(course, /tasty-thai/);
  assert.match(database, /IndexedDB|Dexie|noklingo/i);
  assert.match(serviceWorker, /CACHE_VERSION/);
  assert.match(manifest, /"display": "standalone"/);

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
