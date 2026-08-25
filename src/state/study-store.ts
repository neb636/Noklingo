import { create } from "zustand";
import { cueCards, lessons, studyLessons } from "@/domain/seed";
import { reconcileSnapshot } from "@/domain/curriculum-validation";
import {
  AppSnapshotSchema,
  type ActiveStudySession, type AppSnapshot, type CompletedStudySession,
  type SessionAnswer, type Settings, type StudyAttempt, type VideoLesson,
} from "@/domain/schemas";
import {
  answerFor, buildSession, findQuestion, gradeChoice, gradeConstruction, gradeMatching,
  nextReviewState, passesMastery, updateConsistency, CURRICULUM_VERSION,
} from "@/engine/learning-engine";
import { addLocalDays, localDateKey } from "@/engine/local-date";
import { compareLocalDates } from "@/engine/local-date";

export const defaultSnapshot: AppSnapshot = {
  version: 3,
  curriculumVersion: CURRICULUM_VERSION,
  lessonProgress: [],
  reviewStates: [],
  attempts: [],
  completedSessions: [],
  activeSession: null,
  settings: {
    audioEnabled: true, volume: 0.75, speechRate: 0.85, theme: "system",
    showRomanization: true, showThaiScript: true, thaiSize: "standard",
    reduceMotion: false, captionsByDefault: true, politeParticle: "both",
  },
  streak: { currentDays: 0, longestDays: 0 },
};

interface StudyState extends AppSnapshot {
  hydrated: boolean;
  hydrationNotice: boolean;
  staleSessionNotice: boolean;
  hydrate: (snapshot: AppSnapshot, incompatible?: boolean, staleSessionDropped?: boolean) => void;
  dismissHydrationNotice: () => void;
  dismissStaleSessionNotice: () => void;
  startIntroduction: (lessonId: string) => void;
  startMastery: (lessonId: string) => void;
  startStandaloneReview: () => void;
  completeVideo: (bypassed?: boolean) => void;
  revealCard: () => void;
  advanceCard: () => void;
  answerChoice: (displayedChoiceIndex: number) => void;
  answerConstruction: (tokens: string[]) => void;
  answerMatching: (pairs: Array<{ left: string; right: string }>) => void;
  finishSession: () => void;
  abandonSession: () => void;
  clearLastResult: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceSnapshot: (snapshot: AppSnapshot) => void;
  reset: () => void;
}

function lessonById(lessonId: string): VideoLesson | undefined {
  return lessons.find((lesson) => lesson.id === lessonId);
}

function currentEntry(session: ActiveStudySession) {
  return session.queue[session.questionIndex];
}

function addAnswer(state: StudyState, answer: SessionAnswer): Partial<StudyState> {
  const session = state.activeSession;
  if (!session || answerFor(session, answer.queueId)) return {};
  return { activeSession: { ...session, answers: [...session.answers, answer], questionIndex: session.questionIndex + 1 } };
}

function attemptId(sessionId: string, queueId: string): string {
  return `attempt:${sessionId}:${queueId}`;
}

