import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";
import { z } from "zod";
import { validateCurriculum } from "../src/domain/curriculum-validation";
import { CueCardSchema, VideoLessonSchema, type CueCard, type VideoLesson } from "../src/domain/schemas";

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
const audioDir = join(packageDir, "audio");
const audioClipsPath = join(packageDir, "audio-clips.json");
for (const required of [definitionPath, sourcePath]) {
  if (!existsSync(required)) throw new Error(`Missing required package input: ${required}`);
}
const hasAudioDir = existsSync(audioDir) && statSync(audioDir).isDirectory();
const hasAudioClips = existsSync(audioClipsPath);
if (hasAudioDir === hasAudioClips) throw new Error("Provide exactly one audio source: audio/ or audio-clips.json.");

const AudioClipManifestSchema = z.object({
  clips: z.array(z.object({
    cueCardId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    thai: z.object({
      output: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*-th\.m4a$/),
      startSeconds: z.number().finite().nonnegative(),
      endSeconds: z.number().finite().positive(),
    }),
    english: z.object({
      output: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*-en\.m4a$/),
      startSeconds: z.number().finite().nonnegative(),
      endSeconds: z.number().finite().positive(),
    }),
  })).min(1),
});
const audioClipManifest = hasAudioClips
  ? AudioClipManifestSchema.parse(JSON.parse(readFileSync(audioClipsPath, "utf8")))
  : undefined;
if (audioClipManifest && new Set(audioClipManifest.clips.map((clip) => clip.cueCardId)).size !== audioClipManifest.clips.length) {
  throw new Error("Audio clip cue-card ids must be unique.");
}
for (const clip of audioClipManifest?.clips ?? []) {
  if (clip.thai.output !== `${clip.cueCardId}-th.m4a` || clip.english.output !== `${clip.cueCardId}-en.m4a`) {
    throw new Error(`Audio outputs must use the cue-card id and -th/-en suffixes: ${clip.cueCardId}.`);
  }
}
const audioRanges = audioClipManifest?.clips.flatMap((clip) => [clip.thai, clip.english]) ?? [];
const clipByOutput = new Map(audioRanges.map((clip) => [clip.output, clip]));
if (clipByOutput.size !== audioRanges.length) throw new Error("Audio clip output names must be unique.");

const raw = JSON.parse(readFileSync(definitionPath, "utf8"));
const lesson = VideoLessonSchema.parse(raw.lesson);
const packageCards = CueCardSchema.array().parse(raw.cueCards);
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lesson.id)) throw new Error("Lesson ids must be lowercase URL-safe slugs.");
if (lesson.contentStatus !== "verified") throw new Error("Only reviewed packages marked verified may be imported.");
if (lesson.media.durationStatus !== "confirmed") throw new Error("Verified packages require a confirmed duration.");
if (lesson.source?.permissionStatus !== "authorized") throw new Error("A verified package requires an authorized source record.");
if (lesson.media.availability !== "available") throw new Error("Imported lesson media must be marked available.");

const expectedMediaRoot = `/lessons/${lesson.id}`;
if (lesson.media.videoSrc !== `${expectedMediaRoot}/intro.mp4` || lesson.media.posterSrc !== `${expectedMediaRoot}/poster.jpg`) {
  throw new Error(`Lesson media paths must be ${expectedMediaRoot}/intro.mp4 and poster.jpg.`);
}
if (packageCards.some((card) => card.lessonId !== lesson.id)) throw new Error("Every cue card in the package must belong to the imported lesson.");
const declaredCardIds = new Set(lesson.cueCardIds);
if (packageCards.length !== declaredCardIds.size
  || packageCards.some((card) => !declaredCardIds.has(card.id))
  || lesson.cueCardIds.some((id) => !packageCards.some((card) => card.id === id))) {
  throw new Error("The package cue cards must exactly match lesson.cueCardIds, without duplicates or extras.");
}
for (const audioPath of [
  ...packageCards.flatMap((card) => [card.thaiAudioSrc, card.englishAudioSrc]),
  ...lesson.quizBank.map((question) => question.audioSrc),
].filter((path): path is string => Boolean(path))) {
  if (!audioPath.startsWith(`${expectedMediaRoot}/audio/`)) {
    throw new Error(`Lesson audio must be bundled below ${expectedMediaRoot}/audio/: ${audioPath}`);
  }
}

