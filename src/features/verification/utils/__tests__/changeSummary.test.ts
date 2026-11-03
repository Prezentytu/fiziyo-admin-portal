import { describe, expect, it } from 'vitest';

import { summarizeChanges, type ChangeSnapshot } from '../changeSummary';

const base: ChangeSnapshot = {
  name: 'Przysiad',
  patientDescription: 'Opis',
  therapistDescription: 'Opis dla fizjo',
  sets: 100,
  reps: 1000,
  executionTime: null,
  restSets: 300,
  side: 'none',
  videoUrl: 'https://cdn/video.mp4',
  imageCount: 3,
  enrichment: { patient: { steps: ['a', 'b'] }, safety: {} },
};

describe('summarizeChanges', () => {
  it('opisuje zmiany parametrów jak w podsumowaniu decyzji', () => {
    const result = summarizeChanges(base, { ...base, sets: 3, reps: 12, restSets: 60, side: 'both' }, 0);

    expect(result.parameters).toEqual([
      'serie 100 → 3',
      'powtórzenia 1000 → 12',
      'przerwa 300 s → 60 s',
      'strona: Razem → Na każdą stronę',
    ]);
  });

  it('zbiera zmiany materiału, instrukcji i bezpieczeństwa', () => {
    const result = summarizeChanges(
      base,
      {
        ...base,
        imageCount: 4,
        patientDescription: 'Nowy opis',
        enrichment: {
          patient: { steps: ['a', 'b', 'c'] },
          safety: { stop_if: 'Ból\nZawroty głowy', requires_supervision: true },
        },
      },
      1
    );

    expect(result.material).toEqual(['wymienione zdjęcia: 1', 'dodane zdjęcia: 1']);
    expect(result.instruction).toEqual(['poprawiony opis', 'kroki: 2 → 3']);
    expect(result.safety).toEqual(['objawy przerwania: 0 → 2', 'tylko pod nadzorem']);
  });

  it('bez zmian zwraca puste listy', () => {
    expect(summarizeChanges(base, base, 0)).toEqual({ material: [], parameters: [], instruction: [], safety: [] });
  });
});
