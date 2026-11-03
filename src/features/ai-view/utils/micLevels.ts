/** Loudness of the microphone for the dictation wave: one bar per animation tick, newest on the right. */

export const WAVE_BARS = 96;
const SILENCE_FLOOR = 0.04;

/** Root mean square of 8-bit PCM samples centred on 128, scaled so speech fills most of the bar. */
export function rmsLevel(samples: ArrayLike<number>): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let index = 0; index < samples.length; index++) {
    const centred = (samples[index] - 128) / 128;
    sum += centred * centred;
  }
  return Math.min(1, Math.sqrt(sum / samples.length) * 4);
}

/** Shifts the wave left by one bar; silence still shows a short tick, as in Claude. */
export function pushLevel(levels: readonly number[], level: number, size = WAVE_BARS): number[] {
  const next = [...levels, Math.max(SILENCE_FLOOR, Math.min(1, level))];
  return next.length > size ? next.slice(next.length - size) : next;
}
