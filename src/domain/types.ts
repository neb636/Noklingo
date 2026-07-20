export type ExerciseType =
  | "listen-choice"
  | "thai-to-english"
  | "english-to-thai"
  | "word-order"
  | "fill-blank"
  | "matching"
  | "conversation"
  | "speaking"
  | "mistake-review";

export type Choice = {
  id: string;
  label: string;
  thai?: string;
  romanization?: string;
};

export type Pair = {
  id: string;
  left: string;
  right: string;
};

export type Exercise = {
  id: string;
  type: ExerciseType;
  prompt: string;
  instruction: string;
  thai?: string;
  romanization?: string;
  audioRef?: string;
  choices?: Choice[];
  tokens?: string[];
  pairs?: Pair[];
  correctAnswer: string | string[];
  acceptedAnswers?: string[];
  hint?: string;
  explanation?: string;
};

export type Lesson = {
  id: string;
  unitId: string;
  title: string;
  eyebrow: string;
  description: string;
  icon: string;
  xp: number;
  exercises: Exercise[];
};

export type PathNode = {
  id: string;
  type: "lesson" | "checkpoint" | "review";
  title: string;
  lessonId?: string;
};

export type CourseUnit = {
  id: string;
  number: number;
  title: string;
  description: string;
  color: "coral" | "teal";
  nodes: PathNode[];
};

export type Course = {
  id: string;
  title: string;
  units: CourseUnit[];
  lessons: Record<string, Lesson>;
};

export type Settings = {
  audioEnabled: boolean;
  volume: number;
  romanization: "always" | "learning" | "never";
  reducedMotion: boolean;
  darkMode: boolean;
};

export type Profile = {
  name: string;
  onboarded: boolean;
  dailyGoal: number;
  motivation: string;
  familiarity: "new" | "some" | "comfortable";
};

export type Activity = {
  id: string;
  lessonId: string;
  title: string;
  xp: number;
  accuracy: number;
  completedAt: string;
};

export type Progress = {
  totalXp: number;
  todayXp: number;
  todayDate: string;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  completedLessonIds: string[];
  lessonAttempts: Record<string, number>;
  activities: Activity[];
  mistakeExerciseIds: string[];
};

export type ExerciseAnswer = string | string[] | Record<string, string>;

export type AnswerRecord = {
  exerciseId: string;
  correct: boolean;
  answer: ExerciseAnswer;
};

export type LessonSession = {
  lessonId: string;
  exerciseIndex: number;
  hearts: number;
  answers: AnswerRecord[];
  currentAnswer: ExerciseAnswer | null;
  currentResult: boolean | null;
  startedAt: string;
};

export type CompletionSummary = {
  lessonId: string;
  xp: number;
  accuracy: number;
  mistakes: number;
  seconds: number;
  unlockedTitle?: string;
};

export type PersistedAppData = {
  version: 1;
  profile: Profile;
  settings: Settings;
  progress: Progress;
  activeSession: LessonSession | null;
};
