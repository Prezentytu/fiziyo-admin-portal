import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import { ExerciseParametersFields } from '../ExerciseParametersFields';

/**
 * Pola dawki pokazują czas i opis strony według wersji rekordu (prop `alternatingPerSide`).
 * Wektor 3 × 10, 3 s, przerwa 2 s, między seriami 30 s, przygotowanie 5 s: seria 98 s / 48 s, całość 359 s / 209 s.
 */
const values = {
  sets: 3,
  reps: 10,
  executionTime: 3,
  restReps: 2,
  restSets: 30,
  preparationTime: 5,
  side: 'alternating',
} as never;

const renderFields = (alternatingPerSide: boolean) => {
  const { container } = render(
    <TooltipProvider>
      <ExerciseParametersFields
        surface="patientOverride"
        exerciseType="reps"
        values={values}
        onChange={() => {}}
        advancedDefaultOpen
        alternatingPerSide={alternatingPerSide}
      />
    </TooltipProvider>
  );
  return container;
};

const times = (container: HTMLElement) =>
  container.textContent?.match(/Czas serii \(wyliczany\)(.*?)Czas ćwiczenia \(wyliczany\)(.*?)(?=[A-ZŁŚŻ])/)?.slice(1, 3);

const sideHelp = (container: HTMLElement) =>
  [...container.querySelectorAll('[aria-label^="Informacja:"]')]
    .map((element) => element.getAttribute('aria-label') ?? '')
    .filter((label) => /podana liczba/.test(label));

describe('ExerciseParametersFields: dawka „naprzemiennie” według wersji rekordu', () => {
  it('rekord 3.3: czas serii 1 min 38 s, całość 6 min, opis „na każdą stronę”', () => {
    const container = renderFields(true);
    expect(times(container)).toEqual(['1 min 38 s', '5 min 59 s']);
    expect(sideHelp(container)).toHaveLength(1);
    expect(sideHelp(container)[0]).toContain('podana liczba na każdą stronę');
  });

  it('rekord bez wersji: czas serii 48 s, całość 3 min 29 s, opis „łącznie” jak na main', () => {
    const container = renderFields(false);
    expect(times(container)).toEqual(['48 s', '3 min 29 s']);
    expect(sideHelp(container)).toHaveLength(1);
    expect(sideHelp(container)[0]).toContain('podana liczba łącznie');
  });
});
