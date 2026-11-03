import { describe, expect, it } from 'vitest';

import { findMissingEnrichmentIds, withLoadedEnrichment } from './exercisePickerDetails';

describe('withLoadedEnrichment', () => {
  it('attaches loaded enrichment, including empty (null), and leaves other exercises without the field', () => {
    const enrichmentById = new Map([
      ['a', { $schema: 'fiziyo-exercise-v3', patient: { steps: ['Krok'] } }],
      ['b', null],
    ]);

    const result = withLoadedEnrichment([{ id: 'a' }, { id: 'b' }, { id: 'c' }], enrichmentById);

    expect(result[0].enrichmentData?.patient?.steps).toEqual(['Krok']);
    expect(result[1]).toHaveProperty('enrichmentData', null);
    expect(result[2]).not.toHaveProperty('enrichmentData');
  });
});

describe('findMissingEnrichmentIds', () => {
  it('returns each id not loaded yet once, skipping empty ids', () => {
    expect(findMissingEnrichmentIds(['a', 'b', 'a', '', 'c'], new Map([['b', null]]))).toEqual(['a', 'c']);
  });
});
