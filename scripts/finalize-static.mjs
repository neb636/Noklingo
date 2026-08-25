import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  rmdir,
  writeFile,
} from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";

const output = join(process.cwd(), "dist", "client");
const routes = ["today", "study", "results", "library", "progress", "settings"];
const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH ?? "");
const baseSegments = basePath ? basePath.slice(1).split("/") : [];
const viewportTag = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" data-next-head="" />';
const compressedExtensions = new Set([".br", ".gz", ".zst", ".map"]);

await normalizeVinextAssetLayout();

for (const route of routes) {
  const source = join(output, `${route}.html`);
  const rawHtml = await readFile(source, "utf8");
  if (!rawHtml.includes("__NEXT_DATA__") || /http-equiv=["']refresh/i.test(rawHtml)) {
    throw new Error(`Refusing to publish an invalid static page: ${route}.html`);
  }

  const html = normalizeViewport(rawHtml);
  const directory = join(output, route);
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(source, html),
    writeFile(join(directory, "index.html"), html),
  ]);
}

await normalizeViteMetadata();
await finalizeManifestIdentity();

const staticFiles = (await walkFiles(join(output, "_next", "static")))
  .filter((filePath) => !compressedExtensions.has(extname(filePath)))
  .map((filePath) => toPosix(relative(output, filePath)))
  .sort();

if (!staticFiles.length) {
  throw new Error("Static build emitted no hashed client assets.");
}

const precachePaths = [
  "./",
  ...routes.map((route) => `./${route}/`),
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  ...staticFiles.map((filePath) => `./${filePath}`),
];

// Stable lesson asset URLs are cached on demand, so their bytes must also
// participate in the build revision even though large videos are never
// precached or runtime-cached by this worker.
const runtimeRevisionPaths = (await walkFiles(join(output, "lessons")))
  .filter((filePath) => !compressedExtensions.has(extname(filePath)))
  .filter((filePath) => !filePath.toLowerCase().endsWith(".mp4"))
  .map((filePath) => `./${toPosix(relative(output, filePath))}`)
  .sort();
const revisionPaths = [...new Set([...precachePaths, ...runtimeRevisionPaths])];

if (precachePaths.some((path) => path.toLowerCase().endsWith(".mp4"))) {
  throw new Error("MP4 files must never enter the application-shell precache.");
}

for (const path of precachePaths) {
  await assertPrecacheTarget(path);
}

const swPath = join(output, "sw.js");
const swTemplate = await readFile(swPath, "utf8");
const revision = await buildRevision(revisionPaths, swTemplate);
const generatedWorker = injectServiceWorkerManifest(swTemplate, revision, precachePaths);
await writeFile(swPath, generatedWorker);

await validateManifest();
await validateHtmlReferences();

console.log(
  `Prepared ${routes.length} GitHub Pages routes and ${precachePaths.length} offline shell assets `
  + `for ${basePath || "/"} (revision ${revision}).`,
);

function normalizeBasePath(value) {
  if (!value || value === "/") return "";
  if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.includes("?") || value.includes("#")) {
    throw new Error(`NEXT_PUBLIC_BASE_PATH must be a URL path, received: ${value}`);
  }
  const segments = value.split("/").filter(Boolean);
  if (!segments.length || segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error(`NEXT_PUBLIC_BASE_PATH contains an unsafe segment: ${value}`);
  }
  return `/${segments.join("/")}`;
}

async function normalizeVinextAssetLayout() {
  const rootAssets = join(output, "_next");
  if (!baseSegments.length) {
    if (!(await exists(rootAssets))) throw new Error("Static build is missing dist/client/_next.");
    return;
  }

  const nestedAssets = join(output, ...baseSegments, "_next");
  const hasNestedAssets = await exists(nestedAssets);
  const hasRootAssets = await exists(rootAssets);

  if (hasNestedAssets && hasRootAssets) {
    throw new Error("Static build emitted both root and path-prefixed _next trees; refusing an ambiguous artifact.");
  }
  if (!hasNestedAssets && !hasRootAssets) {
    throw new Error(`Static build is missing its _next tree for base path ${basePath}.`);
  }
  if (hasNestedAssets) {
    await rename(nestedAssets, rootAssets);
  }

  // Remove only now-empty path-prefix directories. Any unrelated generated
  // content prevents removal and is left untouched.
  for (let depth = baseSegments.length; depth > 0; depth -= 1) {
    try {
      await rmdir(join(output, ...baseSegments.slice(0, depth)));
    } catch (error) {
      if (error?.code !== "ENOTEMPTY" && error?.code !== "EEXIST" && error?.code !== "ENOENT") throw error;
    }
  }
}

