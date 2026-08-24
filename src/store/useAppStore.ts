import { create } from "zustand";
import { curriculum } from "@/src/content/curriculum";
import type {
  DailyStudySession,
  ExerciseAnswer,
  ItemReviewState,
  LessonProgress,
  PersistedAppDataV3,
  Settings,
  StreakState,
  StudyAttempt,
  StudyCompletionSummary,
} from "@/src/domain/types";
import {
  advanceSessionCard,
  answerSessionQuiz,
  completeStudySession,
  createInitialAppData,
  createIntroductionSession,
  createMasterySession,
  createReplaySession,
  createReviewSession,
  deriveTodayState,
  finishSessionVideo,
} from "@/src/engine/study";
import { clearAppData, loadAppData, saveAppData } from "@/src/lib/db";

export type AppRoute =
  "today" | "study" | "results" | "library" | "progress" | "settings";

type AppState = {
  hydrated: boolean;
  route: AppRoute;
  settings: Settings;
  streak: StreakState;
  lessonProgress: Record<string, LessonProgress>;
  itemReviewStates: Record<string, ItemReviewState>;
  attempts: StudyAttempt[];
  activeSession: DailyStudySession | null;
  redesignNoticeSeen: boolean;
  completion: StudyCompletionSummary | null;
  notice: string | null;
  hydrate: () => Promise<void>;
  navigate: (route: AppRoute) => void;
  startToday: () => void;
  resumeSession: () => void;
  markVideoComplete: () => void;
  skipUnavailableVideo: () => void;
  nextCard: () => void;
  previousCard: () => void;
  setQuizAnswer: (answer: ExerciseAnswer) => void;
  submitQuiz: () => void;
  finishResults: () => void;
  replayLesson: (lessonId: string) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  dismissNotice: () => void;
  reset: () => Promise<void>;
};

const freshData = (noticeSeen = true) => ({
  ...createInitialAppData(curriculum),
  redesignNoticeSeen: noticeSeen,
});

const persistedSnapshot = (state: AppState): PersistedAppDataV3 => ({
  version: 3,
  settings: state.settings,
  streak: state.streak,
  lessonProgress: state.lessonProgress,
  itemReviewStates: state.itemReviewStates,
  attempts: state.attempts,
  // Replays are intentionally disposable and must never displace a real
  // learning session after a refresh.
  activeSession:
    state.activeSession?.mode === "replay" ? null : state.activeSession,
  redesignNoticeSeen: state.redesignNoticeSeen,
});

const dataFields = (data: PersistedAppDataV3) => ({
  settings: data.settings,
  streak: data.streak,
  lessonProgress: data.lessonProgress,
  itemReviewStates: data.itemReviewStates,
  attempts: data.attempts,
  activeSession: data.activeSession,
  redesignNoticeSeen: data.redesignNoticeSeen,
});

const persist = (state: AppState) =>
  saveAppData(persistedSnapshot(state)).catch(() => undefined);

