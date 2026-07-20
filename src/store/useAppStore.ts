import { create } from "zustand";
import {
  course,
  findNextLessonId,
  orderedLessonIds,
} from "@/src/content/course";
import type {
  CompletionSummary,
  ExerciseAnswer,
  LessonSession,
  PersistedAppData,
  Profile,
  Progress,
  Settings,
} from "@/src/domain/types";
import { clearAppData, loadAppData, saveAppData } from "@/src/lib/db";
import {
  defaultProgress,
  isAnswerCorrect,
  localDateKey,
  sessionAccuracy,
  updateStreak,
} from "@/src/lib/progress";

export type AppRoute =
  | "onboarding"
  | "home"
  | "lesson"
  | "complete"
  | "practice"
  | "progress"
  | "settings";

const defaultSettings: Settings = {
  audioEnabled: true,
  volume: 0.8,
  romanization: "learning",
  reducedMotion: false,
  darkMode: false,
};

const defaultProfile: Profile = {
  name: "Learner",
  onboarded: false,
  dailyGoal: 20,
  motivation: "Talk with family",
  familiarity: "new",
};

type AppState = {
  hydrated: boolean;
  route: AppRoute;
  profile: Profile;
  settings: Settings;
  progress: Progress;
  activeSession: LessonSession | null;
  completion: CompletionSummary | null;
  notice: string | null;
  hydrate: () => Promise<void>;
  navigate: (route: AppRoute) => void;
  finishOnboarding: (profile: Partial<Profile>) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  startLesson: (lessonId?: string) => void;
  resumeLesson: () => void;
  setAnswer: (answer: ExerciseAnswer) => void;
  checkAnswer: () => void;
  continueLesson: () => void;
  exitLesson: () => void;
  dismissNotice: () => void;
  replaceData: (data: PersistedAppData) => void;
  reset: () => Promise<void>;
};

const persist = (state: AppState) =>
  saveAppData({
    version: 1,
    profile: state.profile,
    settings: state.settings,
    progress: state.progress,
    activeSession: state.activeSession,
  }).catch(() => undefined);

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  route: "onboarding",
  profile: defaultProfile,
  settings: defaultSettings,
  progress: defaultProgress(),
  activeSession: null,
  completion: null,
  notice: null,

  hydrate: async () => {
    const data = await loadAppData();
    if (data) {
      const today = localDateKey();
      const progress =
        data.progress.todayDate === today
          ? data.progress
          : { ...data.progress, todayXp: 0, todayDate: today };
      set({
        hydrated: true,
        profile: data.profile,
        settings: data.settings,
        progress,
        activeSession: data.activeSession,
        route: data.profile.onboarded ? "home" : "onboarding",
      });
      persist(get());
      return;
    }
    set({ hydrated: true });
    persist(get());
  },

  navigate: (route) => set({ route, notice: null }),

  finishOnboarding: (profile) => {
    set((state) => ({
      profile: { ...state.profile, ...profile, onboarded: true },
      route: "home",
    }));
    persist(get());
  },

  updateSettings: (settings) => {
    set((state) => ({ settings: { ...state.settings, ...settings } }));
    persist(get());
  },

  startLesson: (lessonId) => {
    const resolved =
      lessonId ?? findNextLessonId(get().progress.completedLessonIds);
    const lesson = course.lessons[resolved];
    if (!lesson) return;
    set({
      activeSession: {
        lessonId: resolved,
        exerciseIndex: 0,
        hearts: 5,
        answers: [],
        currentAnswer: null,
        currentResult: null,
        startedAt: new Date().toISOString(),
      },
      completion: null,
      route: "lesson",
    });
    persist(get());
  },

  resumeLesson: () => {
    if (get().activeSession) set({ route: "lesson" });
  },

  setAnswer: (answer) => {
    set((state) =>
      state.activeSession && state.activeSession.currentResult === null
        ? { activeSession: { ...state.activeSession, currentAnswer: answer } }
        : {},
    );
    persist(get());
  },

  checkAnswer: () => {
    const session = get().activeSession;
    if (
      !session ||
      session.currentAnswer === null ||
      session.currentResult !== null
    )
      return;
    const lesson = course.lessons[session.lessonId];
    const exercise = lesson.exercises[session.exerciseIndex];
    const correct = isAnswerCorrect(exercise, session.currentAnswer);
    set({
      activeSession: {
        ...session,
        hearts: correct ? session.hearts : Math.max(0, session.hearts - 1),
        currentResult: correct,
        answers: [
          ...session.answers,
          { exerciseId: exercise.id, correct, answer: session.currentAnswer },
        ],
      },
    });
    persist(get());
  },

  continueLesson: () => {
    const session = get().activeSession;
    if (!session || session.currentResult === null) return;
    const lesson = course.lessons[session.lessonId];
    const isLast = session.exerciseIndex >= lesson.exercises.length - 1;

    if (!isLast) {
      set({
        activeSession: {
          ...session,
          exerciseIndex: session.exerciseIndex + 1,
          currentAnswer: null,
          currentResult: null,
        },
      });
      persist(get());
      return;
    }

    const accuracy = sessionAccuracy(session);
    const completedAt = new Date();
    const xp = lesson.xp + (accuracy === 100 ? 3 : 0);
    const previous = get().progress;
    const streaked = updateStreak(previous);
    const completedLessonIds = Array.from(
      new Set([...previous.completedLessonIds, lesson.id]),
    );
    const nextIndex = orderedLessonIds.indexOf(lesson.id) + 1;
    const unlockedTitle = orderedLessonIds[nextIndex]
      ? course.lessons[orderedLessonIds[nextIndex]].title
      : undefined;
    const progress: Progress = {
      ...streaked,
      totalXp: previous.totalXp + xp,
      todayXp: previous.todayXp + xp,
      todayDate: localDateKey(),
      completedLessonIds,
      lessonAttempts: {
        ...previous.lessonAttempts,
        [lesson.id]: (previous.lessonAttempts[lesson.id] ?? 0) + 1,
      },
      activities: [
        {
          id: `${lesson.id}-${completedAt.getTime()}`,
          lessonId: lesson.id,
          title: lesson.title,
          xp,
          accuracy,
          completedAt: completedAt.toISOString(),
        },
        ...previous.activities,
      ].slice(0, 30),
      mistakeExerciseIds: Array.from(
        new Set([
          ...previous.mistakeExerciseIds,
          ...session.answers
            .filter((answer) => !answer.correct)
            .map((answer) => answer.exerciseId),
        ]),
      ),
    };
    set({
      progress,
      completion: {
        lessonId: lesson.id,
        xp,
        accuracy,
        mistakes: session.answers.filter((answer) => !answer.correct).length,
        seconds: Math.max(
          1,
          Math.round(
            (completedAt.getTime() - new Date(session.startedAt).getTime()) /
              1000,
          ),
        ),
        unlockedTitle,
      },
      activeSession: null,
      route: "complete",
    });
    persist(get());
  },

  exitLesson: () => {
    set({
      route: "home",
      notice: "Lesson saved — come back whenever you’re ready.",
    });
    persist(get());
  },

  dismissNotice: () => set({ notice: null }),

  replaceData: (data) => {
    set({
      profile: data.profile,
      settings: data.settings,
      progress: data.progress,
      activeSession: data.activeSession,
      route: "home",
      notice: "Progress imported successfully.",
    });
  },

  reset: async () => {
    await clearAppData();
    set({
      profile: defaultProfile,
      settings: defaultSettings,
      progress: defaultProgress(),
      activeSession: null,
      completion: null,
      route: "onboarding",
      notice: null,
    });
    persist(get());
  },
}));
