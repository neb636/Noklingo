export function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function deterministicShuffle<T>(items: readonly T[], seed: string): T[] {
  const output = [...items];
  let state = stableHash(seed) || 1;
  for (let index = output.length - 1; index > 0; index -= 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const swap = (state >>> 0) % (index + 1);
    [output[index], output[swap]] = [output[swap], output[index]];
  }
  return output;
}
