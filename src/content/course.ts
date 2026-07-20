import type { z } from "zod";
import { parseCourse } from "@/src/domain/courseValidation";
import {
  CourseSchema,
  ExerciseSchema,
  type CourseInput,
} from "@/src/domain/schemas";
import type { AudioAsset, Dialogue, Lesson, Phrase } from "@/src/domain/types";

type ExerciseInput = z.input<typeof ExerciseSchema>;

const exercise = (value: ExerciseInput) => value;
const feedback = (answer: string, pronunciation?: string) => ({
  correct: "Exactly — that sounds natural.",
  incorrect: `The natural answer is ${answer}.`,
  pronunciation,
});

const speakers: CourseInput["speakers"] = [
  {
    id: "speaker.nok",
    name: "Nok",
    gender: "male",
    role: "Friendly coach and learner model",
    description: "A relaxed central-Thai voice who normally uses khrap.",
    defaultPoliteParticle: "khrap",
  },
  {
    id: "speaker.mali",
    name: "Mali",
    gender: "female",
    role: "Wife and conversation partner",
    description: "A warm Bangkok speaker who normally uses kha.",
    defaultPoliteParticle: "kha",
  },
  {
    id: "speaker.lek",
    name: "P' Lek",
    gender: "male",
    role: "Relative and restaurant regular",
    description: "An easygoing older relative with casual everyday delivery.",
    defaultPoliteParticle: "khrap",
  },
];

const audio = (
  id: string,
  speakerId: string,
  transcriptThai: string,
  romanization: string,
): CourseInput["audioAssets"][number] => ({
  id,
  speakerId,
  src: `tts:${transcriptThai}`,
  slowSrc: `tts-slow:${transcriptThai}`,
  fallbackText: transcriptThai,
  transcriptThai,
  romanization,
  kind: "tts-placeholder",
});

const audioAssets: CourseInput["audioAssets"] = [
  audio("audio.hello-khrap", "speaker.nok", "สวัสดีครับ", "sà-wàt-dee khrap"),
  audio("audio.hello-kha", "speaker.mali", "สวัสดีค่ะ", "sà-wàt-dee kha"),
  audio("audio.thanks", "speaker.nok", "ขอบคุณครับ", "khàawp-khun khrap"),
  audio("audio.no-worries", "speaker.mali", "ไม่เป็นไรค่ะ", "mâi-bpen-rai kha"),
  audio("audio.want-this", "speaker.nok", "เอาอันนี้ครับ", "ao an-née khrap"),
  audio("audio.not-spicy", "speaker.nok", "ไม่เผ็ดครับ", "mâi phèt khrap"),
  audio("audio.bill", "speaker.nok", "เช็คบิลด้วยครับ", "chék-bin dûai khrap"),
  audio(
    "audio.spicy-question",
    "speaker.mali",
    "เอาเผ็ดไหมคะ",
    "ao phèt mǎi kha",
  ),
  audio("audio.tasty-question", "speaker.lek", "อร่อยไหม", "à-ròi mǎi"),
  audio(
    "audio.eaten-yet",
    "speaker.mali",
    "กินข้าวหรือยังคะ",
    "kin khâao rʉ̌ʉ yang kha",
  ),
  audio("audio.eaten-already", "speaker.nok", "กินแล้วครับ", "kin láew khrap"),
  audio(
    "audio.not-yet",
    "speaker.nok",
    "ยังไม่ได้กินครับ",
    "yang mâi dâi kin khrap",
  ),
  audio(
    "audio.dialogue-restaurant",
    "speaker.mali",
    "เอาอันนี้ครับ เอาเผ็ดไหมคะ ไม่เผ็ดครับ",
    "ao an-née khrap · ao phèt mǎi kha · mâi phèt khrap",
  ),
  audio(
    "audio.dialogue-family",
    "speaker.mali",
    "กินข้าวหรือยังคะ กินแล้วครับ อร่อยไหม",
    "kin khâao rʉ̌ʉ yang kha · kin láew khrap · à-ròi mǎi",
  ),
  audio("audio.vocab-hello", "speaker.nok", "สวัสดี", "sà-wàt-dee"),
  audio("audio.vocab-thanks", "speaker.nok", "ขอบคุณ", "khàawp-khun"),
  audio("audio.vocab-spicy", "speaker.mali", "เผ็ด", "phèt"),
  audio("audio.vocab-eat", "speaker.lek", "กิน", "kin"),
];

const vocabulary: CourseInput["vocabulary"] = [
  {
    id: "vocab.hello",
    thai: "สวัสดี",
    romanization: "sà-wàt-dee",
    meaning: "hello",
    audioRef: "audio.vocab-hello",
    toneGuidance: "Keep the middle syllable short; the final dee is level.",
    formality: "neutral",
    usageNotes: "Works at any time of day.",
    tags: ["greeting"],
    topics: ["introductions"],
    difficulty: 1,
  },
  {
    id: "vocab.thanks",
    thai: "ขอบคุณ",
    romanization: "khàawp-khun",
    meaning: "thank you",
    audioRef: "audio.vocab-thanks",
    toneGuidance: "Let khàawp fall, then keep khun level and quick.",
    formality: "neutral",
    usageNotes: "Add your usual politeness particle in most interactions.",
    tags: ["manners"],
    topics: ["introductions"],
    difficulty: 1,
  },
  {
    id: "vocab.spicy",
    thai: "เผ็ด",
    romanization: "phèt",
    meaning: "spicy",
    audioRef: "audio.vocab-spicy",
    toneGuidance: "Short vowel with a low, clipped ending.",
    formality: "neutral",
    usageNotes: "Put mâi before it to say not spicy.",
    tags: ["food"],
    topics: ["restaurant"],
    difficulty: 2,
  },
  {
    id: "vocab.eat",
    thai: "กิน",
    romanization: "kin",
    meaning: "eat",
    audioRef: "audio.vocab-eat",
    toneGuidance: "Short, level syllable.",
    formality: "casual",
    usageNotes: "Extremely common in everyday family conversation.",
    tags: ["daily-life"],
    topics: ["family"],
    difficulty: 1,
  },
];

type PhraseSeed = Omit<
  CourseInput["phrases"][number],
  | "literalMeaning"
  | "speakerGender"
  | "politenessContext"
  | "acceptedRomanizations"
  | "vocabularyIds"
  | "grammarNoteIds"
  | "culturalNoteIds"
  | "reviewPriority"
> &
  Partial<
    Pick<
      CourseInput["phrases"][number],
      | "literalMeaning"
      | "speakerGender"
      | "politenessContext"
      | "acceptedRomanizations"
      | "vocabularyIds"
      | "grammarNoteIds"
      | "culturalNoteIds"
      | "reviewPriority"
    >
  >;

const phrase = (value: PhraseSeed): CourseInput["phrases"][number] => ({
  acceptedRomanizations: [],
  vocabularyIds: [],
  grammarNoteIds: [],
  culturalNoteIds: [],
  reviewPriority: 1,
  ...value,
});

