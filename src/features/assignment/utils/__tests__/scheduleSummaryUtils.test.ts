import { describe, expect, it } from 'vitest';
import {
  calculateScheduleSummary,
  calculateStartInDays,
  formatScheduleCompact,
  formatScheduleDateRange,
  formatScheduleDetailed,
} from '../scheduleSummaryUtils';

describe('scheduleSummaryUtils', () => {
  it('calculates summary for flexible weekly schedule', () => {
    const summary = calculateScheduleSummary({
      startDate: '2026-06-10T00:00:00.000Z',
      endDate: '2026-07-10T00:00:00.000Z',
      frequency: {
        timesPerWeek: 3,
        timesPerDay: 1,
      },
    });

    expect(summary.durationDays).toBe(30);
    expect(summary.effectiveWeeklyFrequency).toBe(3);
    expect(summary.totalSessions).toBe(13);
    expect(summary.isFlexibleMode).toBe(true);
    expect(summary.dayLabels).toBeNull();
  });

  it('calculates summary for specific days schedule', () => {
    const summary = calculateScheduleSummary({
      startDate: '2026-06-10T00:00:00.000Z',
      endDate: '2026-06-24T00:00:00.000Z',
      frequency: {
        timesPerWeek: 5,
        timesPerDay: 2,
        monday: true,
        wednesday: true,
        friday: true,
      },
    });

    expect(summary.durationDays).toBe(14);
    expect(summary.effectiveWeeklyFrequency).toBe(3);
    expect(summary.totalSessions).toBe(12);
    expect(summary.isFlexibleMode).toBe(false);
    expect(summary.dayLabels).toEqual(['Pn', 'Śr', 'Pt']);
  });

  it('handles edge case when start and end date are equal', () => {
    const summary = calculateScheduleSummary({
      startDate: '2026-06-10T00:00:00.000Z',
      endDate: '2026-06-10T00:00:00.000Z',
      frequency: {
        timesPerWeek: 1,
        timesPerDay: 1,
      },
    });

    expect(summary.durationDays).toBe(1);
    expect(summary.totalSessions).toBe(0);
  });

  it('formats date ranges in short and long variants', () => {
    expect(formatScheduleDateRange('2026-06-10', '2026-07-10', 'short')).toBe('10.06.2026–10.07.2026');
    expect(formatScheduleDateRange('2026-06-10', '2026-07-10', 'long')).toContain('2026');
  });

  it('formats compact and detailed summaries', () => {
    const summary = calculateScheduleSummary({
      startDate: '2026-06-10T00:00:00.000Z',
      endDate: '2026-07-10T00:00:00.000Z',
      frequency: {
        timesPerWeek: 3,
        timesPerDay: 2,
      },
    });

    expect(formatScheduleCompact(summary)).toContain('30 dni');
    expect(formatScheduleCompact(summary)).toContain('~26 sesji');
    expect(formatScheduleDetailed(summary)).toContain('Częstotliwość:');
    expect(formatScheduleDetailed(summary)).toContain('Szacowane sesje: ~26');
  });

  it('calculates days to start', () => {
    expect(calculateStartInDays('2026-06-20', new Date('2026-06-10T12:00:00.000Z'))).toBe(10);
  });
});
