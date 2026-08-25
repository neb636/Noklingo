import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import draftCardsJson from "../src/content/draft-cue-cards.json";
import draftLessonsJson from "../src/content/draft-reels.json";
import generatedIndexJson from "../src/content/pronunciation-manifest.json";
import { CueCardSchema, VideoLessonSchema, type CueCard, type VideoLesson } from "../src/domain/schemas";
import {
  defaultClipPaddingOptions,
  defaultThaiMatchOptions,
  matchThaiPhrase,
  paddedClipRange,
  type ClipPaddingOptions,
  type MatchResult,
  type PronunciationIndex,
  type PronunciationLessonManifest,
  type TranscriptSegment,
} from "../src/domain/pronunciation";

type GeneratorOptions = { force: boolean; dryRun: boolean; verbose: boolean; model: string; packageDir?: string };
type GeneratorConfig = ClipPaddingOptions & { model: string; confidenceThreshold: number; ambiguityMargin: number };
type Target = {
  lesson: VideoLesson;
  cards: CueCard[];
  sourceVideo: string;
  outputAudioDirectory?: string;
  publicAudioRoot: string;
  packageDir?: string;
};

const repoRoot = resolve(import.meta.dirname, "..");
const toolRoot = join(repoRoot, "tools", "pronunciation-generator");
const cacheRoot = join(toolRoot, ".cache");
const python = join(toolRoot, ".venv", "bin", "python");
const args = process.argv.slice(2);
const generatorConfig = loadGeneratorConfig();
const options: GeneratorOptions = {
  force: args.includes("--force"),
  dryRun: args.includes("--dry-run"),
  verbose: args.includes("--verbose"),
  model: optionValue("--model") ?? generatorConfig.model,
  packageDir: optionValue("--package"),
};
const requestedId = args.find((arg, index) => !arg.startsWith("--") && args[index - 1] !== "--model" && args[index - 1] !== "--package");

if (requestedId && args.includes("--all")) fail("Choose a lesson id or --all, not both.");
if (options.packageDir && (requestedId || args.includes("--all"))) fail("--package cannot be combined with a lesson id or --all.");
if (!requestedId && !args.includes("--all") && !options.packageDir) fail(usage());

preflight();
const targets = targetsFor(requestedId, options);
const index = generatedIndexJson as PronunciationIndex;
let nextIndex: PronunciationIndex = { version: 1, lessons: [...(index.lessons ?? [])] };

for (const target of targets) {
  const result = generateLesson(target, options);
  if (!target.packageDir) {
    nextIndex = {
      version: 1,
      lessons: [...nextIndex.lessons.filter((lesson) => lesson.lessonId !== result.lessonId), result]
        .sort((left, right) => left.lessonId.localeCompare(right.lessonId)),
    };
  }
  if (!options.dryRun) {
    const lessonManifestPath = target.packageDir
      ? join(target.packageDir, "pronunciation-manifest.json")
      : join(repoRoot, "public", "lessons", "drafts", target.lesson.id, "pronunciation-manifest.json");
    writeJson(lessonManifestPath, result);
  }
}

if (!options.dryRun && targets.some((target) => !target.packageDir)) {
  writeJson(join(repoRoot, "src", "content", "pronunciation-manifest.json"), nextIndex);
}

function usage() {
  return "Usage: npm run pronunciation:generate -- <lesson-id> | --all | --package content-inbox/<lesson-id> [--force] [--dry-run] [--verbose] [--model large-v3]";
}

function optionValue(name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) fail(`${name} requires a value.`);
  return value;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function preflight() {
  for (const binary of ["ffmpeg", "ffprobe"]) {
    if (spawnSync(binary, ["-version"], { stdio: "ignore" }).status !== 0) {
      fail(`${binary} is required. Install FFmpeg first (macOS/Homebrew: brew install ffmpeg), then run npm run pronunciation:setup.`);
    }
  }
  if (!existsSync(python)) fail(`Local transcription environment is missing. Run npm run pronunciation:setup first.`);
  if (spawnSync(python, ["-c", "import faster_whisper"], { stdio: "ignore" }).status !== 0) {
    fail(`faster-whisper is missing from the local transcription environment. Run npm run pronunciation:setup again.`);
  }
}