const phrases: CourseInput["phrases"] = [
  phrase({
    id: "phrase.hello-khrap",
    thai: "สวัสดีครับ",
    romanization: "sà-wàt-dee khrap",
    meaning: "Hello (using khrap)",
    literalMeaning: "Hello + male/khrap politeness particle",
    audioRef: "audio.hello-khrap",
    speakerGender: "male",
    politenessContext: "Used by a speaker whose usual polite ending is khrap.",
    toneGuidance:
      "Say khrap lightly; it supports the greeting rather than dominating it.",
    formality: "polite",
    usageNotes: "A safe greeting for relatives, staff, and new people.",
    tags: ["greeting", "khrap"],
    topics: ["introductions"],
    difficulty: 1,
    vocabularyIds: ["vocab.hello"],
    grammarNoteIds: ["grammar.polite-particles"],
  }),
  phrase({
    id: "phrase.hello-kha",
    thai: "สวัสดีค่ะ",
    romanization: "sà-wàt-dee kha",
    meaning: "Hello (using kha)",
    literalMeaning: "Hello + female/kha politeness particle",
    audioRef: "audio.hello-kha",
    speakerGender: "female",
    politenessContext: "Used by a speaker whose usual polite ending is kha.",
    toneGuidance: "Keep kha short and gently falling in this statement.",
    formality: "polite",
    usageNotes: "You will often hear this form from women speakers.",
    tags: ["greeting", "kha"],
    topics: ["introductions"],
    difficulty: 1,
    vocabularyIds: ["vocab.hello"],
    grammarNoteIds: ["grammar.polite-particles"],
  }),
  phrase({
    id: "phrase.thanks",
    thai: "ขอบคุณครับ",
    romanization: "khàawp-khun khrap",
    meaning: "Thank you (using khrap)",
    audioRef: "audio.thanks",
    politenessContext: "Swap khrap for kha if that is your usual particle.",
    toneGuidance: "The first syllable falls; avoid stretching khun.",
    formality: "polite",
    usageNotes: "Useful dozens of times a day while traveling.",
    tags: ["manners", "khrap"],
    topics: ["introductions"],
    difficulty: 1,
    vocabularyIds: ["vocab.thanks"],
    grammarNoteIds: ["grammar.polite-particles"],
    acceptedRomanizations: ["khop khun khrap"],
  }),
  phrase({
    id: "phrase.no-worries",
    thai: "ไม่เป็นไรค่ะ",
    romanization: "mâi-bpen-rai kha",
    meaning: "No worries / it's okay",
    audioRef: "audio.no-worries",
    politenessContext:
      "This recording uses kha; khrap is equally natural for a khrap speaker.",
    toneGuidance: "Let mâi fall; keep the rest flowing as one familiar chunk.",
    formality: "polite",
    usageNotes: "Can answer thanks, apologies, or a small inconvenience.",
    tags: ["manners", "flexible"],
    topics: ["introductions"],
    difficulty: 2,
  }),
  phrase({
    id: "phrase.want-this",
    thai: "เอาอันนี้ครับ",
    romanization: "ao an-née khrap",
    meaning: "I'll take this one, please",
    audioRef: "audio.want-this",
    politenessContext: "Swap khrap for kha to match your speaking style.",
    toneGuidance: "Née has a clear high tone; point naturally as you say it.",
    formality: "polite",
    usageNotes: "Perfect when pointing at a menu or food tray.",
    tags: ["ordering", "pointing"],
    topics: ["restaurant"],
    difficulty: 2,
    culturalNoteIds: ["culture.pointing-at-menu"],
  }),
  phrase({
    id: "phrase.not-spicy",
    thai: "ไม่เผ็ดครับ",
    romanization: "mâi phèt khrap",
    meaning: "Not spicy, please",
    audioRef: "audio.not-spicy",
    politenessContext: "Swap khrap for kha if needed.",
    toneGuidance: "Both mâi and phèt fall; keep phèt short.",
    formality: "polite",
    usageNotes: "For a little spice, say phèt nít-nòi instead.",
    tags: ["food", "preference"],
    topics: ["restaurant"],
    difficulty: 2,
    vocabularyIds: ["vocab.spicy"],
    grammarNoteIds: ["grammar.mai-negation"],
  }),
  phrase({
    id: "phrase.bill-please",
    thai: "เช็คบิลด้วยครับ",
    romanization: "chék-bin dûai khrap",
    meaning: "The bill, please",
    audioRef: "audio.bill",
    politenessContext: "Swap khrap for kha if needed.",
    toneGuidance: "Dûai falls; the borrowed chék-bin is quick and familiar.",
    formality: "polite",
    usageNotes: "Widely understood in restaurants.",
    tags: ["payment", "restaurant"],
    topics: ["restaurant"],
    difficulty: 2,
  }),
  phrase({
    id: "phrase.eaten-yet",
    thai: "กินข้าวหรือยังคะ",
    romanization: "kin khâao rʉ̌ʉ yang kha",
    meaning: "Have you eaten yet?",
    literalMeaning: "Eat rice or not-yet?",
    audioRef: "audio.eaten-yet",
    politenessContext:
      "Mali uses kha; family may drop it in very casual speech.",
    toneGuidance: "Let rʉ̌ʉ rise and keep the whole question conversational.",
    formality: "casual",
    usageNotes: "Often a caring greeting, not a request for a meal report.",
    tags: ["family", "food"],
    topics: ["family"],
    difficulty: 3,
    vocabularyIds: ["vocab.eat"],
    culturalNoteIds: ["culture.eaten-yet"],
  }),
  phrase({
    id: "phrase.eaten-already",
    thai: "กินแล้วครับ",
    romanization: "kin láew khrap",
    meaning: "I've eaten already",
    audioRef: "audio.eaten-already",
    politenessContext: "Swap khrap for kha if needed.",
    toneGuidance: "Láew rises clearly; do not over-stress kin.",
    formality: "polite",
    usageNotes: "A natural short answer to kin khâao rʉ̌ʉ yang?",
    tags: ["family", "response"],
    topics: ["family"],
    difficulty: 2,
    vocabularyIds: ["vocab.eat"],
    grammarNoteIds: ["grammar.laew-yang"],
  }),
  phrase({
    id: "phrase.not-yet",
    thai: "ยังไม่ได้กินครับ",
    romanization: "yang mâi dâi kin khrap",
    meaning: "I haven't eaten yet",
    audioRef: "audio.not-yet",
    politenessContext: "Swap khrap for kha if needed.",
    toneGuidance: "Keep mâi dâi together; dâi falls.",
    formality: "polite",
    usageNotes: "A practical family answer that may immediately produce food.",
    tags: ["family", "response"],
    topics: ["family"],
    difficulty: 3,
    vocabularyIds: ["vocab.eat"],
    grammarNoteIds: ["grammar.laew-yang"],
  }),
];

