import { describe, expect, it } from 'vitest';
import { getDefaultDaysForFrequency } from '../scheduleUtils';

describe('getDefaultDaysForFrequency', () => {
  it('returns only Monday for 1 session per week', () => {
    const days = getDefaultDaysForFrequency(1);
    expect(days.monday).toBe(true);
    expect(days.tuesday).toBe(false);
    expect(days.wednesday).toBe(false);
    expect(days.thursday).toBe(false);
    expect(days.friday).toBe(false);
    expect(days.saturday).toBe(false);
    expect(days.sunday).toBe(false);
  });

  it('returns Monday and Thursday for 2 sessions per week', () => {
    const days = getDefaultDaysForFrequency(2);
    expect(days.monday).toBe(true);
    expect(days.thursday).toBe(true);
    expect(days.tuesday).toBe(false);
    expect(days.wednesday).toBe(false);
    expect(days.friday).toBe(false);
    expect(days.saturday).toBe(false);
    expect(days.sunday).toBe(false);
  });

  it('returns Monday, Wednesday, Friday for 3 sessions per week', () => {
    const days = getDefaultDaysForFrequency(3);
    expect(days.monday).toBe(true);
    expect(days.wednesday).toBe(true);
    expect(days.friday).toBe(true);
    expect(days.tuesday).toBe(false);
    expect(days.thursday).toBe(false);
    expect(days.saturday).toBe(false);
    expect(days.sunday).toBe(false);
  });

  it('returns Mon, Wed, Fri, Sat for 4 sessions per week', () => {
    const days = getDefaultDaysForFrequency(4);
    expect(days.monday).toBe(true);
    expect(days.wednesday).toBe(true);
    expect(days.friday).toBe(true);
    expect(days.saturday).toBe(true);
    expect(days.tuesday).toBe(false);
    expect(days.thursday).toBe(false);
    expect(days.sunday).toBe(false);
  });

  it('returns Monday–Friday for 5 sessions per week', () => {
    const days = getDefaultDaysForFrequency(5);
    expect(days.monday).toBe(true);
    expect(days.tuesday).toBe(true);
    expect(days.wednesday).toBe(true);
    expect(days.thursday).toBe(true);
    expect(days.friday).toBe(true);
    expect(days.saturday).toBe(false);
    expect(days.sunday).toBe(false);
  });

  it('returns Monday–Friday for 6 and 7 sessions (weekdays only)', () => {
    expect(getDefaultDaysForFrequency(6)).toEqual(getDefaultDaysForFrequency(5));
    expect(getDefaultDaysForFrequency(7)).toEqual(getDefaultDaysForFrequency(5));
  });

  it('clamps values below 1 to 1 (Monday only)', () => {
    const days = getDefaultDaysForFrequency(0);
    expect(days.monday).toBe(true);
    expect([days.tuesday, days.wednesday, days.thursday, days.friday, days.saturday, days.sunday].every(Boolean)).toBe(
      false
    );
  });

  it('clamps values above 7 to 7 (same as 5 weekdays)', () => {
    expect(getDefaultDaysForFrequency(8)).toEqual(getDefaultDaysForFrequency(5));
    expect(getDefaultDaysForFrequency(99)).toEqual(getDefaultDaysForFrequency(5));
  });

  it('rounds fractional values', () => {
    expect(getDefaultDaysForFrequency(2.4)).toEqual(getDefaultDaysForFrequency(2));
    expect(getDefaultDaysForFrequency(2.6)).toEqual(getDefaultDaysForFrequency(3));
  });
});