function normalizeViewport(html) {
  const withoutViewport = html.replace(
    /<meta\b(?=[^>]*\bname=["']viewport["'])[^>]*\/?\s*>/gi,
    "",
  );
  const headMatch = withoutViewport.match(/<head(?:\s[^>]*)?>/i);
  if (!headMatch) throw new Error("Static page has no <head> element.");
  return withoutViewport.replace(headMatch[0], `${headMatch[0]}${viewportTag}`);
}

async function normalizeViteMetadata() {
  if (!baseSegments.length) return;
  const metadataFiles = [
    join(output, ".vite", "manifest.json"),
    join(output, ".vite", "ssr-manifest.json"),
    join(output, "vinext-client-entry-manifest.json"),
  ];
  const diskPrefix = `${baseSegments.join("/")}/_next/`;

  for (const filePath of metadataFiles) {
    if (!(await exists(filePath))) continue;
    const json = await readFile(filePath, "utf8");
    await writeFile(filePath, json.replaceAll(diskPrefix, "_next/"));
  }
}

async function finalizeManifestIdentity() {
  const manifestPath = join(output, "manifest.webmanifest");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.id = basePath ? `${basePath}/` : "/";
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function buildRevision(paths, swTemplate) {
  const hash = createHash("sha256");
  hash.update(swTemplate);
  for (const path of paths) {
    const filePath = artifactPathForPrecache(path);
    hash.update("\0");
    hash.update(path);
    hash.update("\0");
    hash.update(await readFile(filePath));
  }
  return hash.digest("hex").slice(0, 16);
}

function injectServiceWorkerManifest(template, revision, paths) {
  const revisionToken = "__THAI_STUDY_BUILD_REVISION__";
  const precacheToken = "/* __THAI_STUDY_PRECACHE_PATHS__ */ []";
  if (countOccurrences(template, revisionToken) !== 1 || countOccurrences(template, precacheToken) !== 1) {
    throw new Error("Service-worker build tokens are missing or duplicated.");
  }
  const generated = template
    .replace(revisionToken, revision)
    .replace(precacheToken, JSON.stringify(paths, null, 2));
  if (generated.includes(revisionToken) || generated.includes("__THAI_STUDY_PRECACHE_PATHS__")) {
    throw new Error("Service-worker build tokens were not fully replaced.");
  }
  return generated;
}

async function validateManifest() {
  const manifestPath = join(output, "manifest.webmanifest");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const expectedIdentity = basePath ? `${basePath}/` : "/";
  if (manifest.id !== expectedIdentity) {
    throw new Error(`PWA identity does not match the built scope: ${manifest.id}`);
  }
  const references = [manifest.id, manifest.start_url, manifest.scope, ...(manifest.icons ?? []).map((icon) => icon.src)];
  for (const reference of references) {
    if (typeof reference !== "string") throw new Error("PWA manifest contains a missing URL field.");
    await assertPublishedUrl(reference, `${basePath || ""}/manifest.webmanifest`);
  }
}

async function validateHtmlReferences() {
  const htmlFiles = (await walkFiles(output)).filter((filePath) => extname(filePath) === ".html");
  for (const filePath of htmlFiles) {
    const html = await readFile(filePath, "utf8");
    const relativePath = toPosix(relative(output, filePath));
    const pagePath = `${basePath}/${relativePath}`.replaceAll("//", "/");
    const references = new Set();
    for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) references.add(match[1]);
    for (const match of html.matchAll(/"(?:pageModuleUrl|appModuleUrl)":"([^"]+)"/g)) references.add(match[1]);
    for (const reference of references) await assertPublishedUrl(reference, pagePath);
  }
}

async function assertPublishedUrl(reference, pagePath) {
  if (!reference || reference.startsWith("#") || /^(?:data|blob|mailto|tel|javascript):/i.test(reference)) return;
  const pageUrl = new URL(pagePath, "https://static.example");
  const url = new URL(reference.replaceAll("&amp;", "&"), pageUrl);
  if (url.origin !== pageUrl.origin) return;

  const relativeUrlPath = stripPublishedBasePath(url.pathname);
  const candidates = artifactCandidates(relativeUrlPath);
  for (const candidate of candidates) {
    if (await exists(candidate)) return;
  }
  throw new Error(`Static URL does not map to the published artifact: ${reference} (from ${pagePath})`);
}

function stripPublishedBasePath(pathname) {
  if (!basePath) return pathname.replace(/^\/+/, "");
  if (pathname === basePath || pathname === `${basePath}/`) return "";
  if (!pathname.startsWith(`${basePath}/`)) {
    throw new Error(`Internal URL escapes configured base path ${basePath}: ${pathname}`);
  }
  return pathname.slice(basePath.length + 1);
}

function artifactCandidates(relativeUrlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(relativeUrlPath);
  } catch {
    throw new Error(`Static URL contains invalid percent encoding: ${relativeUrlPath}`);
  }
  const segments = decoded.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error(`Static URL contains an unsafe path segment: ${relativeUrlPath}`);
  }
  if (!segments.length) return [join(output, "index.html")];

  const exact = join(output, ...segments);
  if (relativeUrlPath.endsWith("/")) return [join(exact, "index.html")];
  if (extname(segments.at(-1))) return [exact];
  return [exact, `${exact}.html`, join(exact, "index.html")];
}

async function assertPrecacheTarget(path) {
  const target = artifactPathForPrecache(path);
  if (!(await exists(target))) throw new Error(`Precache URL has no artifact target: ${path}`);
}

function artifactPathForPrecache(path) {
  if (!path.startsWith("./")) throw new Error(`Precache URL must be scope-relative: ${path}`);
  const relativePath = path.slice(2);
  if (!relativePath) return join(output, "index.html");
  const segments = relativePath.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error(`Unsafe precache path: ${path}`);
  }
  return path.endsWith("/") ? join(output, ...segments, "index.html") : join(output, ...segments);
}

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function toPosix(path) {
  return path.split(sep).join("/");
}

function countOccurrences(value, needle) {
  return value.split(needle).length - 1;
}
