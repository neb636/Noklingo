import { execFile } from "node:child_process";
import { copyFile, mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";

const root = resolve(import.meta.dirname, "..");
const sourceDir = join(root, "insta");
const posterDir = process.env.REEL_POSTER_DIR
  ? resolve(process.env.REEL_POSTER_DIR)
  : undefined;
const execFileAsync = promisify(execFile);

// Deliberately editorial metadata only. These plans remain drafts until their
// language, timestamps, captions, phrase audio, and quiz banks are reviewed.
const plans = [
  ["common-verbs", "learnthai_irl_2026-08-20_13-24-32_DcQ3KtgSPKN.mp4", "Essential verbs", "Recognize a small set of high-frequency action words.", 11.7],
  ["question-words", "learnthai_irl_2026-08-06_12-58-07_Dbsw7PxyKUN.mp4", "What, where, when, why, how", "Notice the core words used to ask for information.", 12.188],
  ["connectors", "learnthai_irl_2026-08-18_13-06-46_DcLreBDSxkH.mp4", "Conversation connectors", "Recognize small words that connect ideas in speech.", 10.795],
  ["large-numbers", "learnthai_irl_2026-07-31_12-07-54_DbdObkDyVQs.mp4", "Powers of ten", "Notice the pattern behind increasingly large Thai numbers.", 22.637],
  ["time-units", "learnthai_irl_2026-08-12_12-50-40_Db8M4GTygAD.mp4", "Minute through year", "Recognize words for minutes, hours, days, months, and years.", 11.77],
  ["times-of-day", "learnthai_irl_2026-08-09_12-33-56_Db0cod_S1wT.mp4", "Morning through night", "Distinguish common parts of the day in context.", 16.437],
  ["quantities", "learnthai_irl_2026-08-23_13-07-00_DcYjinlyu2w.mp4", "None through all", "Compare expressions for none, some, half, most, and all.", 16.6],
  ["country-names", "learnthai_irl_2026-08-03_14-26-18_DblMh82SJ0G.mp4", "Countries in Thai", "Recognize a selection of country names in Thai.", 36.453],
  ["directions", "learnthai_irl_2026-08-04_13-28-24_Dbnq6cpSqOQ.mp4", "Straight, turns, and U-turns", "Listen for practical movement and turning directions.", 13.674],
  ["weather", "learnthai_irl_2026-08-16_13-08-43_DcGiG_XydRu.mp4", "Everyday weather", "Recognize several everyday ways to describe the weather.", 13.814],
  ["feeling-unwell", "learnthai_irl_2026-08-07_12-47-39_DbvUdUsyqjb.mp4", "Saying you feel sick", "Recognize useful ways to say that you do not feel well.", 24.75],
  ["food-flavors", "learnthai_irl_2026-08-14_13-05-05_DcBXuuUS0k9.mp4", "Describing flavors", "Distinguish several basic ways to describe food.", 12.792],
  ["food-allergies", "learnthai_irl_2026-08-21_13-01-44_DcTZKYUSK9N.mp4", "Communicating allergies", "Notice the frame used to name common food allergies.", 20.269],
  ["coffee-order", "learnthai_irl_2026-08-22_13-02-35_DcV9636yyq5.mp4", "Ordering coffee", "Follow a real café visit and identify the ordering pattern.", 32.668],
  ["what-are-you-doing", "learnthai_irl_2026-08-01_13-34-18_Dbf8YlbSj_X.mp4", "An everyday check-in", "Listen for short questions used in everyday conversation.", 21.081],
  ["waking-up", "learnthai_irl_2026-08-11_13-05-14_Db5pmXqytEc.mp4", "Morning check-ins", "Follow a few short phrases used after waking up.", 22.916],
  ["movie-invitation", "learnthai_irl_2026-08-05_12-54-00_DbqLsjeT7bn.mp4", "Making an invitation", "Notice invitation patterns for simple shared activities.", 25.609],
  ["parting-safely", "learnthai_irl_2026-08-15_13-14-32_DcD9zQ8SQ8v.mp4", "Natural goodbyes", "Compare several warm ways to leave and check in later.", 21.151],
  ["encouragement", "learnthai_irl_2026-08-13_13-15-33_Db-0OFPSuuJ.mp4", "Keep going", "Listen for short phrases that encourage someone to continue.", 24.727],
  ["compliments", "learnthai_irl_2026-08-17_13-14-04_DcJHCxwygGy.mp4", "Kind things to say", "Notice short, friendly compliments for everyday conversation.", 20.617],
  ["its-okay", "learnthai_irl_2026-08-24_13-12-25_DcbIu-OyPNB.mp4", "Reassuring responses", "Compare reassuring responses used in different situations.", 34.108],
  ["making-up", "learnthai_irl_2026-08-19_13-04-57_DcOP6I7y_i9.mp4", "Apologies and reconciliation", "Notice apology and de-escalation phrases in an informal setting.", 22.358],
  ["affectionate-phrases", "learnthai_irl_2026-07-24_11-54-17_DbLLNypSMDH.mp4", "Affection and care", "Listen for a handful of warm phrases between close people.", 26.933],
  ["thai-slang-upgrades", "learnthai_irl_2026-08-02_13-28-02_DbihFsvyEEf.mp4", "Beginner versus native slang", "Compare beginner vocabulary with more colloquial alternatives.", 18.55],
];

function shortcode(filename) {
  return basename(filename, ".mp4").replace(
    /^learnthai_irl_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_/,
    "",
  );
}

function vttTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = (seconds % 60).toFixed(3).padStart(6, "0");
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${remainder}`;
}

function machineVtt(record) {
  const cues = record.segments.map((segment, index) => [
    String(index + 1),
    `${vttTime(segment.start)} --> ${vttTime(segment.end)} line:12%`,
    segment.text.replaceAll("-->", "→"),
  ].join("\n"));
  return [
    "WEBVTT",
    "",
    "NOTE Machine-generated draft captions. Not verified curriculum content.",
    "",
    ...cues.flatMap((cue) => [cue, ""]),
  ].join("\n");
}

const logPath = join(sourceDir, "reel_dialogue_logs", "dialogue_logs.json");
const logs = JSON.parse(await readFile(logPath, "utf8"));
const logsByVideo = new Map(logs.reels.map((record) => [record.video, record]));
const lessons = [];

for (const [index, [id, filename, title, objective, durationSeconds]] of plans.entries()) {
  const sourcePath = join(sourceDir, filename);
  const details = await stat(sourcePath);
  if (!details.isFile() || details.size === 0) throw new Error(`Missing Reel source: ${filename}`);

  const targetDir = join(root, "public", "lessons", "drafts", id);
  await mkdir(targetDir, { recursive: true });
  await copyFile(sourcePath, join(targetDir, "intro.mp4"));

  const posterName = `${filename}.png`;
  const posterSource = posterDir ? join(posterDir, posterName) : undefined;
  if (posterSource) {
    const temporaryPoster = join(targetDir, "poster-source.png");
    await copyFile(posterSource, temporaryPoster);
    await execFileAsync("sips", [
      "-s", "format", "jpeg", "-s", "formatOptions", "82",
      temporaryPoster, "--out", join(targetDir, "poster.jpg"),
    ]);
    await unlink(temporaryPoster);
  }

  const record = logsByVideo.get(filename);
  const captionsSrc = record ? `/lessons/drafts/${id}/captions.vtt` : undefined;
  if (record) await writeFile(join(targetDir, "captions.vtt"), machineVtt(record), "utf8");

  const code = shortcode(filename);
  lessons.push({
    id,
    order: index + 1,
    title,
    objective: `Draft plan — ${objective}`,
    description: "A locally bundled Reel awaiting transcript and Thai-language editorial review.",
    contentStatus: "draft",
    source: {
      label: "Learn Thai IRL · supplied local Reel",
      url: `https://www.instagram.com/learnthai_irl/reel/${code}/`,
      permissionStatus: "authorized",
    },
    media: {
      videoSrc: `/lessons/drafts/${id}/intro.mp4`,
      posterSrc: `/lessons/drafts/${id}/poster.jpg`,
      captionsSrc,
      durationSeconds,
      durationStatus: "confirmed",
      captionsStatus: record ? "machine-draft" : "unavailable",
      availability: "available",
      fallbackMessage: "This local draft clip could not be played on this device.",
    },
    transcript: [],
    draftTranscript: record ? {
      generatedAt: logs.generated_at,
      model: record.model,
      detectedLanguage: record.detected_language,
      languageProbability: record.language_probability,
      segments: record.segments.map((segment, segmentIndex) => ({
        id: `${id}-machine-${segmentIndex + 1}`,
        startSeconds: segment.start,
        endSeconds: segment.end,
        text: segment.text,
      })),
    } : undefined,
    cueCardIds: [],
    quizBank: [],
  });
}

const outputPath = join(root, "src", "content", "draft-reels.json");
await writeFile(outputPath, `${JSON.stringify({ lessons }, null, 2)}\n`, "utf8");
console.log(`Bundled ${lessons.length} draft Reel plans (${logsByVideo.size} with machine-caption intake).`);
