import type { z } from "zod";
import { parseCourse } from "@/src/domain/courseValidation";
import {
  CourseSchema,
  ExerciseSchema,
  type CourseInput,
} from "@/src/domain/schemas";
import type { AudioAsset, Dialogue, Lesson, Phrase } from "@/src/domain/types";

type ExerciseInput = z.input<typeof ExerciseSchema>;
type Formality = "casual" | "neutral" | "polite" | "formal";

type ItemSeed = {
  id: string;
  thai: string;
  romanization: string;
  meaning: string;
  literalMeaning?: string;
  toneGuidance: string;
  usageNotes: string;
  formality: Formality;
  speakerId: string;
  politenessContext?: string;
  grammarNoteIds?: string[];
};

type LessonSeed = {
  id: string;
  unitId: string;
  title: string;
  eyebrow: string;
  objective: string;
  icon: string;
  topic: string;
  vocab: ItemSeed & { partOfSpeech: string };
  phrases: [ItemSeed, ItemSeed];
  dialogueSpeakers: [string, string];
  conversationPrompt: string;
  conversationAnswer?: 0 | 1;
  conversationAudio?: 0 | 1;
  dialogueQuestion: string;
  dialogueAnswer: string;
  culturalTitle: string;
  culturalBody: string;
};

const v = (
  id: string,
  thai: string,
  romanization: string,
  meaning: string,
  toneGuidance: string,
  usageNotes: string,
  partOfSpeech = "high-frequency word",
  speakerId = "speaker.lek",
): LessonSeed["vocab"] => ({
  id,
  thai,
  romanization,
  meaning,
  toneGuidance,
  usageNotes,
  partOfSpeech,
  speakerId,
  formality: "neutral",
});

const p = (
  id: string,
  thai: string,
  romanization: string,
  meaning: string,
  toneGuidance: string,
  usageNotes: string,
  formality: Formality = "polite",
  speakerId = "speaker.nok",
  literalMeaning?: string,
): ItemSeed => ({
  id,
  thai,
  romanization,
  meaning,
  toneGuidance,
  usageNotes,
  formality,
  speakerId,
  literalMeaning,
  politenessContext:
    formality === "polite"
      ? "The model uses khrap or kha to match the speaker; use your own usual particle."
      : undefined,
});

const speakers: CourseInput["speakers"] = [
  {
    id: "speaker.nok",
    name: "Nok",
    gender: "male",
    role: "Learner model and friendly coach",
    description: "A relaxed central-Thai voice who normally uses khrap.",
    defaultPoliteParticle: "khrap",
  },
  {
    id: "speaker.mali",
    name: "Mali",
    gender: "female",
    role: "Thai wife and conversation partner",
    description: "A warm Bangkok speaker who normally uses kha.",
    defaultPoliteParticle: "kha",
  },
  {
    id: "speaker.lek",
    name: "P' Lek",
    gender: "male",
    role: "Older relative and restaurant regular",
    description: "An easygoing older relative with casual everyday delivery.",
    defaultPoliteParticle: "khrap",
  },
  {
    id: "speaker.pim",
    name: "Pim",
    gender: "female",
    role: "Hotel and restaurant worker",
    description: "A clear, friendly service voice with natural polite pacing.",
    defaultPoliteParticle: "kha",
  },
  {
    id: "speaker.chai",
    name: "Chai",
    gender: "male",
    role: "Driver and family friend",
    description:
      "A conversational central-Thai voice with normal-speed reductions.",
    defaultPoliteParticle: "khrap",
  },
  {
    id: "speaker.mae",
    name: "Mae Orn",
    gender: "female",
    role: "Mother-in-law",
    description:
      "A warm older relative who mixes caring questions with casual speech.",
    defaultPoliteParticle: "kha",
  },
  {
    id: "speaker.ensemble",
    name: "Noklingo cast",
    gender: "neutral",
    role: "Multi-speaker dialogue recording",
    description:
      "The recurring cast recorded together at natural conversational speed.",
    defaultPoliteParticle: "none",
  },
];

