import { validateCurriculum } from "../src/domain/curriculum-validation";

const issues = validateCurriculum();
if (issues.length) {
  for (const issue of issues) console.error(`${issue.lessonId}: ${issue.message}`);
  process.exitCode = 1;
} else {
  console.log("Curriculum contracts are valid.");
}
