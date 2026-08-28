import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import draftCardsJson from "../src/content/draft-cue-cards.json";
import draftLessonsJson from "../src/content/draft-reels.json";
import generatedIndexJson from "../src/content/pronunciation-manifest.json";
import { CueCardSchema, VideoLessonSchema, type CueCard, type VideoLesson } from "../src/domain/schemas";
import {
  defaultClipPaddingOptions, defaultThaiMatchOptions, matchEnglishPhrase, matchThaiPhrase, paddedClipRange,
  type ClipPaddingOptions, type MatchResult, type PronunciationIndex, type PronunciationLanguageClip, type PronunciationManifestClip,
  type PronunciationLessonManifest, type TranscriptSegment,
} from "../src/domain/pronunciation";

type GeneratorOptions = { force: boolean; dryRun: boolean; verbose: boolean; model: string; packageDir?: string };
type GeneratorConfig = ClipPaddingOptions & { model: string; confidenceThreshold: number; ambiguityMargin: number; maximumPairDistanceSeconds: number };
type Target = { lesson: VideoLesson; cards: CueCard[]; sourceVideo: string; outputAudioDirectory?: string; publicAudioRoot: string; packageDir?: string };
type Extractable = { output: string; start: number; end: number };

const repoRoot = resolve(import.meta.dirname, "..");
const toolRoot = join(repoRoot, "tools", "pronunciation-generator");
const cacheRoot = join(toolRoot, ".cache");
const python = join(toolRoot, ".venv", "bin", "python");
const args = process.argv.slice(2);
const generatorConfig = loadGeneratorConfig();
const options: GeneratorOptions = { force: args.includes("--force"), dryRun: args.includes("--dry-run"), verbose: args.includes("--verbose"), model: optionValue("--model") ?? generatorConfig.model, packageDir: optionValue("--package") };
const requestedId = args.find((arg, index) => !arg.startsWith("--") && args[index - 1] !== "--model" && args[index - 1] !== "--package");

if (requestedId && args.includes("--all")) fail("Choose a lesson id or --all, not both.");
if (options.packageDir && (requestedId || args.includes("--all"))) fail("--package cannot be combined with a lesson id or --all.");
if (!requestedId && !args.includes("--all") && !options.packageDir) fail(usage());

preflight();
const targets = targetsFor(requestedId, options);
const oldIndex = generatedIndexJson as unknown as PronunciationIndex;
let nextIndex: PronunciationIndex = { version: 2, lessons: oldIndex.version === 2 ? [...(oldIndex.lessons ?? [])] : [] };
for (const target of targets) {
  const result = generateLesson(target, options);
  if (!target.packageDir) nextIndex = { version: 2, lessons: [...nextIndex.lessons.filter((lesson) => lesson.lessonId !== result.lessonId), result].sort((a, b) => a.lessonId.localeCompare(b.lessonId)) };
  if (!options.dryRun) writeJson(target.packageDir ? join(target.packageDir, "pronunciation-manifest.json") : join(repoRoot, "public", "lessons", "drafts", target.lesson.id, "pronunciation-manifest.json"), result);
}
if (!options.dryRun && targets.some((target) => !target.packageDir)) writeJson(join(repoRoot, "src", "content", "pronunciation-manifest.json"), nextIndex);

function usage() { return "Usage: npm run pronunciation:generate -- <lesson-id> | --all | --package content-inbox/<lesson-id> [--force] [--dry-run] [--verbose] [--model large-v3]"; }
function optionValue(name: string): string | undefined { const index = args.indexOf(name); if (index === -1) return undefined; const value = args[index + 1]; if (!value || value.startsWith("--")) fail(`${name} requires a value.`); return value; }
function fail(message: string): never { console.error(message); process.exit(1); }
function preflight() {
  for (const binary of ["ffmpeg", "ffprobe"]) if (spawnSync(binary, ["-version"], { stdio: "ignore" }).status !== 0) fail(`${binary} is required. Install FFmpeg first.`);
  if (!existsSync(python)) fail("Local transcription environment is missing. Run npm run pronunciation:setup first.");
  if (spawnSync(python, ["-c", "import faster_whisper"], { stdio: "ignore" }).status !== 0) fail("faster-whisper is missing. Run npm run pronunciation:setup again.");
}