const lessonSeeds: LessonSeed[] = [
  {
    id: "lesson.first-hellos",
    unitId: "unit.warm-welcome",
    title: "Hello without the homework",
    eyebrow: "First useful sounds",
    objective:
      "Greet family and staff, recognize both common polite endings, and thank someone.",
    icon: "Sparkles",
    topic: "survival",
    vocab: v(
      "vocab.thanks",
      "ขอบคุณ",
      "khàawp-khun",
      "thank you",
      "Let khàawp fall, then keep khun level and quick.",
      "Add your usual polite particle in most interactions.",
      "social expression",
    ),
    phrases: [
      p(
        "phrase.hello-khrap",
        "สวัสดีครับ",
        "sà-wàt-dee khrap",
        "Hello (using khrap)",
        "Keep the middle syllable short; say khrap lightly.",
        "A safe greeting for relatives, staff, and new people.",
      ),
      p(
        "phrase.hello-kha",
        "สวัสดีค่ะ",
        "sà-wàt-dee kha",
        "Hello (using kha)",
        "Keep kha short and gently falling in this statement.",
        "You will commonly hear this from speakers who use kha.",
        "polite",
        "speaker.mali",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.mali"],
    conversationPrompt:
      "Mali greets you with sà-wàt-dee kha. You normally use khrap. What do you say back?",
    conversationAnswer: 0,
    conversationAudio: 1,
    dialogueQuestion: "What are Mali and Nok doing?",
    dialogueAnswer: "Greeting each other politely",
    culturalTitle: "Your particle follows your voice",
    culturalBody:
      "Khrap and kha normally reflect the speaker's own style, not the listener's gender. Listen for both; answer with your own.",
  },
  {
    id: "lesson.survival-repairs",
    unitId: "unit.warm-welcome",
    title: "Repair the conversation",
    eyebrow: "When Thai gets fast",
    objective:
      "Say that you do not understand and ask for slower speech without embarrassment.",
    icon: "MessagesCircle",
    topic: "survival",
    vocab: v(
      "vocab.sorry",
      "ขอโทษ",
      "khǎaw-thôot",
      "sorry / excuse me",
      "Khǎaw rises; thôot falls with a long vowel.",
      "Useful for an apology, getting attention, or softening an interruption.",
      "social expression",
    ),
    phrases: [
      p(
        "phrase.dont-understand",
        "ไม่เข้าใจครับ",
        "mâi khâo-jai khrap",
        "I don't understand",
        "Mâi and khâo both fall; keep jai short and level.",
        "Normal and safe when a sentence got away from you.",
      ),
      p(
        "phrase.speak-slowly",
        "พูดช้าๆ หน่อยได้ไหมครับ",
        "phûut cháa-cháa nòi dâi mǎi khrap",
        "Could you speak a little more slowly?",
        "Stretch cháa slightly, then let mǎi rise at the question.",
        "Polite and more natural than demanding 'slow'.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "A relative says a long sentence at normal speed. You understood none of it. What polite repair request keeps things moving?",
    dialogueQuestion: "What help is Nok asking for?",
    dialogueAnswer: "Slower speech because he did not understand",
    culturalTitle: "Conversation repair is real conversation",
    culturalBody:
      "Thai speakers do not expect a beginner to catch everything. A calm repair phrase is more useful than pretending to understand.",
  },
  {
    id: "lesson.yes-no-okay",
    unitId: "unit.warm-welcome",
    title: "Yes, no, and no worries",
    eyebrow: "Keep tiny exchanges moving",
    objective: "Confirm, negate, and respond kindly to a small apology.",
    icon: "BadgeCheck",
    topic: "survival",
    vocab: v(
      "vocab.no",
      "ไม่",
      "mâi",
      "not / no",
      "Mâi has a falling tone and normally comes before what it negates.",
      "A bare no depends on the question; mâi plus the repeated verb is often clearer.",
      "negator / response",
    ),
    phrases: [
      p(
        "phrase.yes-khrap",
        "ใช่ครับ",
        "châi khrap",
        "Yes / that's right",
        "Châi falls in one clear syllable; keep khrap light.",
        "Confirms that a fact or understanding is correct.",
      ),
      p(
        "phrase.no-worries",
        "ไม่เป็นไรครับ",
        "mâi-bpen-rai khrap",
        "No worries / it's okay",
        "Let mâi fall; keep mâi-bpen-rai flowing as one familiar chunk.",
        "Can answer thanks, apologies, or a small inconvenience.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "A relative apologizes for arriving five minutes late. Which light reply says it is okay?",
    dialogueQuestion: "What two small social moves does Nok make?",
    dialogueAnswer: "He confirms something and says no worries",
    culturalTitle: "No usually echoes the idea",
    culturalBody:
      "Thai often answers a yes/no question by repeating or negating its key verb. Châi confirms correctness; it is not the automatic answer to every question type.",
  },
  {
    id: "lesson.names-first",
    unitId: "unit.introductions",
    title: "Names at the family table",
    eyebrow: "Introduce yourself",
    objective:
      "Give your name and ask someone else's name in a natural short exchange.",
    icon: "UserRound",
    topic: "introductions",
    vocab: v(
      "vocab.name",
      "ชื่อ",
      "chʉ̂ʉ",
      "name / to be named",
      "Hold the vowel; the tone falls.",
      "Thai often uses chʉ̂ʉ directly without a separate verb 'to be'.",
      "noun / verb",
    ),
    phrases: [
      p(
        "phrase.my-name",
        "ผมชื่อนิคครับ",
        "phǒm chʉ̂ʉ Nick khrap",
        "My name is Nick",
        "Phǒm rises; chʉ̂ʉ falls and has a long vowel.",
        "Replace Nick with your name. Speakers who use chǎn or dì-chǎn may use that instead.",
      ),
      p(
        "phrase.your-name",
        "คุณชื่ออะไรครับ",
        "khun chʉ̂ʉ à-rai khrap",
        "What's your name?",
        "Keep à-rai light; the question does not need exaggerated English-style pitch.",
        "Polite with a new person; names or kin terms often replace pronouns later.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.pim"],
    conversationPrompt:
      "Pim asks khun chʉ̂ʉ à-rai kha? Answer with your name using khrap.",
    conversationAnswer: 0,
    conversationAudio: 1,
    dialogueQuestion: "What information do they exchange?",
    dialogueAnswer: "Their names",
    culturalTitle: "Names quickly replace pronouns",
    culturalBody:
      "Thai speakers often use names, nicknames, or family terms where English repeats I and you.",
  },
  {
    id: "lesson.where-you-fit",
    unitId: "unit.introductions",
    title: "Where you come from",
    eyebrow: "A useful two-sentence story",
    objective:
      "Say where you are from and explain your Thai family connection.",
    icon: "MapPin",
    topic: "introductions",
    vocab: v(
      "vocab.thai-person",
      "คนไทย",
      "khon thai",
      "Thai person",
      "Keep khon level and thai mid; do not stress either heavily.",
      "Nationality follows khon in this beginner-friendly pattern.",
      "noun",
    ),
    phrases: [
      p(
        "phrase.from-america",
        "มาจากอเมริกาครับ",
        "maa jàak à-mee-rí-gaa khrap",
        "I'm from America",
        "Maa is long; jàak is low and clipped.",
        "The subject is naturally omitted when context makes it obvious.",
      ),
      p(
        "phrase.wife-thai",
        "ภรรยาผมเป็นคนไทยครับ",
        "phan-rá-yaa phǒm bpen khon thai khrap",
        "My wife is Thai",
        "Keep phan-rá-yaa flowing; bpen begins with an unaspirated bp sound.",
        "Phan-rá-yaa is clear and respectful; fɛɛn is common and more casual for partner.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "A relative asks why you visit Thailand so often. Which sentence explains the family connection?",
    dialogueQuestion: "Why does Nok have a close connection to Thailand?",
    dialogueAnswer: "His wife is Thai",
    culturalTitle: "Subjects disappear when they are obvious",
    culturalBody:
      "Conversational Thai often omits I or you. The full forms here are helpful scaffolds, not words that must appear in every reply.",
  },
  {
    id: "lesson.what-and-where",
    unitId: "unit.question-tools",
    title: "What is this? Where is that?",
    eyebrow: "Question words you can point with",
    objective: "Ask what something is and find the restroom.",
    icon: "CircleHelp",
    topic: "questions",
    vocab: v(
      "vocab.what",
      "อะไร",
      "à-rai",
      "what",
      "The first syllable is low; keep the second light.",
      "Usually appears where the missing information would go, not automatically at the sentence start.",
      "question word",
    ),
    phrases: [
      p(
        "phrase.what-is-this",
        "นี่คืออะไรครับ",
        "nîi khʉʉ à-rai khrap",
        "What is this?",
        "Nîi falls; khʉʉ has a long level vowel.",
        "Useful while pointing at food, objects, or something on a screen.",
      ),
      p(
        "phrase.where-restroom",
        "ห้องน้ำอยู่ที่ไหนครับ",
        "hâawng-náam yùu thîi-nǎi khrap",
        "Where is the restroom?",
        "Hâawng falls; náam rises; nǎi rises.",
        "A direct, polite travel essential.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.pim"],
    conversationPrompt:
      "You are in a café and need the restroom. Which question should you ask?",
    dialogueQuestion: "What place is Nok trying to find?",
    dialogueAnswer: "The restroom",
    culturalTitle: "Question words stay near the gap",
    culturalBody:
      "Thai question words often sit where the answer belongs: the restroom is where? This becomes very useful for listening.",
  },
  {
    id: "lesson.ask-again",
    unitId: "unit.question-tools",
    title: "Ask again, then ask what it means",
    eyebrow: "Clarification tools",
    objective:
      "Ask for repetition and clarify the meaning of a word or comment.",
    icon: "RefreshCcw",
    topic: "questions",
    vocab: v(
      "vocab.how-much",
      "เท่าไหร่",
      "thâo-rài",
      "how much / how many",
      "Thâo falls; rài stays low.",
      "Price is often understood from context, so the short form can be enough.",
      "question phrase",
    ),
    phrases: [
      p(
        "phrase.say-again",
        "พูดอีกครั้งได้ไหมครับ",
        "phûut ìik khráng dâi mǎi khrap",
        "Could you say that again?",
        "Ìik is low; khráng is high; mǎi rises.",
        "Polite and useful when you heard sounds but did not catch the message.",
      ),
      p(
        "phrase.what-mean",
        "หมายถึงอะไรครับ",
        "mǎai-thʉ̌ng à-rai khrap",
        "What does that mean?",
        "Mǎai rises; thʉ̌ng also rises but stays compact.",
        "Ask this about a word, joke, or comment; point or repeat the unclear bit.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "You caught a new word but not its meaning. Which question asks for the meaning rather than just repetition?",
    dialogueQuestion: "What two clarification moves does Nok use?",
    dialogueAnswer: "He asks for repetition and then asks the meaning",
    culturalTitle: "Meaning before every word",
    culturalBody:
      "First identify the topic and intent. Ask for a repeat only when the missing detail matters; this keeps listening confident rather than brittle.",
  },
  {
    id: "lesson.restaurant-basics",
    unitId: "unit.restaurant",
    title: "Point, order, survive the spice",
    eyebrow: "Restaurant essentials",
    objective: "Order by pointing and answer the first spice-level question.",
    icon: "Soup",
    topic: "restaurant",
    vocab: v(
      "vocab.spicy",
      "เผ็ด",
      "phèt",
      "spicy",
      "Use a short vowel with a low, clipped ending.",
      "Mâi before phèt means not spicy.",
      "adjective",
      "speaker.pim",
    ),
    phrases: [
      p(
        "phrase.want-this",
        "เอาอันนี้ครับ",
        "ao an-née khrap",
        "I'll take this one, please",
        "Née has a clear high tone; point naturally as you say it.",
        "Perfect when a photo menu or food tray supplies the noun.",
      ),
      p(
        "phrase.not-spicy",
        "ไม่เผ็ดครับ",
        "mâi phèt khrap",
        "Not spicy, please",
        "Both mâi and phèt fall; keep phèt short.",
        "A clear preference, though kitchens may still contain chile residue.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "The server asks ao phèt mǎi kha? You want no spice. What do you say?",
    dialogueQuestion: "How does Nok want the dish prepared?",
    dialogueAnswer: "Not spicy",
    culturalTitle: "Pointing can be fluent communication",
    culturalBody:
      "Ao an-née plus a polite particle is natural when a picture menu does the noun work. Gesture and language can cooperate.",
  },
  {
    id: "lesson.restaurant-flavor",
    unitId: "unit.restaurant",
    title: "A little heat, then the bill",
    eyebrow: "Taste and payment",
    objective: "Request a little spice, react to the food, and close the meal.",
    icon: "Utensils",
    topic: "restaurant",
    vocab: v(
      "vocab.delicious",
      "อร่อย",
      "à-ròi",
      "delicious / tasty",
      "À is low; ròi is also low and should flow quickly.",
      "A very common reaction to food and a likely family question.",
      "adjective",
      "speaker.mae",
    ),
    phrases: [
      p(
        "phrase.little-spicy",
        "เอาเผ็ดนิดหน่อยครับ",
        "ao phèt nít-nòi khrap",
        "A little spicy, please",
        "Nít is high and clipped; nòi is low.",
        "Use when you want some heat, not the full local default.",
      ),
      p(
        "phrase.bill-please",
        "เช็คบิลด้วยครับ",
        "chék-bin dûai khrap",
        "The bill, please",
        "Dûai falls; the borrowed chék-bin is quick and familiar.",
        "Widely understood in restaurants; kep ngoen dûai is another natural option.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "You have finished eating and want to pay. Which phrase closes the meal?",
    dialogueQuestion: "What does Nok do after choosing a mild spice level?",
    dialogueAnswer: "He asks for the bill",
    culturalTitle: "A little can vary",
    culturalBody:
      "Nít-nòi means a little, but spice judgments differ. Pair the phrase with a friendly gesture and be ready to adjust next time.",
  },
  {
    id: "lesson.restaurant-needs",
    unitId: "unit.restaurant",
    title: "Food needs that matter",
    eyebrow: "Restrictions and allergies",
    objective:
      "State that you do not eat meat and clearly flag a peanut allergy.",
    icon: "ShieldAlert",
    topic: "restaurant",
    vocab: v(
      "vocab.allergy",
      "แพ้",
      "pháe",
      "to be allergic to",
      "Pháe has a high tone and a long vowel.",
      "Use for a real allergy, not merely a dislike.",
      "verb / health term",
      "speaker.pim",
    ),
    phrases: [
      p(
        "phrase.no-meat",
        "ไม่กินเนื้อสัตว์ครับ",
        "mâi kin nʉ́a-sàt khrap",
        "I don't eat meat",
        "Nʉ́a is high; sàt is low and clipped.",
        "Clearer for ordinary dietary communication than assuming one label covers every ingredient.",
      ),
      p(
        "phrase.peanut-allergy",
        "แพ้ถั่วลิสงครับ",
        "pháe thùa-lí-sǒng khrap",
        "I'm allergic to peanuts",
        "Start pháe high; lí is high and sǒng rises.",
        "Say this early and show a translated allergy card too for a severe allergy.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "A server is checking ingredients. You have a real peanut allergy. Which phrase is medically important to say clearly?",
    dialogueQuestion:
      "Which restriction is an allergy rather than a preference?",
    dialogueAnswer: "The peanut restriction",
    culturalTitle: "Allergy language is not a guarantee",
    culturalBody:
      "For a severe allergy, use this phrase plus a written allergy card and verify cross-contact. Gin jay can imply a stricter vegan-style practice and is not a universal allergy label.",
  },
  {
    id: "lesson.numbers-at-the-counter",
    unitId: "unit.shopping",
    title: "Three of these, one clear price",
    eyebrow: "Numbers and classifiers",
    objective: "Order a practical quantity and recognize a hundred-baht price.",
    icon: "BadgeDollarSign",
    topic: "shopping",
    vocab: v(
      "vocab.three",
      "สาม",
      "sǎam",
      "three",
      "Use a rising tone and a long vowel.",
      "Numbers usually come before a classifier in quantity phrases.",
      "number",
    ),
    phrases: [
      p(
        "phrase.three-items",
        "เอาอันนี้สามอันครับ",
        "ao an-née sǎam an khrap",
        "I'll take three of these",
        "Keep the first an light; let sǎam rise clearly.",
        "An is a general classifier useful when pointing at ordinary objects.",
      ),
      p(
        "phrase.hundred-baht",
        "หนึ่งร้อยบาทครับ",
        "nʉ̀ng-rɔ́ɔi bàat khrap",
        "One hundred baht",
        "Rɔ́ɔi is high and long; bàat is low and long.",
        "Prices often arrive without a full sentence, so recognize the number chunk.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.pim"],
    conversationPrompt:
      "You want three identical snacks from the display. Which phrase gives a quantity?",
    conversationAnswer: 0,
    dialogueQuestion: "How many items does Nok want?",
    dialogueAnswer: "Three",
    culturalTitle: "Classifiers only when they earn their keep",
    culturalBody:
      "Thai uses classifiers with counted nouns. Start with versatile an in pointing situations; learn specialized classifiers as real needs arise.",
  },
  {
    id: "lesson.shopping-options",
    unitId: "unit.shopping",
    title: "A bigger one and a card",
    eyebrow: "Sizes and payment",
    objective: "Ask for a larger size and whether a shop accepts cards.",
    icon: "CreditCard",
    topic: "shopping",
    vocab: v(
      "vocab.card",
      "บัตร",
      "bàt",
      "card",
      "Bàt is low and ends abruptly.",
      "Bàt can mean a card generally; context supplies credit, hotel, or ID card.",
      "noun",
      "speaker.pim",
    ),
    phrases: [
      p(
        "phrase.bigger-one",
        "มีใหญ่กว่านี้ไหมครับ",
        "mii yài kwàa née mǎi khrap",
        "Do you have a bigger one?",
        "Yài and kwàa are low; mǎi rises at the end.",
        "Useful for clothing, rooms, portions, or objects when context is visible.",
      ),
      p(
        "phrase.accept-card",
        "รับบัตรไหมครับ",
        "ráp bàt mǎi khrap",
        "Do you accept cards?",
        "Ráp is high and clipped; bàt is low; mǎi rises.",
        "Ask before a purchase at a small shop; cash remains useful.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.pim"],
    conversationPrompt:
      "You only have a credit card and want to check before buying. What do you ask?",
    dialogueQuestion: "What two shopping options does Nok check?",
    dialogueAnswer: "A larger size and card payment",
    culturalTitle: "Bargaining is contextual",
    culturalBody:
      "Markets may allow friendly negotiation, but fixed-price shops usually do not. Phɛɛng bpai (too expensive) can sound blunt without a smile and context.",
  },
  {
    id: "lesson.useful-numbers",
    unitId: "unit.shopping",
    title: "Five items, twenty baht",
    eyebrow: "More numbers you will hear",
    objective: "Recognize five, ten, and twenty inside quantities and prices.",
    icon: "ListOrdered",
    topic: "shopping",
    vocab: v(
      "vocab.ten",
      "สิบ",
      "sìp",
      "ten",
      "Sìp is low with a short, clipped ending.",
      "Combine it with another digit: yîi-sìp is twenty.",
      "number",
      "speaker.pim",
    ),
    phrases: [
      p(
        "phrase.five-items",
        "เอาห้าอันครับ",
        "ao hâa an khrap",
        "I'll take five",
        "Hâa falls and has a long vowel; keep an light.",
        "Use while pointing when the item is already obvious.",
      ),
      p(
        "phrase.twenty-baht",
        "ยี่สิบบาทค่ะ",
        "yîi-sìp bàat kha",
        "Twenty baht",
        "Yîi falls; sìp and bàat are low, with bàat held long.",
        "Listen for the complete number before assuming you heard sìp alone.",
        "polite",
        "speaker.pim",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.pim"],
    conversationPrompt:
      "The seller gives the price yîi-sìp bàat. Which amount did you hear?",
    dialogueQuestion: "What quantity and price appear in the exchange?",
    dialogueAnswer: "Five items and twenty baht",
    culturalTitle: "Learn numbers inside real chunks",
    culturalBody:
      "Course 1 anchors one, three, five, ten, twenty, and one hundred in purchases and travel time; expand the number system through review rather than one long list.",
  },
  {
    id: "lesson.driver-basics",
    unitId: "unit.getting-around",
    title: "Show the pin, stop here",
    eyebrow: "Taxi and ride-hailing",
    objective:
      "Show a destination and ask the driver to stop at the right place.",
    icon: "CarTaxiFront",
    topic: "transport",
    vocab: v(
      "vocab.here",
      "นี่",
      "nîi",
      "here / this",
      "Nîi has a falling tone and a long vowel.",
      "In phrases, trong née points to this exact spot.",
      "location word",
      "speaker.chai",
    ),
    phrases: [
      p(
        "phrase.go-here",
        "ไปที่นี่ครับ",
        "bpai thîi nîi khrap",
        "Please go here",
        "Bpai is level; thîi and nîi both fall.",
        "Say it while showing a map pin or address.",
      ),
      p(
        "phrase.stop-here",
        "จอดตรงนี้ได้ไหมครับ",
        "jàawt trong née dâi mǎi khrap",
        "Could you stop here?",
        "Jàawt is low and long; née is high; mǎi rises.",
        "A polite request when you recognize the destination.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "You recognize the hotel entrance from the car. Which request asks the driver to stop?",
    dialogueQuestion: "What does Nok want the driver to do at the destination?",
    dialogueAnswer: "Stop here",
    culturalTitle: "Maps solve pronunciation problems",
    culturalBody:
      "Show the pin and say bpai thîi nîi. Confirming visually is normal, especially when English spellings hide Thai pronunciation.",
  },
  {
    id: "lesson.directions-and-time",
    unitId: "unit.getting-around",
    title: "Turn left, how many minutes?",
    eyebrow: "Directions and travel time",
    objective: "Recognize a left turn and ask how long the trip takes.",
    icon: "Signpost",
    topic: "transport",
    vocab: v(
      "vocab.minute",
      "นาที",
      "naa-thii",
      "minute",
      "Both vowels are long; thii stays level.",
      "Numbers plus naa-thii give travel time.",
      "time noun",
      "speaker.chai",
    ),
    phrases: [
      p(
        "phrase.turn-left",
        "เลี้ยวซ้ายครับ",
        "líao sáai khrap",
        "Turn left, please",
        "Both líao and sáai use high tones and long vowels.",
        "Khwǎa means right; learn the pair by listening in real routes.",
      ),
      p(
        "phrase.how-many-minutes",
        "ใช้เวลากี่นาทีครับ",
        "chái wee-laa gìi naa-thii khrap",
        "How many minutes does it take?",
        "Chái is high; gìi is low; keep naa-thii even.",
        "Natural for taxis, airport transfers, boats, and queues.",
      ),
    ],
    dialogueSpeakers: ["speaker.chai", "speaker.nok"],
    conversationPrompt:
      "Traffic looks heavy and you need an arrival estimate. Which question asks for the travel time?",
    dialogueQuestion:
      "What information does Nok want after hearing a direction?",
    dialogueAnswer: "The travel time in minutes",
    culturalTitle: "Traffic changes the answer",
    culturalBody:
      "Bangkok travel estimates depend heavily on traffic. Listen for bpra-maan (about) before the number and treat it as an estimate.",
  },
  {
    id: "lesson.airport-and-train",
    unitId: "unit.getting-around",
    title: "The airport and the train time",
    eyebrow: "Bigger travel days",
    objective: "Name the airport destination and ask when a train leaves.",
    icon: "PlaneTakeoff",
    topic: "transport",
    vocab: v(
      "vocab.airport",
      "สนามบิน",
      "sà-nǎam-bin",
      "airport",
      "Sà is low; nǎam rises and is long; bin stays level.",
      "The airport name or map pin should accompany this word when a city has more than one.",
      "place noun",
      "speaker.chai",
    ),
    phrases: [
      p(
        "phrase.go-airport",
        "ไปสนามบินครับ",
        "bpai sà-nǎam-bin khrap",
        "To the airport, please",
        "Keep bpai level and sà-nǎam-bin rhythmic.",
        "Show the exact terminal or airport pin as you say it.",
      ),
      p(
        "phrase.train-what-time",
        "รถไฟออกกี่โมงครับ",
        "rót-fai àawk gìi moong khrap",
        "What time does the train leave?",
        "Rót is high and clipped; àawk is low; gìi is low.",
        "Useful at a station; confirm the platform and displayed time too.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "You found the train but still need its departure time. Which question asks when it leaves?",
    dialogueQuestion: "Which two transport situations appear?",
    dialogueAnswer: "An airport trip and a train departure",
    culturalTitle: "Show the exact transport name",
    culturalBody:
      "Bangkok has multiple airports and large stations. Pair the Thai phrase with the exact Thai place name, terminal, platform, or pin.",
  },
  {
    id: "lesson.hotel-arrival",
    unitId: "unit.hotel",
    title: "A room is waiting",
    eyebrow: "Hotel arrival",
    objective: "Say you have a reservation and ask how to use the Wi-Fi.",
    icon: "Hotel",
    topic: "hotel",
    vocab: v(
      "vocab.reservation",
      "จอง",
      "jɔɔng",
      "to reserve / book",
      "Jɔɔng is level with a long vowel.",
      "Jɔɔng wái emphasizes that the booking was made in advance.",
      "verb",
      "speaker.pim",
    ),
    phrases: [
      p(
        "phrase.booked-room",
        "ผมจองห้องไว้ครับ",
        "phǒm jɔɔng hâawng wái khrap",
        "I have a room booked",
        "Phǒm rises; hâawng falls; wái is high.",
        "Give the booking name immediately after this if needed.",
      ),
      p(
        "phrase.how-wifi",
        "ไวไฟใช้ยังไงครับ",
        "wai-fai chái yang-ngai khrap",
        "How do I use the Wi-Fi?",
        "Chái is high; yang-ngai flows as a familiar question chunk.",
        "Casual-polite and natural at a hotel or relative's home.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "The receptionist cannot find your room yet. Which sentence tells her you booked in advance?",
    conversationAnswer: 0,
    dialogueQuestion: "What two hotel needs does Nok mention?",
    dialogueAnswer: "His room booking and the Wi-Fi",
    culturalTitle: "Names and booking screens do the rest",
    culturalBody:
      "A short Thai opener plus the booking confirmation on your phone is efficient and polite; you do not need a long translated speech.",
  },
  {
    id: "lesson.hotel-problems",
    unitId: "unit.hotel",
    title: "The air-con is not cold",
    eyebrow: "Travel problems",
    objective: "Report a broken room feature and ask hotel staff for help.",
    icon: "Wrench",
    topic: "hotel",
    vocab: v(
      "vocab.broken",
      "เสีย",
      "sǐa",
      "broken / not working",
      "Sǐa has a rising tone and a long vowel.",
      "Useful for appliances, phones, cards, and vehicles when context is clear.",
      "adjective",
      "speaker.pim",
    ),
    phrases: [
      p(
        "phrase.ac-not-cold",
        "แอร์ไม่เย็นครับ",
        "ɛɛ mâi yen khrap",
        "The air conditioning isn't cold",
        "Hold ɛɛ; mâi falls; yen stays level.",
        "A natural complaint; Thai often describes the failed result rather than saying the machine is broken.",
      ),
      p(
        "phrase.help-please",
        "ช่วยหน่อยได้ไหมครับ",
        "chûai nòi dâi mǎi khrap",
        "Could you help me, please?",
        "Chûai falls; nòi is low; mǎi rises.",
        "Polite general help request, less urgent than chûai dûai!",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "Your room is hot because the air-con is running but not cooling. Which sentence reports that exact problem?",
    conversationAnswer: 0,
    dialogueQuestion: "Why does Nok ask for help?",
    dialogueAnswer: "The air conditioning is not cooling",
    culturalTitle: "Describe what is failing",
    culturalBody:
      "Specific symptoms such as mâi yen (not cold) or mâi tham-ngaan (not working) help staff solve the problem faster than a vague complaint.",
  },
  {
    id: "lesson.lost-item",
    unitId: "unit.hotel",
    title: "I cannot find my bag",
    eyebrow: "Lost-item details",
    objective: "Identify a missing bag and say where you may have left it.",
    icon: "BriefcaseBusiness",
    topic: "hotel",
    vocab: v(
      "vocab.bag",
      "กระเป๋า",
      "grà-bpǎo",
      "bag",
      "Grà is low; bpǎo rises.",
      "Can mean a bag, purse, or suitcase depending on context; point to a photo if possible.",
      "noun",
      "speaker.pim",
    ),
    phrases: [
      p(
        "phrase.cant-find-bag",
        "หากระเป๋าไม่เจอครับ",
        "hǎa grà-bpǎo mâi jəə khrap",
        "I can't find my bag",
        "Hǎa and bpǎo rise; mâi falls; jəə is long and level.",
        "Natural for a missing item when you are still searching, not necessarily reporting theft.",
      ),
      p(
        "phrase.left-in-room",
        "น่าจะลืมไว้ที่ห้องครับ",
        "nâa-jà lʉʉm wái thîi hâawng khrap",
        "I probably left it in the room",
        "Nâa and jà fall/low; lʉʉm is level and long; wái is high.",
        "Nâa-jà marks a reasonable guess rather than certainty.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "Staff asks where the missing bag may be. Which phrase says you probably left it in the room?",
    dialogueQuestion: "What is missing, and where may it be?",
    dialogueAnswer: "A bag that may be in the room",
    culturalTitle: "Missing is not automatically stolen",
    culturalBody:
      "Start with the observable problem and last known location. Use stronger theft language only when you have reason to report theft.",
  },
  {
    id: "lesson.family-food-check",
    unitId: "unit.family-chatter",
    title: "The Thai family food check",
    eyebrow: "Casual caring conversation",
    objective:
      "Understand and answer the caring question about whether you have eaten.",
    icon: "MessagesCircle",
    topic: "family",
    vocab: v(
      "vocab.eat",
      "กิน",
      "kin",
      "eat",
      "Use a short, level syllable.",
      "Extremely common in everyday family conversation.",
      "verb",
      "speaker.mae",
    ),
    phrases: [
      p(
        "phrase.eaten-yet",
        "กินข้าวหรือยังคะ",
        "kin khâao rʉ̌ʉ yang kha",
        "Have you eaten yet?",
        "Khâao falls; rʉ̌ʉ rises; keep the whole question conversational.",
        "Often a caring greeting, not a demand for a meal report.",
        "casual",
        "speaker.mae",
        "Eat rice or not yet?",
      ),
      p(
        "phrase.eaten-already",
        "กินแล้วครับ",
        "kin láew khrap",
        "I've eaten already",
        "Láew has a clear high tone; do not over-stress kin.",
        "A natural short answer; family may omit the polite particle.",
      ),
    ],
    dialogueSpeakers: ["speaker.mae", "speaker.nok"],
    conversationPrompt:
      "Mae Orn asks kin khâao rʉ̌ʉ yang kha? You ate on the plane. What is the concise answer?",
    dialogueQuestion: "Does Nok still need a meal?",
    dialogueAnswer: "No, he has eaten already",
    culturalTitle: "A question that also means I care",
    culturalBody:
      "Kin khâao rʉ̌ʉ yang? can be both a literal meal question and a warm family check-in.",
  },
  {
    id: "lesson.meet-the-family",
    unitId: "unit.family-chatter",
    title: "This is my wife",
    eyebrow: "Family relationships",
    objective: "Introduce your wife and ask how a parent is doing.",
    icon: "HeartHandshake",
    topic: "family",
    vocab: v(
      "vocab.wife",
      "ภรรยา",
      "phan-rá-yaa",
      "wife",
      "Keep the three syllables connected; the middle syllable is high.",
      "Clear and respectful; fɛɛn is a more casual partner term.",
      "family noun",
      "speaker.mae",
    ),
    phrases: [
      p(
        "phrase.this-my-wife",
        "นี่ภรรยาผมครับ",
        "nîi phan-rá-yaa phǒm khrap",
        "This is my wife",
        "Nîi falls; phǒm rises.",
        "Useful for introductions when the relationship is not already obvious.",
      ),
      p(
        "phrase.mom-well",
        "คุณแม่สบายดีไหมครับ",
        "khun-mɛ̂ɛ sà-baai dee mǎi khrap",
        "How is Mom doing?",
        "Mɛ̂ɛ falls and is long; mǎi rises.",
        "Khun-mɛ̂ɛ is respectful. Family-specific kin terms vary by relationship.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "You arrive without your mother-in-law and want to ask how she is. Which phrase is warm and respectful?",
    dialogueQuestion: "Who does Nok introduce and ask about?",
    dialogueAnswer: "His wife and Mom",
    culturalTitle: "Kin terms carry warmth and hierarchy",
    culturalBody:
      "Thai families use relationship terms as names and pronouns. Follow your wife's lead for the exact terms used in her family.",
  },
  {
    id: "lesson.family-small-talk",
    unitId: "unit.family-chatter",
    title: "Children and work",
    eyebrow: "The questions relatives ask",
    objective:
      "Say how many children you have and understand a common work question.",
    icon: "Users",
    topic: "family",
    vocab: v(
      "vocab.work",
      "ทำงาน",
      "tham-ngaan",
      "work / to work",
      "Tham is level; ngaan is long and level.",
      "The same chunk can mean the activity or the fact of having a job.",
      "verb / noun",
      "speaker.lek",
    ),
    phrases: [
      p(
        "phrase.two-children",
        "มีลูกสองคนครับ",
        "mii lûuk sǎawng khon khrap",
        "I have two children",
        "Lûuk falls and is long; sǎawng rises.",
        "Khon is the classifier for people.",
      ),
      p(
        "phrase.what-work",
        "ทำงานอะไรครับ",
        "tham-ngaan à-rai khrap",
        "What kind of work do you do?",
        "Keep tham-ngaan together; à-rai stays light.",
        "Common social small talk. A short field or job title is enough.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.lek"],
    conversationPrompt:
      "P' Lek is getting to know you and asks tham-ngaan à-rai khrap? What topic is he asking about?",
    dialogueQuestion: "Which two family small-talk topics come up?",
    dialogueAnswer: "Children and work",
    culturalTitle: "Personal questions can be friendly",
    culturalBody:
      "Age, family, and work may come up earlier than an English speaker expects. Context and tone usually make them social rather than intrusive.",
  },
  {
    id: "lesson.go-and-wait",
    unitId: "unit.everyday-actions",
    title: "Where are you going? Wait a moment",
    eyebrow: "Everyday motion",
    objective:
      "Recognize a casual where-are-you-going question and ask someone to wait briefly.",
    icon: "Footprints",
    topic: "activities",
    vocab: v(
      "vocab.go",
      "ไป",
      "bpai",
      "go",
      "Bpai is a level syllable with an unaspirated bp start.",
      "One of the highest-frequency verbs in ordinary plans and movement.",
      "verb",
      "speaker.chai",
    ),
    phrases: [
      p(
        "phrase.where-going",
        "จะไปไหนครับ",
        "jà bpai nǎi khrap",
        "Where are you going?",
        "Jà is low; nǎi rises.",
        "Casual everyday question; pronouns are normally omitted when obvious.",
      ),
      p(
        "phrase.wait-moment",
        "รอแป๊บหนึ่งครับ",
        "rɔɔ bpáep nʉ̀ng khrap",
        "Wait a moment, please",
        "Rɔɔ is long; bpáep is high and clipped.",
        "Bpáep nʉ̀ng is casual and means a short moment, not a precise duration.",
        "casual",
      ),
    ],
    dialogueSpeakers: ["speaker.chai", "speaker.nok"],
    conversationPrompt:
      "Your driver is ready but your wife is still coming downstairs. Which phrase asks for a brief wait?",
    dialogueQuestion: "What does Nok ask Chai to do before they go?",
    dialogueAnswer: "Wait a moment",
    culturalTitle: "Pronouns often take the day off",
    culturalBody:
      "Jà bpai nǎi? is complete in context. Natural Thai often omits both speaker and listener when everyone knows who is involved.",
  },
  {
    id: "lesson.what-doing",
    unitId: "unit.everyday-actions",
    title: "What are you doing? Watching TV",
    eyebrow: "Actions happening now",
    objective:
      "Ask what someone is doing and answer with an activity in progress.",
    icon: "Tv",
    topic: "activities",
    vocab: v(
      "vocab.watch",
      "ดู",
      "duu",
      "watch / look",
      "Duu is level with a long vowel.",
      "Context distinguishes watching, looking, and checking.",
      "verb",
      "speaker.mali",
    ),
    phrases: [
      p(
        "phrase.what-doing",
        "กำลังทำอะไรอยู่ครับ",
        "gam-lang tham à-rai yùu khrap",
        "What are you doing?",
        "Gam-lang stays level; yùu is low and long.",
        "Gam-lang ... yùu frames an action in progress, but casual speech may use only one marker.",
      ),
      p(
        "phrase.watching-tv",
        "กำลังดูทีวีครับ",
        "gam-lang duu thii-wii khrap",
        "I'm watching TV",
        "Keep duu long and level; thii-wii is an easy borrowed chunk.",
        "A full beginner answer; in context, duu thii-wii is often enough.",
      ),
    ],
    dialogueSpeakers: ["speaker.mali", "speaker.nok"],
    conversationPrompt:
      "Mali calls and asks gam-lang tham à-rai yùu kha? You are watching television. Which answer fits?",
    dialogueQuestion: "What is Nok doing when Mali calls?",
    dialogueAnswer: "Watching TV",
    culturalTitle: "One progressive marker may disappear",
    culturalBody:
      "Normal speech may shorten gam-lang ... yùu to one marker or none when the situation already shows the action.",
  },
  {
    id: "lesson.want-and-like",
    unitId: "unit.everyday-actions",
    title: "Want to eat, really like it",
    eyebrow: "Wants and preferences",
    objective: "Say what you want to eat and express a genuine like.",
    icon: "ThumbsUp",
    topic: "activities",
    vocab: v(
      "vocab.like",
      "ชอบ",
      "chɔ̂ɔp",
      "like",
      "Chɔ̂ɔp falls and has a long vowel.",
      "Mâi khɔ̂i chɔ̂ɔp softens dislike to 'don't really like'.",
      "verb",
      "speaker.mali",
    ),
    phrases: [
      p(
        "phrase.want-eat",
        "อยากกินข้าวครับ",
        "yàak kin khâao khrap",
        "I want to eat",
        "Yàak is low and long; khâao falls.",
        "Yàak plus a verb expresses wanting to do something.",
      ),
      p(
        "phrase.like-thai-food",
        "ชอบอาหารไทยมากครับ",
        "chɔ̂ɔp aa-hǎan thai mâak khrap",
        "I really like Thai food",
        "Chɔ̂ɔp and mâak fall; hǎan rises.",
        "Warm, safe family-table praise; be ready for the next serving.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "A relative asks whether you enjoy Thai food. Which phrase gives an enthusiastic but natural answer?",
    dialogueQuestion: "What does Nok want, and what cuisine does he like?",
    dialogueAnswer: "He wants to eat and likes Thai food",
    culturalTitle: "Likes invite follow-up questions",
    culturalBody:
      "A strong food compliment often prompts questions about favorite dishes and spice. That is useful conversational momentum.",
  },
  {
    id: "lesson.hungry-full-tired",
    unitId: "unit.feelings",
    title: "Hungry, full, and very tired",
    eyebrow: "Body check-ins",
    objective:
      "Understand three high-frequency physical states around meals and travel.",
    icon: "BatteryMedium",
    topic: "feelings",
    vocab: v(
      "vocab.hungry",
      "หิว",
      "hǐu",
      "hungry",
      "Hǐu rises in one compact syllable.",
      "Khâao may follow, but hǐu alone is normal in context.",
      "adjective / state",
      "speaker.mae",
    ),
    phrases: [
      p(
        "phrase.full-already",
        "อิ่มแล้วครับ",
        "ìm láew khrap",
        "I'm full now",
        "Ìm is low and short; láew is high.",
        "Polite and useful when family wants to keep feeding you.",
      ),
      p(
        "phrase.very-tired",
        "เหนื่อยมากครับ",
        "nʉ̀ai mâak khrap",
        "I'm very tired",
        "Nʉ̀ai is low; mâak falls and is long.",
        "Can describe physical fatigue or a long travel day.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "Auntie offers a fourth helping, but you cannot eat more. Which phrase says you are full?",
    conversationAnswer: 0,
    dialogueQuestion:
      "Which two states does Nok mention after dinner and a long flight?",
    dialogueAnswer: "He is full and very tired",
    culturalTitle: "Full is kinder than a flat no",
    culturalBody:
      "Ìm láew warmly explains why you are declining more food. A smile and khàawp-khun make the appreciation clear.",
  },
  {
    id: "lesson.fun-funny-hot",
    unitId: "unit.feelings",
    title: "Fun, funny, and definitely hot",
    eyebrow: "Easy reactions",
    objective: "React to a good time, a joke, and Thailand's weather.",
    icon: "Laugh",
    topic: "feelings",
    vocab: v(
      "vocab.hot",
      "ร้อน",
      "rɔ́ɔn",
      "hot",
      "Rɔ́ɔn is high with a long vowel.",
      "Describes weather, rooms, objects, and food temperature; phèt is spicy heat.",
      "adjective",
      "speaker.chai",
    ),
    phrases: [
      p(
        "phrase.very-fun",
        "สนุกมากครับ",
        "sà-nùk mâak khrap",
        "It's really fun",
        "Sà is low; nùk is low and clipped; mâak falls.",
        "Natural praise for an outing, activity, or party.",
      ),
      p(
        "phrase.that-funny",
        "อันนั้นตลกดีครับ",
        "an-nán dtà-lòk dee khrap",
        "That's pretty funny",
        "Nán is high; dtà-lòk has two low syllables.",
        "Friendly reaction. Tone and relationship decide whether teasing feels warm.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "P' Lek tells a harmless joke and waits for your reaction. Which phrase says you found it funny?",
    dialogueQuestion: "How does Nok feel about the outing and the joke?",
    dialogueAnswer: "He finds the outing fun and the joke funny",
    culturalTitle: "Hot is not spicy",
    culturalBody:
      "Rɔ́ɔn is temperature-hot; phèt is spicy. English uses one word where Thai keeps two everyday ideas separate.",
  },
  {
    id: "lesson.surprised-worried",
    unitId: "unit.feelings",
    title: "That startled me — don't worry",
    eyebrow: "Reassuring reactions",
    objective: "Recognize surprise and offer a simple reassurance.",
    icon: "CircleAlert",
    topic: "feelings",
    vocab: v(
      "vocab.worried",
      "กังวล",
      "gang-won",
      "worried",
      "Both syllables stay level and compact.",
      "Mâi dtâawng gang-won means there is no need to worry.",
      "adjective / state",
      "speaker.mali",
    ),
    phrases: [
      p(
        "phrase.startled",
        "ตกใจหมดเลยครับ",
        "dtòk-jai mòt loei khrap",
        "That really startled me",
        "Dtòk and mòt are low and clipped; loei stays level.",
        "Casual reaction after a surprise, sudden noise, or unexpected news.",
        "casual",
      ),
      p(
        "phrase.dont-worry",
        "ไม่ต้องกังวลนะครับ",
        "mâi dtâawng gang-won ná khrap",
        "Don't worry",
        "Mâi and dtâawng fall; ná is high and softens the reassurance.",
        "Supportive, not a command; tone should be calm.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.mali"],
    conversationPrompt:
      "Mali looks anxious about a small delay you can handle. Which phrase reassures her?",
    dialogueQuestion: "How does the exchange move emotionally?",
    dialogueAnswer: "From surprise to reassurance",
    culturalTitle: "Ná softens and connects",
    culturalBody:
      "The particle ná can make suggestions and reassurance sound warmer. Its exact effect comes from context and voice.",
  },
  {
    id: "lesson.good-bad-cold-bored",
    unitId: "unit.feelings",
    title: "Not good — cold and boring",
    eyebrow: "Less enthusiastic reactions",
    objective:
      "Recognize a negative evaluation, cold temperature, and boredom without sounding harsh.",
    icon: "CloudRain",
    topic: "feelings",
    vocab: v(
      "vocab.cold",
      "หนาว",
      "nǎao",
      "cold (weather or body)",
      "Nǎao rises and has a long vowel.",
      "Use yen for a cold object, drink, or air-con result; nǎao is feeling cold or cold weather.",
      "adjective",
      "speaker.mali",
    ),
    phrases: [
      p(
        "phrase.not-good",
        "ไม่ค่อยดีครับ",
        "mâi khɔ̂i dee khrap",
        "Not very good",
        "Mâi and khɔ̂i fall; dee stays level.",
        "Softer and more conversational than a blunt 'bad'.",
      ),
      p(
        "phrase.bit-boring",
        "น่าเบื่อนิดหน่อยครับ",
        "nâa-bʉ̀a nít-nòi khrap",
        "It's a little boring",
        "Nâa falls; bʉ̀a is low; nít is high and clipped.",
        "A softened opinion. With people or hosts, choose context and tone carefully.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "A friend privately asks what you thought of a slow movie. Which phrase gives a softened 'a little boring'?",
    dialogueQuestion: "Are Nok's reactions enthusiastic or negative?",
    dialogueAnswer: "Negative, but softened rather than blunt",
    culturalTitle: "Soften negative opinions",
    culturalBody:
      "Mâi khɔ̂i and nít-nòi reduce bluntness. Be especially careful when the topic is a person's food, home, family, or hospitality.",
  },
  {
    id: "lesson.today-tomorrow",
    unitId: "unit.plans",
    title: "Free today? Meet when?",
    eyebrow: "Make a simple plan",
    objective: "Ask whether someone is free and agree on a meeting time.",
    icon: "CalendarClock",
    topic: "plans",
    vocab: v(
      "vocab.tomorrow",
      "พรุ่งนี้",
      "phrûng-níi",
      "tomorrow",
      "Phrûng falls; níi is high.",
      "Wan-níi is today; phrûng-níi is tomorrow.",
      "time word",
      "speaker.mali",
    ),
    phrases: [
      p(
        "phrase.free-today",
        "วันนี้ว่างไหมครับ",
        "wan-níi wâang mǎi khrap",
        "Are you free today?",
        "Níi is high; wâang falls; mǎi rises.",
        "A natural invitation opener before suggesting the activity.",
      ),
      p(
        "phrase.meet-what-time",
        "เจอกันกี่โมงครับ",
        "jəə gan gìi moong khrap",
        "What time should we meet?",
        "Jəə is level and long; gìi is low; moong is level.",
        "Gìi moong asks clock time in a practical beginner chunk.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "Your family agreed to meet tomorrow but no one chose a time. What do you ask?",
    dialogueQuestion: "What two details are needed to make the plan?",
    dialogueAnswer: "Whether someone is free and the meeting time",
    culturalTitle: "Thai clock language has layers",
    culturalBody:
      "Everyday Thai time expressions vary by part of day. Start by recognizing the number and confirming the time on your phone when precision matters.",
  },
  {
    id: "lesson.invite-and-later",
    unitId: "unit.plans",
    title: "Eat together, see you later",
    eyebrow: "Invitations and goodbyes",
    objective: "Invite someone to eat and close the plan naturally.",
    icon: "CalendarPlus",
    topic: "plans",
    vocab: v(
      "vocab.later",
      "ทีหลัง",
      "thii-lǎng",
      "later / afterward",
      "Thii is level; lǎng rises.",
      "Dǐao can also mean in a little while and often starts a future plan.",
      "time expression",
      "speaker.mali",
    ),
    phrases: [
      p(
        "phrase.eat-together",
        "ไปกินข้าวกันไหมครับ",
        "bpai kin khâao gan mǎi khrap",
        "Want to go eat together?",
        "Khâao falls; mǎi rises; keep the invitation flowing.",
        "Very common invitation among family and friends.",
      ),
      p(
        "phrase.see-you-later",
        "เดี๋ยวเจอกันครับ",
        "dǐao jəə gan khrap",
        "See you in a bit / later",
        "Dǐao rises; jəə is long and level.",
        "Implies you expect to meet again soon; the exact time comes from context.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.mali"],
    conversationPrompt:
      "Mali accepts your lunch plan and you are splitting up briefly. Which phrase means you will meet again soon?",
    dialogueQuestion: "What plan do Nok and Mali make?",
    dialogueAnswer: "They will eat together and meet again shortly",
    culturalTitle: "Kin khâao is social glue",
    culturalBody:
      "Inviting someone to eat is a default way to spend time together. The phrase can be as much about connection as hunger.",
  },
  {
    id: "lesson.before-and-after",
    unitId: "unit.plans",
    title: "Morning, before food, after work",
    eyebrow: "Place plans in the day",
    objective:
      "Recognize morning and locate an activity before a meal or after work.",
    icon: "Sunrise",
    topic: "plans",
    vocab: v(
      "vocab.morning",
      "ตอนเช้า",
      "dtaawn-cháao",
      "in the morning",
      "Dtaawn is level and long; cháao is high and long.",
      "Dtaawn-yen is evening; these day-part chunks are more useful than forcing one clock system at first.",
      "time expression",
      "speaker.mali",
    ),
    phrases: [
      p(
        "phrase.before-eating",
        "ก่อนกินข้าวครับ",
        "gɔ̀ɔn kin khâao khrap",
        "Before eating",
        "Gɔ̀ɔn is low and long; khâao falls.",
        "Gɔ̀ɔn comes before the activity that serves as the time reference.",
      ),
      p(
        "phrase.after-work",
        "หลังเลิกงานครับ",
        "lǎng lə̂ək ngaan khrap",
        "After work",
        "Lǎng rises; lə̂ək falls; ngaan is long and level.",
        "A common way to place an evening plan without giving an exact clock time.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "Someone asks when you can meet on a workday. Which phrase places it after work?",
    dialogueQuestion: "What two relative times does Nok mention?",
    dialogueAnswer: "Before eating and after work",
    culturalTitle: "Relative time often beats exact time",
    culturalBody:
      "Plans may be anchored to meals, work, or day parts. Confirm an exact time separately when a flight, train, or appointment depends on it.",
  },
  {
    id: "lesson.fillers-and-agreement",
    unitId: "unit.casual-listening",
    title: "Oh, right — yes, yes",
    eyebrow: "Conversation glue",
    objective:
      "Recognize agreement sounds and short reactions without treating them as new topics.",
    icon: "AudioLines",
    topic: "listening",
    vocab: v(
      "vocab.yes",
      "ใช่",
      "châi",
      "yes / that's right",
      "Châi falls in one clear syllable.",
      "Often doubled as châi châi for quick enthusiastic agreement.",
      "response word",
      "speaker.mali",
    ),
    phrases: [
      p(
        "phrase.oh-understand",
        "อ๋อ เข้าใจแล้วครับ",
        "ɔ̌ɔ khâo-jai láew khrap",
        "Oh, I get it now",
        "Let ɔ̌ɔ rise and trail slightly; láew is high.",
        "A natural reaction when an explanation clicks.",
      ),
      p(
        "phrase.yes-yes",
        "ใช่ๆ ค่ะ",
        "châi châi kha",
        "Yes, exactly",
        "Both châi syllables fall but stay quick.",
        "Casual agreement from a kha speaker; a khrap speaker may say châi khrap.",
        "casual",
        "speaker.mali",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.mali"],
    conversationPrompt:
      "A relative clarifies which cousin is coming. It clicks. Which reaction shows you understand now?",
    conversationAnswer: 0,
    dialogueQuestion: "Are the speakers disagreeing or aligning?",
    dialogueAnswer: "They are understanding and agreeing",
    culturalTitle: "Small sounds carry the floor",
    culturalBody:
      "Agreement sounds show attention and keep the speaker going. You can follow the intent even when the surrounding details are fuzzy.",
  },
  {
    id: "lesson.omitted-words",
    unitId: "unit.casual-listening",
    title: "Shorter than the textbook",
    eyebrow: "Omitted familiar words",
    objective:
      "Understand a shortened food question and a natural uncertain response.",
    icon: "ScanEar",
    topic: "listening",
    vocab: v(
      "vocab.know",
      "รู้",
      "rúu",
      "know",
      "Rúu is high with a long vowel.",
      "Mâi rúu is the everyday 'don't know' chunk.",
      "verb",
      "speaker.lek",
    ),
    phrases: [
      p(
        "phrase.eaten-yet-casual",
        "กินหรือยัง",
        "kin rʉ̌ʉ yang",
        "Eaten yet?",
        "Rʉ̌ʉ rises; yang stays level and light.",
        "Casual reduction with obvious food context; relatives may omit khâao and particles.",
        "casual",
        "speaker.mae",
      ),
      p(
        "phrase.dont-know-either",
        "ไม่รู้เหมือนกันครับ",
        "mâi rúu mʉ̌an gan khrap",
        "I don't know either",
        "Mâi falls; rúu is high; mʉ̌an rises.",
        "A natural response when you share the uncertainty.",
      ),
    ],
    dialogueSpeakers: ["speaker.mae", "speaker.nok"],
    conversationPrompt:
      "Mae Orn shortens the familiar food question to kin rʉ̌ʉ yang. What overall intent should you recognize?",
    conversationAnswer: 0,
    conversationAudio: 0,
    dialogueQuestion: "Which familiar topic is shortened in the exchange?",
    dialogueAnswer: "Whether someone has eaten",
    culturalTitle: "Missing words are often recoverable",
    culturalBody:
      "Speakers omit predictable nouns, subjects, and particles. Listen for the surviving verb and time marker to recover the subject.",
  },
  {
    id: "lesson.topic-tracking",
    unitId: "unit.casual-listening",
    title: "Where have you been? Well…",
    eyebrow: "Follow the subject, not every syllable",
    objective:
      "Catch a common social question and a hesitant, softened answer.",
    icon: "Radar",
    topic: "listening",
    vocab: v(
      "vocab.really",
      "จริง",
      "jing",
      "true / really",
      "Jing is level and ends cleanly.",
      "Jing rɔ̌ɔ? is a common surprised 'really?'.",
      "adjective / reaction",
      "speaker.lek",
    ),
    phrases: [
      p(
        "phrase.where-been",
        "ไปไหนมา",
        "bpai nǎi maa",
        "Where have you been?",
        "Nǎi rises; maa is long and level.",
        "Casual social question; literally the movement frame is go where come.",
        "casual",
        "speaker.lek",
      ),
      p(
        "phrase.well-not-sure",
        "ก็...ไม่แน่ใจครับ",
        "gɔ̂ɔ... mâi nâe-jai khrap",
        "Well... I'm not sure",
        "Gɔ̂ɔ and mâi fall; pause naturally after gɔ̂ɔ.",
        "Gɔ̂ɔ can hold the floor and soften the start of an answer.",
        "casual",
      ),
    ],
    dialogueSpeakers: ["speaker.lek", "speaker.nok"],
    conversationPrompt:
      "You need a second to formulate an uncertain answer. Which phrase buys time without sounding abrupt?",
    dialogueQuestion: "What is the general shape of the exchange?",
    dialogueAnswer: "A social whereabouts question followed by uncertainty",
    culturalTitle: "Gɔ̂ɔ does conversational work",
    culturalBody:
      "Gɔ̂ɔ may sound like 'well', 'so', or a soft connector. Its job is often interactional rather than a single dictionary meaning.",
  },
  {
    id: "lesson.thai-compliment",
    unitId: "unit.friendly-talk",
    title: "Your Thai is good!",
    eyebrow: "Compliments without panic",
    objective:
      "Understand a language compliment and answer modestly but warmly.",
    icon: "MessageCircleHeart",
    topic: "social",
    vocab: v(
      "vocab.skilled",
      "เก่ง",
      "gèng",
      "skilled / good at",
      "Gèng is low and clipped.",
      "Compliments ability, not general moral goodness.",
      "adjective",
      "speaker.mae",
    ),
    phrases: [
      p(
        "phrase.thai-good",
        "พูดไทยเก่งจังค่ะ",
        "phûut thai gèng jang kha",
        "Your Thai is really good!",
        "Phûut falls; gèng is low; jang stays level.",
        "Warm compliment from a kha speaker; jang adds an impressed feeling.",
        "casual",
        "speaker.mae",
      ),
      p(
        "phrase.not-that-good",
        "ยังไม่เก่งขนาดนั้นครับ",
        "yang mâi gèng khà-nàat nán khrap",
        "I'm not that good yet",
        "Mâi falls; gèng is low; nán is high.",
        "Modest without rejecting the friendliness. A smile and thanks also work.",
      ),
    ],
    dialogueSpeakers: ["speaker.mae", "speaker.nok"],
    conversationPrompt:
      "Mae Orn praises your Thai. Which answer is modest but still keeps the exchange warm?",
    dialogueQuestion: "How does Nok respond to the compliment?",
    dialogueAnswer: "He modestly says he is not that good yet",
    culturalTitle: "Receive the connection, not just the evaluation",
    culturalBody:
      "A modest reply is common, but do not argue the compliment into the ground. Smile, thank the speaker, and keep talking.",
  },
  {
    id: "lesson.joking-really",
    unitId: "unit.friendly-talk",
    title: "Just kidding — really?",
    eyebrow: "Playful speech",
    objective: "Recognize a joke disclaimer and react with friendly surprise.",
    icon: "PartyPopper",
    topic: "social",
    vocab: v(
      "vocab.joke",
      "ล้อเล่น",
      "láaw-lên",
      "to joke / tease",
      "Láaw is high and long; lên falls.",
      "Can describe playful teasing; relationship and tone determine whether it is welcome.",
      "verb",
      "speaker.lek",
    ),
    phrases: [
      p(
        "phrase.just-kidding",
        "พูดเล่นนะ",
        "phûut lên ná",
        "Just kidding",
        "Phûut and lên fall; ná is high and soft.",
        "Casual/playful. Do not use it to excuse a genuinely hurtful comment.",
        "casual",
        "speaker.lek",
      ),
      p(
        "phrase.really-question",
        "จริงเหรอครับ",
        "jing rɔ̌ɔ khrap",
        "Really?",
        "Jing is level; rɔ̌ɔ rises and is slightly drawn out.",
        "Common surprised or interested reaction; voice conveys sincere versus playful intent.",
        "casual",
      ),
    ],
    dialogueSpeakers: ["speaker.lek", "speaker.nok"],
    conversationPrompt:
      "P' Lek makes an unlikely claim and smiles. Which short reaction means 'Really?'",
    dialogueQuestion:
      "What tells you the comment should not be taken literally?",
    dialogueAnswer: "P' Lek says he is only kidding",
    culturalTitle: "Playful is not universal permission",
    culturalBody:
      "Teasing depends on closeness, age, tone, and topic. Start by recognizing it; copy only the gentle patterns your own family uses comfortably.",
  },
  {
    id: "lesson.look-good",
    unitId: "unit.friendly-talk",
    title: "You look good today",
    eyebrow: "Friendly social warmth",
    objective: "Give a low-risk compliment and answer one naturally.",
    icon: "Sparkle",
    topic: "social",
    vocab: v(
      "vocab.look",
      "ดู",
      "duu",
      "look / seem",
      "Duu is level and long.",
      "Before an adjective, duu often means 'look/seem'.",
      "verb",
      "speaker.mali",
    ),
    phrases: [
      p(
        "phrase.look-good",
        "วันนี้ดูดีนะ",
        "wan-níi duu dee ná",
        "You look good today",
        "Níi and ná are high; duu and dee stay level.",
        "Friendly and broad; safer than commenting on weight or body changes.",
        "casual",
        "speaker.mali",
      ),
      p(
        "phrase.thanks-warm",
        "ขอบคุณนะครับ",
        "khàawp-khun ná khrap",
        "Thanks, that's kind of you",
        "Khàawp falls; ná is high and adds warmth.",
        "A warm response to a compliment from someone familiar.",
      ),
    ],
    dialogueSpeakers: ["speaker.mali", "speaker.nok"],
    conversationPrompt:
      "Mali says wan-níi duu dee ná. Which reply accepts the compliment warmly?",
    dialogueQuestion: "What social move does Mali make?",
    dialogueAnswer: "She gives Nok a friendly compliment",
    culturalTitle: "Choose low-risk compliments",
    culturalBody:
      "Compliments about style, ability, food, or a fun event are safer for a beginner than comments about bodies, age, skin, or money.",
  },
  {
    id: "lesson.lost-and-sick",
    unitId: "unit.emergencies",
    title: "Lost and feeling sick",
    eyebrow: "Problem essentials",
    objective: "Say you are lost or sick and state that you need a doctor.",
    icon: "Siren",
    topic: "emergency",
    vocab: v(
      "vocab.lost",
      "หลงทาง",
      "lǒng-thaang",
      "lost / lost the way",
      "Lǒng rises; thaang is long and level.",
      "Use for being geographically lost, not a lost object.",
      "state",
      "speaker.chai",
    ),
    phrases: [
      p(
        "phrase.feel-sick",
        "ไม่สบายครับ",
        "mâi sà-baai khrap",
        "I feel sick / unwell",
        "Mâi falls; sà is low; baai stays level and long.",
        "General unwellness. Add a specific symptom or show it when possible.",
      ),
      p(
        "phrase.need-doctor",
        "ต้องไปหาหมอครับ",
        "dtâawng bpai hǎa mɔ̌ɔ khrap",
        "I need to see a doctor",
        "Dtâawng falls; hǎa and mɔ̌ɔ rise.",
        "A natural way to say you need medical attention. For urgent danger, use local emergency services rather than relying only on a phrase.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "You feel seriously unwell and need medical care, not just rest. Which phrase makes that need explicit?",
    dialogueQuestion: "What kind of help does Nok need?",
    dialogueAnswer: "Medical help from a doctor",
    culturalTitle: "Short language plus clear evidence",
    culturalBody:
      "Show your hotel address, insurance details, medication list, or translated symptom card. In urgent situations, clarity beats perfect grammar.",
  },
  {
    id: "lesson.call-and-location",
    unitId: "unit.emergencies",
    title: "Call my wife; I am at the hotel",
    eyebrow: "Get a trusted person involved",
    objective:
      "Ask someone to call your wife and give a simple current location.",
    icon: "PhoneCall",
    topic: "emergency",
    vocab: v(
      "vocab.help",
      "ช่วย",
      "chûai",
      "help",
      "Chûai has a falling tone and a blended final sound.",
      "Chûai dûai! is urgent; chûai nòi dâi mǎi is a calmer request.",
      "verb / call for help",
      "speaker.pim",
    ),
    phrases: [
      p(
        "phrase.call-wife",
        "ช่วยโทรหาภรรยาผมให้หน่อยครับ",
        "chûai thoo hǎa phan-rá-yaa phǒm hâi nòi khrap",
        "Please call my wife for me",
        "Thoo is level and long; hǎa rises; hâi falls.",
        "Show the contact on your phone as you ask.",
      ),
      p(
        "phrase.at-hotel",
        "ตอนนี้อยู่ที่โรงแรมครับ",
        "dtaawn-níi yùu thîi roong-rɛɛm khrap",
        "I'm at the hotel now",
        "Níi is high; yùu and thîi fall; roong-rɛɛm stays level.",
        "Replace roong-rɛɛm with a landmark or show the address pin.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "You need a trusted Thai speaker involved. Which request asks someone to phone your wife?",
    conversationAnswer: 0,
    dialogueQuestion: "Who should be called, and where is Nok?",
    dialogueAnswer: "His wife should be called; he is at the hotel",
    culturalTitle: "A contact card is part of the language plan",
    culturalBody:
      "Keep your wife's Thai contact name, your lodging address in Thai, and key medical details available offline.",
  },
  {
    id: "lesson.urgent-help",
    unitId: "unit.emergencies",
    title: "Help now; where is the hospital?",
    eyebrow: "Urgent location language",
    objective: "Call for urgent help and ask for the nearest hospital.",
    icon: "Hospital",
    topic: "emergency",
    vocab: v(
      "vocab.hurt",
      "เจ็บ",
      "jèp",
      "hurt / painful",
      "Jèp is low with a short vowel and clipped ending.",
      "Point to the body area or add the body-part word if known.",
      "state / adjective",
      "speaker.pim",
    ),
    phrases: [
      p(
        "phrase.help-urgent",
        "ช่วยด้วยครับ",
        "chûai dûai khrap",
        "Help!",
        "Both chûai and dûai fall; project clearly without stretching khrap.",
        "Urgent. For a routine request use the calmer chûai nòi dâi mǎi.",
        "polite",
      ),
      p(
        "phrase.where-hospital",
        "โรงพยาบาลอยู่ที่ไหนครับ",
        "roong-pha-yaa-baan yùu thîi-nǎi khrap",
        "Where is the hospital?",
        "Keep roong-pha-yaa-baan rhythmic; nǎi rises.",
        "Use with a map and ask for the nearest appropriate facility when possible.",
      ),
    ],
    dialogueSpeakers: ["speaker.nok", "speaker.nok"],
    conversationPrompt:
      "Someone is injured and you need urgent assistance. Which short call clearly means help now?",
    conversationAnswer: 0,
    dialogueQuestion: "What urgent place is Nok trying to reach?",
    dialogueAnswer: "A hospital",
    culturalTitle: "Emergency phrases are backups",
    culturalBody:
      "These phrases support—not replace—emergency numbers, travel insurance assistance, location sharing, and help from a trusted Thai speaker.",
  },
];

const unitSpecs = [
  [
    "unit.warm-welcome",
    1,
    "Core survival phrases",
    "Greet people, thank them, and repair a conversation.",
    "coral",
  ],
  [
    "unit.introductions",
    2,
    "Introduce yourself",
    "Share your name, origin, and Thai family connection.",
    "teal",
  ],
  [
    "unit.question-tools",
    3,
    "Questions that unlock Thai",
    "Ask what, where, meaning, repetition, and price.",
    "sun",
  ],
  [
    "unit.restaurant",
    4,
    "Food and restaurants",
    "Order, manage spice, discuss needs, and pay.",
    "coral",
  ],
  [
    "unit.shopping",
    5,
    "Numbers, money, and shopping",
    "Handle useful quantities, sizes, prices, and payment.",
    "teal",
  ],
  [
    "unit.getting-around",
    6,
    "Getting around",
    "Work with drivers, directions, landmarks, and travel time.",
    "sun",
  ],
  [
    "unit.hotel",
    7,
    "Hotels and travel problems",
    "Check in, connect, and explain a room problem.",
    "coral",
  ],
  [
    "unit.family-chatter",
    8,
    "Family conversations",
    "Handle caring questions and family small talk.",
    "teal",
  ],
  [
    "unit.everyday-actions",
    9,
    "Everyday activities",
    "Talk about going, waiting, watching, wanting, and liking.",
    "sun",
  ],
  [
    "unit.feelings",
    10,
    "Feelings and reactions",
    "React to food, travel, weather, jokes, and surprises.",
    "coral",
  ],
  [
    "unit.plans",
    11,
    "Making plans",
    "Invite people, choose a time, and reconnect later.",
    "teal",
  ],
  [
    "unit.casual-listening",
    12,
    "Listening to casual speech",
    "Track fillers, omissions, agreement, and overall intent.",
    "sun",
  ],
  [
    "unit.friendly-talk",
    13,
    "Friendly informal conversation",
    "Receive compliments, tease carefully, and respond warmly.",
    "coral",
  ],
  [
    "unit.emergencies",
    14,
    "Problems and emergencies",
    "Get medical help, involve family, and share a location.",
    "teal",
  ],
] as const;

const sections: CourseInput["sections"] = [
  {
    id: "section.first-conversations",
    number: 1,
    title: "First conversations",
    description:
      "Survive the opening moments and ask for the information you need.",
    unitIds: unitSpecs.slice(0, 4).map(([id]) => id),
  },
  {
    id: "section.thailand-days",
    number: 2,
    title: "Thailand days",
    description:
      "Move through shops, roads, hotels, and family homes with less friction.",
    unitIds: unitSpecs.slice(4, 8).map(([id]) => id),
  },
  {
    id: "section.everyday-connection",
    number: 3,
    title: "Everyday connection",
    description:
      "Talk about daily life, reactions, and plans instead of isolated phrases.",
    unitIds: unitSpecs.slice(8, 11).map(([id]) => id),
  },
  {
    id: "section.natural-listening",
    number: 4,
    title: "Natural listening and confidence",
    description:
      "Follow casual speech, join friendly banter, and handle urgent needs.",
    unitIds: unitSpecs.slice(11).map(([id]) => id),
  },
];

const unitNumberById = new Map<string, number>(
  unitSpecs.map(([id, number]) => [id, number]),
);

const itemDifficulty = (unitId: string) =>
  Math.min(5, 1 + Math.floor(((unitNumberById.get(unitId) ?? 1) - 1) / 3));

const audioIdFor = (itemId: string) =>
  `audio.${itemId.replace(/^(phrase|vocab)\./u, (kind) =>
    kind === "vocab." ? "vocab-" : "",
  )}`;
const shortId = (id: string) => id.replace(/^(lesson|phrase|vocab)\./u, "");

const itemSeeds = lessonSeeds.flatMap((seed) => [seed.vocab, ...seed.phrases]);

const speakerById = new Map(speakers.map((speaker) => [speaker.id, speaker]));

const dialogueTurnsFor = (seed: LessonSeed) =>
  seed.phrases.map((item, index) => {
    const speakerId = seed.dialogueSpeakers[index];
    const speaker = speakerById.get(speakerId);
    if (!speaker) throw new Error(`Unknown dialogue speaker ${speakerId}`);
    const question = item.meaning.trim().endsWith("?");
    let thai = item.thai;
    let romanization = item.romanization;
    if (speaker.defaultPoliteParticle === "kha" && thai.endsWith("ครับ")) {
      thai = `${thai.slice(0, -4)}${question ? "คะ" : "ค่ะ"}`;
      romanization = romanization.replace(/ khrap$/u, " kha");
    } else if (
      speaker.defaultPoliteParticle === "khrap" &&
      /(?:ค่ะ|คะ)$/u.test(thai)
    ) {
      thai = thai.replace(/(?:ค่ะ|คะ)$/u, "ครับ");
      romanization = romanization.replace(/ kha$/u, " khrap");
    }
    return {
      speakerId,
      phraseId:
        thai === item.thai && romanization === item.romanization
          ? item.id
          : undefined,
      thai,
      romanization,
      meaning: item.meaning,
      audioRef: `audio.dialogue.${shortId(seed.id)}.turn-${index + 1}`,
    };
  });

const dialogueTurnSeeds = new Map(
  lessonSeeds.map((seed) => [seed.id, dialogueTurnsFor(seed)]),
);

const audioAssets: CourseInput["audioAssets"] = [
  ...itemSeeds.map((item) => ({
    id: audioIdFor(item.id),
    speakerId: item.speakerId,
    src: `tts:${item.thai}`,
    slowSrc: `tts-slow:${item.thai}`,
    fallbackText: item.thai,
    transcriptThai: item.thai,
    romanization: item.romanization,
    kind: "tts-placeholder" as const,
  })),
  ...lessonSeeds.flatMap((seed) => {
    const turns = dialogueTurnSeeds.get(seed.id) ?? [];
    const dialogueSlug = shortId(seed.id);
    return [
      ...turns.map((turn) => ({
        id: turn.audioRef,
        speakerId: turn.speakerId,
        src: `tts:${turn.thai}`,
        slowSrc: `tts-slow:${turn.thai}`,
        fallbackText: turn.thai,
        transcriptThai: turn.thai,
        romanization: turn.romanization,
        kind: "tts-placeholder" as const,
      })),
      {
        id: `audio.dialogue.${dialogueSlug}`,
        speakerId: "speaker.ensemble",
        src: `tts:${turns.map(({ thai }) => thai).join(" ")}`,
        slowSrc: `tts-slow:${turns.map(({ thai }) => thai).join(" ")}`,
        fallbackText: turns.map(({ thai }) => thai).join(" "),
        transcriptThai: turns.map(({ thai }) => thai).join(" "),
        romanization: turns.map(({ romanization }) => romanization).join(" · "),
        kind: "tts-placeholder" as const,
      },
    ];
  }),
];

const vocabulary: CourseInput["vocabulary"] = lessonSeeds.map((seed) => ({
  id: seed.vocab.id,
  thai: seed.vocab.thai,
  romanization: seed.vocab.romanization,
  meaning: seed.vocab.meaning,
  literalMeaning: seed.vocab.literalMeaning,
  audioRef: audioIdFor(seed.vocab.id),
  politenessContext: seed.vocab.politenessContext,
  toneGuidance: seed.vocab.toneGuidance,
  formality: seed.vocab.formality,
  usageNotes: seed.vocab.usageNotes,
  tags: [seed.topic, "vocabulary"],
  topics: [seed.topic],
  difficulty: itemDifficulty(seed.unitId),
  reviewPriority: seed.topic === "emergency" ? 1.5 : 1,
  partOfSpeech: seed.vocab.partOfSpeech,
}));

const phrases: CourseInput["phrases"] = lessonSeeds.flatMap((seed) =>
  seed.phrases.map((item) => ({
    id: item.id,
    thai: item.thai,
    romanization: item.romanization,
    meaning: item.meaning,
    literalMeaning: item.literalMeaning,
    audioRef: audioIdFor(item.id),
    speakerGender:
      speakers.find(({ id }) => id === item.speakerId)?.gender ?? "neutral",
    politenessContext: item.politenessContext,
    toneGuidance: item.toneGuidance,
    formality: item.formality,
    usageNotes: item.usageNotes,
    tags: [seed.topic, item.formality],
    topics: [seed.topic],
    difficulty: itemDifficulty(seed.unitId),
    reviewPriority: seed.topic === "emergency" ? 1.5 : 1,
    acceptedRomanizations: [],
    vocabularyIds: item.thai.includes(seed.vocab.thai) ? [seed.vocab.id] : [],
    grammarNoteIds:
      item.formality === "polite"
        ? ["grammar.polite-particles"]
        : ["grammar.context-omission"],
    culturalNoteIds: [`culture.${seed.id.replace("lesson.", "")}`],
  })),
);

const dialogues: CourseInput["dialogues"] = lessonSeeds.map((seed) => ({
  id: `dialogue.${seed.id.replace("lesson.", "")}`,
  title: seed.title,
  context: seed.objective,
  turns: dialogueTurnSeeds.get(seed.id) ?? [],
  difficulty: itemDifficulty(seed.unitId),
  tags: [seed.topic, "dialogue"],
  formality: seed.phrases.some(({ formality }) => formality === "casual")
    ? "casual"
    : "polite",
  usageNotes: seed.culturalBody,
  comprehensionQuestions: [
    {
      id: `question.${seed.id.replace("lesson.", "")}`,
      prompt: seed.dialogueQuestion,
      correctAnswer: seed.dialogueAnswer,
      explanation: `Listen for ${seed.phrases[0].romanization} and ${seed.phrases[1].romanization}; together they show: ${seed.dialogueAnswer}.`,
    },
  ],
}));

const feedback = (answer: string, pronunciation?: string) => ({
  correct: "Exactly — that fits the situation naturally.",
  incorrect: `The useful answer here is ${answer}.`,
  pronunciation,
});

const exercise = (value: ExerciseInput) => value;

const meaningDistractors = (correct: string) =>
  [
    "Where is the restroom?",
    "I am very tired",
    "The bill, please",
    "See you later",
  ]
    .filter((value) => value !== correct)
    .slice(0, 2);

const choiceFor = (item: ItemSeed, suffix: string) => ({
  id: suffix,
  label: item.romanization,
  romanization: item.romanization,
  meaning: item.meaning,
  thai: item.thai,
});

function buildExercises(seed: LessonSeed, reviewItem?: ItemSeed) {
  const [first, second] = seed.phrases;
  const contentSlug = shortId(seed.id);
  const lessonSlug =
    {
      "lesson.first-hellos": "hello",
      "lesson.restaurant-basics": "food",
      "lesson.family-food-check": "family",
    }[seed.id] ?? shortId(seed.id);
  const review = reviewItem ?? second;
  const fallback = p(
    `phrase.fallback-${lessonSlug}`,
    "ไม่รู้ครับ",
    "mâi rúu khrap",
    "I don't know",
    "Mâi falls; rúu is high and long.",
    "A neutral distractor in this authored exercise only.",
  );
  const conversationDistractor =
    review.id === first.id || review.id === second.id ? fallback : review;
  const conversationAnswerIndex = seed.conversationAnswer ?? 1;
  const conversationResponse = seed.phrases[conversationAnswerIndex];
  const conversationOther = seed.phrases[conversationAnswerIndex === 0 ? 1 : 0];
  const conversationCueIndex =
    seed.conversationAudio ??
    (conversationAnswerIndex === 1 ? (0 as const) : undefined);
  const conversationCue =
    conversationCueIndex === undefined
      ? undefined
      : seed.phrases[conversationCueIndex];
  const [wrongMeaningOne, wrongMeaningTwo] = meaningDistractors(
    seed.vocab.meaning,
  );
  const dialogueCorrect = `${first.meaning}; ${second.meaning}`;
  const personalizedTopics = new Set([
    "introductions",
    "restaurant",
    "transport",
    "hotel",
    "family",
    "social",
  ]);
  const meaningExerciseType = personalizedTopics.has(seed.topic)
    ? "personalized-translation"
    : "english-to-phrase";
  const firstTokens = first.romanization.split(" ");
  const missingCorrect = firstTokens[0];
  const missingOptions = Array.from(
    new Set([
      missingCorrect,
      second.romanization.split(" ")[0],
      seed.vocab.romanization,
      "khrap",
      "mǎi",
    ]),
  ).slice(0, 3);
  const repairMeaning = /[.!?]$/.test(second.meaning)
    ? second.meaning
    : `${second.meaning}.`;

  return [
    exercise({
      id: `ex.${lessonSlug}.listen-meaning`,
      type: "listen-meaning",
      instruction: "Listen to the new sound first",
      prompt: `What does ${seed.vocab.romanization} mean here?`,
      audioRef: audioIdFor(seed.vocab.id),
      speakerId: seed.vocab.speakerId,
      choices: [
        { id: "correct", label: seed.vocab.meaning },
        { id: "distractor-one", label: wrongMeaningOne },
        { id: "distractor-two", label: wrongMeaningTwo },
      ],
      correctAnswer: "correct",
      inlineHint: seed.vocab.usageNotes,
      explanation: seed.vocab.usageNotes,
      difficulty: Math.max(1, itemDifficulty(seed.unitId) - 1),
      tags: [seed.topic, "listening", "recognition"],
      sourceItemIds: [seed.vocab.id],
      feedback: feedback(seed.vocab.romanization, seed.vocab.toneGuidance),
      accessibilityLabel: `Listen to ${seed.vocab.romanization} and choose its English meaning`,
      estimatedSeconds: 24,
    }),
    exercise({
      id: `ex.${lessonSlug}.listen-phrase`,
      type: "listen-phrase",
      instruction: "Catch the complete phrase",
      prompt: "Which Romanized Thai matches the audio?",
      audioRef: audioIdFor(first.id),
      speakerId: first.speakerId,
      choices: [
        choiceFor(first, "correct"),
        choiceFor(second, "distractor-one"),
        choiceFor(conversationDistractor, "distractor-two"),
      ],
      correctAnswer: "correct",
      explanation: first.usageNotes,
      difficulty: itemDifficulty(seed.unitId),
      tags: [seed.topic, "listening", "romanization"],
      sourceItemIds: [first.id],
      feedback: feedback(first.romanization, first.toneGuidance),
      accessibilityLabel: `Listen and select the Romanized phrase for ${first.meaning}`,
      estimatedSeconds: 25,
    }),
    exercise({
      id: `ex.${lessonSlug}.meaning-recall`,
      type: meaningExerciseType,
      instruction: "Choose what you would actually say",
      prompt: second.meaning,
      context: seed.objective,
      choices: [
        choiceFor(second, "correct"),
        choiceFor(first, "distractor-one"),
        choiceFor(conversationDistractor, "distractor-two"),
      ],
      correctAnswer: "correct",
      explanation: second.usageNotes,
      difficulty: itemDifficulty(seed.unitId),
      tags: [seed.topic, "meaning", "retrieval"],
      sourceItemIds: [second.id],
      feedback: feedback(second.romanization, second.toneGuidance),
      accessibilityLabel: `Choose the Thai phrase meaning ${second.meaning}`,
      estimatedSeconds: 27,
    }),
    exercise({
      id: `ex.${lessonSlug}.missing-word`,
      type: "missing-word",
      instruction: "Retrieve the missing sound chunk",
      prompt: `${first.meaning}: ___ ${firstTokens.slice(1).join(" ")}`,
      romanization: `___ ${firstTokens.slice(1).join(" ")}`,
      choices: missingOptions.map((label, index) => ({
        id: index === 0 ? "correct" : `distractor-${index}`,
        label,
      })),
      correctAnswer: "correct",
      explanation: `The phrase begins with ${missingCorrect}. ${first.usageNotes}`,
      difficulty: itemDifficulty(seed.unitId),
      tags: [seed.topic, "missing-word", "retrieval"],
      sourceItemIds: [first.id],
      feedback: feedback(missingCorrect, first.toneGuidance),
      accessibilityLabel: `Choose the first missing sound chunk in ${first.meaning}`,
      estimatedSeconds: 26,
    }),
    exercise({
      id: `ex.${lessonSlug}.phrase-order`,
      type: "phrase-order",
      instruction: "Build the phrase from sound chunks",
      prompt: first.meaning,
      tokens: first.romanization.split(" "),
      correctAnswer: first.romanization.split(" "),
      explanation: `Thai puts these familiar chunks in this spoken order. ${first.usageNotes}`,
      difficulty: Math.min(5, itemDifficulty(seed.unitId) + 1),
      tags: [seed.topic, "construction", "retrieval"],
      sourceItemIds: [first.id],
      feedback: feedback(first.romanization, first.toneGuidance),
      accessibilityLabel: `Order Romanized chunks to say ${first.meaning}`,
      estimatedSeconds: 30,
    }),
    exercise({
      id: `ex.${lessonSlug}.matching`,
      type: "matching-pairs",
      instruction: reviewItem
        ? "Match two new ideas and one returning phrase"
        : "Match the three new ideas",
      prompt: "Connect each sound to its practical meaning.",
      pairs: [
        {
          id: "vocabulary",
          left: seed.vocab.romanization,
          right: seed.vocab.meaning,
        },
        { id: "new-phrase", left: first.romanization, right: first.meaning },
        { id: "review", left: review.romanization, right: review.meaning },
      ],
      correctAnswer: ["vocabulary", "new-phrase", "review"],
      explanation: reviewItem
        ? "The returning phrase keeps earlier Thai active while the new pieces settle in."
        : "These are the lesson's three small building blocks.",
      difficulty: itemDifficulty(seed.unitId),
      tags: [seed.topic, "matching", "interleaved-review"],
      sourceItemIds: [seed.vocab.id, first.id, review.id],
      feedback: feedback("all three sound-meaning pairs"),
      accessibilityLabel: "Match Romanized Thai with three English meanings",
      estimatedSeconds: 35,
    }),
    exercise({
      id: `ex.${lessonSlug}.conversation`,
      type: "conversation-response",
      instruction: "Keep the real exchange moving",
      prompt: seed.conversationPrompt,
      context: seed.objective,
      audioRef: conversationCue ? audioIdFor(conversationCue.id) : undefined,
      speakerId: conversationCue?.speakerId,
      choices: [
        choiceFor(conversationResponse, "correct"),
        choiceFor(conversationOther, "distractor-one"),
        choiceFor(conversationDistractor, "distractor-two"),
      ],
      correctAnswer: "correct",
      explanation: `${conversationResponse.usageNotes} ${seed.culturalBody}`,
      difficulty: Math.min(5, itemDifficulty(seed.unitId) + 1),
      tags: [seed.topic, "conversation", "response"],
      sourceItemIds: [first.id, second.id],
      feedback: feedback(
        conversationResponse.romanization,
        conversationResponse.toneGuidance,
      ),
      accessibilityLabel: `Choose a natural conversation response: ${conversationResponse.meaning}`,
      estimatedSeconds: 32,
    }),
    exercise({
      id: `ex.${lessonSlug}.dialogue`,
      type: "dialogue-comprehension",
      instruction: "Follow the exchange at normal speed",
      prompt: seed.dialogueQuestion,
      dialogueId: `dialogue.${contentSlug}`,
      audioRef: `audio.dialogue.${contentSlug}`,
      choices: [
        { id: "correct", label: seed.dialogueAnswer },
        { id: "distractor-one", label: `Only: ${wrongMeaningOne}` },
        { id: "distractor-two", label: `Only: ${wrongMeaningTwo}` },
      ],
      correctAnswer: "correct",
      explanation: `The key ideas are ${dialogueCorrect}. You only need the overall intent on this pass.`,
      difficulty: Math.min(5, itemDifficulty(seed.unitId) + 1),
      tags: [seed.topic, "dialogue", "gist-listening"],
      sourceItemIds: [first.id, second.id],
      feedback: feedback(seed.dialogueAnswer),
      accessibilityLabel: `Listen to the ${seed.title} dialogue and identify its overall intent`,
      estimatedSeconds: 40,
    }),
    exercise({
      id: `ex.${lessonSlug}.mistake-correction`,
      type: "mistake-correction",
      instruction: "Correct the situation, not just the words",
      prompt: `The situation calls for “${repairMeaning}” Which phrase repairs the mix-up?`,
      context: seed.objective,
      choices: [
        choiceFor(second, "correct"),
        choiceFor(first, "distractor-one"),
        choiceFor(conversationDistractor, "distractor-two"),
      ],
      correctAnswer: "correct",
      explanation: `${second.usageNotes} The other choices serve different intentions.`,
      difficulty: Math.min(5, itemDifficulty(seed.unitId) + 1),
      tags: [seed.topic, "mistake-correction", "retrieval"],
      sourceItemIds: [second.id],
      feedback: feedback(second.romanization, second.toneGuidance),
      accessibilityLabel: `Correct the phrase choice for ${second.meaning}`,
      estimatedSeconds: 28,
    }),
    exercise({
      id: `ex.${lessonSlug}.speaking`,
      type: "speaking-practice",
      instruction: "Say the useful line, then self-check",
      prompt: second.meaning,
      thai: second.thai,
      romanization: second.romanization,
      meaning: second.meaning,
      audioRef: audioIdFor(second.id),
      speakerId: second.speakerId,
      correctAnswer: "confident",
      acceptedAnswers: [second.thai, second.romanization],
      explanation:
        "Clear, relaxed speech beats over-enunciation. Replay the normal model after the slow one.",
      difficulty: Math.max(3, itemDifficulty(seed.unitId)),
      tags: [seed.topic, "speaking", "retrieval"],
      sourceItemIds: [second.id],
      feedback: feedback(second.romanization, second.toneGuidance),
      accessibilityLabel: `Practice saying ${second.meaning} and self-assess`,
      estimatedSeconds: 38,
    }),
  ];
}

const skillIdForUnit = (unitId: string) =>
  `skill.${unitId.replace("unit.", "")}`;

const skills: CourseInput["skills"] = unitSpecs.map(([unitId, , title]) => ({
  id: skillIdForUnit(unitId),
  title,
  description:
    unitSpecs.find(([id]) => id === unitId)?.[3] ?? "Practical spoken Thai",
  itemIds: lessonSeeds
    .filter((seed) => seed.unitId === unitId)
    .flatMap((seed) => [seed.vocab.id, ...seed.phrases.map(({ id }) => id)]),
  tags: [unitId.replace("unit.", "")],
}));

type CheckpointPlan = {
  id: string;
  lessonId: string;
  title: string;
  unlocksUnitIds: string[];
};

const checkpointPlanByUnit = new Map<string, CheckpointPlan>([
  [
    "unit.warm-welcome",
    {
      id: "checkpoint.welcome",
      lessonId: "lesson.welcome-checkpoint",
      title: "Warm welcome checkpoint",
      unlocksUnitIds: [
        "unit.introductions",
        "unit.question-tools",
        "unit.restaurant",
      ],
    },
  ],
  [
    "unit.restaurant",
    {
      id: "checkpoint.travel-basics",
      lessonId: "lesson.travel-basics-checkpoint",
      title: "First travel conversations checkpoint",
      unlocksUnitIds: [
        "unit.shopping",
        "unit.getting-around",
        "unit.hotel",
        "unit.family-chatter",
      ],
    },
  ],
  [
    "unit.family-chatter",
    {
      id: "checkpoint.family",
      lessonId: "lesson.family-checkpoint",
      title: "Thailand day and family checkpoint",
      unlocksUnitIds: ["unit.everyday-actions", "unit.feelings", "unit.plans"],
    },
  ],
  [
    "unit.plans",
    {
      id: "checkpoint.everyday",
      lessonId: "lesson.everyday-checkpoint",
      title: "Everyday conversation checkpoint",
      unlocksUnitIds: [
        "unit.casual-listening",
        "unit.friendly-talk",
        "unit.emergencies",
      ],
    },
  ],
  [
    "unit.emergencies",
    {
      id: "checkpoint.course-one",
      lessonId: "lesson.course-one-checkpoint",
      title: "Conversational Thai course checkpoint",
      unlocksUnitIds: [],
    },
  ],
]);

const prerequisiteCheckpointByUnit = new Map<string, string>([
  ["unit.introductions", "checkpoint.welcome"],
  ["unit.question-tools", "checkpoint.welcome"],
  ["unit.restaurant", "checkpoint.welcome"],
  ["unit.shopping", "checkpoint.travel-basics"],
  ["unit.getting-around", "checkpoint.travel-basics"],
  ["unit.hotel", "checkpoint.travel-basics"],
  ["unit.family-chatter", "checkpoint.travel-basics"],
  ["unit.everyday-actions", "checkpoint.family"],
  ["unit.feelings", "checkpoint.family"],
  ["unit.plans", "checkpoint.family"],
  ["unit.casual-listening", "checkpoint.everyday"],
  ["unit.friendly-talk", "checkpoint.everyday"],
  ["unit.emergencies", "checkpoint.everyday"],
]);

const lessonList: CourseInput["lessons"] = [];
const checkpointRecords: CourseInput["checkpoints"] = [];
const unitNodes = new Map<string, CourseInput["units"][number]["nodes"]>();
let previousLessonId: string | undefined;
let previousReviewItem: ItemSeed | undefined;
let checkpointScope: CourseInput["lessons"] = [];

function buildCheckpointLesson(
  unitId: string,
  plan: CheckpointPlan,
  sourceLessons: CourseInput["lessons"],
  prerequisiteLessonId: string,
) {
  const types = [
    "listen-meaning",
    "listen-phrase",
    "english-to-phrase",
    "phrase-order",
    "matching-pairs",
    "conversation-response",
    "dialogue-comprehension",
    "speaking-practice",
  ] as const;
  const sourceExercises = sourceLessons.flatMap((lesson) => lesson.exercises);
  const exercises = types.map((type, index) => {
    const candidates = sourceExercises.filter(
      (candidate) => candidate.type === type,
    );
    const source = candidates[index % candidates.length];
    if (!source) throw new Error(`Missing ${type} source for ${plan.id}`);
    return {
      ...source,
      id: `ex.${shortId(plan.lessonId)}.${index + 1}`,
      instruction: `Checkpoint · ${source.instruction}`,
      prompt: `${index + 1}. ${source.prompt}`,
      difficulty: Math.max(3, source.difficulty),
      tags: Array.from(new Set([...source.tags, "checkpoint"])),
    } satisfies ExerciseInput;
  });
  const skillIds = Array.from(
    new Set(sourceLessons.flatMap((lesson) => lesson.skillIds)),
  );
  return {
    id: plan.lessonId,
    unitId,
    kind: "checkpoint" as const,
    title: plan.title,
    eyebrow: "Checkpoint",
    description:
      "Mix listening, meaning, construction, conversation, and speaking without introducing new material.",
    icon: "Trophy",
    completionXp: 8,
    estimatedMinutes: 5,
    skillIds,
    prerequisiteLessonIds: [prerequisiteLessonId],
    introducedItemIds: [],
    exercises,
    tags: ["checkpoint", "retrieval", unitId.replace("unit.", "")],
  } satisfies CourseInput["lessons"][number];
}

for (const [unitId] of unitSpecs) {
  const nodes: CourseInput["units"][number]["nodes"] = [];
  const seeds = lessonSeeds.filter((seed) => seed.unitId === unitId);
  for (const seed of seeds) {
    const lesson: CourseInput["lessons"][number] = {
      id: seed.id,
      unitId: seed.unitId,
      kind: "lesson",
      title: seed.title,
      eyebrow: seed.eyebrow,
      description: seed.objective,
      icon: seed.icon,
      completionXp: 6,
      estimatedMinutes: 5,
      skillIds: [skillIdForUnit(seed.unitId)],
      prerequisiteLessonIds: previousLessonId ? [previousLessonId] : [],
      introducedItemIds: [
        seed.vocab.id,
        seed.phrases[0].id,
        seed.phrases[1].id,
      ],
      exercises: buildExercises(seed, previousReviewItem),
      tags: [seed.topic, "listening-first", "conversation"],
    };
    lessonList.push(lesson);
    checkpointScope.push(lesson);
    nodes.push({
      id: `node.${shortId(seed.id)}`,
      type: "lesson",
      title: seed.title,
      lessonId: seed.id,
    });
    previousLessonId = seed.id;
    previousReviewItem = seed.phrases[1];
  }

  nodes.push({
    id: `node.${unitId.replace("unit.", "")}-review`,
    type: "review",
    title: `${unitSpecs.find(([id]) => id === unitId)?.[2]} smart review`,
  });

  const checkpointPlan = checkpointPlanByUnit.get(unitId);
  if (checkpointPlan && previousLessonId) {
    const checkpointLesson = buildCheckpointLesson(
      unitId,
      checkpointPlan,
      checkpointScope,
      previousLessonId,
    );
    lessonList.push(checkpointLesson);
    nodes.push({
      id:
        checkpointPlan.id === "checkpoint.welcome"
          ? "node.welcome-checkpoint"
          : `node.${shortId(checkpointPlan.lessonId)}`,
      type: "checkpoint",
      title: checkpointPlan.title,
      lessonId: checkpointPlan.lessonId,
    });
    checkpointRecords.push({
      id: checkpointPlan.id,
      title: checkpointPlan.title,
      lessonId: checkpointPlan.lessonId,
      passingAccuracy: 80,
      unlocksUnitIds: checkpointPlan.unlocksUnitIds,
    });
    previousLessonId = checkpointPlan.lessonId;
    checkpointScope = [];
  }
  unitNodes.set(unitId, nodes);
}

const sectionIdForUnit = (unitNumber: number) =>
  unitNumber <= 4
    ? "section.first-conversations"
    : unitNumber <= 8
      ? "section.thailand-days"
      : unitNumber <= 11
        ? "section.everyday-connection"
        : "section.natural-listening";

const units: CourseInput["units"] = unitSpecs.map(
  ([id, number, title, description, color]) => ({
    id,
    sectionId: sectionIdForUnit(number),
    number,
    title,
    description,
    color,
    skillIds: [skillIdForUnit(id)],
    prerequisiteCheckpointIds: prerequisiteCheckpointByUnit.has(id)
      ? [prerequisiteCheckpointByUnit.get(id)!]
      : [],
    nodes: unitNodes.get(id) ?? [],
  }),
);

const culturalNotes: CourseInput["culturalNotes"] = lessonSeeds.map((seed) => ({
  id: `culture.${shortId(seed.id)}`,
  title: seed.culturalTitle,
  body: seed.culturalBody,
  relatedItemIds: seed.phrases.map(({ id }) => id),
}));

const grammarNotes: CourseInput["grammarNotes"] = [
  {
    id: "grammar.polite-particles",
    title: "Polite endings belong to the speaker",
    summary:
      "Speakers commonly finish polite statements with khrap or kha according to their own speech style. The particle does not copy the listener.",
    examples: ["phrase.hello-khrap", "phrase.hello-kha"],
  },
  {
    id: "grammar.context-omission",
    title: "Context carries omitted words",
    summary:
      "Natural Thai often omits subjects, objects, nouns, or particles that both speakers can recover from the situation.",
    examples: ["phrase.eaten-yet-casual", "phrase.where-been"],
  },
];

const hints: CourseInput["hints"] = [
  {
    id: "hint.listen-for-anchor",
    text: "Listen for one anchor word first; the overall intent matters more than perfect transcription.",
    penaltyXp: 1,
  },
];

const achievements: CourseInput["achievements"] = [
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
    title: "Conversation unlocked",
    description: "Pass a first checkpoint.",
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
  {
    id: "achievement.course-one",
    title: "Thailand conversation ready",
    description: "Pass all five course checkpoints.",
    icon: "BadgeCheck",
    criteria: { kind: "checkpoint-count", threshold: 5 },
  },
];

export const rawCourse = {
  schemaVersion: 1,
  id: "course.spoken-thai-starter",
  title: "Conversational Thai",
  description:
    "A listening-first course for useful Thai with family, restaurants, travel, everyday conversation, and emergencies.",
  sourceLanguage: "th",
  learnerLanguage: "en",
  sections,
  units,
  skills,
  lessons: lessonList,
  vocabulary,
  phrases,
  dialogues,
  speakers,
  audioAssets,
  hints,
  grammarNotes,
  culturalNotes,
  checkpoints: checkpointRecords,
  achievements,
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

export const courseContentStats = {
  units: course.units.length,
  lessons: course.lessons.filter(({ kind }) => kind === "lesson").length,
  checkpoints: course.checkpoints.length,
  exercises: course.lessons.reduce(
    (total, lesson) => total + lesson.exercises.length,
    0,
  ),
  vocabulary: course.vocabulary.length,
  phrases: course.phrases.length,
  dialogues: course.dialogues.length,
  audioAssets: course.audioAssets.length,
};
