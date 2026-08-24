import { CurriculumSchema } from "@/src/domain/schemas";
import type {
  AudioAsset,
  Choice,
  KnowledgeItem,
  QuizItem,
  QuizKind,
  VideoLesson,
} from "@/src/domain/types";
import { publicAssetPath } from "@/src/lib/assets";

const lessonId = "lesson.everyday-thai";

const itemSeeds = [
  {
    id: "item.on-my-way",
    thai: "กำลังไป",
    romanization: "gam-lang bpai",
    meaning: "On my way.",
    literalMeaning: "currently going",
    usageNotes: "A compact update when you are already heading somewhere.",
    context: "Someone is waiting and asks where you are.",
  },
  {
    id: "item.what-doing",
    thai: "ทำอะไรอยู่",
    romanization: "tam à-rai yòo",
    meaning: "What are you doing?",
    literalMeaning: "doing what currently",
    usageNotes: "A natural check-in about what someone is doing right now.",
    context: "You call a friend and ask what they are up to.",
  },
  {
    id: "item.where-are-you",
    thai: "อยู่ไหน",
    romanization: "yòo năi",
    meaning: "Where are you?",
    literalMeaning: "located where",
    usageNotes:
      "A direct everyday location question among people who know each other.",
    context: "You are trying to meet up with someone.",
  },
  {
    id: "item.where-going",
    thai: "จะไปไหน",
    romanization: "jà bpai năi",
    meaning: "Where are you going?",
    literalMeaning: "will go where",
    usageNotes:
      "An everyday question about someone's destination or immediate plan.",
    context: "Someone is heading out and you ask their destination.",
  },
  {
    id: "item.see-you",
    thai: "แล้วเจอกัน",
    romanization: "láew jer gan",
    meaning: "See you later.",
    literalMeaning: "then meet each other",
    usageNotes:
      "A friendly way to close a conversation when you expect to meet again.",
    context: "You finish making plans and say goodbye for now.",
  },
] as const;

const transcript = itemSeeds.map((item, index) => ({
  id: `line.draft-${index + 1}`,
  startSeconds: index * 5,
  endSeconds: index * 5 + 4,
  speaker: "Draft teaching voice",
  thai: item.thai,
  romanization: item.romanization,
  meaning: item.meaning,
  literalMeaning: item.literalMeaning,
  contextNote:
    "Authored placeholder for the reference lesson; timestamp and wording must be replaced from a verified source transcript.",
  sourceStatus: "draft-placeholder" as const,
}));

const knowledgeItems: KnowledgeItem[] = itemSeeds.map((item, index) => ({
  ...item,
  lessonId,
  audioRef: `audio.${item.id.slice("item.".length)}`,
  transcriptLineIds: [transcript[index].id],
  tags: ["everyday", "reaction"],
}));

const audioAssets: AudioAsset[] = itemSeeds.map((item) => ({
  id: `audio.${item.id.slice("item.".length)}`,
  fallbackText: item.thai,
  transcriptThai: item.thai,
  romanization: item.romanization,
  kind: "tts-placeholder",
}));

const choicesFor = (
  correctItemId: string,
  display: "meaning" | "thai",
): Choice[] => {
  const correctIndex = itemSeeds.findIndex(({ id }) => id === correctItemId);
  const indexes = [
    correctIndex,
    (correctIndex + 1) % 5,
    (correctIndex + 3) % 5,
  ];
  return indexes.map((index) => {
    const item = itemSeeds[index];
    return {
      id: `choice.${item.id.slice("item.".length)}`,
      label: display === "meaning" ? item.meaning : item.thai,
      meaning: item.meaning,
      thai: item.thai,
      romanization: item.romanization,
      accessibilityLabel: `${item.thai}, ${item.meaning}`,
    };
  });
};

type QuizSeed = {
  suffix: string;
  itemId: string;
  quizKind: QuizKind;
  type: QuizItem["type"];
  instruction: string;
  prompt: string;
  display: "meaning" | "thai";
  audio: boolean;
};

const makeQuiz = ({
  suffix,
  itemId,
  quizKind,
  type,
  instruction,
  prompt,
  display,
  audio,
}: QuizSeed): QuizItem => {
  const item = knowledgeItems.find(({ id }) => id === itemId);
  if (!item) throw new Error(`Unknown reference item ${itemId}`);
  return {
    id: `quiz.${suffix}`,
    lessonId,
    variantOf: `variant.${itemId.slice("item.".length)}`,
    quizKind,
    type,
    instruction,
    prompt,
    thai: item.thai,
    romanization: item.romanization,
    meaning: item.meaning,
    context: item.context,
    audioRef: audio ? item.audioRef : undefined,
    choices: choicesFor(itemId, display),
    correctAnswer: `choice.${itemId.slice("item.".length)}`,
    acceptedAnswers: [],
    hintIds: [],
    explanation: `${item.thai} (${item.romanization}) means “${item.meaning}”`,
    difficulty: 2,
    tags: ["everyday", "scored"],
    sourceItemIds: [itemId],
    feedback: {
      correct: "That everyday response fits.",
      incorrect: `The intended phrase is ${item.thai} — ${item.meaning}`,
    },
    accessibilityLabel: `${instruction}: ${prompt}`,
    estimatedSeconds: 25,
  };
};

