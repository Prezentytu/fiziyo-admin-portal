import { describe, expect, it } from 'vitest';

import {
  buildExerciseLibraryQueryString,
  parseExerciseLibraryUrlState,
  toExerciseLibraryTab,
} from '../exerciseLibraryUrlState';

describe('parseExerciseLibraryUrlState', () => {
  it('reads filter, search, page and page size', () => {
    const state = parseExerciseLibraryUrlState(
      new URLSearchParams('filter=needsChanges&q=%20przysiad%20&page=3&pageSize=48')
    );

    expect(state).toEqual({ filter: 'needsChanges', search: 'przysiad', page: 3, pageSize: 48 });
  });

  it('falls back to defaults for unknown or broken values', () => {
    const state = parseExerciseLibraryUrlState(new URLSearchParams('filter=toString&page=-2&pageSize=5000'));

    expect(state).toEqual({ filter: 'all', search: '', page: 1, pageSize: 24 });
  });
});

describe('buildExerciseLibraryQueryString', () => {
  it('keeps defaults out of the URL', () => {
    expect(buildExerciseLibraryQueryString({ filter: 'all', search: ' ', page: 1, pageSize: 24 })).toBe('');
  });

  it('round-trips a non-default state', () => {
    const state = { filter: 'fiziyo', search: 'łopatka', page: 2, pageSize: 96 } as const;

    expect(parseExerciseLibraryUrlState(new URLSearchParams(buildExerciseLibraryQueryString(state)))).toEqual(state);
  });
});

describe('toExerciseLibraryTab', () => {
  it('maps panel filters to API tabs', () => {
    expect(toExerciseLibraryTab('needsChanges')).toBe('NEEDS_CHANGES');
    expect(toExerciseLibraryTab('organization')).toBe('ORGANIZATION');
  });
});