function targetsFor(id: string | undefined, config: GeneratorOptions): Target[] {
  if (config.packageDir) return [packageTarget(resolve(config.packageDir))];
  const lessons = VideoLessonSchema.array().parse(draftLessonsJson.lessons);
  const cards = CueCardSchema.array().parse(draftCardsJson.cueCards);
  const selected = id ? lessons.filter((lesson) => lesson.id === id) : lessons;
  if (!selected.length) fail(`No draft lesson found for ${id}.`);
  return selected.map((lesson) => ({ lesson, cards: cards.filter((card) => card.lessonId === lesson.id), sourceVideo: join(repoRoot, "public", lesson.media.videoSrc.replace(/^\/+/, "")), outputAudioDirectory: join(repoRoot, "public", "lessons", "drafts", lesson.id, "audio"), publicAudioRoot: `/lessons/drafts/${lesson.id}/audio` }));
}
function packageTarget(packageDir: string): Target {
  const definition = join(packageDir, "lesson.json"); const sourceVideo = join(packageDir, "source.mp4");
  if (!existsSync(definition) || !existsSync(sourceVideo)) fail(`Package must contain lesson.json and source.mp4: ${packageDir}`);
  const raw = JSON.parse(readFileSync(definition, "utf8")) as { lesson: unknown; cueCards: unknown };
  const lesson = VideoLessonSchema.parse(raw.lesson); const cards = CueCardSchema.array().parse(raw.cueCards);
  if (cards.some((card) => card.lessonId !== lesson.id)) fail("Every package cue card must belong to its lesson.");
  return { lesson, cards, sourceVideo, publicAudioRoot: `/lessons/${lesson.id}/audio`, packageDir };
}

