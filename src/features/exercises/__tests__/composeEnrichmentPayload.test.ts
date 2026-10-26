import { describe, expect, it } from 'vitest';

import { composeEnrichmentPayload } from '../useEnrichmentDraft';

describe('composeEnrichmentPayload', () => {
  it('po wyczyszczeniu środkowego kroku zdjęcia zostają przy właściwych krokach', () => {
    const payload = composeEnrichmentPayload({
      patient: {
        steps: ['Stań', '', 'Wstań'],
        step_images: [
          { step: 1, url: 'a' },
          { step: 2, url: 'b' },
          { step: 3, url: 'c' },
        ],
      },
    });

    expect(payload.patient?.steps).toEqual(['Stań', 'Wstań']);
    expect(payload.patient?.step_images).toEqual([
      { step: 1, url: 'a' },
      { step: 2, url: 'c' },
    ]);
  });
});
