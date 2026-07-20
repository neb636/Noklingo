import { create } from "zustand";
import {
  checkpointsByLessonId,
  course,
  exercisesById,
  lessonsById,
} from "@/src/content/course";
import type {
  CompletionSummary,
  Exercise,
  ExerciseAnswer,
  ExerciseAttempt,
  Lesson,
  LessonSession,
  PersistedAppData,
  Profile,
  Progress,
  Settings,
} from "@/src/domain/types";
import {
  calculateAttemptXp,
  createMistakeCorrectionExercise,
  gradeAnswer,
  sessionAccuracy,
  sourceExerciseId,
} from "@/src/engine/grading";
import {
  defaultProgress,
  findNextLessonId,
  isLessonUnlocked,
  localDateKey,
  refreshDailyProgress,
  unlockAchievements,
  updateStreak,
} from "@/src/engine/progression";
import {
  applyAttemptToLearningState,
  generateReviewSession,
} from "@/src/engine/review";
import { clearAppData, loadAppData, saveAppData } from "@/src/lib/db";

export type AppRoute =
  | "onboarding"
  | "home"
  | "lesson"
  | "complete"
  | "practice"
  | "progress"
  | "settings";

export const defaultSettings: Settings = {
  audioEnabled: true,
  volume: 0.8,
  romanization: "learning",
  showThaiScript: false,
  reducedMotion: false,
  darkMode: false,
};

export const defaultProfile: Profile = {
  name: "Learner",
  onboarded: false,
  dailyGoal: 20,
  motivation: "Talk with family",
  familiarity: "new",
  politeParticle: "khrap",
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
  startReview: () => void;
  resumeLesson: () => void;
  setAnswer: (answer: ExerciseAnswer) => void;
  markHintUsed: () => void;
  checkAnswer: () => void;
  continueLesson: () => void;
  exitLesson: () => void;
  dismissNotice: () => void;
  replaceData: (data: PersistedAppData) => void;
  reset: () => Promise<void>;
};

const persistedSnapshot = (state: AppState): PersistedAppData => ({
  version: 2,
  profile: state.profile,
  settings: state.settings,
  progress: state.progress,
  activeSession: state.activeSession,
});

const persist = (state: AppState) =>
  saveAppData(persistedSnapshot(state)).catch(() => undefined);

const timestampId = (prefix: string, suffix: string) =>
  `${prefix}.${Date.now()}.${suffix}`;

const swapKhrapAndKha = (value: string) =>
  value
    .replaceAll("khrap", "__POLITE_KHRAP__")
    .replaceAll("kha", "khrap")
    .replaceAll("__POLITE_KHRAP__", "kha")
    .replaceAll("ครับ", "__POLITE_THAI_KHRAP__")
    .replaceAll("ค่ะ", "ครับ")
    .replaceAll("__POLITE_THAI_KHRAP__", "ค่ะ");

const personalizeExercise = (
  exercise: Exercise,
  profile: Profile,
): Exercise => {
  if (
    profile.politeParticle !== "kha" ||
    exercise.type !== "personalized-translation"
  )
    return exercise;
  return {
    ...exercise,
    prompt: swapKhrapAndKha(exercise.prompt),
    context: exercise.context ? swapKhrapAndKha(exercise.context) : undefined,
    explanation: swapKhrapAndKha(exercise.explanation),
    choices: exercise.choices?.map((choice) => ({
      ...choice,
      label: swapKhrapAndKha(choice.label),
      romanization: choice.romanization
        ? swapKhrapAndKha(choice.romanization)
        : undefined,
      thai: choice.thai ? swapKhrapAndKha(choice.thai) : undefined,
    })),
    feedback: {
      ...exercise.feedback,
      correct: swapKhrapAndKha(exercise.feedback.correct),
      incorrect: swapKhrapAndKha(exercise.feedback.incorrect),
      pronunciation: exercise.feedback.pronunciation
        ? swapKhrapAndKha(exercise.feedback.pronunciation)
        : undefined,
    },
  };
};

