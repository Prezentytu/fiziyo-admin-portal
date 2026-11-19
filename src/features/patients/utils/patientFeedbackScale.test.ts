import { describe, expect, it } from 'vitest';

import { calculateTherapyStatus, describeTrainingDay, generateHeatmapData, getDayFeeling } from '@/lib/therapyStatus';

import { progressToEvents } from '../EventJournal';

import {
  formatFeedbackLevel,
  formatPainFeedback,
  isDiscomfortFeedback,
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

  it('formats pain 0–10 before the old scale, and "bez bólu" 0/10 as an answer', () => {
    expect(formatPainFeedback({ painNrs: 8, painLevel: 0 })).toBe('8/10');
    expect(formatPainFeedback({ painNrs: 0, painLevel: 0 })).toBe('0/10');
    expect(formatPainFeedback({ painNrs: null, painLevel: 4 })).toBe('4/5');
    expect(formatPainFeedback({ painNrs: null, painLevel: 0 })).toBeNull();
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

describe('pain 0–10 (NRS) in therapy status', () => {
  const today = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const assignments = [{ id: 'assignment-1', status: 'active', startDate: today }];

  it.each([
    { feedback: { painNrs: 7 }, expected: true },
    { feedback: { painNrs: 6 }, expected: false },
    // NRS answered wins over the old scale: 2/10 is not discomfort even with an old 5/5 on the same record.
    { feedback: { painNrs: 2, painLevel: 5 }, expected: false },
    { feedback: { painNrs: 0 }, expected: false },
    { feedback: { painNrs: null, painLevel: 4 }, expected: true },
    { feedback: {}, expected: false },
  ])('isDiscomfortFeedback($feedback) = $expected', ({ feedback, expected }) => {
    expect(isDiscomfortFeedback(feedback)).toBe(expected);
  });

  it('pain 8/10 without an old-scale answer asks the therapist to check the plan', () => {
    const progress = [{ id: 'p1', status: 'completed', completedAt: today, painNrs: 8, painLevel: 0 }];

    const status = calculateTherapyStatus(progress, assignments);
    const todayCell = generateHeatmapData(progress, assignments).find(
      (day) => day.dateStr === new Date(today).toDateString()
    );

    expect(status.reason).toBe('discomfort');
    expect(todayCell?.wellbeing).toBe('discomfort');
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

describe('getDayFeeling', () => {
  it('reads a day with one easy and one hard exercise as hard, whatever the order', () => {
    const easyFirst = [
      { id: 'a', status: 'completed', difficultyLevel: 5 },
      { id: 'b', status: 'completed', difficultyLevel: 1 },
    ];

    expect(getDayFeeling(easyFirst)).toBe('hard');
    expect(getDayFeeling([{ id: 'c', status: 'completed', difficultyLevel: 0 }])).toBeNull();
  });
});

describe('a day without a difficulty answer', () => {
  it('is not described as an OK training in the calendar', () => {
    const label = describeTrainingDay({ wellbeing: 'ok', feeling: getDayFeeling([{ id: 'a', status: 'completed', difficultyLevel: 0 }]) });

    expect(label).not.toMatch(/OK|Lekko/);
    expect(describeTrainingDay({ wellbeing: 'ok', feeling: 'ok' })).toBe('Trening wykonany: OK');
  });
});

describe('event journal on a discomfort day', () => {
  it("keeps the patient's note when it sits on another exercise than the pain, whatever the order", () => {
    const completedAt = new Date().toISOString();
    const pain = { id: 'pain', status: 'completed', completedAt, painLevel: 5, patientNotes: '' };
    const note = { id: 'note', status: 'completed', completedAt, painLevel: 0, patientNotes: 'Kolano bolało przy przysiadzie' };

    for (const day of [[pain, note], [note, pain]]) {
      const [today] = progressToEvents(day, 1);

      expect(today.type).toBe('discomfort');
      expect(today.description).toBe('Kolano bolało przy przysiadzie');
    }
  });

  it('shows discomfort for pain 8/10 without an old-scale answer, like the therapy status', () => {
    const completedAt = new Date().toISOString();
    const [today] = progressToEvents([{ id: 'nrs', status: 'completed', completedAt, painNrs: 8, painLevel: 0 }], 1);

    expect(today.type).toBe('discomfort');
  });
});