function targetsFor(id: string | undefined, config: GeneratorOptions): Target[] {
  if (config.packageDir) return [packageTarget(resolve(config.packageDir))];
  const lessons = VideoLessonSchema.array().parse(draftLessonsJson.lessons);
  const cards = CueCardSchema.array().parse(draftCardsJson.cueCards);
  const selected = id ? lessons.filter((lesson) => lesson.id === id) : lessons;
  if (!selected.length) fail(`No draft lesson found for ${id}.`);
  return selected.map((lesson) => ({
    lesson,
    cards: cards.filter((card) => card.lessonId === lesson.id),
    sourceVideo: join(repoRoot, "public", lesson.media.videoSrc.replace(/^\/+/, "")),
    outputAudioDirectory: join(repoRoot, "public", "lessons", "drafts", lesson.id, "audio"),
    publicAudioRoot: `/lessons/drafts/${lesson.id}/audio`,
  }));
}

function packageTarget(packageDir: string): Target {
  const definition = join(packageDir, "lesson.json");
  const sourceVideo = join(packageDir, "source.mp4");
  if (!existsSync(definition) || !existsSync(sourceVideo)) fail(`Package must contain lesson.json and source.mp4: ${packageDir}`);
  const raw = JSON.parse(readFileSync(definition, "utf8")) as { lesson: unknown; cueCards: unknown };
  const lesson = VideoLessonSchema.parse(raw.lesson);
  const cards = CueCardSchema.array().parse(raw.cueCards);
  if (cards.some((card) => card.lessonId !== lesson.id)) fail("Every package cue card must belong to its lesson.");
  return {
    lesson,
    cards,
    sourceVideo,
    publicAudioRoot: `/lessons/${lesson.id}/audio`,
    packageDir,
  };
}