const dialogues: CourseInput["dialogues"] = [
  {
    id: "dialogue.restaurant-spice",
    title: "At the noodle shop",
    context: "Mali is serving and Nok orders from the picture menu.",
    difficulty: 3,
    tags: ["restaurant", "listening"],
    turns: [
      {
        speakerId: "speaker.nok",
        phraseId: "phrase.want-this",
        thai: "เอาอันนี้ครับ",
        romanization: "ao an-née khrap",
        meaning: "I'll take this one, please.",
        audioRef: "audio.want-this",
      },
      {
        speakerId: "speaker.mali",
        thai: "เอาเผ็ดไหมคะ",
        romanization: "ao phèt mǎi kha",
        meaning: "Do you want it spicy?",
        audioRef: "audio.spicy-question",
      },
      {
        speakerId: "speaker.nok",
        phraseId: "phrase.not-spicy",
        thai: "ไม่เผ็ดครับ",
        romanization: "mâi phèt khrap",
        meaning: "Not spicy, please.",
        audioRef: "audio.not-spicy",
      },
    ],
  },
  {
    id: "dialogue.family-meal",
    title: "The family food check",
    context: "Mali checks whether Nok has eaten before everyone heads out.",
    difficulty: 3,
    tags: ["family", "casual"],
    turns: [
      {
        speakerId: "speaker.mali",
        phraseId: "phrase.eaten-yet",
        thai: "กินข้าวหรือยังคะ",
        romanization: "kin khâao rʉ̌ʉ yang kha",
        meaning: "Have you eaten yet?",
        audioRef: "audio.eaten-yet",
      },
      {
        speakerId: "speaker.nok",
        phraseId: "phrase.eaten-already",
        thai: "กินแล้วครับ",
        romanization: "kin láew khrap",
        meaning: "I've eaten already.",
        audioRef: "audio.eaten-already",
      },
      {
        speakerId: "speaker.lek",
        thai: "อร่อยไหม",
        romanization: "à-ròi mǎi",
        meaning: "Was it tasty?",
        audioRef: "audio.tasty-question",
      },
    ],
  },
];

const commonChoices = {
  helloKhrap: {
    id: "hello-khrap",
    label: "sà-wàt-dee khrap",
    meaning: "Hello (using khrap)",
    thai: "สวัสดีครับ",
  },
  helloKha: {
    id: "hello-kha",
    label: "sà-wàt-dee kha",
    meaning: "Hello (using kha)",
    thai: "สวัสดีค่ะ",
  },
  thanks: {
    id: "thanks",
    label: "khàawp-khun khrap",
    meaning: "Thank you",
    thai: "ขอบคุณครับ",
  },
  noWorries: {
    id: "no-worries",
    label: "mâi-bpen-rai kha",
    meaning: "No worries",
    thai: "ไม่เป็นไรค่ะ",
  },
};