export const useStudyStore = create<StudyState>((set) => ({
  ...defaultSnapshot,
  hydrated: false,
  hydrationNotice: false,
  staleSessionNotice: false,
  hydrate: (snapshot, incompatible = false, staleSessionDropped = false) => {
    const reconciled = reconcileForCurrentCurriculum(snapshot);
    set({
      ...reconciled,
      hydrated: true,
      hydrationNotice: incompatible,
      staleSessionNotice: staleSessionDropped || (snapshot.activeSession !== null && reconciled.activeSession === null),
    });
  },
  dismissHydrationNotice: () => set({ hydrationNotice: false }),
  dismissStaleSessionNotice: () => set({ staleSessionNotice: false }),
  startIntroduction: (lessonId) => set((state) => {
    if (state.activeSession) return state;
    const lesson = lessonById(lessonId);
    const targetIndex = studyLessons.findIndex((item) => item.id === lessonId);
    const priorMastered = targetIndex >= 0 && studyLessons.slice(0, targetIndex).every((item) => state.lessonProgress.find((progress) => progress.lessonId === item.id)?.status === "mastered");
    const current = state.lessonProgress.find((progress) => progress.lessonId === lessonId);
    if (!lesson || targetIndex < 0 || !priorMastered || current?.status === "awaiting-mastery" || current?.status === "mastered") return state;
    const now = new Date();
    return { activeSession: buildSession({ mode: "introduction", lesson, snapshot: state, today: localDateKey(now), nowIso: now.toISOString() }) };
  }),
  startMastery: (lessonId) => set((state) => {
    if (state.activeSession) return state;
    const lesson = lessonById(lessonId);
    const now = new Date();
    const today = localDateKey(now);
    const progress = state.lessonProgress.find((entry) => entry.lessonId === lessonId);
    if (!lesson || progress?.status !== "awaiting-mastery" || !progress.masteryEligibleDate || compareLocalDates(progress.masteryEligibleDate, today) > 0 || progress.lastMasteryAttemptDate === today) return state;
    return { activeSession: buildSession({ mode: "mastery", lesson, snapshot: state, today, nowIso: now.toISOString() }) };
  }),
  startStandaloneReview: () => set((state) => {
    if (state.activeSession) return state;
    const now = new Date();
    if (!studyLessons.length || !studyLessons.every((lesson) => state.lessonProgress.find((entry) => entry.lessonId === lesson.id)?.status === "mastered")) return state;
    return { activeSession: buildSession({ mode: "standalone-review", snapshot: state, today: localDateKey(now), nowIso: now.toISOString() }) };
  }),
  completeVideo: (bypassed = false) => set((state) => state.activeSession?.stage === "video" ? {
    activeSession: { ...state.activeSession, videoCompleted: !bypassed, videoBypassed: bypassed, stage: "cue-cards", cardIndex: 0 },
  } : state),
  revealCard: () => set((state) => state.activeSession ? { activeSession: { ...state.activeSession, cardRevealed: true } } : state),
  advanceCard: () => set((state) => {
    const session = state.activeSession;
    if (!session) return state;
    const last = session.cardIndex >= session.cardOrder.length - 1;
    if (!last) return { activeSession: { ...session, cardIndex: session.cardIndex + 1, cardRevealed: false } };
    return { activeSession: { ...session, stage: session.mode === "introduction" ? "diagnostic" : "mastery-quiz", cardRevealed: false, questionIndex: 0 } };
  }),
  answerChoice: (displayedChoiceIndex) => set((state) => {
    const session = state.activeSession;
    const entry = session && currentEntry(session);
    if (!session || !entry) return state;
    return addAnswer(state, { queueId: entry.queueId, selectedChoice: displayedChoiceIndex, correct: gradeChoice(entry, displayedChoiceIndex), answeredAt: new Date().toISOString() });
  }),
  answerConstruction: (tokens) => set((state) => {
    const session = state.activeSession;
    const entry = session && currentEntry(session);
    if (!session || !entry) return state;
    return addAnswer(state, { queueId: entry.queueId, constructedTokens: tokens, correct: gradeConstruction(entry, tokens), answeredAt: new Date().toISOString() });
  }),
  answerMatching: (pairs) => set((state) => {
    const session = state.activeSession;
    const entry = session && currentEntry(session);
    if (!session || !entry) return state;
    return addAnswer(state, { queueId: entry.queueId, matchedPairs: pairs, correct: gradeMatching(entry, pairs), answeredAt: new Date().toISOString() });
  }),
  finishSession: () => set((state) => {
    const session = state.activeSession;
    if (!session || session.answers.length !== session.queue.length) return state;
    const now = new Date();
    const nowIso = now.toISOString();
    const today = localDateKey(now);
    const answerMap = new Map(session.answers.map((answer) => [answer.queueId, answer]));
    const activeEntries = session.queue.filter((entry) => entry.source === "active");
    const reviewEntries = session.queue.filter((entry) => entry.source === "review");
    const activeCorrect = activeEntries.filter((entry) => answerMap.get(entry.queueId)?.correct).length;
    const reviewCorrect = reviewEntries.filter((entry) => answerMap.get(entry.queueId)?.correct).length;
    const passed = session.mode === "mastery" ? passesMastery(activeCorrect, activeEntries.length) : undefined;
    const completed: CompletedStudySession = {
      ...session, localDate: today, stage: "results", completedAt: nowIso,
      activeCorrect, activeTotal: activeEntries.length, reviewCorrect, reviewTotal: reviewEntries.length, passed,
    };
    const newAttempts: StudyAttempt[] = session.queue.map((entry) => ({
      id: attemptId(session.id, entry.queueId), sessionId: session.id, lessonId: entry.lessonId,
      itemId: entry.itemId, questionId: entry.questionId,
      source: session.mode === "introduction" ? "diagnostic" : entry.source === "active" ? "active-mastery" : "spaced-review",
      correct: Boolean(answerMap.get(entry.queueId)?.correct), createdAt: nowIso,
    }));
    let progress = state.lessonProgress;
    let reviewStates = state.reviewStates;
    let streak = state.streak;

    if (session.mode === "introduction" && session.lessonId) {
      const existing = progress.find((entry) => entry.lessonId === session.lessonId);
      progress = [...progress.filter((entry) => entry.lessonId !== session.lessonId), {
        lessonId: session.lessonId, status: "awaiting-mastery", introducedAt: existing?.introducedAt ?? nowIso,
        introducedDate: existing?.introducedDate ?? today, masteryEligibleDate: addLocalDays(today, 1),
        lastStudiedAt: nowIso,
      }];
      streak = updateConsistency(streak, today);
    }

    if (session.mode === "mastery" && session.lessonId) {
      const existing = progress.find((entry) => entry.lessonId === session.lessonId);
      progress = [...progress.filter((entry) => entry.lessonId !== session.lessonId), {
        ...existing, lessonId: session.lessonId, status: passed ? "mastered" : "awaiting-mastery",
        lastMasteryAttemptDate: today, masteredAt: passed ? nowIso : existing?.masteredAt,
        masteredDate: passed ? today : existing?.masteredDate, lastStudiedAt: nowIso,
      }];
      streak = updateConsistency(streak, today);
      if (passed) {
        const itemResults = new Map<string, boolean[]>();
        for (const entry of activeEntries) itemResults.set(entry.itemId, [...(itemResults.get(entry.itemId) ?? []), Boolean(answerMap.get(entry.queueId)?.correct)]);
        for (const [itemId, results] of itemResults) {
          const existingReview = reviewStates.find((item) => item.itemId === itemId);
          const next = nextReviewState(existingReview, itemId, results.every(Boolean), today, nowIso);
          reviewStates = [...reviewStates.filter((item) => item.itemId !== itemId), next];
        }
      }
    }

    if (session.mode !== "introduction") {
      for (const entry of reviewEntries) {
        const existingReview = reviewStates.find((item) => item.itemId === entry.itemId);
        const next = nextReviewState(existingReview, entry.itemId, Boolean(answerMap.get(entry.queueId)?.correct), today, nowIso);
        reviewStates = [...reviewStates.filter((item) => item.itemId !== entry.itemId), next];
      }
    }

    return {
      lessonProgress: progress, reviewStates, streak,
      attempts: [...state.attempts, ...newAttempts], completedSessions: [...state.completedSessions, completed],
      activeSession: null, lastResultSessionId: completed.id,
    };
  }),
  abandonSession: () => set({ activeSession: null }),
  clearLastResult: () => set({ lastResultSessionId: undefined }),
  updateSettings: (patch) => set((state) => {
    const next = { ...state.settings, ...patch };
    if (!next.showRomanization && !next.showThaiScript) {
      if (patch.showRomanization === false) next.showThaiScript = true;
      else next.showRomanization = true;
    }
    return { settings: next };
  }),
  replaceSnapshot: (snapshot) => set({
    ...reconcileForCurrentCurriculum(snapshot),
    hydrated: true,
    hydrationNotice: false,
    staleSessionNotice: false,
  }),
  reset: () => set({
    ...defaultSnapshot,
    hydrated: true,
    hydrationNotice: false,
    staleSessionNotice: false,
  }),
}));

