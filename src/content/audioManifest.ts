import { course } from "@/src/content/course";
import { AudioManifestEntrySchema } from "@/src/domain/schemas";
import type { AudioManifestEntry } from "@/src/domain/types";

const speakerById = new Map(
  course.speakers.map((speaker) => [speaker.id, speaker]),
);
const dialogueById = new Map(
  course.dialogues.map((dialogue) => [dialogue.id, dialogue]),
);

const lessonIdsForAudio = (audioAssetId: string) =>
  course.lessons
    .filter((lesson) =>
      lesson.exercises.some((exercise) => {
        if (exercise.audioRef === audioAssetId) return true;
        const dialogue = exercise.dialogueId
          ? dialogueById.get(exercise.dialogueId)
          : undefined;
        return dialogue?.turns.some((turn) => turn.audioRef === audioAssetId);
      }),
    )
    .map(({ id }) => id);

const emotionalToneFor = (lessonIds: string[]) => {
  if (lessonIds.some((id) => id.includes("urgent") || id.includes("sick")))
    return "calm, clear, and urgent without theatrical shouting";
  if (lessonIds.some((id) => id.includes("joking") || id.includes("fun")))
    return "warm and lightly playful";
  return "warm, attentive, and naturally conversational";
};

const recordingNoteFor = (speed: "normal" | "slow") =>
  speed === "normal"
    ? "Record as connected everyday speech; keep natural reductions and particles."
    : "Record a learner-practice take with clearer syllable boundaries while preserving tones, vowel length, and connected speech.";

export const audioManifest: AudioManifestEntry[] = course.audioAssets.flatMap(
  (asset) => {
    const speaker = speakerById.get(asset.speakerId);
    if (!speaker) throw new Error(`Unknown audio speaker ${asset.speakerId}`);
    const lessonIds = lessonIdsForAudio(asset.id);
    const assetSlug = asset.id.replace("audio.", "");
    const speakerSlug = speaker.id.replace("speaker.", "");
    return (["normal", "slow"] as const).map((deliverySpeed) =>
      AudioManifestEntrySchema.parse({
        id: `recording.${assetSlug}.${deliverySpeed}`,
        audioAssetId: asset.id,
        thaiText: asset.transcriptThai,
        romanization: asset.romanization,
        speakerDescription: `${speaker.name} — ${speaker.description}`,
        gender: speaker.gender,
        deliverySpeed,
        emotionalTone: emotionalToneFor(lessonIds),
        context: `Used in ${lessonIds
          .map(
            (lessonId) =>
              course.lessons.find(({ id }) => id === lessonId)?.title ??
              lessonId,
          )
          .join(", ")}`,
        suggestedFilename: `/audio/${speakerSlug}/${assetSlug}--${deliverySpeed}.mp3`,
        lessonIds,
        recordingStatus:
          asset.kind === "bundled" ? "recorded" : "needs-recording",
        recordingNotes: recordingNoteFor(deliverySpeed),
      }),
    );
  },
);

export const missingAudioRecordings = audioManifest.filter(
  ({ recordingStatus }) => recordingStatus === "needs-recording",
);
