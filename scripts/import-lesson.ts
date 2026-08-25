import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { CueCardSchema, VideoLessonSchema } from "../src/domain/schemas";

const args = process.argv.slice(2);
const packageArg = args.find((arg) => !arg.startsWith("--"));
const apply = args.includes("--apply");
if (!packageArg) {
  console.error("Usage: npm run lesson:import -- content-inbox/<lesson-id> [--apply]");
  process.exit(1);
}

const packageDir = resolve(packageArg);
const definitionPath = join(packageDir, "lesson.json");
const sourcePath = join(packageDir, "source.mp4");
const captionsPath = join(packageDir, "captions.vtt");
for (const required of [definitionPath, sourcePath, captionsPath]) {
  if (!existsSync(required)) throw new Error(`Missing required package file: ${required}`);
}

const raw = JSON.parse(readFileSync(definitionPath, "utf8"));
const lesson = VideoLessonSchema.parse(raw.lesson);
const cueCards = CueCardSchema.array().parse(raw.cueCards);
if (cueCards.length < 5 || cueCards.length > 10) throw new Error("A lesson package requires 5–10 cue cards.");
if (new Set(cueCards.map((card) => card.id)).size !== cueCards.length) throw new Error("Cue-card ids must be unique within a package.");
if (cueCards.some((card) => card.lessonId !== lesson.id) || lesson.cueCardIds.some((id) => !cueCards.some((card) => card.id === id))) throw new Error("Cue-card lesson ids and references must match the packaged lesson.");
if (lesson.quizBank.filter((question) => question.scored).length < 10) throw new Error("A lesson package requires at least ten scored questions.");
if (lesson.contentStatus !== "verified") throw new Error("Only reviewed packages marked verified may be imported.");
if (lesson.source?.permissionStatus !== "authorized") throw new Error("A verified package requires an authorized source record.");
if (lesson.media.availability !== "available") throw new Error("Imported lesson media must be marked available.");
if (spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status !== 0) throw new Error("ffmpeg is required to normalize lesson media.");

console.log(`Validated ${lesson.id}: ${cueCards.length} cue cards, ${lesson.quizBank.filter((question) => question.scored).length} scored questions.`);
if (!apply) {
  console.log("Dry run complete. Add --apply to normalize media and update the curriculum registry.");
  process.exit(0);
}

const repoRoot = resolve(import.meta.dirname, "..");
const mediaDir = join(repoRoot, "public", "lessons", lesson.id);
mkdirSync(mediaDir, { recursive: true });
execFileSync("ffmpeg", ["-y", "-i", sourcePath, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", join(mediaDir, "intro.mp4")], { stdio: "inherit" });
execFileSync("ffmpeg", ["-y", "-ss", "00:00:01", "-i", sourcePath, "-frames:v", "1", "-q:v", "2", join(mediaDir, "poster.jpg")], { stdio: "inherit" });
cpSync(captionsPath, join(mediaDir, "captions.vtt"));
const audioDir = join(packageDir, "audio");
if (existsSync(audioDir)) cpSync(audioDir, join(mediaDir, "audio"), { recursive: true });

const registryPath = join(repoRoot, "src", "content", "lesson-packages.json");
const registry = JSON.parse(readFileSync(registryPath, "utf8")) as { lessons: unknown[]; cueCards: unknown[] };
registry.lessons = [...registry.lessons.filter((entry) => (entry as { id?: string }).id !== lesson.id), lesson].sort((a, b) => (a as { order: number }).order - (b as { order: number }).order);
const packageCardIds = new Set(cueCards.map((card) => card.id));
registry.cueCards = [...registry.cueCards.filter((entry) => !packageCardIds.has((entry as { id: string }).id)), ...cueCards];
writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Imported ${basename(packageDir)} into public/lessons/${lesson.id} and updated the curriculum registry.`);
