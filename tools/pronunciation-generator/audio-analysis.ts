import { readFileSync } from "node:fs";
import type { EnergyFrame } from "../../src/domain/pronunciation-boundaries";

type WavData = { samples: Int16Array; sampleRate: number };

export function readMonoPcm16Wav(path: string): WavData {
  const buffer = readFileSync(path);
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") throw new Error(`Unsupported WAV file: ${path}`);
  let offset = 12; let sampleRate = 0; let channels = 0; let bitsPerSample = 0; let format = 0; let data: Buffer | undefined;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4); const length = buffer.readUInt32LE(offset + 4); const body = offset + 8;
    if (id === "fmt ") { format = buffer.readUInt16LE(body); channels = buffer.readUInt16LE(body + 2); sampleRate = buffer.readUInt32LE(body + 4); bitsPerSample = buffer.readUInt16LE(body + 14); }
    else if (id === "data") data = buffer.subarray(body, body + length);
    offset = body + length + (length % 2);
  }
  if (format !== 1 || channels !== 1 || bitsPerSample !== 16 || !sampleRate || !data) throw new Error(`Expected mono PCM16 WAV: ${path}`);
  return { samples: new Int16Array(data.buffer, data.byteOffset, Math.floor(data.byteLength / 2)), sampleRate };
}

export function energyFrames(path: string, frameDurationMs: number): EnergyFrame[] {
  const { samples, sampleRate } = readMonoPcm16Wav(path); const frameSamples = Math.max(1, Math.round(sampleRate * frameDurationMs / 1000)); const frames: EnergyFrame[] = [];
  for (let offset = 0; offset < samples.length; offset += frameSamples) {
    const end = Math.min(samples.length, offset + frameSamples); let squares = 0;
    for (let index = offset; index < end; index += 1) { const normalized = samples[index] / 32768; squares += normalized * normalized; }
    const rms = Math.sqrt(squares / Math.max(1, end - offset)); frames.push({ start: offset / sampleRate, end: end / sampleRate, db: 20 * Math.log10(Math.max(rms, 1e-6)) });
  }
  return frames;
}

export function wavDuration(path: string): number {
  const { samples, sampleRate } = readMonoPcm16Wav(path);
  return samples.length / sampleRate;
}

export function waveformPeaks(path: string, bucketCount = 1200): number[] {
  const { samples } = readMonoPcm16Wav(path); const bucketSize = Math.max(1, Math.ceil(samples.length / bucketCount)); const peaks: number[] = [];
  for (let offset = 0; offset < samples.length; offset += bucketSize) {
    let peak = 0;
    for (let index = offset; index < Math.min(samples.length, offset + bucketSize); index += 1) peak = Math.max(peak, Math.abs(samples[index] / 32768));
    peaks.push(Number(peak.toFixed(4)));
  }
  return peaks;
}