export function reconcileForCurrentCurriculum(snapshot: AppSnapshot): AppSnapshot {
  const parsed = AppSnapshotSchema.parse(snapshot);
  return reconcileSnapshot(parsed, lessons, cueCards, CURRICULUM_VERSION);
}

export function snapshotFromState(state: StudyState): AppSnapshot {
  return AppSnapshotSchema.parse({
    version: 3, curriculumVersion: CURRICULUM_VERSION,
    lessonProgress: state.lessonProgress, reviewStates: state.reviewStates,
    attempts: state.attempts, completedSessions: state.completedSessions,
    activeSession: state.activeSession, lastResultSessionId: state.lastResultSessionId,
    settings: state.settings, streak: state.streak,
  });
}

export function activeCard(session: ActiveStudySession | null) {
  return session ? cueCards.find((card) => card.id === session.cardOrder[session.cardIndex]) : undefined;
}

export function activeQuestion(session: ActiveStudySession | null) {
  const entry = session && currentEntry(session);
  return entry ? { entry, question: findQuestion(entry) } : undefined;
}

export function lastCompletedSession(state: Pick<StudyState, "completedSessions" | "lastResultSessionId">) {
  return state.completedSessions.find((session) => session.id === state.lastResultSessionId) ?? state.completedSessions.at(-1);
}