for (const tool of ["ffmpeg", "ffprobe"]) {
  if (spawnSync(tool, ["-version"], { stdio: "ignore" }).status !== 0) throw new Error(`${tool} is required to validate and normalize lesson media.`);
}
const sourceMetadata = probeMedia(sourcePath);
if (!sourceMetadata.videoCodecs.includes("h264") || !sourceMetadata.audioCodecs.includes("aac")) {
  throw new Error("source.mp4 must contain H.264 video and AAC audio.");
}
if (Math.abs(sourceMetadata.durationSeconds - lesson.media.durationSeconds) > 0.25) {
  throw new Error(`Declared duration ${lesson.media.durationSeconds}s does not match source duration ${sourceMetadata.durationSeconds.toFixed(3)}s.`);
}
for (const clip of audioRanges) {
  const duration = clip.endSeconds - clip.startSeconds;
  if (duration < 0.25 || duration > 10 || clip.endSeconds > sourceMetadata.durationSeconds) {
    throw new Error(`Invalid audio excerpt ${clip.output}: use a 0.25–10 second range inside source.mp4.`);
  }
}

const repoRoot = resolve(import.meta.dirname, "..");
const registryPath = join(repoRoot, "src", "content", "lesson-packages.json");
const registry = JSON.parse(readFileSync(registryPath, "utf8")) as { lessons: unknown[]; cueCards: unknown[] };
const existingLessons = VideoLessonSchema.array().parse(registry.lessons);
const existingCards = CueCardSchema.array().parse(registry.cueCards);
const existingIssues = validateCurriculum(existingLessons, existingCards, {
  assetExists: (localPath) => existsSync(publicAsset(localPath)),
});
if (existingIssues.length) throw new Error(`Existing reviewed registry is invalid: ${existingIssues[0].lessonId}: ${existingIssues[0].message}`);

const nextLessons = [...existingLessons.filter((entry) => entry.id !== lesson.id), lesson].sort((a, b) => a.order - b.order);
const nextCards = [...existingCards.filter((entry) => entry.lessonId !== lesson.id), ...packageCards];
const packageIssues = validateCurriculum(nextLessons, nextCards, {
  assetExists: (localPath) => intakeAsset(localPath, lesson, packageCards) !== undefined || existsSync(publicAsset(localPath)),
});
if (packageIssues.length) {
  throw new Error(packageIssues.map((issue) => `${issue.lessonId}: ${issue.message}`).join("\n"));
}

const declaredAudio = [...new Set([
  ...packageCards.flatMap((card) => [card.thaiAudioSrc, card.englishAudioSrc]),
  ...lesson.quizBank.map((question) => question.audioSrc),
].filter((path): path is string => Boolean(path)))];
const declaredOutputs = new Set(declaredAudio.map((path) => path.split("/audio/")[1]));
if (audioClipManifest && (declaredOutputs.size !== clipByOutput.size || [...declaredOutputs].some((output) => !output || !clipByOutput.has(output)))) {
  throw new Error("audio-clips.json must exactly cover every declared lesson audio asset, without extras.");
}
for (const audioPath of declaredAudio) {
  const input = intakeAsset(audioPath, lesson, packageCards);
  if (!input) throw new Error(`Missing declared audio input: ${audioPath}`);
  if (hasAudioDir) {
    const metadata = probeMedia(input);
    if (!metadata.audioCodecs.length) throw new Error(`Declared audio has no playable audio stream: ${audioPath}`);
  }
}

console.log(`Validated ${lesson.id}: ${packageCards.length} cue cards, ${lesson.quizBank.filter((question) => question.scored).length} scored questions, ${sourceMetadata.durationSeconds.toFixed(3)}s.`);
if (!apply) {
  console.log("Dry run complete. Add --apply to normalize media and update the reviewed curriculum registry.");
  process.exit(0);
}

