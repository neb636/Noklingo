import { describe, expect, it } from "vitest";
import { matchEnglishPhrase, matchThaiPhrase, normalizeEnglish, normalizeThai, paddedClipRange, type TranscriptSegment } from "../src/domain/pronunciation";

const segment = (text: string, start = 1, end = 2): TranscriptSegment => ({
  text,
  start,
  end,
  words: [{ text, start, end, probability: 0.98 }],
});

describe("Thai pronunciation matching", () => {
  it("normalizes Thai spacing and punctuation", () => {
    expect(normalizeThai("ไป กินข้าว กันมั้ย؟")).toBe("ไปกินข้าวกันมั้ย");
  });

  it("normalizes English capitalization, spacing, and punctuation", () => {
    expect(normalizeEnglish("  Can I have a hug? ")).toBe("canihaveahug");
  });

  it("matches an English meaning across timestamped words", () => {
    const result = matchEnglishPhrase("I miss you so much", [{
      text: "คิดถึงจัง I miss you so much", start: 1, end: 3, words: [
        { text: "คิดถึงจัง", start: 1, end: 1.5, probability: 0.98 },
        { text: " I", start: 1.5, end: 1.7, probability: 0.99 },
        { text: " miss", start: 1.7, end: 2, probability: 0.99 },
        { text: " you", start: 2, end: 2.2, probability: 0.99 },
        { text: " so", start: 2.2, end: 2.4, probability: 0.99 },
        { text: " much", start: 2.4, end: 2.8, probability: 0.99 },
      ],
    }]);
    expect(result.status).toBe("matched");
    expect(result.start).toBe(1.5);
    expect(result.end).toBe(2.8);
  });

  it("uses timestamped transcript units for an exact Thai phrase", () => {
    const result = matchThaiPhrase("ร้อนจัง", [
      { text: "วันนี้ร้อนจังเลย", start: 4, end: 6, words: [
        { text: "วันนี้", start: 4, end: 4.5, probability: 0.95 },
        { text: "ร้อนจัง", start: 4.5, end: 5.2, probability: 0.99 },
        { text: "เลย", start: 5.2, end: 6, probability: 0.95 },
      ] },
    ]);
    expect(result.status).toBe("matched");
    expect(result.start).toBe(4.5);
    expect(result.end).toBe(5.2);
    expect(result.transcriptMatch).toBe("ร้อนจัง");
  });

  it("does not guess between repeated equally likely phrases", () => {
    const result = matchThaiPhrase("ไป", [segment("ไป", 1, 1.4), segment("ไป", 3, 3.4)]);
    expect(result.status).toBe("ambiguous");
    expect(result.candidates).toHaveLength(2);
  });

  it("reports an unmatched phrase without creating a candidate", () => {
    const result = matchThaiPhrase("ขอบคุณ", [segment("สวัสดี")]);
    expect(result.status).toBe("unmatched");
  });

  it("adds natural padding while clamping to source duration", () => {
    expect(paddedClipRange(0.05, 0.2, 1)).toEqual({ start: 0, end: 0.45 });
    expect(paddedClipRange(1, 8, 10)).toBeUndefined();
  });
});
