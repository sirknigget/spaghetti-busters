import { ENTROPY } from "#root/src/game/debris/debris-settings.ts";

export function debrisRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += ENTROPY.increment;

    let n = state;

    n = Math.imul(n ^ (n >>> ENTROPY.firstShift), n | 1);
    n ^= n + Math.imul(n ^ (n >>> ENTROPY.secondShift), n | ENTROPY.multiplier);

    return ((n ^ (n >>> ENTROPY.finalShift)) >>> 0) / ENTROPY.normalizer;
  };
}