const mediaDir = join(repoRoot, "public", "lessons", lesson.id);
mkdirSync(mediaDir, { recursive: true });
execFileSync("ffmpeg", ["-y", "-i", sourcePath, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", join(mediaDir, "intro.mp4")], { stdio: "inherit" });
execFileSync("ffmpeg", ["-y", "-ss", "00:00:01", "-i", sourcePath, "-frames:v", "1", "-q:v", "2", join(mediaDir, "poster.jpg")], { stdio: "inherit" });
const installedAudioDir = join(mediaDir, "audio");
mkdirSync(installedAudioDir, { recursive: true });
if (hasAudioDir) cpSync(audioDir, installedAudioDir, { recursive: true });
if (audioRanges.length) {
  const filters = audioRanges.map((clip, index) => `[0:a]atrim=start=${clip.startSeconds}:end=${clip.endSeconds},asetpts=PTS-STARTPTS[a${index}]`).join(";");
  const outputs = audioRanges.flatMap((clip, index) => [
    "-map", `[a${index}]`, "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", join(installedAudioDir, clip.output),
  ]);
  execFileSync("ffmpeg", ["-y", "-i", sourcePath, "-filter_complex", filters, ...outputs], { stdio: "inherit" });
}

const normalizedMetadata = probeMedia(join(mediaDir, "intro.mp4"));
if (!normalizedMetadata.videoCodecs.includes("h264") || !normalizedMetadata.audioCodecs.includes("aac")
  || Math.abs(normalizedMetadata.durationSeconds - lesson.media.durationSeconds) > 0.25) {
  throw new Error("Normalized lesson media failed codec or duration verification.");
}
for (const path of [lesson.media.videoSrc, lesson.media.posterSrc, ...packageCards.flatMap((card) => [card.thaiAudioSrc, card.englishAudioSrc]), ...lesson.quizBank.map((question) => question.audioSrc)]) {
  if (path && !existsSync(publicAsset(path))) throw new Error(`Generated bundle is missing declared asset: ${path}`);
}
for (const audioPath of declaredAudio) {
  if (!probeMedia(publicAsset(audioPath)).audioCodecs.length) throw new Error(`Installed audio is not playable: ${audioPath}`);
}

const installedIssues = validateCurriculum(nextLessons, nextCards, {
  assetExists: (localPath) => existsSync(publicAsset(localPath)),
});
if (installedIssues.length) throw new Error(installedIssues.map((issue) => `${issue.lessonId}: ${issue.message}`).join("\n"));

writeFileSync(registryPath, `${JSON.stringify({ lessons: nextLessons, cueCards: nextCards }, null, 2)}\n`);
console.log(`Imported ${basename(packageDir)} into public/lessons/${lesson.id} and updated the reviewed registry.`);

function intakeAsset(localPath: string, targetLesson: VideoLesson, cards: CueCard[]): string | undefined {
  if (localPath === targetLesson.media.videoSrc) return sourcePath;
  if (localPath === targetLesson.media.posterSrc) return sourcePath; // The importer creates the poster from this verified source.
  const declaredAudio = new Set([
    ...cards.flatMap((card) => [card.thaiAudioSrc, card.englishAudioSrc]),
    ...targetLesson.quizBank.map((question) => question.audioSrc),
  ].filter((path): path is string => Boolean(path)));
  if (!declaredAudio.has(localPath)) return undefined;
  const relativeAudio = localPath.split("/audio/")[1];
  if (!relativeAudio || relativeAudio.includes("..")) return undefined;
  if (audioClipManifest) return clipByOutput.has(relativeAudio) ? sourcePath : undefined;
  const file = resolve(audioDir, relativeAudio);
  return file.startsWith(`${audioDir}${sep}`) && existsSync(file) ? file : undefined;
}

function publicAsset(localPath: string) {
  const publicRoot = join(repoRoot, "public");
  const file = resolve(publicRoot, localPath.replace(/^\/+/, ""));
  if (file !== publicRoot && !file.startsWith(`${publicRoot}${sep}`)) throw new Error(`Unsafe public asset path: ${localPath}`);
  return file;
}

function probeMedia(path: string) {
  const result = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name", "-of", "json", path], { encoding: "utf8" });
  const metadata = JSON.parse(result) as { format?: { duration?: string }; streams?: Array<{ codec_type?: string; codec_name?: string }> };
  const durationSeconds = Number(metadata.format?.duration);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error(`Could not confirm media duration: ${path}`);
  return {
    durationSeconds,
    videoCodecs: (metadata.streams ?? []).filter((stream) => stream.codec_type === "video").map((stream) => stream.codec_name),
    audioCodecs: (metadata.streams ?? []).filter((stream) => stream.codec_type === "audio").map((stream) => stream.codec_name),
  };
}
