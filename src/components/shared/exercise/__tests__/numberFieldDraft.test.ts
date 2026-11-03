import { describe, expect, it } from 'vitest';

import { EXERCISE_FIELD_EDIT_CONFIG } from '../fieldContract';
import { parseNumberFieldDraft } from '../numberFieldDraft';

const restSets = EXERCISE_FIELD_EDIT_CONFIG.restSets;

describe('parseNumberFieldDraft', () => {
  it('keeps a value inside the range', () => {
    expect(parseNumberFieldDraft('30', restSets)).toEqual({ kind: 'value', value: 30 });
  });

  it('clears the field when the text is empty', () => {
    expect(parseNumberFieldDraft('  ', restSets)).toEqual({ kind: 'value', value: null });
  });

  it('rejects a rest typed after the old value ("60" + "30") instead of saving 6030 s', () => {
    expect(parseNumberFieldDraft('6030', restSets)).toEqual({ kind: 'error', message: 'Najwięcej 300 s' });
  });

  it('rejects a negative value', () => {
    expect(parseNumberFieldDraft('-5', restSets)).toEqual({ kind: 'error', message: 'Najmniej 0 s' });
  });

  it('accepts a decimal comma', () => {
    expect(parseNumberFieldDraft('2,5', { min: 0, max: 500, suffix: 'kg' })).toEqual({ kind: 'value', value: 2.5 });
  });
});