const lessons: CourseInput["lessons"] = [
  {
    id: "lesson.first-hellos",
    unitId: "unit.warm-welcome",
    kind: "lesson",
    title: "Hello without the homework",
    eyebrow: "First useful sounds",
    description:
      "Greet family, thank people, and choose the polite ending that fits your voice.",
    icon: "Sparkles",
    completionXp: 5,
    estimatedMinutes: 4,
    skillIds: ["skill.greetings", "skill.politeness"],
    prerequisiteLessonIds: [],
    introducedItemIds: [
      "phrase.hello-khrap",
      "phrase.thanks",
      "phrase.no-worries",
    ],
    tags: ["introduction", "listening"],
    exercises: [
      exercise({
        id: "ex.hello.listen-meaning",
        type: "listen-meaning",
        instruction: "Listen, then choose the natural meaning",
        prompt: "What did Mali say?",
        audioRef: "audio.hello-kha",
        speakerId: "speaker.mali",
        choices: [
          { id: "hello", label: "Hello" },
          { id: "thanks", label: "Thank you" },
          { id: "hungry", label: "I'm hungry" },
        ],
        correctAnswer: "hello",
        hintIds: ["hint.hello-everywhere"],
        explanation:
          "Sà-wàt-dee is the all-purpose Thai greeting; Mali adds kha because that is her usual polite ending.",
        difficulty: 1,
        tags: ["listening", "greeting"],
        sourceItemIds: ["phrase.hello-kha"],
        feedback: feedback("sà-wàt-dee kha", "sà / wàt / dee / kha"),
        accessibilityLabel:
          "Listen to Mali greet you and select the English meaning",
        estimatedSeconds: 24,
      }),
      exercise({
        id: "ex.hello.listen-phrase",
        type: "listen-phrase",
        instruction: "Listen for the exact phrase",
        prompt: "Which Romanized phrase matches Nok's audio?",
        audioRef: "audio.hello-khrap",
        speakerId: "speaker.nok",
        choices: [
          commonChoices.helloKhrap,
          commonChoices.thanks,
          commonChoices.noWorries,
        ],
        correctAnswer: "hello-khrap",
        explanation:
          "Nok uses khrap. Kha and khrap reflect the speaker, not the person being addressed.",
        difficulty: 1,
        tags: ["listening", "romanization"],
        sourceItemIds: ["phrase.hello-khrap"],
        feedback: feedback("sà-wàt-dee khrap"),
        accessibilityLabel:
          "Listen to Nok and select the matching Romanized Thai phrase",
        estimatedSeconds: 24,
      }),
      exercise({
        id: "ex.hello.english-thanks",
        type: "english-to-phrase",
        instruction: "Choose the phrase you would actually say",
        prompt:
          "You want to thank your wife's aunt, and you normally use khrap.",
        choices: [
          commonChoices.thanks,
          commonChoices.helloKhrap,
          commonChoices.noWorries,
        ],
        correctAnswer: "thanks",
        explanation:
          "Khàawp-khun means thank you; the light khrap keeps it polite.",
        difficulty: 1,
        tags: ["recall", "family"],
        sourceItemIds: ["phrase.thanks"],
        feedback: feedback("khàawp-khun khrap"),
        accessibilityLabel:
          "Choose the Thai phrase for thanking an older relative",
        estimatedSeconds: 24,
      }),
      exercise({
        id: "ex.hello.missing-particle",
        type: "missing-word",
        instruction: "Complete the Romanized phrase",
        prompt: "A khrap speaker says: sà-wàt-dee ___",
        romanization: "sà-wàt-dee ___",
        choices: [
          { id: "khrap", label: "khrap" },
          { id: "kha", label: "kha" },
          { id: "mmaak", label: "mâak" },
        ],
        correctAnswer: "khrap",
        hintIds: ["hint.particle-speaker"],
        explanation:
          "Use khrap if that is your usual polite particle; use kha if kha is yours.",
        difficulty: 2,
        tags: ["politeness", "recall"],
        sourceItemIds: ["phrase.hello-khrap"],
        feedback: feedback("khrap"),
        accessibilityLabel:
          "Choose the missing politeness particle for a khrap speaker",
        estimatedSeconds: 24,
      }),
      exercise({
        id: "ex.hello.match",
        type: "matching-pairs",
        instruction: "Match the sound chunks to their meanings",
        prompt: "Pair each Romanized phrase with its everyday meaning.",
        pairs: [
          { id: "hello", left: "sà-wàt-dee", right: "Hello" },
          { id: "thanks", left: "khàawp-khun", right: "Thank you" },
          { id: "okay", left: "mâi-bpen-rai", right: "No worries" },
        ],
        correctAnswer: ["hello", "thanks", "okay"],
        explanation:
          "These three chunks cover a surprising amount of polite daily life.",
        difficulty: 2,
        tags: ["matching", "retrieval"],
        sourceItemIds: [
          "phrase.hello-khrap",
          "phrase.thanks",
          "phrase.no-worries",
        ],
        feedback: feedback("all three pairs"),
        accessibilityLabel:
          "Match three Romanized Thai phrases to English meanings",
        estimatedSeconds: 34,
      }),
      exercise({
        id: "ex.hello.conversation",
        type: "conversation-response",
        instruction: "Choose the natural reply",
        prompt:
          "Mali smiles and says “sà-wàt-dee kha.” You use khrap. What do you say back?",
        context: "Meeting family at the front door",
        audioRef: "audio.hello-kha",
        speakerId: "speaker.mali",
        choices: [
          commonChoices.helloKhrap,
          commonChoices.noWorries,
          commonChoices.thanks,
        ],
        correctAnswer: "hello-khrap",
        explanation:
          "Mirror the greeting, but keep your own particle rather than copying the other speaker's.",
        difficulty: 2,
        tags: ["conversation", "family"],
        sourceItemIds: ["phrase.hello-khrap", "phrase.hello-kha"],
        feedback: feedback("sà-wàt-dee khrap"),
        accessibilityLabel:
          "Select a natural spoken response to Mali's greeting",
        estimatedSeconds: 27,
      }),
      exercise({
        id: "ex.hello.speaking",
        type: "speaking-practice",
        instruction: "Say it, then rate how it felt",
        prompt: "Thank someone warmly.",
        thai: "ขอบคุณครับ",
        romanization: "khàawp-khun khrap",
        meaning: "Thank you",
        audioRef: "audio.thanks",
        speakerId: "speaker.nok",
        correctAnswer: "confident",
        acceptedAnswers: ["ขอบคุณครับ", "ขอบคุณ", "khàawp-khun khrap"],
        explanation:
          "Aim for a relaxed phrase, not perfect studio pronunciation.",
        difficulty: 2,
        tags: ["speaking", "manners"],
        sourceItemIds: ["phrase.thanks"],
        feedback: feedback("khàawp-khun khrap", "khàawp / khun / khrap"),
        accessibilityLabel: "Practice saying thank you in Thai and self-assess",
        estimatedSeconds: 34,
      }),
      exercise({
        id: "ex.hello.personalized",
        type: "personalized-translation",
        instruction: "Put it into your life",
        prompt:
          "Your wife introduces you to an aunt. She greets you, then you want to greet and thank her politely.",
        context: "A real family arrival after a long flight",
        choices: [
          {
            id: "greet-thank",
            label: "sà-wàt-dee khrap, khàawp-khun khrap",
            meaning: "Hello, thank you",
          },
          {
            id: "no-worries",
            label: "mâi-bpen-rai khrap",
            meaning: "No worries",
          },
          {
            id: "hello-kha",
            label: "sà-wàt-dee kha",
            meaning: "Hello using kha",
          },
        ],
        correctAnswer: "greet-thank",
        explanation:
          "Combining two tiny familiar phrases is already a useful family interaction.",
        difficulty: 3,
        tags: ["personalized", "family", "retrieval"],
        sourceItemIds: ["phrase.hello-khrap", "phrase.thanks"],
        feedback: feedback("sà-wàt-dee khrap, khàawp-khun khrap"),
        accessibilityLabel:
          "Choose a personalized greeting and thanks for your wife's aunt",
        estimatedSeconds: 36,
      }),
    ],
  },
  {
    id: "lesson.welcome-checkpoint",
    unitId: "unit.warm-welcome",
    kind: "checkpoint",
    title: "Warm welcome checkpoint",
    eyebrow: "Checkpoint",
    description:
      "Recognize and respond with the first phrases without leaning on repetition.",
    icon: "Trophy",
    completionXp: 8,
    estimatedMinutes: 4,
    skillIds: ["skill.greetings", "skill.politeness"],
    prerequisiteLessonIds: ["lesson.first-hellos"],
    introducedItemIds: [],
    tags: ["checkpoint", "retrieval"],
    exercises: [
      exercise({
        id: "ex.checkpoint.listen-greeting",
        type: "listen-meaning",
        instruction: "Listen without a hint",
        prompt: "What is Mali doing?",
        audioRef: "audio.hello-kha",
        choices: [
          { id: "greeting", label: "Greeting you politely" },
          { id: "thanking", label: "Thanking you" },
          { id: "apologizing", label: "Apologizing" },
        ],
        correctAnswer: "greeting",
        explanation:
          "Sà-wàt-dee is the greeting; kha tells you about Mali's speaking style.",
        difficulty: 2,
        tags: ["checkpoint", "listening"],
        sourceItemIds: ["phrase.hello-kha"],
        feedback: feedback("a polite greeting"),
        accessibilityLabel: "Identify the purpose of Mali's spoken greeting",
        estimatedSeconds: 24,
      }),
      exercise({
        id: "ex.checkpoint.listen-thanks",
        type: "listen-phrase",
        instruction: "Choose the exact sound sequence",
        prompt: "Which phrase did Nok use?",
        audioRef: "audio.thanks",
        choices: [
          commonChoices.thanks,
          commonChoices.helloKhrap,
          commonChoices.noWorries,
        ],
        correctAnswer: "thanks",
        explanation:
          "Khàawp-khun khrap is the full polite chunk in this recording.",
        difficulty: 2,
        tags: ["checkpoint", "listening"],
        sourceItemIds: ["phrase.thanks"],
        feedback: feedback("khàawp-khun khrap"),
        accessibilityLabel: "Select the Romanized phrase matching Nok's thanks",
        estimatedSeconds: 24,
      }),
      exercise({
        id: "ex.checkpoint.english-okay",
        type: "english-to-phrase",
        instruction: "Retrieve the flexible phrase",
        prompt:
          "A relative apologizes for being five minutes late. Say “no worries.”",
        choices: [
          commonChoices.noWorries,
          commonChoices.thanks,
          commonChoices.helloKha,
        ],
        correctAnswer: "no-worries",
        explanation: "Mâi-bpen-rai handles this small inconvenience naturally.",
        difficulty: 2,
        tags: ["checkpoint", "recall"],
        sourceItemIds: ["phrase.no-worries"],
        feedback: feedback("mâi-bpen-rai"),
        accessibilityLabel: "Choose the Thai phrase meaning no worries",
        estimatedSeconds: 25,
      }),
      exercise({
        id: "ex.checkpoint.order-thanks",
        type: "phrase-order",
        instruction: "Build the spoken phrase from Romanized chunks",
        prompt: "Thank you (using khrap)",
        tokens: ["khrap", "khàawp-khun"],
        correctAnswer: ["khàawp-khun", "khrap"],
        explanation:
          "The meaning comes first; the politeness particle closes the phrase.",
        difficulty: 3,
        tags: ["checkpoint", "ordering"],
        sourceItemIds: ["phrase.thanks"],
        feedback: feedback("khàawp-khun khrap"),
        accessibilityLabel:
          "Order two Romanized chunks to say thank you politely",
        estimatedSeconds: 29,
      }),
      exercise({
        id: "ex.checkpoint.match",
        type: "matching-pairs",
        instruction: "Connect each phrase quickly",
        prompt: "Match the three phrases to the situation where each fits.",
        pairs: [
          { id: "arrival", left: "sà-wàt-dee", right: "Arriving" },
          { id: "favor", left: "khàawp-khun", right: "After a favor" },
          {
            id: "small-problem",
            left: "mâi-bpen-rai",
            right: "A small problem",
          },
        ],
        correctAnswer: ["arrival", "favor", "small-problem"],
        explanation:
          "Recognition should now connect directly to a social situation.",
        difficulty: 3,
        tags: ["checkpoint", "matching"],
        sourceItemIds: [
          "phrase.hello-khrap",
          "phrase.thanks",
          "phrase.no-worries",
        ],
        feedback: feedback("the three natural situations"),
        accessibilityLabel: "Match each Romanized phrase to a social situation",
        estimatedSeconds: 34,
      }),
      exercise({
        id: "ex.checkpoint.conversation",
        type: "conversation-response",
        instruction: "Keep the exchange moving",
        prompt:
          "P' Lek says “khàawp-khun khrap” after you pass him a drink. What is the lightest natural reply?",
        choices: [
          commonChoices.noWorries,
          commonChoices.helloKhrap,
          commonChoices.thanks,
        ],
        correctAnswer: "no-worries",
        explanation: "Mâi-bpen-rai is a natural “no problem” after thanks.",
        difficulty: 3,
        tags: ["checkpoint", "conversation"],
        sourceItemIds: ["phrase.no-worries", "phrase.thanks"],
        feedback: feedback("mâi-bpen-rai khrap"),
        accessibilityLabel:
          "Choose a natural reply when an older relative thanks you",
        estimatedSeconds: 29,
      }),
      exercise({
        id: "ex.checkpoint.common-mixup",
        type: "mistake-correction",
        instruction: "Repair a common mix-up",
        prompt:
          "You use khrap, but accidentally copied Mali's kha. Which corrected greeting is yours?",
        choices: [
          commonChoices.helloKhrap,
          commonChoices.helloKha,
          commonChoices.noWorries,
        ],
        correctAnswer: "hello-khrap",
        explanation:
          "Particles follow the speaker's own style. You do not mirror the other person's particle.",
        difficulty: 3,
        tags: ["checkpoint", "mistake"],
        sourceItemIds: ["phrase.hello-khrap", "phrase.hello-kha"],
        feedback: feedback("sà-wàt-dee khrap"),
        accessibilityLabel: "Correct a politeness-particle mix-up",
        estimatedSeconds: 28,
      }),
      exercise({
        id: "ex.checkpoint.family-arrival",
        type: "personalized-translation",
        instruction: "Handle the whole micro-moment",
        prompt:
          "You arrive at your wife's family home. Greet an aunt, then answer her thanks after you hand over a gift.",
        choices: [
          {
            id: "hello-okay",
            label: "sà-wàt-dee khrap … mâi-bpen-rai khrap",
            meaning: "Hello … no worries",
          },
          {
            id: "thanks-hello",
            label: "khàawp-khun khrap … sà-wàt-dee khrap",
            meaning: "Thank you … hello",
          },
          {
            id: "kha-both",
            label: "sà-wàt-dee kha … mâi-bpen-rai kha",
            meaning: "Both phrases using kha",
          },
        ],
        correctAnswer: "hello-okay",
        explanation:
          "The sequence fits the situation: greet on arrival, then say no worries after her thanks.",
        difficulty: 4,
        tags: ["checkpoint", "personalized", "retrieval"],
        sourceItemIds: ["phrase.hello-khrap", "phrase.no-worries"],
        feedback: feedback("sà-wàt-dee khrap … mâi-bpen-rai khrap"),
        accessibilityLabel:
          "Choose a two-part response for arriving at your wife's family home",
        estimatedSeconds: 39,
      }),
    ],
  },
  {
    id: "lesson.restaurant-basics",
    unitId: "unit.restaurant",
    kind: "lesson",
    title: "Point, order, survive the spice",
    eyebrow: "Restaurant essentials",
    description: "Order from a menu, set the heat level, and ask for the bill.",
    icon: "Soup",
    completionXp: 6,
    estimatedMinutes: 5,
    skillIds: ["skill.restaurant"],
    prerequisiteLessonIds: ["lesson.welcome-checkpoint"],
    introducedItemIds: [
      "phrase.want-this",
      "phrase.not-spicy",
      "phrase.bill-please",
    ],
    tags: ["food", "travel"],
    exercises: [
      exercise({
        id: "ex.food.listen-meaning",
        type: "listen-meaning",
        instruction: "Listen at menu speed",
        prompt: "What does Nok want?",
        audioRef: "audio.want-this",
        choices: [
          { id: "this", label: "This one" },
          { id: "bill", label: "The bill" },
          { id: "water", label: "Water" },
        ],
        correctAnswer: "this",
        explanation: "Ao an-née is a practical point-and-order phrase.",
        difficulty: 1,
        tags: ["listening", "ordering"],
        sourceItemIds: ["phrase.want-this"],
        feedback: feedback("this one, please"),
        accessibilityLabel: "Listen to Nok order and choose what he wants",
        estimatedSeconds: 23,
      }),
      exercise({
        id: "ex.food.listen-phrase",
        type: "listen-phrase",
        instruction: "Catch the spice request",
        prompt: "Which phrase matches the audio?",
        audioRef: "audio.not-spicy",
        choices: [
          {
            id: "not-spicy",
            label: "mâi phèt khrap",
            meaning: "Not spicy, please",
          },
          { id: "this", label: "ao an-née khrap", meaning: "This one, please" },
          {
            id: "bill",
            label: "chék-bin dûai khrap",
            meaning: "The bill, please",
          },
        ],
        correctAnswer: "not-spicy",
        explanation: "Mâi negates phèt: literally “not spicy.”",
        difficulty: 2,
        tags: ["listening", "food"],
        sourceItemIds: ["phrase.not-spicy"],
        feedback: feedback("mâi phèt khrap"),
        accessibilityLabel: "Listen and select the Romanized not-spicy request",
        estimatedSeconds: 24,
      }),
      exercise({
        id: "ex.food.bill",
        type: "english-to-phrase",
        instruction: "Choose what you would say",
        prompt: "You are ready to pay. Ask for the bill politely.",
        choices: [
          {
            id: "bill",
            label: "chék-bin dûai khrap",
            meaning: "The bill, please",
          },
          { id: "this", label: "ao an-née khrap", meaning: "This one, please" },
          {
            id: "not-spicy",
            label: "mâi phèt khrap",
            meaning: "Not spicy, please",
          },
        ],
        correctAnswer: "bill",
        explanation:
          "Chék-bin is a familiar borrowed phrase; dûai softens it into a request.",
        difficulty: 2,
        tags: ["recall", "payment"],
        sourceItemIds: ["phrase.bill-please"],
        feedback: feedback("chék-bin dûai khrap"),
        accessibilityLabel: "Choose the Thai phrase for asking for the bill",
        estimatedSeconds: 24,
      }),
      exercise({
        id: "ex.food.missing-spicy",
        type: "missing-word",
        instruction: "Fill the sound-sized gap",
        prompt: "mâi ___ khrap — not spicy, please",
        romanization: "mâi ___ khrap",
        choices: [
          { id: "phet", label: "phèt" },
          { id: "nee", label: "née" },
          { id: "duai", label: "dûai" },
        ],
        correctAnswer: "phet",
        hintIds: ["hint.mai-before"],
        explanation:
          "Mâi goes directly before the thing being negated: phèt, spicy.",
        difficulty: 2,
        tags: ["missing-word", "food"],
        sourceItemIds: ["phrase.not-spicy", "vocab.spicy"],
        feedback: feedback("phèt", "short and falling"),
        accessibilityLabel: "Choose the missing Romanized word in not spicy",
        estimatedSeconds: 25,
      }),
      exercise({
        id: "ex.food.match",
        type: "matching-pairs",
        instruction: "Match the restaurant moves",
        prompt: "Pair each sound chunk with its job.",
        pairs: [
          { id: "point", left: "ao an-née", right: "Choose this" },
          { id: "heat", left: "mâi phèt", right: "Remove spice" },
          { id: "pay", left: "chék-bin", right: "Ask to pay" },
        ],
        correctAnswer: ["point", "heat", "pay"],
        explanation: "Think in jobs, not word-for-word translation.",
        difficulty: 2,
        tags: ["matching", "restaurant"],
        sourceItemIds: [
          "phrase.want-this",
          "phrase.not-spicy",
          "phrase.bill-please",
        ],
        feedback: feedback("all three restaurant jobs"),
        accessibilityLabel:
          "Match three Romanized restaurant phrases to their uses",
        estimatedSeconds: 34,
      }),
      exercise({
        id: "ex.food.conversation",
        type: "conversation-response",
        instruction: "Answer the server",
        prompt: "Mali asks “ao phèt mǎi kha?” — Do you want it spicy?",
        audioRef: "audio.spicy-question",
        context: "A noodle shop where the default spice level is ambitious",
        choices: [
          {
            id: "not-spicy",
            label: "mâi phèt khrap",
            meaning: "Not spicy, please",
          },
          {
            id: "bill",
            label: "chék-bin dûai khrap",
            meaning: "The bill, please",
          },
          { id: "hello", label: "sà-wàt-dee khrap", meaning: "Hello" },
        ],
        correctAnswer: "not-spicy",
        explanation:
          "Answer the choice she asked about; mâi phèt is clear and useful.",
        difficulty: 3,
        tags: ["conversation", "restaurant"],
        sourceItemIds: ["phrase.not-spicy"],
        feedback: feedback("mâi phèt khrap"),
        accessibilityLabel:
          "Choose a not-spicy response to the server's question",
        estimatedSeconds: 29,
      }),
      exercise({
        id: "ex.food.order-phrase",
        type: "phrase-order",
        instruction: "Build the phrase from sound chunks",
        prompt: "I'll take this one, please.",
        tokens: ["khrap", "an-née", "ao"],
        correctAnswer: ["ao", "an-née", "khrap"],
        explanation:
          "Ao (want/take) leads, then an-née (this one), then your polite ending.",
        difficulty: 3,
        tags: ["ordering", "retrieval"],
        sourceItemIds: ["phrase.want-this"],
        feedback: feedback("ao an-née khrap"),
        accessibilityLabel: "Order Romanized chunks to ask for this menu item",
        estimatedSeconds: 31,
      }),
      exercise({
        id: "ex.food.speaking",
        type: "speaking-practice",
        instruction: "Try it before your food arrives",
        prompt: "Ask for no spice, then rate the attempt.",
        thai: "ไม่เผ็ดครับ",
        romanization: "mâi phèt khrap",
        meaning: "Not spicy, please",
        audioRef: "audio.not-spicy",
        correctAnswer: "confident",
        acceptedAnswers: ["ไม่เผ็ดครับ", "ไม่เผ็ด", "mâi phèt khrap"],
        explanation: "Short and clear beats loud and over-pronounced.",
        difficulty: 3,
        tags: ["speaking", "restaurant"],
        sourceItemIds: ["phrase.not-spicy"],
        feedback: feedback("mâi phèt khrap", "mâi falls; phèt is short"),
        accessibilityLabel: "Practice saying not spicy and self-assess",
        estimatedSeconds: 36,
      }),
      exercise({
        id: "ex.food.dialogue",
        type: "dialogue-comprehension",
        instruction: "Follow the short exchange",
        prompt: "How does Nok want the dish prepared?",
        dialogueId: "dialogue.restaurant-spice",
        audioRef: "audio.dialogue-restaurant",
        choices: [
          { id: "not-spicy", label: "Not spicy" },
          { id: "very-spicy", label: "Very spicy" },
          { id: "takeaway", label: "To take away" },
        ],
        correctAnswer: "not-spicy",
        explanation: "Nok answers the spice question with mâi phèt khrap.",
        difficulty: 4,
        tags: ["dialogue", "listening", "retrieval"],
        sourceItemIds: ["phrase.want-this", "phrase.not-spicy"],
        feedback: feedback("not spicy"),
        accessibilityLabel:
          "Listen to a restaurant dialogue and identify Nok's spice preference",
        estimatedSeconds: 44,
      }),
    ],
  },
  {
    id: "lesson.family-food-check",
    unitId: "unit.family-chatter",
    kind: "lesson",
    title: "The Thai family food check",
    eyebrow: "Casual conversation",
    description:
      "Understand the caring question every family seems ready to ask.",
    icon: "MessagesCircle",
    completionXp: 6,
    estimatedMinutes: 5,
    skillIds: ["skill.family-chatter"],
    prerequisiteLessonIds: ["lesson.restaurant-basics"],
    introducedItemIds: [
      "phrase.eaten-yet",
      "phrase.eaten-already",
      "phrase.not-yet",
    ],
    tags: ["family", "casual"],
    exercises: [
      exercise({
        id: "ex.family.listen-meaning",
        type: "listen-meaning",
        instruction: "Listen for the family's favorite check-in",
        prompt: "What is Mali asking?",
        audioRef: "audio.eaten-yet",
        choices: [
          { id: "eaten", label: "Have you eaten yet?" },
          { id: "going", label: "Where are you going?" },
          { id: "tired", label: "Are you tired?" },
        ],
        correctAnswer: "eaten",
        explanation:
          "Kin khâao rʉ̌ʉ yang? is both a real question and a caring social check-in.",
        difficulty: 2,
        tags: ["listening", "family"],
        sourceItemIds: ["phrase.eaten-yet"],
        feedback: feedback("Have you eaten yet?"),
        accessibilityLabel:
          "Listen to Mali and identify her family check-in question",
        estimatedSeconds: 25,
      }),
      exercise({
        id: "ex.family.listen-phrase",
        type: "listen-phrase",
        instruction: "Catch the short answer",
        prompt: "Which Romanized answer matches Nok?",
        audioRef: "audio.eaten-already",
        choices: [
          {
            id: "already",
            label: "kin láew khrap",
            meaning: "I've eaten already",
          },
          {
            id: "not-yet",
            label: "yang mâi dâi kin khrap",
            meaning: "I haven't eaten yet",
          },
          {
            id: "not-spicy",
            label: "mâi phèt khrap",
            meaning: "Not spicy, please",
          },
        ],
        correctAnswer: "already",
        explanation: "Láew carries the already/completed idea.",
        difficulty: 2,
        tags: ["listening", "family"],
        sourceItemIds: ["phrase.eaten-already"],
        feedback: feedback("kin láew khrap"),
        accessibilityLabel:
          "Listen and select the Romanized answer saying already eaten",
        estimatedSeconds: 24,
      }),
      exercise({
        id: "ex.family.not-yet",
        type: "english-to-phrase",
        instruction: "Choose the honest answer",
        prompt:
          "You have not eaten yet — which reply may cause three relatives to feed you immediately?",
        choices: [
          {
            id: "not-yet",
            label: "yang mâi dâi kin khrap",
            meaning: "I haven't eaten yet",
          },
          {
            id: "already",
            label: "kin láew khrap",
            meaning: "I've eaten already",
          },
          {
            id: "bill",
            label: "chék-bin dûai khrap",
            meaning: "The bill, please",
          },
        ],
        correctAnswer: "not-yet",
        explanation:
          "Yang mâi dâi kin is a natural “haven't eaten yet.” Food may follow.",
        difficulty: 2,
        tags: ["recall", "family", "humor"],
        sourceItemIds: ["phrase.not-yet"],
        feedback: feedback("yang mâi dâi kin khrap"),
        accessibilityLabel:
          "Choose the Thai response saying you have not eaten yet",
        estimatedSeconds: 28,
      }),
      exercise({
        id: "ex.family.missing-yet",
        type: "missing-word",
        instruction: "Complete the question by sound",
        prompt: "kin khâao rʉ̌ʉ ___ kha?",
        romanization: "kin khâao rʉ̌ʉ ___ kha",
        choices: [
          { id: "yang", label: "yang" },
          { id: "laew", label: "láew" },
          { id: "phet", label: "phèt" },
        ],
        correctAnswer: "yang",
        explanation:
          "Yang supplies the “yet?” idea in this familiar question pattern.",
        difficulty: 3,
        tags: ["missing-word", "family"],
        sourceItemIds: ["phrase.eaten-yet"],
        feedback: feedback("yang"),
        accessibilityLabel:
          "Choose the missing Romanized word in have you eaten yet",
        estimatedSeconds: 27,
      }),
      exercise({
        id: "ex.family.match",
        type: "matching-pairs",
        instruction: "Match question and outcomes",
        prompt: "Connect each family-food chunk to its job.",
        pairs: [
          { id: "question", left: "rʉ̌ʉ yang?", right: "yet?" },
          { id: "done", left: "láew", right: "already / completed" },
          { id: "not-done", left: "yang mâi dâi", right: "not yet" },
        ],
        correctAnswer: ["question", "done", "not-done"],
        explanation:
          "These time markers let you understand the exchange before every word is perfect.",
        difficulty: 3,
        tags: ["matching", "family"],
        sourceItemIds: [
          "phrase.eaten-yet",
          "phrase.eaten-already",
          "phrase.not-yet",
        ],
        feedback: feedback("the three time markers"),
        accessibilityLabel:
          "Match three Romanized time chunks to their meanings",
        estimatedSeconds: 35,
      }),
      exercise({
        id: "ex.family.conversation",
        type: "conversation-response",
        instruction: "Answer without overthinking",
        prompt:
          "Your wife asks “kin khâao rʉ̌ʉ yang kha?” You ate on the plane.",
        audioRef: "audio.eaten-yet",
        choices: [
          {
            id: "already",
            label: "kin láew khrap",
            meaning: "I've eaten already",
          },
          {
            id: "not-yet",
            label: "yang mâi dâi kin khrap",
            meaning: "I haven't eaten yet",
          },
          { id: "hello", label: "sà-wàt-dee khrap", meaning: "Hello" },
        ],
        correctAnswer: "already",
        explanation:
          "Kin láew is the concise natural answer when the action is complete.",
        difficulty: 3,
        tags: ["conversation", "wife", "travel"],
        sourceItemIds: ["phrase.eaten-yet", "phrase.eaten-already"],
        feedback: feedback("kin láew khrap"),
        accessibilityLabel:
          "Choose the natural answer saying you ate on the plane",
        estimatedSeconds: 30,
      }),
      exercise({
        id: "ex.family.speaking",
        type: "speaking-practice",
        instruction: "Give the short family answer",
        prompt: "Say “I've eaten already,” then rate how it felt.",
        thai: "กินแล้วครับ",
        romanization: "kin láew khrap",
        meaning: "I've eaten already",
        audioRef: "audio.eaten-already",
        correctAnswer: "confident",
        acceptedAnswers: ["กินแล้วครับ", "กินแล้ว", "kin láew khrap"],
        explanation: "Let láew rise and keep the rest easy.",
        difficulty: 3,
        tags: ["speaking", "family"],
        sourceItemIds: ["phrase.eaten-already"],
        feedback: feedback("kin láew khrap", "kin / LÁEW / khrap"),
        accessibilityLabel:
          "Practice saying I have eaten already and self-assess",
        estimatedSeconds: 35,
      }),
      exercise({
        id: "ex.family.dialogue",
        type: "dialogue-comprehension",
        instruction: "Follow the family exchange",
        prompt: "Does Nok still need dinner?",
        dialogueId: "dialogue.family-meal",
        audioRef: "audio.dialogue-family",
        choices: [
          { id: "no", label: "No — he says he has eaten" },
          { id: "yes", label: "Yes — he says he has not eaten" },
          { id: "unknown", label: "The conversation never says" },
        ],
        correctAnswer: "no",
        explanation: "Kin láew means the eating is already complete.",
        difficulty: 4,
        tags: ["dialogue", "listening", "family"],
        sourceItemIds: ["phrase.eaten-yet", "phrase.eaten-already"],
        feedback: feedback("No — he has eaten already"),
        accessibilityLabel:
          "Listen to the family dialogue and decide whether Nok needs dinner",
        estimatedSeconds: 44,
      }),
    ],
  },
];

