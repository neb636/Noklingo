import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import draftCardsJson from "../src/content/draft-cue-cards.json";
import draftLessonsJson from "../src/content/draft-reels.json";
import type { PronunciationIndex } from "../src/domain/pronunciation";

const apply = process.argv.includes("--apply");
const force = process.argv.includes("--force");
const repoRoot = resolve(import.meta.dirname, "..");
const generator = join(repoRoot, "scripts", "generate-pronunciation.ts");
const metadataBefore = metadataHash();
const legacy = legacyAudioFiles();
const historicalLegacyById = historicalLegacyAudio();

console.log(`Dual-audio migration inventory: ${draftLessonsJson.lessons.length} lessons, ${draftCardsJson.cueCards.length} concepts, ${legacy.length} legacy clips.`);
const generatorArgs = ["--import", "tsx", generator, "--all", ...(apply ? [] : ["--dry-run"]), ...(force ? ["--force"] : [])];
const generated = spawnSync(process.execPath, generatorArgs, { cwd: repoRoot, stdio: "inherit" });
if (generated.status !== 0) process.exit(generated.status ?? 1);
if (!apply) {
  console.log("Migration dry run complete. Add --apply to write pairs, verify replacements, and remove validated legacy clips.");
  process.exit(0);
}

if (metadataHash() !== metadataBefore) throw new Error("Lesson or cue-card editorial metadata changed during audio migration.");
const index = JSON.parse(readFileSync(join(repoRoot, "src", "content", "pronunciation-manifest.json"), "utf8")) as PronunciationIndex;
if (index.version !== 2 || index.lessons.length !== draftLessonsJson.lessons.length) throw new Error("Generated pronunciation index is incomplete.");
const entries = index.lessons.flatMap((lesson) => lesson.clips.map((clip) => ({ lessonId: lesson.lessonId, ...clip })));
if (entries.length !== draftCardsJson.cueCards.length || new Set(entries.map((clip) => clip.cueCardId)).size !== entries.length) throw new Error("Migration did not preserve the complete concept ID inventory.");

const report = entries.map((clip) => ({
  lessonId: clip.lessonId,
  cueCardId: clip.cueCardId,
  legacyAudio: historicalLegacyById.get(clip.cueCardId) ?? null,
  pairStatus: clip.pairStatus,
  thai: { audio: clip.thai.audio, start: clip.thai.start, end: clip.thai.end, confidence: clip.thai.confidence, status: clip.thai.status, diagnostic: clip.thai.diagnostic },
  english: { audio: clip.english.audio, start: clip.english.start, end: clip.english.end, confidence: clip.english.confidence, status: clip.english.status, diagnostic: clip.english.diagnostic },
  requiresOverride: clip.pairStatus !== "complete",
}));
writeFileSync(join(repoRoot, "dual-audio-migration-report.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), concepts: report }, null, 2)}\n`);

for (const clip of entries) {
  for (const path of [clip.thai.audio, clip.english.audio].filter((value): value is string => Boolean(value))) {
    const file = join(repoRoot, "public", path.replace(/^\/+/, ""));
    if (!existsSync(file)) throw new Error(`Generated audio is missing: ${path}`);
    const duration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file], { encoding: "utf8" }).trim());
    if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Generated audio is not playable: ${path}`);
  }
}

const legacyWithoutThaiReplacement = legacy.filter((file) => !entries.find((clip) => clip.cueCardId === basename(file, ".m4a"))?.thai.audio);
if (legacyWithoutThaiReplacement.length) {
  throw new Error(`${legacyWithoutThaiReplacement.length} legacy clips do not yet have a validated Thai replacement. Add reviewed overrides, rerun generation, and retry migration; no legacy files were removed.`);
}
for (const file of legacy) rmSync(file);
console.log(`Migration verified ${entries.length} concepts and removed ${legacy.length} replaced legacy clips. Review dual-audio-migration-report.json for incomplete new concepts.`);

function legacyAudioFiles() {
  const files: string[] = [];
  for (const lesson of draftLessonsJson.lessons) {
    const directory = join(repoRoot, "public", "lessons", "drafts", lesson.id, "audio");
    if (!existsSync(directory)) continue;
    for (const name of readdirSync(directory)) if (name.endsWith(".m4a") && !/-(?:th|en)\.m4a$/.test(name)) files.push(join(directory, name));
  }
  return files.sort();
}

function metadataHash() {
  return createHash("sha256").update(JSON.stringify({ lessons: draftLessonsJson.lessons, cueCards: draftCardsJson.cueCards })).digest("hex");
}

function historicalLegacyAudio() {
  const paths = new Map<string, string>();
  const reportPath = join(repoRoot, "dual-audio-migration-report.json");
  if (existsSync(reportPath)) {
    const previous = JSON.parse(readFileSync(reportPath, "utf8")) as { concepts?: Array<{ cueCardId: string; legacyAudio?: string | null }> };
    for (const concept of previous.concepts ?? []) if (concept.legacyAudio) paths.set(concept.cueCardId, concept.legacyAudio);
  }
  const tracked = spawnSync("git", ["ls-files", "public/lessons/drafts/*/audio/*.m4a"], { cwd: repoRoot, encoding: "utf8" });
  if (tracked.status === 0) for (const file of tracked.stdout.split("\n").filter(Boolean)) {
    const name = basename(file, ".m4a");
    if (!/-(?:th|en)$/.test(name)) paths.set(name, `/${file.replace(/^public\//, "")}`);
  }
  return paths;
}
