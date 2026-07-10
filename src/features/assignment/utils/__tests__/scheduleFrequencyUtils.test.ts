import { describe, expect, it } from 'vitest';

import { buildAssignmentFrequencyPayload, normalizeFrequencySeed } from '../scheduleFrequencyUtils';

describe('scheduleFrequencyUtils', () => {
  it('normalizes a flexible seed without inventing weekday selections', () => {
    expect(
      normalizeFrequencySeed({
        timesPerDay: '2',
        timesPerWeek: '3',
        breakBetweenSets: '4',
        isFlexible: true,
        monday: true,
        friday: true,
      })
    ).toMatchObject({
      timesPerDay: 2,
      timesPerWeek: 3,
      breakBetweenSets: 4,
      isFlexible: true,
      monday: false,
      friday: false,
    });
  });

  it('keeps selected days for a specific schedule seed', () => {
    expect(
      normalizeFrequencySeed({
        isFlexible: false,
        monday: true,
        wednesday: true,
      })
    ).toMatchObject({
      isFlexible: false,
      monday: true,
      wednesday: true,
      friday: false,
    });
  });

  it('serializes every numeric frequency field to a string', () => {
    expect(
      buildAssignmentFrequencyPayload({
        timesPerDay: 2,
        timesPerWeek: 3,
        breakBetweenSets: 4,
        isFlexible: false,
        monday: true,
        wednesday: true,
      })
    ).toEqual({
      timesPerDay: '2',
      timesPerWeek: '2',
      breakBetweenSets: '4',
      isFlexible: false,
      monday: true,
      tuesday: false,
      wednesday: true,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    });
  });

  it('clears every day when building a flexible payload', () => {
    expect(
      buildAssignmentFrequencyPayload({
        timesPerDay: '1',
        timesPerWeek: '5',
        breakBetweenSets: '0',
        isFlexible: true,
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
      })
    ).toMatchObject({
      timesPerDay: '1',
      timesPerWeek: '5',
      breakBetweenSets: '0',
      isFlexible: true,
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    });
  });
});
