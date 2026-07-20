// Compatibility exports keep UI imports small while the pure engine lives in
// src/engine and remains testable without React or browser storage.
export {
  addLocalDays,
  daysBetweenDateKeys,
  defaultProgress,
  findNextLessonId,
  isLessonUnlocked,
  isUnitUnlocked,
  localDateKey,
  recalculateMastery,
  refreshDailyProgress,
  unitPercent,
  unlockAchievements,
  updateStreak,
} from "@/src/engine/progression";
export {
  correctAnswerPresentation,
  gradeAnswer,
  isAnswerCorrect,
  sessionAccuracy,
} from "@/src/engine/grading";
