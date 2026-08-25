import type { Settings } from "@/domain/schemas";

export function withPreferredParticle(text: string, preference: Settings["politeParticle"]): string {
  if (preference === "both") return text;
  const thai = preference === "khráp" ? "ครับ" : "ค่ะ";
  const romanized = preference === "khráp" ? "khráp" : "khâ";
  return text
    .replaceAll("ครับ/ค่ะ", thai)
    .replaceAll("คะ/ครับ", thai)
    .replaceAll("khráp/khâ", romanized)
    .replaceAll("khá/khráp", romanized);
}
