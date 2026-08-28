import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { validateCurriculum } from "../src/domain/curriculum-validation";
import { CueCardSchema, VideoLessonSchema, type CueCard, type VideoLesson } from "../src/domain/schemas";

const args = process.argv.slice(2);
const rootArg = args.find((arg) => !arg.startsWith("--"));
const apply = args.includes("--apply");
if (!rootArg) {
  console.error("Usage: npm run lesson:import-all -- content-inbox [--apply]");
  process.exit(1);
}

const intakeRoot = resolve(rootArg);
if (!existsSync(intakeRoot) || !statSync(intakeRoot).isDirectory()) throw new Error(`Lesson intake directory not found: ${intakeRoot}`);
const packageDirs = readdirSync(intakeRoot)
  .map((name) => join(intakeRoot, name))
  .filter((path) => statSync(path).isDirectory() && existsSync(join(path, "lesson.json")))
  .sort();
if (!packageDirs.length) throw new Error(`No lesson packages found below ${intakeRoot}.`);

const repoRoot = resolve(import.meta.dirname, "..");
const registryPath = join(repoRoot, "src", "content", "lesson-packages.json");
const registry = JSON.parse(readFileSync(registryPath, "utf8")) as { lessons: unknown[]; cueCards: unknown[] };
const existingLessons = VideoLessonSchema.array().parse(registry.lessons);
const existingCards = CueCardSchema.array().parse(registry.cueCards);
const packageLessons: VideoLesson[] = [];
const packageCards: CueCard[] = [];
const suppliedAssets = new Set<string>();

for (const packageDir of packageDirs) {
  const result = spawnSync(process.execPath, ["--import", "tsx", join(repoRoot, "scripts", "import-lesson.ts"), packageDir], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `Dry run failed: ${packageDir}`);
  process.stdout.write(result.stdout);

  const raw = JSON.parse(readFileSync(join(packageDir, "lesson.json"), "utf8"));
  const lesson = VideoLessonSchema.parse(raw.lesson);
  const cards = CueCardSchema.array().parse(raw.cueCards);
  packageLessons.push(lesson);
  packageCards.push(...cards);
  suppliedAssets.add(lesson.media.videoSrc);
  suppliedAssets.add(lesson.media.posterSrc);
  for (const path of [...cards.flatMap((card) => [card.thaiAudioSrc, card.englishAudioSrc]), ...lesson.quizBank.map((question) => question.audioSrc)]) {
    if (path) suppliedAssets.add(path);
  }
}

const replacing = new Set(packageLessons.map((lesson) => lesson.id));
const nextLessons = [...existingLessons.filter((lesson) => !replacing.has(lesson.id)), ...packageLessons]
  .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
const nextCards = [...existingCards.filter((card) => !replacing.has(card.lessonId)), ...packageCards];
const publicRoot = join(repoRoot, "public");
const issues = validateCurriculum(nextLessons, nextCards, {
  assetExists: (localPath) => suppliedAssets.has(localPath) || safePublicAssetExists(localPath),
});
if (issues.length) throw new Error(issues.map((issue) => `${issue.lessonId}: ${issue.message}`).join("\n"));

console.log(`Validated complete intake: ${packageLessons.length} lessons and ${packageCards.length} cue cards.`);
if (!apply) {
  console.log("Batch dry run complete. Add --apply to install every validated package.");
  process.exit(0);
}

for (const packageDir of packageDirs) {
  const result = spawnSync(process.execPath, ["--import", "tsx", join(repoRoot, "scripts", "import-lesson.ts"), packageDir, "--apply"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error(`Import failed after aggregate validation: ${packageDir}`);
}
console.log(`Installed ${packageLessons.length} lesson packages. Run npm run check before committing the release.`);

function safePublicAssetExists(localPath: string) {
  const file = resolve(publicRoot, localPath.replace(/^\/+/, ""));
  return file.startsWith(`${publicRoot}${sep}`) && existsSync(file);
}
