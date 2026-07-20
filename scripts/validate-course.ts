import { access } from "node:fs/promises";
import { resolve } from "node:path";
import {
  CourseAuthoringError,
  parseCourse,
  validateCourseAuthoring,
} from "../src/domain/courseValidation";
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

try {
  const { course, missing } = await validateBundledAudio();
  const issues = validateCourseAuthoring(course);
  const warnings = issues.filter(({ severity }) => severity === "warning");
  if (missing.length) {
    throw new Error(
      `Missing bundled audio:\n${missing.map((item) => `- ${item}`).join("\n")}`,
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
    `Course valid: ${course.units.length} units, ${course.lessons.length} lessons, ${exerciseCount} exercises, ${course.audioAssets.length} audio assets.`,
  );
} catch (error) {
  if (error instanceof CourseAuthoringError) {
    console.error(error.message);
  } else {
    console.error(error instanceof Error ? error.message : error);
  }
  process.exitCode = 1;
}
