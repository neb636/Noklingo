import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import draftCardsJson from "../src/content/draft-cue-cards.json";
import draftLessonsJson from "../src/content/draft-reels.json";
import generatedIndexJson from "../src/content/pronunciation-manifest.json";
import { CueCardSchema, VideoLessonSchema, type CueCard, type VideoLesson } from "../src/domain/schemas";
import {
  defaultBoundaryOptions, defaultThaiMatchOptions, matchEnglishPhrase, matchThaiPhrase, pronunciationReviewIsStale,
  type BoundaryOptions, type MatchResult, type PronunciationIndex, type PronunciationLanguageClip,
  type PronunciationManifestClip, type PronunciationLessonManifest, type TranscriptCandidate, type TranscriptSegment,
} from "../src/domain/pronunciation";
import { assertProtectedRange, detectSpeechIslands, proposeSpeechProtectedRange, refineSpeechEnvelopes, type EnergyFrame, type RefinedSpeechEnvelope, type SpeechEnvelope } from "../src/domain/pronunciation-boundaries";
import { energyFrames } from "../tools/pronunciation-generator/audio-analysis";

type GeneratorOptions = { force: boolean; dryRun: boolean; verbose: boolean; model: string; packageDir?: string; onlyCard?: string; onlyLanguage?: "thai" | "english"; report?: string };
type GeneratorConfig = BoundaryOptions & { model: string; confidenceThreshold: number; ambiguityMargin: number; maximumPairDistanceSeconds: number };
type Target = { lesson: VideoLesson; cards: CueCard[]; sourceVideo: string; outputAudioDirectory?: string; publicAudioRoot: string; packageDir?: string };
type Extractable = { output: string; start: number; end: number };
type MatchedConcept = { card: CueCard; thai: MatchResult; english: MatchResult };
type QaEntry = { lessonId: string; cueCardId: string; language: "thai" | "english"; warnings: string[]; status: string };

const repoRoot = resolve(import.meta.dirname, "..");
const toolRoot = join(repoRoot, "tools", "pronunciation-generator");
const cacheRoot = join(toolRoot, ".cache");
const python = join(toolRoot, ".venv", "bin", "python");
const args = process.argv.slice(2);
const generatorConfig = loadGeneratorConfig();
const languageValue = optionValue("--only-language");
if (languageValue && languageValue !== "thai" && languageValue !== "english") fail("--only-language must be thai or english.");
const options: GeneratorOptions = {
  force: args.includes("--force"), dryRun: args.includes("--dry-run"), verbose: args.includes("--verbose"),
  model: optionValue("--model") ?? generatorConfig.model, packageDir: optionValue("--package"), onlyCard: optionValue("--only-card"),
  onlyLanguage: languageValue as GeneratorOptions["onlyLanguage"], report: optionValue("--report"),
};
const algorithmFingerprint = createHash("sha256").update(JSON.stringify({ version: 4, ...generatorConfig, model: options.model })).digest("hex").slice(0, 16);
const valueOptions = new Set(["--model", "--package", "--only-card", "--only-language", "--report"]);
const optionValues = new Set(args.filter((_, index) => valueOptions.has(args[index - 1])));
const requestedId = args.find((arg) => !arg.startsWith("--") && !optionValues.has(arg));

if (requestedId && args.includes("--all")) fail("Choose a lesson id or --all, not both.");
if (options.packageDir && (requestedId || args.includes("--all"))) fail("--package cannot be combined with a lesson id or --all.");
if (!requestedId && !args.includes("--all") && !options.packageDir) fail(usage());
if (options.onlyLanguage && !options.onlyCard) fail("--only-language requires --only-card.");

