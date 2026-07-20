import { access } from "node:fs/promises";
import { resolve } from "node:path";
import {
  CourseAuthoringError,
  parseCourse,
  validateCourseAuthoring,
} from "../src/domain/courseValidation";
import { audioManifest } from "../src/content/audioManifest";
import { rawCourse } from "../src/content/course";

async function validateBundledAudio() {
  const course = parseCourse(rawCourse);
  const missing: string[] = [];
  for (const asset of course.audioAssets) {
    for (const source of [asset.src, asset.slowSrc]) {
      if (
        !source ||
        source.startsWith("tts:") ||
        source.startsWith("tts-slow:")
      )
        continue;
      const localPath = source.startsWith("/")
        ? resolve(process.cwd(), "public", source.slice(1))
        : resolve(process.cwd(), "public", source);
      try {
        await access(localPath);
      } catch {
        missing.push(`${asset.id}: ${source}`);
      }
    }
  }
  return { course, missing };
}

function validateRecordingManifest() {
  const errors: string[] = [];
  const ids = new Set<string>();
  const filenames = new Set<string>();
  const lessonIds = new Set(rawCourse.lessons.map((lesson) => lesson.id));
  for (const entry of audioManifest) {
    if (ids.has(entry.id)) errors.push(`Duplicate manifest ID: ${entry.id}`);
    ids.add(entry.id);
    if (filenames.has(entry.suggestedFilename))
      errors.push(`Duplicate suggested filename: ${entry.suggestedFilename}`);
    filenames.add(entry.suggestedFilename);
    for (const lessonId of entry.lessonIds) {
      if (!lessonIds.has(lessonId))
        errors.push(`${entry.id}: unknown lesson ${lessonId}`);
    }
  }
  for (const asset of rawCourse.audioAssets) {
    const entries = audioManifest.filter(
      ({ audioAssetId }) => audioAssetId === asset.id,
    );
    const speeds = new Set(entries.map(({ deliverySpeed }) => deliverySpeed));
    if (entries.length !== 2 || !speeds.has("normal") || !speeds.has("slow")) {
      errors.push(
        `${asset.id}: manifest needs one normal and one slow recording`,
      );
    }
    if (entries.some(({ lessonIds: uses }) => uses.length === 0))
      errors.push(`${asset.id}: manifest entry is not connected to a lesson`);
  }
  return errors;
}

try {
  const { course, missing } = await validateBundledAudio();
  const issues = validateCourseAuthoring(course);
  const manifestErrors = validateRecordingManifest();
  const warnings = issues.filter(({ severity }) => severity === "warning");
  if (missing.length) {
    throw new Error(
      `Missing bundled audio:\n${missing.map((item) => `- ${item}`).join("\n")}`,
    );
  }
  if (manifestErrors.length) {
    throw new Error(
      `Invalid audio recording manifest:\n${manifestErrors
        .map((item) => `- ${item}`)
        .join("\n")}`,
    );
  }
  for (const warning of warnings) {
    console.warn(`Warning · ${warning.path}: ${warning.message}`);
  }
  const exerciseCount = course.lessons.reduce(
    (sum, lesson) => sum + lesson.exercises.length,
    0,
  );
  console.log(
    `Course valid: ${course.units.length} units, ${course.lessons.length} lessons, ${exerciseCount} exercises, ${course.audioAssets.length} audio assets, ${audioManifest.length} recording takes (${audioManifest.filter(({ recordingStatus }) => recordingStatus === "needs-recording").length} still needed).`,
  );
} catch (error) {
  if (error instanceof CourseAuthoringError) {
    console.error(error.message);
  } else {
    console.error(error instanceof Error ? error.message : error);
  }
  process.exitCode = 1;
}
