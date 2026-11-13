import { describe, expect, it } from 'vitest';

import { countFilledMistakes, countFilledTexts, summarizeChanges, type ChangeSnapshot } from '../changeSummary';

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

  it('pusty wiersz typowego błędu nie jest zmianą', () => {
    const withMistake = {
      ...base,
      enrichment: { patient: { mistakes: [{ mistake: 'Kolano do środka', fix: 'Kolano nad stopą' }] } },
    };
    const withBlankRow = {
      ...base,
      enrichment: {
        patient: {
          mistakes: [
            { mistake: 'Kolano do środka', fix: 'Kolano nad stopą' },
            { mistake: ' ', fix: '' },
          ],
        },
      },
    };

    expect(summarizeChanges(withMistake, withBlankRow, 0).instruction).toEqual([]);
  });

  it('bez zmian zwraca puste listy', () => {
    expect(summarizeChanges(base, base, 0)).toEqual({ material: [], parameters: [], instruction: [], safety: [] });
  });
});

describe('liczniki podsumowania', () => {
  it('nie liczą pustych i białych pozycji', () => {
    expect(countFilledTexts(['Krok 1', '', '  ', 'Krok 2'])).toBe(2);
    expect(countFilledTexts(undefined)).toBe(0);
    expect(countFilledMistakes([{ mistake: 'Plecy okrągłe' }, { fix: 'Prosto' }, { mistake: ' ', fix: '' }])).toBe(2);
  });
});

describe('summarizeChanges – rekord v3.3', () => {
  const v33: ChangeSnapshot = {
    ...base,
    contentVersion: '3.3',
    enrichment: {
      schemaVersion: '3.3',
      patient: { summary: 'Napinanie uda.', steps: ['a', 'b'], cues: ['Napnij udo.'] },
      safety: { stop_if: 'Ból kolana', contraindications: [{ text: 'Świeży uraz' }] },
    },
  };

  it('nie zgłasza zmiany wycofanych kolumn opisu', () => {
    const result = summarizeChanges(
      v33,
      { ...v33, patientDescription: 'Inny opis', therapistDescription: 'Inny opis dla fizjo' },
      0
    );

    expect(result.instruction).toEqual([]);
    expect(result.safety).toEqual([]);
  });

  it('opisuje zmianę przeciwwskazań w safety.contraindications', () => {
    const added = {
      ...v33,
      enrichment: {
        ...v33.enrichment,
        safety: { stop_if: 'Ból kolana', contraindications: [{ text: 'Świeży uraz' }, { text: 'Gorączka' }] },
      },
    };
    const reworded = {
      ...v33,
      enrichment: {
        ...v33.enrichment,
        safety: { stop_if: 'Ból kolana', contraindications: [{ text: 'Świeży uraz kolana' }] },
      },
    };

    expect(summarizeChanges(v33, added, 0).safety).toEqual(['przeciwwskazania: 1 → 2']);
    expect(summarizeChanges(v33, reworded, 0).safety).toEqual(['poprawione przeciwwskazania']);
  });

  it('opisuje poprawiony tekst, gdy liczba pozycji się nie zmieniła', () => {
    const result = summarizeChanges(
      v33,
      {
        ...v33,
        enrichment: {
          ...v33.enrichment,
          patient: { summary: 'Napinanie przodu uda.', steps: ['a', 'c'], cues: ['Napnij udo.', 'Oddychaj.'] },
          safety: { stop_if: 'Ostry ból kolana', contraindications: [{ text: 'Świeży uraz' }] },
        },
      },
      0
    );

    expect(result.instruction).toEqual(['poprawione podsumowanie', 'poprawione kroki', 'wskazówki: 1 → 2']);
    expect(result.safety).toEqual(['poprawione objawy przerwania']);
  });

  it('parametry i materiał opisuje jak dla rekordu starego', () => {
    const result = summarizeChanges(v33, { ...v33, sets: 3, imageCount: 4 }, 0);

    expect(result.parameters).toEqual(['serie 100 → 3']);
    expect(result.material).toEqual(['dodane zdjęcia: 1']);
  });
});
