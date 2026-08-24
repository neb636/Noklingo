import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { curriculum } from "../src/content/curriculum";
import { CurriculumSchema } from "../src/domain/schemas";

const problems: string[] = [];
const warnings: string[] = [];
const audioById = new Map(
  curriculum.audioAssets.map((asset) => [asset.id, asset]),
);

CurriculumSchema.parse(curriculum);

const localFile = (source: string) =>
  resolve(process.cwd(), "public", source.replace(/^\/+/, ""));

async function exists(source: string | undefined) {
  if (!source) return false;
  try {
    await access(localFile(source));
    return true;
  } catch {
    return false;
  }
}

for (const lesson of curriculum.lessons) {
  if (!lesson.media.src.endsWith(".mp4")) {
    problems.push(`${lesson.id}: media source must be an MP4`);
  }
  const videoExists = await exists(lesson.media.src);
  const posterExists = await exists(lesson.media.posterSrc);
  const captionsExist = await exists(lesson.media.captionsSrc);

  if (lesson.transcriptStatus === "verified") {
    if (!videoExists) problems.push(`${lesson.id}: bundled MP4 is missing`);
    if (!posterExists) problems.push(`${lesson.id}: poster image is missing`);
    if (!captionsExist)
      problems.push(`${lesson.id}: WebVTT captions are missing`);
    const requiredAudioRefs = new Set(
      lesson.quizBank.flatMap((quiz) =>
        quiz.quizKind === "listening" && quiz.audioRef ? [quiz.audioRef] : [],
      ),
    );
    for (const audioRef of requiredAudioRefs) {
      const source = audioById.get(audioRef)?.src;
      if (!source || !(await exists(source))) {
        problems.push(`${lesson.id}: bundled audio ${audioRef} is missing`);
      }
    }
  } else if (!videoExists) {
    warnings.push(
      `${lesson.id}: expected local MP4 is not supplied; the learner-facing fallback will be used`,
    );
  }
}

if (problems.length) {
  throw new Error(
    `Curriculum validation failed:\n${problems.map((item) => `- ${item}`).join("\n")}`,
  );
}

for (const warning of warnings) console.warn(`warning: ${warning}`);
console.log(
  `Validated v${curriculum.schemaVersion}: ${curriculum.lessons.length} lesson, ${curriculum.knowledgeItems.length} cue cards, ${curriculum.lessons.reduce((sum, lesson) => sum + lesson.quizBank.length, 0)} quiz variants.`,
);