preflight();
const targets = targetsFor(requestedId, options);
const oldIndex = generatedIndexJson as unknown as PronunciationIndex;
let nextIndex: PronunciationIndex = { version: 3, lessons: oldIndex.version >= 2 ? [...(oldIndex.lessons ?? [])] : [] };
const qa: QaEntry[] = [];
for (const target of targets) {
  const result = generateLesson(target, options); qa.push(...qaFor(result));
  if (!target.packageDir) nextIndex = { version: 3, lessons: [...nextIndex.lessons.filter((lesson) => lesson.lessonId !== result.lessonId), result].sort((a, b) => a.lessonId.localeCompare(b.lessonId)) };
  if (!options.dryRun) writeJson(target.packageDir ? join(target.packageDir, "pronunciation-manifest.json") : join(repoRoot, "public", "lessons", "drafts", target.lesson.id, "pronunciation-manifest.json"), result);
}
if (!options.dryRun && targets.some((target) => !target.packageDir)) writeJson(join(repoRoot, "src", "content", "pronunciation-manifest.json"), nextIndex);
if (options.report) writeJson(resolve(options.report), { generatedAt: new Date().toISOString(), algorithmFingerprint, entries: qa });
if (qa.length) console.log(`QA: ${qa.length} language clips need attention${options.report ? ` · ${options.report}` : ""}`);

function usage() { return "Usage: npm run pronunciation:generate -- <lesson-id> | --all | --package <dir> [--force] [--dry-run] [--verbose] [--only-card <id> [--only-language thai|english]] [--report <path>]"; }
function optionValue(name: string): string | undefined { const index = args.indexOf(name); if (index === -1) return undefined; const value = args[index + 1]; if (!value || value.startsWith("--")) fail(`${name} requires a value.`); return value; }
function fail(message: string): never { console.error(message); process.exit(1); }
function preflight() {
  for (const binary of ["ffmpeg", "ffprobe"]) if (spawnSync(binary, ["-version"], { stdio: "ignore" }).status !== 0) fail(`${binary} is required. Install FFmpeg first.`);
  if (!existsSync(python)) fail("Local transcription environment is missing. Run npm run pronunciation:setup first.");
  if (spawnSync(python, ["-c", "import faster_whisper"], { stdio: "ignore" }).status !== 0) fail("faster-whisper is missing. Run npm run pronunciation:setup again.");
}
function targetsFor(id: string | undefined, config: GeneratorOptions): Target[] {
  if (config.packageDir) return [packageTarget(resolve(config.packageDir))];
  const lessons = VideoLessonSchema.array().parse(draftLessonsJson.lessons); const cards = CueCardSchema.array().parse(draftCardsJson.cueCards); const selected = id ? lessons.filter((lesson) => lesson.id === id) : lessons;
  if (!selected.length) fail(`No draft lesson found for ${id}.`);
  return selected.map((lesson) => ({ lesson, cards: cards.filter((card) => card.lessonId === lesson.id), sourceVideo: join(repoRoot, "public", lesson.media.videoSrc.replace(/^\/+/, "")), outputAudioDirectory: join(repoRoot, "public", "lessons", "drafts", lesson.id, "audio"), publicAudioRoot: `/lessons/drafts/${lesson.id}/audio` }));
}
function packageTarget(packageDir: string): Target {
  const definition = join(packageDir, "lesson.json"); const sourceVideo = join(packageDir, "source.mp4");
  if (!existsSync(definition) || !existsSync(sourceVideo)) fail(`Package must contain lesson.json and source.mp4: ${packageDir}`);
  const raw = JSON.parse(readFileSync(definition, "utf8")) as { lesson: unknown; cueCards: unknown }; const lesson = VideoLessonSchema.parse(raw.lesson); const cards = CueCardSchema.array().parse(raw.cueCards);
  if (cards.some((card) => card.lessonId !== lesson.id)) fail("Every package cue card must belong to its lesson.");
  return { lesson, cards, sourceVideo, publicAudioRoot: `/lessons/${lesson.id}/audio`, packageDir };
}