const quizBank: QuizItem[] = [
  makeQuiz({
    suffix: "on-my-way.listen",
    itemId: "item.on-my-way",
    quizKind: "listening",
    type: "listen-meaning",
    instruction: "Listen and choose the natural meaning",
    prompt: "What travel update do you hear?",
    display: "meaning",
    audio: true,
  }),
  makeQuiz({
    suffix: "on-my-way.situation",
    itemId: "item.on-my-way",
    quizKind: "situation-response",
    type: "conversation-response",
    instruction: "Choose the natural reaction",
    prompt:
      "Someone is waiting and you are already traveling there. What do you say?",
    display: "thai",
    audio: false,
  }),
  makeQuiz({
    suffix: "what-doing.listen",
    itemId: "item.what-doing",
    quizKind: "listening",
    type: "listen-meaning",
    instruction: "Listen and choose the natural meaning",
    prompt: "What check-in question do you hear?",
    display: "meaning",
    audio: true,
  }),
  makeQuiz({
    suffix: "what-doing.meaning",
    itemId: "item.what-doing",
    quizKind: "meaning-recognition",
    type: "english-to-phrase",
    instruction: "Choose the matching Thai",
    prompt: "What are you doing?",
    display: "thai",
    audio: false,
  }),
  makeQuiz({
    suffix: "where-are-you.listen",
    itemId: "item.where-are-you",
    quizKind: "listening",
    type: "listen-phrase",
    instruction: "Listen and choose the phrase",
    prompt: "Which Thai phrase did you hear?",
    display: "thai",
    audio: true,
  }),
  makeQuiz({
    suffix: "where-are-you.recall",
    itemId: "item.where-are-you",
    quizKind: "phrase-recall",
    type: "english-to-phrase",
    instruction: "Recall the everyday phrase",
    prompt: "Where are you?",
    display: "thai",
    audio: false,
  }),
  makeQuiz({
    suffix: "where-going.meaning",
    itemId: "item.where-going",
    quizKind: "meaning-recognition",
    type: "english-to-phrase",
    instruction: "Choose the matching Thai",
    prompt: "Where are you going?",
    display: "thai",
    audio: false,
  }),
  makeQuiz({
    suffix: "where-going.situation",
    itemId: "item.where-going",
    quizKind: "situation-response",
    type: "conversation-response",
    instruction: "Choose the natural response",
    prompt: "Someone is heading out. How do you ask their destination?",
    display: "thai",
    audio: false,
  }),
  makeQuiz({
    suffix: "see-you.recall",
    itemId: "item.see-you",
    quizKind: "phrase-recall",
    type: "english-to-phrase",
    instruction: "Recall the friendly goodbye",
    prompt: "See you later.",
    display: "thai",
    audio: false,
  }),
  makeQuiz({
    suffix: "see-you.listen",
    itemId: "item.see-you",
    quizKind: "listening",
    type: "listen-meaning",
    instruction: "Listen and choose the natural meaning",
    prompt: "What closing phrase do you hear?",
    display: "meaning",
    audio: true,
  }),
];

const rawCurriculum = {
  schemaVersion: 3,
  id: "curriculum.noklingo-video",
  title: "Noklingo Everyday Thai",
  description:
    "Video-led Thai lessons followed by cue cards, delayed mastery, and spaced review.",
  sourceLanguage: "th",
  learnerLanguage: "en",
  lessons: [
    {
      id: lessonId,
      order: 1,
      title: "Everyday Thai you actually hear",
      objective:
        "Recognize and retrieve five high-frequency reactions and responses.",
      description:
        "Reference lesson content for the v3 learning loop. Its teaching phrases are authored placeholders, not a verified transcript of the source social video.",
      media: {
        src: "/lessons/everyday-thai/intro.mp4",
        posterSrc: "/lessons/everyday-thai/poster.jpg",
        mimeType: "video/mp4",
        availability: "expected-local",
        fallbackMessage:
          "This replaceable local MP4 has not been supplied yet. You can continue to the authored cue cards without video.",
      },
      transcriptStatus: "draft",
      transcript,
      cueCardItemIds: knowledgeItems.map(({ id }) => id),
      quizBank,
      tags: ["everyday", "reference-lesson"],
    },
  ],
  knowledgeItems,
  audioAssets,
} as const;

export const curriculum = CurriculumSchema.parse(rawCurriculum);

const indexById = <T extends { id: string }>(values: readonly T[]) =>
  Object.fromEntries(values.map((value) => [value.id, value])) as Record<
    string,
    T
  >;

export const lessonsById: Record<string, VideoLesson> = indexById(
  curriculum.lessons,
);
export const knowledgeItemsById: Record<string, KnowledgeItem> = indexById(
  curriculum.knowledgeItems,
);
export const audioAssetsById: Record<string, AudioAsset> = indexById(
  curriculum.audioAssets,
);

export const resolveAudioAsset = (audioRef: string | undefined) =>
  audioRef ? audioAssetsById[audioRef] : undefined;

export const resolveCurriculumAssetPath = publicAssetPath;
