import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, resolve } from "node:path";
import draftCardsJson from "../src/content/draft-cue-cards.json";
import draftLessonsJson from "../src/content/draft-reels.json";
import type { PronunciationLessonManifest } from "../src/domain/pronunciation";
import { CueCardSchema, VideoLessonSchema } from "../src/domain/schemas";
import { waveformPeaks, wavDuration } from "../tools/pronunciation-generator/audio-analysis";
import { approvePronunciationOverride, type ReviewLanguage } from "../tools/pronunciation-generator/review-store";

const repoRoot = resolve(import.meta.dirname, ".."); const args = process.argv.slice(2); const lessonId = args.find((arg, index) => !arg.startsWith("--") && args[index - 1] !== "--port"); const port = Number(optionValue("--port") ?? 4317);
if (!lessonId || !Number.isInteger(port) || port < 1024 || port > 65535) fail("Usage: npm run pronunciation:review -- <lesson-id> [--port 4317]");
const lessons = VideoLessonSchema.array().parse(draftLessonsJson.lessons); const cards = CueCardSchema.array().parse(draftCardsJson.cueCards); const selectedLesson = lessons.find((entry) => entry.id === lessonId); if (!selectedLesson) fail(`Unknown draft lesson: ${lessonId}`); const lesson = selectedLesson;
const lessonCards = cards.filter((card) => card.lessonId === lessonId); const sourceVideo = join(repoRoot, "public", lesson.media.videoSrc.replace(/^\/+/, "")); const audioDirectory = join(repoRoot, "public", "lessons", "drafts", lessonId, "audio");
if (lesson.activityMode === "video-only") fail(`${lesson.title} is a video-only class and has no pronunciation clips to review.`);
const manifestPath = join(repoRoot, "public", "lessons", "drafts", lessonId, "pronunciation-manifest.json"); const cardsPath = join(repoRoot, "src", "content", "draft-cue-cards.json");
const sourceHash = createHash("sha256").update(readFileSync(sourceVideo)).digest("hex"); const transcriptDirectory = join(repoRoot, "tools", "pronunciation-generator", ".cache", "transcripts", sourceHash); const analysisAudio = join(transcriptDirectory, "audio.wav");
const reviewCache = join(repoRoot, "tools", "pronunciation-generator", ".cache", "review", sourceHash, lessonId); const baselineDirectory = join(reviewCache, "baseline"); const previewDirectory = join(reviewCache, "preview");
mkdirSync(baselineDirectory, { recursive: true }); mkdirSync(previewDirectory, { recursive: true });
if (existsSync(audioDirectory) && !existsSync(join(baselineDirectory, ".captured"))) {
  cpSync(audioDirectory, baselineDirectory, { recursive: true }); copyFileSync(manifestPath, join(baselineDirectory, "pronunciation-manifest.json"));
  // Marker creation is intentionally cache-only.
  copyFileSync(manifestPath, join(baselineDirectory, ".captured"));
}
regenerate();

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
    if (request.method === "GET" && url.pathname === "/") return sendFile(response, join(repoRoot, "tools", "pronunciation-generator", "review-ui.html"));
    if (request.method === "GET" && url.pathname === "/review-ui.js") return sendFile(response, join(repoRoot, "tools", "pronunciation-generator", "review-ui.js"));
    if (request.method === "GET" && url.pathname === "/review-ui.css") return sendFile(response, join(repoRoot, "tools", "pronunciation-generator", "review-ui.css"));
    if (request.method === "GET" && url.pathname === "/api/data") return json(response, reviewData());
    if (request.method === "GET" && url.pathname === "/video") return sendFile(response, sourceVideo, request);
    if (request.method === "GET" && url.pathname.startsWith("/audio/current/")) return sendNamedAudio(response, audioDirectory, url.pathname.split("/").at(-1));
    if (request.method === "GET" && url.pathname.startsWith("/audio/baseline/")) return sendNamedAudio(response, baselineDirectory, url.pathname.split("/").at(-1));
    if (request.method === "GET" && url.pathname === "/api/preview") return preview(response, url);
    if (request.method === "POST" && url.pathname === "/api/approve") return approve(request, response);
    response.writeHead(404).end("Not found");
  } catch (error) { response.writeHead(500, { "content-type": "application/json" }).end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) })); }
});
server.listen(port, "127.0.0.1", () => console.log(`Pronunciation review for ${lessonId}: http://127.0.0.1:${port}`));