function generateLesson(target: Target, config: GeneratorOptions): PronunciationLessonManifest {
  if (!existsSync(target.sourceVideo)) fail(`Source video is missing: ${target.sourceVideo}`);
  const sourceHash = hashFile(target.sourceVideo);
  if (target.lesson.activityMode === "video-only") {
    const manifest: PronunciationLessonManifest = { lessonId: target.lesson.id, sourceVideo: target.packageDir ? target.sourceVideo : target.lesson.media.videoSrc, sourceHash, model: config.model, generatedAt: new Date().toISOString(), algorithmFingerprint, clips: [] };
    console.log(`${target.lesson.title}: video-only · no pronunciation clips requested`);
    return manifest;
  }
  const transcriptDirectory = join(cacheRoot, "transcripts", sourceHash); const analysisAudio = join(transcriptDirectory, "audio.wav");
  const transcriptPath = join(transcriptDirectory, `${config.model}-multilingual-v2.json`);
  const hotwords = target.cards.flatMap((card) => [card.pronunciationOverrides?.thai?.matchText ?? card.thai, card.pronunciationOverrides?.english?.matchText ?? card.naturalMeaning]).join(" ");
  if (config.force || !existsSync(transcriptPath) || !existsSync(analysisAudio)) {
    mkdirSync(transcriptDirectory, { recursive: true }); run("ffmpeg", ["-y", "-i", target.sourceVideo, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", analysisAudio]);
    run(python, [join(toolRoot, "transcribe.py"), "--audio", analysisAudio, "--output", transcriptPath, "--model", config.model, "--model-cache", join(cacheRoot, "models"), "--hotwords", hotwords]);
  } else if (config.verbose) console.log(`  Reusing cached transcript ${relative(repoRoot, transcriptPath)}`);
  const transcript = JSON.parse(readFileSync(transcriptPath, "utf8")) as { segments?: TranscriptSegment[] }; const matched = alignConceptMatches(target.cards, transcript.segments ?? []); const frames = energyFrames(analysisAudio, generatorConfig.frameDurationMs); const duration = frames.at(-1)?.end ?? 0;
  if (duration <= 0) fail(`Could not determine decoded audio duration for ${target.sourceVideo}`);
  const envelopes = refineSpeechEnvelopes(allEnvelopes(matched), detectSpeechIslands(frames, generatorConfig), generatorConfig);
  const clips = matched.map((concept) => makeConceptClip(concept, envelopes, frames, duration, target.publicAudioRoot, sourceHash));
  const manifest: PronunciationLessonManifest = { lessonId: target.lesson.id, sourceVideo: target.packageDir ? target.sourceVideo : target.lesson.media.videoSrc, sourceHash, model: config.model, generatedAt: new Date().toISOString(), algorithmFingerprint, clips };
  if (!config.dryRun) {
    const extractable = selectedExtractables(clips); if (target.outputAudioDirectory && extractable.length) extractAll(target.sourceVideo, target.outputAudioDirectory, extractable);
    if (target.packageDir) writeJson(join(target.packageDir, "audio-clips.json"), { clips: clips.filter((clip) => isExtractable(clip.thai) && isExtractable(clip.english)).map((clip) => ({ cueCardId: clip.cueCardId, thai: rangeOutput(clip.thai, `${clip.cueCardId}-th.m4a`), english: rangeOutput(clip.english, `${clip.cueCardId}-en.m4a`) })) });
  }
  const counts = clips.reduce((value, clip) => ({ ...value, [clip.pairStatus]: value[clip.pairStatus] + 1 }), { complete: 0, "thai-only": 0, "english-only": 0, ambiguous: 0, unmatched: 0 });
  console.log(`${target.lesson.title}: ${clips.length} concepts · ${counts.complete} complete · ${counts["thai-only"]} Thai-only · ${counts["english-only"]} English-only · ${counts.ambiguous} ambiguous · ${counts.unmatched} unmatched`);
  for (const entry of qaFor(manifest)) console.log(`  ${entry.cueCardId}/${entry.language}: ${entry.status}${entry.warnings.length ? ` · ${entry.warnings.join(", ")}` : ""}`);
  return manifest;
}

function matchFor(card: CueCard, language: "thai" | "english", segments: TranscriptSegment[]): MatchResult {
  const override = card.pronunciationOverrides?.[language]; const target = override?.matchText ?? (language === "thai" ? card.thai : card.naturalMeaning);
  if (override) return { status: "overridden", start: override.startSeconds, end: override.endSeconds, transcriptMatch: target, confidence: 1, candidates: [] };
  return (language === "thai" ? matchThaiPhrase : matchEnglishPhrase)(target, segments, { confidenceThreshold: generatorConfig.confidenceThreshold, ambiguityMargin: generatorConfig.ambiguityMargin });
}
function alignConceptMatches(cards: CueCard[], segments: TranscriptSegment[]): MatchedConcept[] {
  const used = new Set<string>(); let cursor = 0;
  return cards.map((card) => {
    const thaiMatch = matchFor(card, "thai", segments); const englishMatch = matchFor(card, "english", segments);
    const pairs = matchCandidates(thaiMatch).flatMap((thai) => matchCandidates(englishMatch).map((english) => ({ thai, english, anchor: Math.min(thai.start, english.start), end: Math.max(thai.end, english.end), distance: Math.max(thai.start, english.start) - Math.min(thai.end, english.end), confidence: thai.confidence + english.confidence })))
      .filter((pair) => pair.distance <= generatorConfig.maximumPairDistanceSeconds && pair.anchor >= cursor - 0.2 && !used.has(candidateKey("th", pair.thai)) && !used.has(candidateKey("en", pair.english)));
    const bestConfidence = Math.max(...pairs.map((pair) => pair.confidence), Number.NEGATIVE_INFINITY); const selected = pairs.filter((pair) => pair.confidence >= bestConfidence - generatorConfig.ambiguityMargin * 2).sort((left, right) => left.anchor - right.anchor || left.distance - right.distance || right.confidence - left.confidence)[0];
    if (!selected) return { card, thai: thaiMatch, english: englishMatch };
    used.add(candidateKey("th", selected.thai)); used.add(candidateKey("en", selected.english)); cursor = selected.end;
    return { card, thai: selectedMatch(thaiMatch, selected.thai), english: selectedMatch(englishMatch, selected.english) };
  });
}
function matchCandidates(match: MatchResult): TranscriptCandidate[] { return match.status === "overridden" && match.start !== undefined && match.end !== undefined ? [{ start: match.start, end: match.end, transcriptMatch: match.transcriptMatch ?? "override", confidence: 1, exact: true, segmentIndex: -1 }] : match.candidates; }
function candidateKey(language: string, candidate: { start: number; end: number }) { return `${language}:${candidate.start.toFixed(3)}:${candidate.end.toFixed(3)}`; }
function selectedMatch(original: MatchResult, candidate: TranscriptCandidate): MatchResult { return { status: original.status === "overridden" ? "overridden" : "matched", start: candidate.start, end: candidate.end, transcriptMatch: candidate.transcriptMatch, confidence: candidate.confidence, candidates: original.candidates }; }
function allEnvelopes(concepts: MatchedConcept[]): SpeechEnvelope[] {
  return concepts.flatMap((concept) => (["thai", "english"] as const).map((language) => ({ id: `${concept.card.id}:${language}`, match: concept[language] }))).filter((entry) => entry.match.start !== undefined && entry.match.end !== undefined).map((entry) => ({ id: entry.id, start: entry.match.start!, end: entry.match.end! }));
}
function makeConceptClip(concept: MatchedConcept, envelopes: RefinedSpeechEnvelope[], frames: EnergyFrame[], duration: number, publicRoot: string, sourceHash: string): PronunciationManifestClip {
  const thai = languageClip(concept.card, "thai", concept.thai, envelopes, frames, duration, `${publicRoot}/${concept.card.id}-th.m4a`, sourceHash); const english = languageClip(concept.card, "english", concept.english, envelopes, frames, duration, `${publicRoot}/${concept.card.id}-en.m4a`, sourceHash);
  const thaiReady = isExtractable(thai); const englishReady = isExtractable(english); const ambiguous = thai.status === "ambiguous" || english.status === "ambiguous"; const pairStatus = thaiReady && englishReady ? "complete" : thaiReady ? "thai-only" : englishReady ? "english-only" : ambiguous ? "ambiguous" : "unmatched";
  return { cueCardId: concept.card.id, thaiText: concept.card.thai, englishText: concept.card.naturalMeaning, thai, english, pairStatus };
}
function languageClip(card: CueCard, language: "thai" | "english", match: MatchResult, envelopes: RefinedSpeechEnvelope[], frames: EnergyFrame[], duration: number, audio: string, sourceHash: string): PronunciationLanguageClip {
  if (match.start === undefined || match.end === undefined) return { status: match.status, candidates: match.candidates, diagnostic: match.diagnostic, warnings: [match.status] };
  const override = card.pronunciationOverrides?.[language];
  if (override) {
    const warnings: string[] = []; if (override.endSeconds > duration) warnings.push("invalid-duration");
    if (pronunciationReviewIsStale(override.review, sourceHash, algorithmFingerprint)) warnings.push("stale-review"); else if (!override.review) warnings.push("legacy-unreviewed-override");
    return { audio: warnings.includes("invalid-duration") ? undefined : audio, status: "overridden", start: override.startSeconds, end: override.endSeconds, rawStart: override.startSeconds, rawEnd: override.endSeconds, protectedStart: override.startSeconds, protectedEnd: override.endSeconds, envelopeMethod: "override", transcriptMatch: match.transcriptMatch, confidence: 1, candidates: match.candidates, boundaryMethod: { start: "override", end: "override" }, boundaryConfidence: { start: 1, end: 1 }, warnings };
  }
  const envelope = envelopes.find((entry) => entry.id === `${card.id}:${language}`) ?? { id: `${card.id}:${language}`, start: match.start, end: match.end, method: "whisper" as const }; const proposal = proposeSpeechProtectedRange(envelope, envelopes, frames, duration, generatorConfig);
  if (!proposal) return { status: "unmatched", candidates: match.candidates, diagnostic: "Matched speech exceeds source or maximum clip duration.", rawStart: match.start, rawEnd: match.end, warnings: ["invalid-proposal"] };
  const warnings = [...proposal.warnings]; if (envelope.method === "whisper") warnings.push("unrefined-whisper-envelope"); if (!assertProtectedRange(proposal, envelope)) warnings.push("protected-envelope-violation");
  return { audio, status: match.status, start: proposal.start, end: proposal.end, rawStart: match.start, rawEnd: match.end, protectedStart: envelope.start, protectedEnd: envelope.end, envelopeMethod: envelope.method, transcriptMatch: match.transcriptMatch, confidence: match.confidence, candidates: match.candidates, boundaryMethod: proposal.method, boundaryConfidence: proposal.confidence, warnings, diagnostic: match.diagnostic };
}

function selectedExtractables(clips: PronunciationManifestClip[]): Extractable[] {
  return clips.flatMap((clip) => (["thai", "english"] as const).map((language) => ({ clip, language, value: clip[language] }))).filter((entry) => (!options.onlyCard || entry.clip.cueCardId === options.onlyCard) && (!options.onlyLanguage || entry.language === options.onlyLanguage)).map((entry) => extractableFor(entry.value, `${entry.clip.cueCardId}-${entry.language === "thai" ? "th" : "en"}.m4a`)).filter((entry): entry is Extractable => Boolean(entry));
}
function isExtractable(clip: PronunciationLanguageClip): boolean { return Boolean(clip.audio && clip.start !== undefined && clip.end !== undefined && clip.end > clip.start); }
function extractableFor(clip: PronunciationLanguageClip, output: string): Extractable | undefined { return isExtractable(clip) ? { output, start: clip.start!, end: clip.end! } : undefined; }
function rangeOutput(clip: PronunciationLanguageClip, output: string) { return { output, startSeconds: clip.start!, endSeconds: clip.end! }; }
function extractAll(source: string, outputDirectory: string, clips: Extractable[]) {
  mkdirSync(outputDirectory, { recursive: true });
  const filters = clips.map((clip, index) => { const duration = clip.end - clip.start; const fade = Math.min(generatorConfig.fadeMs / 1000, duration / 4); return `[0:a]atrim=start=${clip.start}:end=${clip.end},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=${fade},afade=t=out:st=${Math.max(0, duration - fade)}:d=${fade}[a${index}]`; }).join(";");
  const temporary = clips.map((clip) => join(outputDirectory, `.${clip.output}.tmp.m4a`)); const outputArgs = clips.flatMap((_, index) => ["-map", `[a${index}]`, "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", temporary[index]]);
  run("ffmpeg", ["-y", "-i", source, "-filter_complex", filters, ...outputArgs]); clips.forEach((clip, index) => renameSync(temporary[index], join(outputDirectory, clip.output)));
}
function qaFor(manifest: PronunciationLessonManifest): QaEntry[] {
  return manifest.clips.flatMap((clip) => (["thai", "english"] as const).map((language) => ({ lessonId: manifest.lessonId, cueCardId: clip.cueCardId, language, warnings: clip[language].warnings ?? [], status: clip[language].status }))).filter((entry) => !["matched", "overridden"].includes(entry.status) || entry.warnings.length > 0);
}
function hashFile(file: string) { return createHash("sha256").update(readFileSync(file)).digest("hex"); }
function run(command: string, commandArgs: string[]) { if (options.verbose) console.log(`  ${command} ${commandArgs.join(" ")}`); const result = spawnSync(command, commandArgs, { stdio: options.verbose ? "inherit" : "pipe", encoding: "utf8" }); if (result.status !== 0) fail(`${command} failed${typeof result.stderr === "string" && result.stderr.trim() ? `: ${result.stderr.trim()}` : ""}`); }
function writeJson(path: string, value: unknown) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`); }
function loadGeneratorConfig(): GeneratorConfig {
  const path = join(toolRoot, "config.json"); const raw = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) as Partial<GeneratorConfig> : {}; const config: GeneratorConfig = { model: raw.model ?? "large-v3", ...defaultBoundaryOptions, ...defaultThaiMatchOptions, maximumPairDistanceSeconds: 5, ...raw };
  const positive = [config.frameDurationMs, config.boundarySearchBeforeMs, config.boundarySearchAfterMs, config.quietRunMs, config.maximumClipDurationMs, config.minimumClipDurationMs, config.speechThresholdDbAboveNoise, config.speechIslandMergeGapMs, config.minimumSpeechIslandMs, config.speechIslandSearchMs];
  if (!config.model || positive.some((value) => value <= 0) || config.protectivePaddingBeforeMs < 0 || config.protectivePaddingAfterMs < 0 || config.quietThresholdDbAboveNoise <= 0 || config.fadeMs < 0 || config.minimumSpeechIslandScore <= 0 || config.minimumSpeechIslandScore > 1 || config.maximumClipDurationMs < config.minimumClipDurationMs || config.confidenceThreshold <= 0 || config.confidenceThreshold > 1 || config.ambiguityMargin < 0 || config.ambiguityMargin >= 1 || config.maximumPairDistanceSeconds <= 0) fail(`Invalid pronunciation generator config: ${path}`);
  return config;
}
