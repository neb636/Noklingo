import { create } from "zustand";
import { cueCards, firstLesson } from "@/domain/seed";
import {
  AppSnapshotSchema,
  type AppSnapshot,
  type Settings,
  type StudyAttempt,
} from "@/domain/schemas";

export const defaultSnapshot: AppSnapshot = {
  version: 1,
  lessonProgress: [{ lessonId: firstLesson.id, status: "unseen" }],
  reviewStates: [],
  attempts: [],
  sessions: [],
  settings: {
    audioEnabled: true,
    speechRate: 0.85,
    theme: "system",
    thaiSize: "standard",
    reduceMotion: false,
    captionsByDefault: true,
  },
  streak: { currentDays: 0, longestDays: 0 },
};

type RecallResult = StudyAttempt["result"];

interface StudyState extends AppSnapshot {
  hydrated: boolean;
  quizAnswers: Record<string, number>;
  hydrate: (snapshot: AppSnapshot) => void;
  beginLesson: (lessonId: string) => void;
  recordRecall: (itemId: string, result: RecallResult) => void;
  answerQuiz: (questionId: string, choiceIndex: number) => void;
  completeLesson: (lessonId: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceSnapshot: (snapshot: AppSnapshot) => void;
  reset: () => void;
}

function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useStudyStore = create<StudyState>((set) => ({
  ...defaultSnapshot,
  hydrated: false,
  quizAnswers: {},
  hydrate: (snapshot) => set({ ...AppSnapshotSchema.parse(snapshot), hydrated: true }),
  beginLesson: (lessonId) => set((state) => {
    const now = new Date().toISOString();
    const existing = state.lessonProgress.find((entry) => entry.lessonId === lessonId);
    const next = {
      lessonId,
      status: existing?.status === "mastered" ? "mastered" as const : "introduced" as const,
      introducedAt: existing?.introducedAt ?? now,
      masteredAt: existing?.masteredAt,
      lastStudiedAt: now,
    };
    return {
      lessonProgress: [...state.lessonProgress.filter((entry) => entry.lessonId !== lessonId), next],
    };
  }),
  recordRecall: (itemId, result) => set((state) => {
    const card = cueCards.find((entry) => entry.id === itemId);
    if (!card) return state;
    const now = new Date();
    const existing = state.reviewStates.find((entry) => entry.itemId === itemId);
    const nextInterval = result === "again" ? 1 : result === "effortful"
      ? Math.max(1, existing?.intervalDays ?? 1)
      : Math.max(2, (existing?.intervalDays ?? 1) * 2);
    const due = new Date(now);
    due.setDate(due.getDate() + nextInterval);
    const attempt: StudyAttempt = {
      id: id("attempt"), lessonId: card.lessonId, itemId,
      promptType: "thai-to-meaning", result, createdAt: now.toISOString(),
    };
    const today = dayKey(now);
    const session = state.sessions.find((entry) => entry.date === today && entry.lessonId === card.lessonId);
    const nextSession = session
      ? { ...session, attemptIds: [...session.attemptIds, attempt.id] }
      : { id: id("session"), date: today, lessonId: card.lessonId, attemptIds: [attempt.id] };
    return {
      attempts: [...state.attempts, attempt],
      reviewStates: [
        ...state.reviewStates.filter((entry) => entry.itemId !== itemId),
        {
          itemId,
          dueAt: due.toISOString(),
          intervalDays: nextInterval,
          ease: Math.min(3, Math.max(1.3, (existing?.ease ?? 2.3) + (result === "remembered" ? 0.1 : -0.15))),
          successfulRecalls: (existing?.successfulRecalls ?? 0) + (result === "remembered" ? 1 : 0),
          lastResult: result,
        },
      ],
      sessions: [...state.sessions.filter((entry) => entry.id !== session?.id), nextSession],
    };
  }),
  answerQuiz: (questionId, choiceIndex) => set((state) => ({
    quizAnswers: { ...state.quizAnswers, [questionId]: choiceIndex },
  })),
  completeLesson: (lessonId) => set((state) => {
    const now = new Date();
    const today = dayKey(now);
    const last = state.streak.lastStudyDate;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const nextDays = last === today ? state.streak.currentDays : last === dayKey(yesterday)
      ? state.streak.currentDays + 1 : 1;
    const session = state.sessions.find((entry) => entry.date === today && entry.lessonId === lessonId);
    return {
      lessonProgress: [
        ...state.lessonProgress.filter((entry) => entry.lessonId !== lessonId),
        {
          lessonId,
          status: "awaiting-mastery" as const,
          introducedAt: state.lessonProgress.find((entry) => entry.lessonId === lessonId)?.introducedAt ?? now.toISOString(),
          lastStudiedAt: now.toISOString(),
        },
      ],
      sessions: session
        ? [...state.sessions.filter((entry) => entry.id !== session.id), { ...session, completedAt: now.toISOString() }]
        : state.sessions,
      streak: { currentDays: nextDays, longestDays: Math.max(nextDays, state.streak.longestDays), lastStudyDate: today },
    };
  }),
  updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
  replaceSnapshot: (snapshot) => set({ ...AppSnapshotSchema.parse(snapshot), quizAnswers: {}, hydrated: true }),
  reset: () => set({ ...defaultSnapshot, quizAnswers: {}, hydrated: true }),
}));

export function snapshotFromState(state: StudyState): AppSnapshot {
  return AppSnapshotSchema.parse({
    version: 1,
    lessonProgress: state.lessonProgress,
    reviewStates: state.reviewStates,
    attempts: state.attempts,
    sessions: state.sessions,
    settings: state.settings,
    streak: state.streak,
  });
}