function optionValue(name: string) { const index = args.indexOf(name); return index === -1 ? undefined : args[index + 1]; }
function fail(message: string): never { console.error(message); process.exit(1); }
function manifest() { return JSON.parse(readFileSync(manifestPath, "utf8")) as PronunciationLessonManifest; }
function audioDuration() { return wavDuration(analysisAudio); }
function regenerate(cardId?: string, language?: ReviewLanguage) {
  const command = ["--import", "tsx", join(repoRoot, "scripts", "generate-pronunciation.ts"), lessonId!]; if (cardId) command.push("--only-card", cardId); if (language) command.push("--only-language", language);
  const result = spawnSync(process.execPath, command, { cwd: repoRoot, encoding: "utf8" }); if (result.status !== 0) throw new Error(result.stderr || result.stdout || "Pronunciation regeneration failed."); if (result.stdout.trim()) console.log(result.stdout.trim());
}
function reviewData() {
  const current = manifest(); const duration = audioDuration();
  return { lesson: { id: lesson.id, title: lesson.title }, duration, sourceHash: current.sourceHash, algorithmFingerprint: current.algorithmFingerprint, peaks: waveformPeaks(analysisAudio), clips: current.clips.flatMap((clip) => (["thai", "english"] as const).map((language) => ({ cardId: clip.cueCardId, language, text: language === "thai" ? clip.thaiText : clip.englishText, counterpart: language === "thai" ? clip.englishText : clip.thaiText, file: `${clip.cueCardId}-${language === "thai" ? "th" : "en"}.m4a`, ...clip[language] }))) };
}
async function approve(request: IncomingMessage, response: ServerResponse) {
  const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(Buffer.from(chunk)); const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { cardId?: string; language?: string; start?: number; end?: number };
  if (!body.cardId || !lessonCards.some((card) => card.id === body.cardId) || (body.language !== "thai" && body.language !== "english")) throw new Error("Invalid cue card or language.");
  const current = manifest(); approvePronunciationOverride({ cardsPath, cueCardId: body.cardId, language: body.language, startSeconds: Number(body.start), endSeconds: Number(body.end), durationSeconds: audioDuration(), sourceHash: current.sourceHash, algorithmFingerprint: current.algorithmFingerprint ?? "unknown" });
  regenerate(body.cardId, body.language); return json(response, reviewData());
}
function preview(response: ServerResponse, url: URL) {
  const start = Number(url.searchParams.get("start")); const end = Number(url.searchParams.get("end")); if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > audioDuration()) throw new Error("Invalid preview range.");
  const key = createHash("sha256").update(`${sourceHash}:${start.toFixed(3)}:${end.toFixed(3)}`).digest("hex").slice(0, 20); const output = join(previewDirectory, `${key}.m4a`);
  if (!existsSync(output)) execFileSync("ffmpeg", ["-v", "error", "-y", "-i", sourceVideo, "-ss", String(start), "-to", String(end), "-vn", "-c:a", "aac", "-b:a", "96k", output]);
  return sendFile(response, output);
}
function sendNamedAudio(response: ServerResponse, directory: string, file: string | undefined) { if (!file || !/^[a-z0-9-]+-(?:th|en)\.m4a$/.test(file)) return response.writeHead(400).end("Invalid filename"); return sendFile(response, join(directory, file)); }
function json(response: ServerResponse, value: unknown) { response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }).end(JSON.stringify(value)); }
function sendFile(response: ServerResponse, path: string, request?: IncomingMessage) {
  if (!existsSync(path)) return response.writeHead(404).end("Not found"); const size = statSync(path).size; const mime = ({ ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".mp4": "video/mp4", ".m4a": "audio/mp4" } as Record<string, string>)[extname(path)] ?? "application/octet-stream"; const range = request?.headers.range;
  if (range) { const match = /bytes=(\d+)-(\d*)/.exec(range); if (!match) return response.writeHead(416).end(); const start = Number(match[1]); const end = match[2] ? Math.min(size - 1, Number(match[2])) : size - 1; response.writeHead(206, { "content-type": mime, "content-length": end - start + 1, "content-range": `bytes ${start}-${end}/${size}`, "accept-ranges": "bytes" }); return response.end(readFileSync(path).subarray(start, end + 1)); }
  response.writeHead(200, { "content-type": mime, "content-length": size, "accept-ranges": "bytes" }).end(readFileSync(path));
}