export const useAppStore = create<AppState>((set, get) => {
  const initial = freshData();

  const setSession = (activeSession: DailyStudySession | null) => {
    set({ activeSession });
    persist(get());
  };

  return {
    hydrated: false,
    route: "today",
    ...dataFields(initial),
    completion: null,
    notice: null,

    hydrate: async () => {
      try {
        const loaded = await loadAppData();
        const data = loaded?.data ?? freshData();
        const notice = loaded?.resetLegacyData
          ? "Noklingo now uses video lessons and next-day mastery. Previous path and XP progress was reset for the new system."
          : data.redesignNoticeSeen
            ? null
            : "Welcome to the new Noklingo: video, cue cards, and delayed recall.";
        set({
          hydrated: true,
          route: "today",
          ...dataFields(data),
          completion: null,
          notice,
        });
        try {
          await saveAppData(persistedSnapshot(get()));
        } catch {
          set({
            notice:
              notice ??
              "Progress loaded, but this device could not save the refreshed snapshot.",
          });
        }
      } catch (error) {
        const data = freshData();
        set({
          hydrated: true,
          route: "today",
          ...dataFields(data),
          completion: null,
          notice:
            error instanceof Error
              ? error.message
              : "Noklingo could not read saved progress.",
        });
      }
    },

    navigate: (route) => {
      const state = get();
      const leavingReplay =
        route !== "study" && state.activeSession?.mode === "replay";
      const leavingResults = state.route === "results" && route !== "results";
      set({
        route,
        notice: null,
        activeSession: leavingReplay ? null : state.activeSession,
        completion: leavingResults ? null : state.completion,
      });
      if (leavingReplay) persist(get());
    },

    startToday: () => {
      const state = get();
      const data = persistedSnapshot(state);
      try {
        const todayState = deriveTodayState(curriculum, data);
        if (todayState.kind === "resume-session") {
          set({ route: "study", notice: null });
          return;
        }
        if (todayState.kind === "waiting") {
          set({
            notice: `Your next mastery check opens ${todayState.nextEligibleDate}.`,
          });
          return;
        }
        if (todayState.kind === "curriculum-complete") {
          set({ route: "library", notice: null });
          return;
        }

        const activeSession =
          todayState.kind === "new-lesson-ready"
            ? createIntroductionSession(curriculum, data, todayState.lesson.id)
            : todayState.kind === "mastery-review-due"
              ? createMasterySession(curriculum, data, todayState.lesson.id)
              : createReviewSession(curriculum, data);
        set({
          activeSession,
          completion: null,
          route: "study",
          notice: null,
        });
        persist(get());
      } catch (error) {
        set({
          notice:
            error instanceof Error
              ? error.message
              : "Today’s session could not be created.",
        });
      }
    },

    resumeSession: () => {
      if (!get().activeSession) return;
      set({ route: "study", notice: null });
    },

    markVideoComplete: () => {
      const session = get().activeSession;
      if (!session) return;
      setSession(finishSessionVideo(session));
    },

    skipUnavailableVideo: () => {
      const session = get().activeSession;
      if (!session) return;
      setSession(finishSessionVideo(session, { skipped: true }));
    },

    nextCard: () => {
      const session = get().activeSession;
      if (!session) return;
      const next = advanceSessionCard(session);
      if (next.mode === "replay" && next.stage === "complete") {
        set({ activeSession: null, route: "library", notice: null });
        persist(get());
        return;
      }
      setSession(next);
    },

    previousCard: () => {
      const session = get().activeSession;
      if (!session || !["cue-cards", "retrieval-cards"].includes(session.stage))
        return;
      setSession({
        ...session,
        cardIndex: Math.max(0, session.cardIndex - 1),
        updatedAt: new Date().toISOString(),
      });
    },

    setQuizAnswer: (answer) => {
      const session = get().activeSession;
      if (!session || session.stage !== "quiz") return;
      try {
        setSession(answerSessionQuiz(session, answer).session);
      } catch (error) {
        set({
          notice:
            error instanceof Error
              ? error.message
              : "Answer could not be saved.",
        });
      }
    },

    submitQuiz: () => {
      const state = get();
      const session = state.activeSession;
      if (!session || session.mode === "replay") return;
      try {
        const result = completeStudySession(
          curriculum,
          persistedSnapshot(state),
          session,
        );
        set({
          ...dataFields(result.data),
          completion: result.summary,
          route: "results",
          notice: null,
        });
        persist(get());
      } catch (error) {
        set({
          notice:
            error instanceof Error
              ? error.message
              : "The session could not be completed.",
        });
      }
    },

    finishResults: () => {
      const state = get();
      const summary = state.completion;
      if (
        summary?.attempt.mode === "mastery" &&
        summary.passed &&
        summary.nextLessonId
      ) {
        try {
          const activeSession = createIntroductionSession(
            curriculum,
            persistedSnapshot(state),
            summary.nextLessonId,
          );
          set({ activeSession, completion: null, route: "study" });
          persist(get());
          return;
        } catch {
          // Today can safely recreate the session if content changed.
        }
      }
      set({ completion: null, route: "today", notice: null });
    },

    replayLesson: (lessonId) => {
      const state = get();
      if (state.lessonProgress[lessonId]?.status !== "mastered") {
        set({ notice: "Master this lesson before replaying it." });
        return;
      }
      if (state.activeSession && state.activeSession.mode !== "replay") {
        set({
          notice:
            "Your active study session is still saved. Finish it before opening a replay.",
        });
        return;
      }
      try {
        set({
          activeSession: createReplaySession(curriculum, lessonId),
          completion: null,
          route: "study",
          notice: null,
        });
      } catch (error) {
        set({
          notice:
            error instanceof Error ? error.message : "Replay is unavailable.",
        });
      }
    },

    updateSettings: (updates) => {
      set((state) => ({ settings: { ...state.settings, ...updates } }));
      persist(get());
    },

    dismissNotice: () => {
      set({ notice: null, redesignNoticeSeen: true });
      persist(get());
    },

    reset: async () => {
      await clearAppData();
      const data = freshData();
      set({
        hydrated: true,
        route: "today",
        ...dataFields(data),
        completion: null,
        notice: null,
      });
      await saveAppData(persistedSnapshot(get()));
    },
  };
});
