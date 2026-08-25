import { existsSync } from "node:fs";
import { resolve, sep } from "node:path";
import { validateCurriculum } from "../src/domain/curriculum-validation";
import { cueCards, lessons } from "../src/domain/seed";

const publicRoot = resolve(import.meta.dirname, "..", "public");

function assetFile(localPath: string) {
  const file = resolve(publicRoot, localPath.replace(/^\/+/, ""));
  if (file !== publicRoot && !file.startsWith(`${publicRoot}${sep}`)) throw new Error(`Unsafe local asset path: ${localPath}`);
  return file;
}

const issues = validateCurriculum(lessons, cueCards, {
  assetExists: (localPath) => existsSync(assetFile(localPath)),
});
if (issues.length) {
  for (const issue of issues) console.error(`${issue.lessonId}: ${issue.message}`);
  process.exitCode = 1;
} else {
  console.log("Curriculum contracts are valid.");
}