export const rawCourse = {
  schemaVersion: 1,
  id: "course.spoken-thai-starter",
  title: "Conversational Thai",
  description:
    "A listening-first sample path for useful Thai with family, restaurants, and everyday life.",
  sourceLanguage: "th",
  learnerLanguage: "en",
  sections: [
    {
      id: "section.everyday-thai",
      number: 1,
      title: "Everyday Thai that earns its suitcase space",
      description:
        "Short conversations chosen for family visits and ordinary travel days.",
      unitIds: ["unit.warm-welcome", "unit.restaurant", "unit.family-chatter"],
    },
  ],
  units: [
    {
      id: "unit.warm-welcome",
      sectionId: "section.everyday-thai",
      number: 1,
      title: "A warm welcome",
      description: "Greet people, thank them, and sound naturally polite.",
      color: "coral",
      skillIds: ["skill.greetings", "skill.politeness"],
      prerequisiteCheckpointIds: [],
      nodes: [
        {
          id: "node.first-hellos",
          type: "lesson",
          title: "Hello without the homework",
          lessonId: "lesson.first-hellos",
        },
        {
          id: "node.welcome-checkpoint",
          type: "checkpoint",
          title: "Warm welcome checkpoint",
          lessonId: "lesson.welcome-checkpoint",
        },
      ],
    },
    {
      id: "unit.restaurant",
      sectionId: "section.everyday-thai",
      number: 2,
      title: "Restaurant survival",
      description: "Point, order, manage the spice, and pay.",
      color: "teal",
      skillIds: ["skill.restaurant"],
      prerequisiteCheckpointIds: ["checkpoint.welcome"],
      nodes: [
        {
          id: "node.restaurant",
          type: "lesson",
          title: "Point, order, survive the spice",
          lessonId: "lesson.restaurant-basics",
        },
        {
          id: "node.restaurant-review",
          type: "review",
          title: "Restaurant review",
        },
      ],
    },
    {
      id: "unit.family-chatter",
      sectionId: "section.everyday-thai",
      number: 3,
      title: "Family chatter",
      description: "Catch the caring, casual questions happening around you.",
      color: "sun",
      skillIds: ["skill.family-chatter"],
      prerequisiteCheckpointIds: ["checkpoint.welcome"],
      nodes: [
        {
          id: "node.family-food",
          type: "lesson",
          title: "The Thai family food check",
          lessonId: "lesson.family-food-check",
        },
        {
          id: "node.family-review",
          type: "review",
          title: "Family conversation review",
        },
      ],
    },
  ],
  skills: [
    {
      id: "skill.greetings",
      title: "Greetings",
      description: "Recognize and return everyday greetings.",
      itemIds: ["phrase.hello-khrap", "phrase.hello-kha"],
      tags: ["introduction"],
    },
    {
      id: "skill.politeness",
      title: "Polite particles",
      description: "Use khrap or kha according to the speaker's own style.",
      itemIds: ["phrase.thanks", "phrase.no-worries"],
      tags: ["manners"],
    },
    {
      id: "skill.restaurant",
      title: "Restaurant essentials",
      description: "Order, state a preference, and close the meal.",
      itemIds: [
        "phrase.want-this",
        "phrase.not-spicy",
        "phrase.bill-please",
        "vocab.spicy",
      ],
      tags: ["food"],
    },
    {
      id: "skill.family-chatter",
      title: "Family food talk",
      description: "Understand and answer the everyday have-you-eaten check.",
      itemIds: [
        "phrase.eaten-yet",
        "phrase.eaten-already",
        "phrase.not-yet",
        "vocab.eat",
      ],
      tags: ["family"],
    },
  ],
  lessons,
  vocabulary,
  phrases,
  dialogues,
  speakers,
  audioAssets,
  hints: [
    {
      id: "hint.hello-everywhere",
      text: "This greeting works morning, noon, and night.",
      penaltyXp: 1,
    },
    {
      id: "hint.particle-speaker",
      text: "The particle follows the person speaking, not the listener.",
      penaltyXp: 1,
    },
    {
      id: "hint.mai-before",
      text: "The negating word comes immediately before phèt.",
      penaltyXp: 1,
    },
  ],
  grammarNotes: [
    {
      id: "grammar.polite-particles",
      title: "Khrap and kha belong to the speaker",
      summary:
        "Speakers commonly finish polite statements with khrap or kha according to their own speech style. Do not copy the other person's particle.",
      examples: ["phrase.hello-khrap", "phrase.hello-kha", "phrase.thanks"],
    },
    {
      id: "grammar.mai-negation",
      title: "Mâi makes a simple negative",
      summary:
        "Place mâi before an adjective or verb: phèt is spicy; mâi phèt is not spicy.",
      examples: ["phrase.not-spicy"],
    },
    {
      id: "grammar.laew-yang",
      title: "Already and not yet",
      summary:
        "Láew marks a completed action; yang and mâi dâi help express not yet.",
      examples: ["phrase.eaten-already", "phrase.not-yet"],
    },
  ],
  culturalNotes: [
    {
      id: "culture.pointing-at-menu",
      title: "Pointing can be fluent communication",
      body: "Ao an-née plus a polite particle is perfectly useful when a photo menu does the noun work.",
      relatedItemIds: ["phrase.want-this"],
    },
    {
      id: "culture.eaten-yet",
      title: "A question that also means I care",
      body: "Kin khâao rʉ̌ʉ yang? often works like a warm check-in, especially with family.",
      relatedItemIds: ["phrase.eaten-yet"],
    },
  ],
  checkpoints: [
    {
      id: "checkpoint.welcome",
      title: "Warm welcome checkpoint",
      lessonId: "lesson.welcome-checkpoint",
      passingAccuracy: 80,
      unlocksUnitIds: ["unit.restaurant", "unit.family-chatter"],
    },
  ],
  achievements: [
    {
      id: "achievement.first-flight",
      title: "Cleared for takeoff",
      description: "Complete a first lesson.",
      icon: "Plane",
      criteria: { kind: "lesson-count", threshold: 1 },
    },
    {
      id: "achievement.clean-sweep",
      title: "Clean sweep",
      description: "Finish a lesson at 100% first-attempt accuracy.",
      icon: "Sparkles",
      criteria: { kind: "perfect-lesson", threshold: 1 },
    },
    {
      id: "achievement.checkpoint",
      title: "Welcome ready",
      description: "Pass the first checkpoint.",
      icon: "Trophy",
      criteria: { kind: "checkpoint-count", threshold: 1 },
    },
    {
      id: "achievement.streak-three",
      title: "Three-day rhythm",
      description: "Practice on three local calendar days in a row.",
      icon: "Flame",
      criteria: { kind: "streak", threshold: 3 },
    },
    {
      id: "achievement.xp-fifty",
      title: "Fifty useful points",
      description: "Earn 50 total XP.",
      icon: "Star",
      criteria: { kind: "xp", threshold: 50 },
    },
  ],
} satisfies z.input<typeof CourseSchema>;

export const course = parseCourse(rawCourse);

const indexById = <T extends { id: string }>(values: T[]) =>
  Object.fromEntries(values.map((value) => [value.id, value])) as Record<
    string,
    T
  >;

export const lessonsById: Record<string, Lesson> = indexById(course.lessons);
export const exercisesById = indexById(
  course.lessons.flatMap((lesson) => lesson.exercises),
);
export const phrasesById: Record<string, Phrase> = indexById(course.phrases);
export const dialoguesById: Record<string, Dialogue> = indexById(
  course.dialogues,
);
export const audioAssetsById: Record<string, AudioAsset> = indexById(
  course.audioAssets,
);
export const hintsById = indexById(course.hints);
export const speakersById = indexById(course.speakers);
export const checkpointsByLessonId = Object.fromEntries(
  course.checkpoints.map((checkpoint) => [checkpoint.lessonId, checkpoint]),
);

export const resolveAudioAsset = (audioRef?: string) =>
  audioRef ? audioAssetsById[audioRef] : undefined;