const createLessonSession = (
  lesson: Lesson,
  profile: Profile,
): LessonSession => {
  const now = new Date().toISOString();
  return {
    sessionId: timestampId("session", lesson.id),
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    mode: lesson.kind,
    exerciseQueue: lesson.exercises.map((exercise) =>
      personalizeExercise({ ...exercise }, profile),
    ),
    exerciseIndex: 0,
    hearts: 5,
    maxHearts: 5,
    answers: [],
    currentAnswer: null,
    currentResult: null,
    currentHintUsed: false,
    exerciseStartedAt: now,
    startedAt: now,
    earnedXp: 0,
    recoveryCount: 0,
    correctionCounts: {},
  };
};

const createReviewLessonSession = (
  progress: Progress,
  profile: Profile,
): LessonSession => {
  const review = generateReviewSession(course, progress);
  const now = new Date().toISOString();
  return {
    sessionId: timestampId("session", review.id),
    lessonId: review.id,
    lessonTitle: "Personalized review",
    mode: "review",
    exerciseQueue: review.exercises.map((exercise) =>
      personalizeExercise(exercise, profile),
    ),
    exerciseIndex: 0,
    hearts: 5,
    maxHearts: 5,
    answers: [],
    currentAnswer: null,
    currentResult: null,
    currentHintUsed: false,
    exerciseStartedAt: now,
    startedAt: now,
    earnedXp: 0,
    recoveryCount: 0,
    correctionCounts: {},
  };
};

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
      set({
        hydrated: true,
        profile: data.profile,
        settings: data.settings,
        progress: refreshDailyProgress(data.progress),
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
    const state = get();
    if (state.activeSession) {
      set({
        route: "lesson",
        notice:
          state.activeSession.lessonId === lessonId
            ? null
            : "Your saved lesson is still waiting; finish or exit it before switching.",
      });
      return;
    }
    const resolved = lessonId ?? findNextLessonId(course, state.progress);
    if (!resolved) {
      get().startReview();
      return;
    }
    const lesson = lessonsById[resolved];
    if (!lesson) return;
    if (!isLessonUnlocked(course, resolved, state.progress)) {
      set({ notice: "Finish the prerequisite or checkpoint first." });
      return;
    }
    const activeSession = createLessonSession(lesson, state.profile);
    set({
      activeSession,
      completion: null,
      route: "lesson",
      notice: null,
      progress: {
        ...state.progress,
        lessonStates: {
          ...state.progress.lessonStates,
          [lesson.id]: {
            lessonId: lesson.id,
            status: "in-progress",
            attempts: state.progress.lessonStates[lesson.id]?.attempts ?? 0,
            bestAccuracy:
              state.progress.lessonStates[lesson.id]?.bestAccuracy ?? 0,
          },
        },
      },
    });
    persist(get());
  },

  startReview: () => {
    const state = get();
    if (state.activeSession) {
      set({ route: "lesson" });
      return;
    }
    set({
      activeSession: createReviewLessonSession(state.progress, state.profile),
      completion: null,
      route: "lesson",
      notice: null,
    });
    persist(get());
  },

  resumeLesson: () => {
    if (!get().activeSession) return;
    set((state) => ({
      route: "lesson",
      activeSession: state.activeSession
        ? {
            ...state.activeSession,
            exerciseStartedAt: new Date().toISOString(),
          }
        : null,
    }));
    persist(get());
  },

  setAnswer: (answer) => {
    set((state) =>
      state.activeSession && state.activeSession.currentResult === null
        ? { activeSession: { ...state.activeSession, currentAnswer: answer } }
        : {},
    );
    persist(get());
  },

  markHintUsed: () => {
    set((state) =>
      state.activeSession && state.activeSession.currentResult === null
        ? {
            activeSession: {
              ...state.activeSession,
              currentHintUsed: true,
            },
          }
        : {},
    );
    persist(get());
  },

  checkAnswer: () => {
    const state = get();
    const session = state.activeSession;
    if (
      !session ||
      session.currentAnswer === null ||
      session.currentResult !== null
    )
      return;
    const current = session.exerciseQueue[session.exerciseIndex];
    if (!current) return;
    const grade = gradeAnswer(current, session.currentAnswer);
    const sourceId = sourceExerciseId(current.id);
    const priorAttempts = session.answers.filter(
      (answer) => answer.sourceExerciseId === sourceId,
    ).length;
    const generatedCorrection = /\.repair-\d+$/u.test(current.id);
    const firstAttempt = priorAttempts === 0 && !generatedCorrection;
    const xpEarned = calculateAttemptXp({
      exercise: current,
      correct: grade.correct,
      firstAttempt,
      hintUsed: session.currentHintUsed,
      selfAssessment: grade.selfAssessment,
    });
    const now = new Date();
    const elapsedMs = Math.max(
      0,
      now.getTime() - new Date(session.exerciseStartedAt).getTime(),
    );
    const attempt: ExerciseAttempt = {
      id: timestampId("attempt", current.id),
      sessionId: session.sessionId,
      lessonId: session.lessonId,
      exerciseId: current.id,
      sourceExerciseId: sourceId,
      sourceItemIds: current.sourceItemIds,
      answer: session.currentAnswer,
      correct: grade.correct,
      firstAttempt,
      hintUsed: session.currentHintUsed,
      retryCount: priorAttempts,
      elapsedMs,
      xpEarned,
      answeredAt: now.toISOString(),
      selfAssessment: grade.selfAssessment,
    };
    const nextProgress = applyAttemptToLearningState(
      course,
      state.progress,
      attempt,
      current,
    );

    let exerciseQueue = session.exerciseQueue;
    const correctionCounts = { ...session.correctionCounts };
    if (!grade.correct && (correctionCounts[sourceId] ?? 0) < 2) {
      const nextRound = (correctionCounts[sourceId] ?? 0) + 1;
      const source = exercisesById[sourceId] ?? current;
      const correction = createMistakeCorrectionExercise(source, nextRound);
      if (!exerciseQueue.some(({ id }) => id === correction.id)) {
        exerciseQueue = [...exerciseQueue, correction];
      }
      correctionCounts[sourceId] = nextRound;
    }

    const depletedHearts = Math.max(0, session.hearts - grade.heartCost);
    const enteredRecovery = depletedHearts === 0;
    set({
      progress: nextProgress,
      activeSession: {
        ...session,
        exerciseQueue,
        correctionCounts,
        hearts: enteredRecovery ? 2 : depletedHearts,
        recoveryCount: session.recoveryCount + (enteredRecovery ? 1 : 0),
        currentResult: grade.correct,
        earnedXp: session.earnedXp + xpEarned,
        answers: [
          ...session.answers,
          {
            exerciseId: current.id,
            sourceExerciseId: sourceId,
            correct: grade.correct,
            firstAttempt,
            answer: session.currentAnswer,
            hintUsed: session.currentHintUsed,
            xpEarned,
          },
        ],
      },
    });
    persist(get());
  },

  continueLesson: () => {
    const state = get();
    const session = state.activeSession;
    if (!session || session.currentResult === null) return;
    const isLast = session.exerciseIndex >= session.exerciseQueue.length - 1;
    if (!isLast) {
      set({
        activeSession: {
          ...session,
          exerciseIndex: session.exerciseIndex + 1,
          currentAnswer: null,
          currentResult: null,
          currentHintUsed: false,
          exerciseStartedAt: new Date().toISOString(),
        },
      });
      persist(get());
      return;
    }

    const now = new Date();
    const lesson = lessonsById[session.lessonId];
    const checkpoint = checkpointsByLessonId[session.lessonId];
    const accuracy = sessionAccuracy(session.answers);
    const requiredAccuracy = checkpoint?.passingAccuracy;
    const passed =
      session.mode !== "checkpoint" || accuracy >= (requiredAccuracy ?? 80);
    const completionBonus = passed
      ? (lesson?.completionXp ?? (session.mode === "review" ? 3 : 0))
      : 0;
    const perfectBonus =
      passed &&
      accuracy === 100 &&
      !session.answers.some(({ hintUsed }) => hintUsed)
        ? 3
        : 0;
    const xp = session.earnedXp + completionBonus + perfectBonus;

    let progress = refreshDailyProgress(state.progress, now);
    const completedLessonIds =
      passed && session.mode !== "review"
        ? Array.from(
            new Set([...progress.completedLessonIds, session.lessonId]),
          )
        : progress.completedLessonIds;
    progress = {
      ...progress,
      totalXp: progress.totalXp + xp,
      todayXp: progress.todayXp + xp,
      todayDate: localDateKey(now),
      completedLessonIds,
      lessonAttempts:
        session.mode === "review"
          ? progress.lessonAttempts
          : {
              ...progress.lessonAttempts,
              [session.lessonId]:
                (progress.lessonAttempts[session.lessonId] ?? 0) + 1,
            },
      lessonStates:
        session.mode === "review"
          ? progress.lessonStates
          : {
              ...progress.lessonStates,
              [session.lessonId]: {
                lessonId: session.lessonId,
                status: passed
                  ? accuracy >= 90
                    ? "mastered"
                    : "completed"
                  : "available",
                attempts:
                  (progress.lessonStates[session.lessonId]?.attempts ?? 0) + 1,
                bestAccuracy: Math.max(
                  progress.lessonStates[session.lessonId]?.bestAccuracy ?? 0,
                  accuracy,
                ),
                lastCompletedAt: passed ? now.toISOString() : undefined,
              },
            },
      checkpointResults: checkpoint
        ? {
            ...progress.checkpointResults,
            [checkpoint.id]: {
              checkpointId: checkpoint.id,
              attempts:
                (progress.checkpointResults[checkpoint.id]?.attempts ?? 0) + 1,
              bestAccuracy: Math.max(
                progress.checkpointResults[checkpoint.id]?.bestAccuracy ?? 0,
                accuracy,
              ),
              passed:
                progress.checkpointResults[checkpoint.id]?.passed === true ||
                passed,
              lastAttemptAt: now.toISOString(),
            },
          }
        : progress.checkpointResults,
      activities: [
        {
          id: timestampId("activity", session.mode),
          lessonId: session.lessonId,
          title: session.lessonTitle,
          xp,
          accuracy,
          completedAt: now.toISOString(),
          mode: session.mode,
          passed,
        },
        ...progress.activities,
      ].slice(0, 50),
    };
    if (passed) progress = updateStreak(progress, now);
    const achievementResult = unlockAchievements(
      course,
      progress,
      accuracy,
      session.mode,
    );
    progress = achievementResult.progress;
    const nextLessonId = findNextLessonId(course, progress);
    const seconds = Math.max(
      1,
      Math.round(
        progress.exerciseAttempts
          .filter(({ sessionId }) => sessionId === session.sessionId)
          .reduce((sum, attempt) => sum + attempt.elapsedMs, 0) / 1_000,
      ),
    );

    set({
      progress,
      completion: {
        lessonId: session.lessonId,
        lessonTitle: session.lessonTitle,
        mode: session.mode,
        xp,
        accuracy,
        mistakes: session.answers.filter(
          (answer) => answer.firstAttempt && !answer.correct,
        ).length,
        seconds,
        passed,
        requiredAccuracy,
        unlockedTitle:
          passed && nextLessonId ? lessonsById[nextLessonId]?.title : undefined,
        newAchievementTitles: achievementResult.newlyUnlocked.map(
          ({ title }) => title,
        ),
      },
      activeSession: null,
      route: "complete",
    });
    persist(get());
  },

  exitLesson: () => {
    set({
      route: "home",
      notice: "Lesson saved — come back whenever you're ready.",
    });
    persist(get());
  },

  dismissNotice: () => set({ notice: null }),

  replaceData: (data) => {
    set({
      profile: data.profile,
      settings: data.settings,
      progress: refreshDailyProgress(data.progress),
      activeSession: data.activeSession,
      route: "home",
      notice: "Progress imported successfully.",
    });
    persist(get());
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
