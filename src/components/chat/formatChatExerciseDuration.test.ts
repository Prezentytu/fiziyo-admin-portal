import { describe, expect, it } from 'vitest';

import { formatChatExerciseDuration } from './formatChatExerciseDuration';

describe('formatChatExerciseDuration', () => {
  it('treats a 30-second hold as seconds, not minutes', () => {
    expect(formatChatExerciseDuration('30')).toBe('30 sekund');
  });

  it('formats a 60-second rest in minutes', () => {
    expect(formatChatExerciseDuration('60')).toBe('1 minuta');
  });

  it('keeps non-numeric HTML values unchanged', () => {
    expect(formatChatExerciseDuration('ok. 5')).toBe('ok. 5');
  });
});
