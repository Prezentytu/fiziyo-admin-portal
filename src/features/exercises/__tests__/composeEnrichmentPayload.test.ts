import { describe, expect, it } from 'vitest';

import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { composeEnrichmentPayload, composeEnrichmentSavePayload, setEnrichmentAtPath } from '../useEnrichmentDraft';

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

describe('composeEnrichmentSavePayload', () => {
  const loaded = {
    $schema: 'fiziyo-exercise-v3',
    schemaVersion: 3.3,
    patient: {
      summary: 'Stary opis.',
      why: 'Po co.',
      steps: ['Stań', '', 'Wstań'],
      step_images: [{ step: 3, url: 'c' }],
    },
    classification: { muscles: { primary: ['glute_max'], secondary: [] }, structures: [] },
    breathing: { text: 'Wydech przy wysiłku.', pattern: null },
    media: [{ kind: 'video', layout: null, start_s: null }],
  } as unknown as ExerciseEnrichmentData;

  const edit = (path: string, value: unknown): ExerciseEnrichmentData => {
    const draft = structuredClone(loaded);
    setEnrichmentAtPath(draft as Record<string, unknown>, path, value);
    return draft;
  };

  it('klucze z pustą wartością, których nikt nie dotknął, wracają do wysyłanego dokumentu', () => {
    const sent = composeEnrichmentSavePayload(loaded, edit('patient.summary', 'Nowy opis.'));

    expect(sent).toHaveProperty('classification', {
      muscles: { primary: ['glute_max'], secondary: [] },
      structures: [],
    });
    expect(sent).toHaveProperty('breathing', { text: 'Wydech przy wysiłku.', pattern: null });
    expect(sent).toHaveProperty('media', [{ kind: 'video', layout: null, start_s: null }]);
    expect(sent).toHaveProperty('schemaVersion', 3.3);
    expect(sent).toHaveProperty('patient.summary', 'Nowy opis.');
  });

  it('pole wyczyszczone przez użytkownika zostaje wycięte, sąsiednie klucze zostają', () => {
    const sent = composeEnrichmentSavePayload(loaded, edit('breathing.text', ''));

    expect(sent).toHaveProperty('breathing', { pattern: null });
  });

  it('kroki i zdjęcia kroków wracają z wczytanego dokumentu tylko razem', () => {
    const edited = composeEnrichmentSavePayload(loaded, edit('patient.steps', ['Stań prosto', '', 'Wstań']));
    expect(edited).toHaveProperty('patient.steps', ['Stań prosto', 'Wstań']);
    expect(edited).toHaveProperty('patient.step_images', [{ step: 2, url: 'c' }]);

    const untouched = composeEnrichmentSavePayload(loaded, edit('patient.why', 'Inaczej.'));
    expect(untouched).toHaveProperty('patient.steps', ['Stań', '', 'Wstań']);
    expect(untouched).toHaveProperty('patient.step_images', [{ step: 3, url: 'c' }]);
  });
});
