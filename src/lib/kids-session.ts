const ORDER_KEY = "noklingo:kids-mode:lesson-order";
const COMPLETED_KEY = "noklingo:kids-mode:completed-lessons";

type LessonWithId = { id: string };

function readStringArray(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.sessionStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeStringArray(key: string, value: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Session storage can be unavailable in privacy-restricted environments.
  }
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function orderKidsLessonsForSession<T extends LessonWithId>(lessons: T[]): T[] {
  if (typeof window === "undefined") return lessons;

  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const storedOrder = readStringArray(ORDER_KEY).filter((id) => lessonById.has(id));
  const storedIds = new Set(storedOrder);
  const newIds = shuffle(lessons.map((lesson) => lesson.id).filter((id) => !storedIds.has(id)));
  const order = [...storedOrder, ...newIds];

  if (order.length !== storedOrder.length || order.some((id, index) => id !== storedOrder[index])) {
    writeStringArray(ORDER_KEY, order);
  }

  const completedIds = new Set(readStringArray(COMPLETED_KEY));
  const orderedLessons = order.map((id) => lessonById.get(id)).filter((lesson): lesson is T => Boolean(lesson));

  // Keep the random order stable, but move lessons finished during this browser
  // session behind lessons the child has not done yet.
  return [
    ...orderedLessons.filter((lesson) => !completedIds.has(lesson.id)),
    ...orderedLessons.filter((lesson) => completedIds.has(lesson.id)),
  ];
}

export function markKidsLessonCompleteForSession(lessonId: string) {
  const completedIds = readStringArray(COMPLETED_KEY);
  if (completedIds.includes(lessonId)) return;
  writeStringArray(COMPLETED_KEY, [...completedIds, lessonId]);
}