function generateLesson(target: Target, config: GeneratorOptions): PronunciationLessonManifest {
  if (!existsSync(target.sourceVideo)) fail(`Source video is missing: ${target.sourceVideo}`);
  const sourceHash = hashFile(target.sourceVideo); const transcriptDirectory = join(cacheRoot, "transcripts", sourceHash);
  const analysisAudio = join(transcriptDirectory, "audio.wav"); const transcriptPath = join(transcriptDirectory, `${config.model}-multilingual-v2.json`); const duration = probeDuration(target.sourceVideo);
  const hotwords = target.cards.flatMap((card) => [card.pronunciationOverrides?.thai?.matchText ?? card.thai, card.pronunciationOverrides?.english?.matchText ?? card.naturalMeaning]).join(" ");
  if (config.force || !existsSync(transcriptPath)) {
    mkdirSync(transcriptDirectory, { recursive: true });
    run("ffmpeg", ["-y", "-i", target.sourceVideo, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", analysisAudio]);
    run(python, [join(toolRoot, "transcribe.py"), "--audio", analysisAudio, "--output", transcriptPath, "--model", config.model, "--model-cache", join(cacheRoot, "models"), "--hotwords", hotwords]);
  } else if (config.verbose) console.log(`  Reusing cached transcript ${relative(repoRoot, transcriptPath)}`);
  const transcript = JSON.parse(readFileSync(transcriptPath, "utf8")) as { segments?: TranscriptSegment[] };
  const clips = clampNeighboringRanges(alignConceptClips(target.cards, transcript.segments ?? [], duration, target.publicAudioRoot));
  const manifest: PronunciationLessonManifest = { lessonId: target.lesson.id, sourceVideo: target.packageDir ? target.sourceVideo : target.lesson.media.videoSrc, sourceHash, model: config.model, generatedAt: new Date().toISOString(), clips };
  if (!config.dryRun) {
    const extractable = clips.flatMap((clip) => [extractableFor(clip.thai, `${clip.cueCardId}-th.m4a`), extractableFor(clip.english, `${clip.cueCardId}-en.m4a`)]).filter((clip): clip is Extractable => Boolean(clip));
    if (target.outputAudioDirectory && extractable.length) extractAll(target.sourceVideo, target.outputAudioDirectory, extractable);
    if (target.packageDir) writeJson(join(target.packageDir, "audio-clips.json"), { clips: clips.filter((clip) => isExtractable(clip.thai) && isExtractable(clip.english)).map((clip) => ({ cueCardId: clip.cueCardId, thai: rangeOutput(clip.thai, `${clip.cueCardId}-th.m4a`), english: rangeOutput(clip.english, `${clip.cueCardId}-en.m4a`) })) });
  }
  const counts = clips.reduce((value, clip) => ({ ...value, [clip.pairStatus]: value[clip.pairStatus] + 1 }), { complete: 0, "thai-only": 0, "english-only": 0, ambiguous: 0, unmatched: 0 });
  console.log(`${target.lesson.title}: ${clips.length} concepts · ${counts.complete} complete · ${counts["thai-only"]} Thai-only · ${counts["english-only"]} English-only · ${counts.ambiguous} ambiguous · ${counts.unmatched} unmatched${config.dryRun ? " (dry run)" : ""}`);
  for (const clip of clips.filter((entry) => entry.pairStatus !== "complete")) console.log(`  ${clip.cueCardId}: ${clip.pairStatus}`);
  return manifest;
}

function matchFor(card: CueCard, language: "thai" | "english", segments: TranscriptSegment[]): MatchResult {
  const override = card.pronunciationOverrides?.[language]; const target = override?.matchText ?? (language === "thai" ? card.thai : card.naturalMeaning);
  if (override) return { status: "overridden", start: override.startSeconds, end: override.endSeconds, transcriptMatch: target, confidence: 1, candidates: [] };
  return (language === "thai" ? matchThaiPhrase : matchEnglishPhrase)(target, segments, { confidenceThreshold: generatorConfig.confidenceThreshold, ambiguityMargin: generatorConfig.ambiguityMargin });
}

function alignConceptClips(cards: CueCard[], segments: TranscriptSegment[], duration: number, publicRoot: string) {
  const used = new Set<string>();
  let cursor = 0;
  return cards.map((card) => {
    const thaiMatch = matchFor(card, "thai", segments);
    const englishMatch = matchFor(card, "english", segments);
    const thaiCandidates = matchCandidates(thaiMatch);
    const englishCandidates = matchCandidates(englishMatch);
    const pairs = thaiCandidates.flatMap((thai) => englishCandidates.map((english) => ({
      thai,
      english,
      anchor: Math.min(thai.start, english.start),
      end: Math.max(thai.end, english.end),
      distance: Math.max(thai.start, english.start) - Math.min(thai.end, english.end),
      confidence: thai.confidence + english.confidence,
    }))).filter((pair) => pair.distance <= generatorConfig.maximumPairDistanceSeconds
      && pair.anchor >= cursor - 0.2
      && !used.has(candidateKey("th", pair.thai))
      && !used.has(candidateKey("en", pair.english)));
    const bestConfidence = Math.max(...pairs.map((pair) => pair.confidence), Number.NEGATIVE_INFINITY);
    const selected = pairs.filter((pair) => pair.confidence >= bestConfidence - generatorConfig.ambiguityMargin * 2)
      .sort((left, right) => left.anchor - right.anchor || left.distance - right.distance || right.confidence - left.confidence)[0];
    if (selected) {
      used.add(candidateKey("th", selected.thai));
      used.add(candidateKey("en", selected.english));
      cursor = selected.end;
      return makeConceptClip(card, selectedMatch(thaiMatch, selected.thai), selectedMatch(englishMatch, selected.english), duration, publicRoot);
    }
    return makeConceptClip(card, thaiMatch, englishMatch, duration, publicRoot);
  });
}

function matchCandidates(match: MatchResult) {
  if (match.status === "overridden" && match.start !== undefined && match.end !== undefined) {
    return [{ start: match.start, end: match.end, transcriptMatch: match.transcriptMatch ?? "override", confidence: 1, exact: true, segmentIndex: -1 }];
  }
  return match.candidates;
}

function candidateKey(language: string, candidate: { start: number; end: number }) { return `${language}:${candidate.start.toFixed(3)}:${candidate.end.toFixed(3)}`; }
function selectedMatch(original: MatchResult, candidate: ReturnType<typeof matchCandidates>[number]): MatchResult {
  return { status: original.status === "overridden" ? "overridden" : "matched", start: candidate.start, end: candidate.end,
    transcriptMatch: candidate.transcriptMatch, confidence: candidate.confidence, candidates: original.candidates };
}

function makeConceptClip(card: CueCard, thaiMatch: MatchResult, englishMatch: MatchResult, duration: number, publicRoot: string) {
  let thai = languageClip(thaiMatch, duration, `${publicRoot}/${card.id}-th.m4a`);
  let english = languageClip(englishMatch, duration, `${publicRoot}/${card.id}-en.m4a`);
  if (isExtractable(thai) && isExtractable(english)) {
    const distance = Math.max(thai.start!, english.start!) - Math.min(thai.end!, english.end!);
    if (distance > generatorConfig.maximumPairDistanceSeconds) english = { ...english, audio: undefined, status: "ambiguous", diagnostic: "Thai and English candidates are too far apart to form a safe pair." };
    else [thai, english] = clampPair(thai, english, thaiMatch, englishMatch);
  }
  const thaiReady = isExtractable(thai); const englishReady = isExtractable(english); const ambiguous = thai.status === "ambiguous" || english.status === "ambiguous";
  const pairStatus = thaiReady && englishReady ? "complete" : thaiReady ? "thai-only" : englishReady ? "english-only" : ambiguous ? "ambiguous" : "unmatched";
  return { cueCardId: card.id, thaiText: card.thai, englishText: card.naturalMeaning, thai, english, pairStatus } as const;
}
function languageClip(match: MatchResult, duration: number, audio: string): PronunciationLanguageClip {
  if (match.start === undefined || match.end === undefined) return { status: match.status, candidates: match.candidates, diagnostic: match.diagnostic };
  const padded = paddedClipRange(match.start, match.end, duration, generatorConfig);
  if (!padded) return { status: "unmatched", candidates: match.candidates, diagnostic: "Matched speech exceeds the maximum clip duration." };
  return { audio, status: match.status, start: padded.start, end: padded.end, transcriptMatch: match.transcriptMatch, confidence: match.confidence, candidates: match.candidates, diagnostic: match.diagnostic };
}
function clampPair(thai: PronunciationLanguageClip, english: PronunciationLanguageClip, thaiMatch: MatchResult, englishMatch: MatchResult): [PronunciationLanguageClip, PronunciationLanguageClip] {
  const thaiCentre = (thaiMatch.start! + thaiMatch.end!) / 2; const englishCentre = (englishMatch.start! + englishMatch.end!) / 2;
  const earlierEnd = thaiCentre < englishCentre ? thaiMatch.end! : englishMatch.end!;
  const laterStart = thaiCentre < englishCentre ? englishMatch.start! : thaiMatch.start!;
  const boundary = (earlierEnd + laterStart) / 2;
  return thaiCentre < englishCentre ? [{ ...thai, end: Math.min(thai.end!, boundary) }, { ...english, start: Math.max(english.start!, boundary) }] : [{ ...thai, start: Math.max(thai.start!, boundary) }, { ...english, end: Math.min(english.end!, boundary) }];
}

function clampNeighboringRanges(clips: PronunciationManifestClip[]): PronunciationManifestClip[] {
  const next = clips.map((clip) => ({ ...clip, thai: { ...clip.thai }, english: { ...clip.english } }));
  const ranges = next.flatMap((clip) => (["thai", "english"] as const).map((language) => ({ clip, language, value: clip[language] })))
    .filter((entry) => isExtractable(entry.value))
    .sort((left, right) => ((left.value.start! + left.value.end!) / 2) - ((right.value.start! + right.value.end!) / 2));
  for (let index = 1; index < ranges.length; index += 1) {
    const left = ranges[index - 1].value;
    const right = ranges[index].value;
    if (left.end! <= right.start!) continue;
    const boundary = ((left.start! + left.end!) / 2 + (right.start! + right.end!) / 2) / 2;
    left.end = Math.max(left.start! + 0.05, Math.min(left.end!, boundary));
    right.start = Math.min(right.end! - 0.05, Math.max(right.start!, boundary));
  }
  return next;
}
function isExtractable(clip: PronunciationLanguageClip): boolean { return Boolean(clip.audio && clip.start !== undefined && clip.end !== undefined && clip.end > clip.start); }
function extractableFor(clip: PronunciationLanguageClip, output: string): Extractable | undefined { return isExtractable(clip) ? { output, start: clip.start!, end: clip.end! } : undefined; }
function rangeOutput(clip: PronunciationLanguageClip, output: string) { return { output, startSeconds: clip.start!, endSeconds: clip.end! }; }
function extractAll(source: string, outputDirectory: string, clips: Extractable[]) {
  mkdirSync(outputDirectory, { recursive: true });
  const filters = clips.map((clip, index) => `[0:a]atrim=start=${clip.start}:end=${clip.end},asetpts=PTS-STARTPTS[a${index}]`).join(";");
  const temporary = clips.map((clip) => join(outputDirectory, `.${clip.output}.tmp.m4a`));
  const outputArgs = clips.flatMap((_, index) => ["-map", `[a${index}]`, "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", temporary[index]]);
  run("ffmpeg", ["-y", "-i", source, "-filter_complex", filters, ...outputArgs]);
  clips.forEach((clip, index) => renameSync(temporary[index], join(outputDirectory, clip.output)));
}
function probeDuration(video: string) { const raw = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", video], { encoding: "utf8" }); const duration = Number(raw.trim()); if (!Number.isFinite(duration) || duration <= 0) fail(`Could not determine media duration for ${video}`); return duration; }
function hashFile(file: string) { return createHash("sha256").update(readFileSync(file)).digest("hex"); }
function run(command: string, commandArgs: string[]) { if (options.verbose) console.log(`  ${command} ${commandArgs.join(" ")}`); const result = spawnSync(command, commandArgs, { stdio: options.verbose ? "inherit" : "pipe", encoding: "utf8" }); if (result.status !== 0) fail(`${command} failed${typeof result.stderr === "string" && result.stderr.trim() ? `: ${result.stderr.trim()}` : ""}`); }
function writeJson(path: string, value: unknown) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`); }
function loadGeneratorConfig(): GeneratorConfig {
  const path = join(toolRoot, "config.json"); const raw = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) as Partial<GeneratorConfig> : {};
  const config: GeneratorConfig = { model: raw.model ?? "large-v3", ...defaultClipPaddingOptions, ...defaultThaiMatchOptions, maximumPairDistanceSeconds: 5, ...raw };
  if (!config.model || config.paddingBeforeMs < 0 || config.paddingAfterMs < 0 || config.minimumClipDurationMs <= 0 || config.maximumClipDurationMs < config.minimumClipDurationMs || config.confidenceThreshold <= 0 || config.confidenceThreshold > 1 || config.ambiguityMargin < 0 || config.ambiguityMargin >= 1 || config.maximumPairDistanceSeconds <= 0) fail(`Invalid pronunciation generator config: ${path}`);
  return config;
}
