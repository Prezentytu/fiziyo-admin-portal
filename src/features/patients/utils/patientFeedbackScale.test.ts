import { describe, expect, it } from 'vitest';

import { calculateTherapyStatus, generateHeatmapData } from '@/lib/therapyStatus';

import {
  formatFeedbackLevel,
  isDiscomfortPain,
  isHardDifficulty,
  mapDifficultyToFeeling,
} from './patientFeedbackScale';

describe('patient feedback scale (mobile 1–5)', () => {
  it.each([
    { level: 0, expected: false },
    { level: 3, expected: false },
    { level: 4, expected: true },
    { level: 5, expected: true },
  ])('treats pain $level of 5 as discomfort: $expected', ({ level, expected }) => {
    expect(isDiscomfortPain(level)).toBe(expected);
  });

  it.each([
    { level: 1, expected: 'hard' },
    { level: 2, expected: 'hard' },
    { level: 3, expected: 'ok' },
    { level: 4, expected: 'easy' },
    { level: 5, expected: 'easy' },
    { level: 0, expected: null },
  ])('reads difficulty $level the way the app labels it', ({ level, expected }) => {
    expect(mapDifficultyToFeeling(level)).toBe(expected);
    expect(isHardDifficulty(level)).toBe(expected === 'hard');
  });

  it('formats levels against the five-point scale', () => {
    expect(formatFeedbackLevel(5)).toBe('5/5');
    expect(formatFeedbackLevel(0)).toBeNull();
  });
});

describe('therapy status with the highest pain from the app', () => {
  it('raises discomfort instead of "W normie" for pain 5 of 5', () => {
    const now = new Date();
    const today = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const assignments = [{ id: 'assignment-1', status: 'active', startDate: today }];
    const progress = [
      {
        id: 'p1',
        status: 'completed',
        completedAt: today,
        painLevel: 5,
        difficultyLevel: 1,
        patientNotes: 'Dzisiaj mocno to bolało i musiałem skończyć wcześniej',
      },
    ];

    const status = calculateTherapyStatus(progress, assignments);
    const todayCell = generateHeatmapData(progress, assignments).find(
      (day) => day.dateStr === new Date(today).toDateString()
    );

    expect(status.reason).toBe('discomfort');
    expect(status.tone).not.toBe('positive');
    expect(status.nextStep).not.toMatch(/pozytywny feedback/i);
    expect(todayCell?.wellbeing).toBe('discomfort');
    expect(todayCell?.feeling).toBe('hard');
  });
});

describe('hard sessions in therapy status', () => {
  it('counts one training with three hard exercises as one hard training, not three', () => {
    const today = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const progress = ['a', 'b', 'c'].map((id) => ({ id, status: 'completed', completedAt: today, difficultyLevel: 1 }));

    const status = calculateTherapyStatus(progress, [{ id: 'assignment-1', status: 'active', startDate: today }]);

    expect(status.reason).not.toBe('high_difficulty');
  });
});