function generateLesson(target: Target, config: GeneratorOptions): PronunciationLessonManifest {
  if (!existsSync(target.sourceVideo)) fail(`Source video is missing: ${target.sourceVideo}`);
  const sourceHash = hashFile(target.sourceVideo);
  const transcriptDirectory = join(cacheRoot, "transcripts", sourceHash);
  const analysisAudio = join(transcriptDirectory, "audio.wav");
  const transcriptPath = join(transcriptDirectory, `${config.model}.json`);
  const duration = probeDuration(target.sourceVideo);
  const hotwords = target.cards.map((card) => card.pronunciationOverride?.matchText ?? card.thai).join(" ");

  if (config.force || !existsSync(transcriptPath)) {
    mkdirSync(transcriptDirectory, { recursive: true });
    run("ffmpeg", ["-y", "-i", target.sourceVideo, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", analysisAudio]);
    run(python, [
      join(toolRoot, "transcribe.py"), "--audio", analysisAudio, "--output", transcriptPath,
      "--model", config.model, "--model-cache", join(cacheRoot, "models"), "--hotwords", hotwords,
    ]);
  } else if (config.verbose) {
    console.log(`  Reusing cached transcript ${relative(repoRoot, transcriptPath)}`);
  }

  const transcript = JSON.parse(readFileSync(transcriptPath, "utf8")) as { language?: string; segments?: TranscriptSegment[] };
  if (transcript.language && transcript.language !== "th") {
    console.warn(`  Warning: model reported ${transcript.language}, expected th. Matches will be treated conservatively.`);
  }
  const clips = target.cards.map((card) => makeClip(card, transcript.segments ?? [], duration, target.publicAudioRoot));
  const manifest: PronunciationLessonManifest = {
    lessonId: target.lesson.id,
    sourceVideo: target.packageDir ? target.sourceVideo : target.lesson.media.videoSrc,
    sourceHash,
    model: config.model,
    generatedAt: new Date().toISOString(),
    clips,
  };

  if (!config.dryRun) {
    if (target.outputAudioDirectory) {
      mkdirSync(target.outputAudioDirectory, { recursive: true });
      for (const clip of clips) {
        if (!clip.audio || clip.start === undefined || clip.end === undefined) continue;
        const output = join(target.outputAudioDirectory, `${clip.cueCardId}.m4a`);
        run("ffmpeg", [
          "-y", "-i", target.sourceVideo, "-ss", String(clip.start), "-t", String(clip.end - clip.start),
          "-vn", "-map_metadata", "-1", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", "-fflags", "+bitexact", "-flags:a", "+bitexact", output,
        ]);
      }
    }
    if (target.packageDir) {
      writeJson(join(target.packageDir, "audio-clips.json"), {
        clips: clips.filter((clip) => clip.audio && clip.start !== undefined && clip.end !== undefined).map((clip) => ({
          output: `${clip.cueCardId}.m4a`, startSeconds: clip.start, endSeconds: clip.end,
        })),
      });
    }
  }

  const counts = countStatuses(clips.map((clip) => clip.status));
  console.log(`${target.lesson.title}: ${clips.length} cue cards · ${counts.matched + counts.overridden} matched · ${counts.ambiguous} ambiguous · ${counts.unmatched} not found${config.dryRun ? " (dry run)" : ""}`);
  for (const clip of clips.filter((entry) => entry.status !== "matched" && entry.status !== "overridden")) {
    console.log(`  ${clip.cueCardId}: ${clip.status}${clip.diagnostic ? ` — ${clip.diagnostic}` : ""}`);
  }
  return manifest;
}

function makeClip(card: CueCard, segments: TranscriptSegment[], duration: number, publicAudioRoot: string) {
  let match: MatchResult;
  if (card.pronunciationOverride) {
    match = {
      status: "overridden", start: card.pronunciationOverride.startSeconds, end: card.pronunciationOverride.endSeconds,
      transcriptMatch: card.pronunciationOverride.matchText ?? card.thai, confidence: 1, candidates: [],
    };
  } else {
    match = matchThaiPhrase(card.thai, segments, {
      confidenceThreshold: generatorConfig.confidenceThreshold,
      ambiguityMargin: generatorConfig.ambiguityMargin,
    });
  }
  if (match.start === undefined || match.end === undefined) {
    return { cueCardId: card.id, thai: card.thai, status: match.status, candidates: match.candidates, diagnostic: match.diagnostic };
  }
  const padded = paddedClipRange(match.start, match.end, duration, generatorConfig);
  if (!padded) {
    return { cueCardId: card.id, thai: card.thai, status: "unmatched" as const, candidates: match.candidates, diagnostic: "Matched speech exceeds the maximum clip duration." };
  }
  return {
    cueCardId: card.id,
    thai: card.thai,
    audio: `${publicAudioRoot}/${card.id}.m4a`,
    status: match.status,
    start: padded.start,
    end: padded.end,
    transcriptMatch: match.transcriptMatch,
    confidence: match.confidence,
    candidates: match.candidates,
    diagnostic: match.diagnostic,
  };
}

function probeDuration(video: string) {
  const raw = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", video], { encoding: "utf8" });
  const duration = Number(raw.trim());
  if (!Number.isFinite(duration) || duration <= 0) fail(`Could not determine media duration for ${video}`);
  return duration;
}

function hashFile(file: string) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function run(command: string, commandArgs: string[]) {
  if (options.verbose) console.log(`  ${command} ${commandArgs.join(" ")}`);
  const result = spawnSync(command, commandArgs, { stdio: options.verbose ? "inherit" : "pipe", encoding: "utf8" });
  if (result.status !== 0) {
    const output = typeof result.stderr === "string" ? result.stderr.trim() : "";
    fail(`${command} failed${output ? `: ${output}` : ""}`);
  }
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function countStatuses(statuses: Array<MatchResult["status"]>) {
  return statuses.reduce((counts, status) => ({ ...counts, [status]: counts[status] + 1 }), { matched: 0, overridden: 0, ambiguous: 0, unmatched: 0 });
}

function loadGeneratorConfig(): GeneratorConfig {
  const path = join(toolRoot, "config.json");
  const raw = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) as Partial<GeneratorConfig> : {};
  const config: GeneratorConfig = {
    model: raw.model ?? "large-v3",
    ...defaultClipPaddingOptions,
    ...defaultThaiMatchOptions,
    ...raw,
  };
  if (!config.model || config.paddingBeforeMs < 0 || config.paddingAfterMs < 0
    || config.minimumClipDurationMs <= 0 || config.maximumClipDurationMs < config.minimumClipDurationMs
    || config.confidenceThreshold <= 0 || config.confidenceThreshold > 1 || config.ambiguityMargin < 0 || config.ambiguityMargin >= 1) {
    fail(`Invalid pronunciation generator config: ${path}`);
  }
  return config;
}
