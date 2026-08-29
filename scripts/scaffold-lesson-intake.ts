import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { CueCardSchema, VideoLessonSchema } from "../src/domain/schemas";

const args = process.argv.slice(2);
const outputArg = args.find((arg) => !arg.startsWith("--")) ?? "content-inbox";
const apply = args.includes("--apply");
const repoRoot = resolve(import.meta.dirname, "..");
const outputRoot = resolve(outputArg);
const draftLessons = VideoLessonSchema.array().parse(JSON.parse(readFileSync(join(repoRoot, "src/content/draft-reels.json"), "utf8")).lessons);
const draftCards = CueCardSchema.array().parse(JSON.parse(readFileSync(join(repoRoot, "src/content/draft-cue-cards.json"), "utf8")).cueCards);

console.log(`Ready to scaffold ${draftLessons.length} lesson review packages below ${outputRoot}.`);
if (!apply) {
  console.log("Dry run complete. Add --apply to create packages without overwriting existing review work.");
  process.exit(0);
}

mkdirSync(outputRoot, { recursive: true });
for (const draft of draftLessons) {
  const packageDir = join(outputRoot, draft.id);
  if (existsSync(packageDir)) throw new Error(`Refusing to overwrite existing review package: ${packageDir}`);
  mkdirSync(packageDir, { recursive: true });
  const cards = draftCards.filter((card) => card.lessonId === draft.id).map((card) => ({
    ...card,
    thaiAudioSrc: `/lessons/${draft.id}/audio/${card.id}-th.m4a`,
    englishAudioSrc: `/lessons/${draft.id}/audio/${card.id}-en.m4a`,
  }));
  const lesson = {
    ...draft,
    media: {
      ...draft.media,
      videoSrc: `/lessons/${draft.id}/intro.mp4`,
      posterSrc: `/lessons/${draft.id}/poster.jpg`,
    },
  };
  writeFileSync(join(packageDir, "lesson.json"), `${JSON.stringify({ lesson, cueCards: cards }, null, 2)}\n`);
  if (draft.activityMode !== "video-only") {
    writeFileSync(join(packageDir, "audio-clips.template.json"), `${JSON.stringify({
      clips: cards.map((card) => ({
        cueCardId: card.id,
        thai: { output: `${card.id}-th.m4a`, startSeconds: null, endSeconds: null },
        english: { output: `${card.id}-en.m4a`, startSeconds: null, endSeconds: null },
      })),
    }, null, 2)}\n`);
  }
  writeFileSync(join(packageDir, "REVIEW.md"), reviewChecklist(draft.id, draft.title, cards.length));
  const sourceFile = join(repoRoot, "public", draft.media.videoSrc.replace(/^\/+/, ""));
  if (!existsSync(sourceFile)) throw new Error(`Draft source media is missing: ${sourceFile}`);
  cpSync(sourceFile, join(packageDir, "source.mp4"));
}
console.log(`Created ${draftLessons.length} review packages. Fill each checklist, rename audio-clips.template.json, then run the batch dry run.`);

function reviewChecklist(id: string, title: string, cardCount: number) {
  const lesson = draftLessons.find((entry) => entry.id === id)!;
  const activityReview = lesson.activityMode === "video-only"
    ? `- [ ] Confirm this is intentionally a video-only class with no attached homework.\n`
    : `- [ ] Verify Thai, romanization, and natural meaning for all ${cardCount} cards.\n` +
      `- [ ] Add a practical usage note to every card.\n` +
      `- [ ] Fill exact Thai and English timestamps, then rename audio-clips.template.json to audio-clips.json.\n` +
      `- [ ] Add at least two verified scored variants per card and all four required interaction types.\n`;
  return `# ${title} review\n\n` +
    `- [ ] Confirm public redistribution rights for video and extracted audio.\n` +
    `- [ ] Confirm the lesson topic emoji and every cue-card emoji match the intended meaning.\n` +
    activityReview +
    `- [ ] Mark cards, questions, and lesson verified only after reviewer sign-off.\n` +
    `- [ ] Run npm run lesson:import -- ${outputArg}/${id} and resolve every reported issue.\n`;
}
