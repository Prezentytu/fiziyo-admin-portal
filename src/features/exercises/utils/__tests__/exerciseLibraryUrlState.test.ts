import { describe, expect, it } from 'vitest';

import {
  buildExerciseLibraryQueryString,
  parseExerciseLibraryUrlState,
  toExerciseAvailability,
  toExerciseLibraryTab,
} from '../exerciseLibraryUrlState';
import { EXERCISE_BODY_REGIONS, findExerciseBodyRegion } from '../exerciseBodyRegions';

describe('parseExerciseLibraryUrlState', () => {
  it('reads filter, search, page and page size', () => {
    const state = parseExerciseLibraryUrlState(
      new URLSearchParams('filter=needsChanges&q=%20przysiad%20&region=kolano&demo=only&page=3&pageSize=48')
    );

    expect(state).toEqual({ filter: 'needsChanges', search: 'przysiad', region: 'kolano', demo: 'only', page: 3, pageSize: 48 });
  });

  it('falls back to defaults for unknown or broken values', () => {
    const state = parseExerciseLibraryUrlState(new URLSearchParams('filter=toString&region=toString&demo=toString&page=-2&pageSize=5000'));

    expect(state).toEqual({ filter: 'all', search: '', region: null, demo: 'all', page: 1, pageSize: 24 });
  });
});

describe('buildExerciseLibraryQueryString', () => {
  it('keeps defaults out of the URL', () => {
    expect(buildExerciseLibraryQueryString({ filter: 'all', search: ' ', region: null, demo: 'all', page: 1, pageSize: 24 })).toBe('');
  });

  it('round-trips a non-default state', () => {
    const state = { filter: 'fiziyo', search: 'łopatka', region: 'bark', demo: 'hide', page: 2, pageSize: 96 } as const;

    expect(parseExerciseLibraryUrlState(new URLSearchParams(buildExerciseLibraryQueryString(state)))).toEqual(state);
  });
});

describe('toExerciseLibraryTab', () => {
  it('maps panel filters to API tabs', () => {
    expect(toExerciseLibraryTab('needsChanges')).toBe('NEEDS_CHANGES');
    expect(toExerciseLibraryTab('organization')).toBe('ORGANIZATION');
  });
});

describe('toExerciseAvailability', () => {
  it('maps the demo filter to the API availability, leaving "all" unrestricted', () => {
    expect(toExerciseAvailability('all')).toBeNull();
    expect(toExerciseAvailability('hide')).toBe('STANDARD');
    expect(toExerciseAvailability('only')).toBe('DEMO');
  });
});

describe('EXERCISE_BODY_REGIONS', () => {
  it('maps every region slug to a distinct API region', () => {
    const regions = EXERCISE_BODY_REGIONS.map((option) => option.region);

    expect(new Set(regions).size).toBe(9);
    expect(findExerciseBodyRegion('bark')?.region).toBe('SHOULDER');
    expect(findExerciseBodyRegion('SHOULDER')).toBeNull();
  });
});
