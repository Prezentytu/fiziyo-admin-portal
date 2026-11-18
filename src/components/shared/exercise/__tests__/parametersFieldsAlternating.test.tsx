import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

/** [jedna seria, całe ćwiczenie]: wartość to ostatni element wiersza czasu wyliczanego. */
const times = (container: HTMLElement) =>
  ['series-time', 'total-time'].map(
    (row) => container.querySelector(`[data-testid="exercise-param-${row}"]`)?.lastElementChild?.textContent
  );

/** Treść podpowiedzi przy polu „Strona ciała”, odczytana po najechaniu na ikonę „i”. */
const sideHelp = async () => {
  await userEvent.setup().hover(screen.getByRole('button', { name: 'Informacja: Strona ciała' }));
  return (await screen.findByRole('tooltip')).textContent ?? '';
};

describe('ExerciseParametersFields: dawka „naprzemiennie” według wersji rekordu', () => {
  it('rekord 3.3: czas serii 1 min 38 s, całość 6 min, opis „na każdą stronę”', async () => {
    const container = renderFields(true);
    expect(times(container)).toEqual(['1 min 38 s', '5 min 59 s']);
    expect(await sideHelp()).toContain('podana liczba na każdą stronę');
  });

  it('rekord bez wersji: czas serii 48 s, całość 3 min 29 s, opis „łącznie” jak na main', async () => {
    const container = renderFields(false);
    expect(times(container)).toEqual(['48 s', '3 min 29 s']);
    expect(await sideHelp()).toContain('podana liczba łącznie');
  });
});

describe('ExerciseParametersFields: nazwy dostępne', () => {
  it('pole wyboru strony ma etykietę „Strona ciała” (data-testid znika w buildzie produkcyjnym)', () => {
    renderFields(true);
    expect(screen.getByRole('combobox', { name: 'Strona ciała' })).toBeInTheDocument();
  });
});

describe('ExerciseParametersFields: suma powtórzeń, gdy liczba jest na stronę', () => {
  const renderWith = (side: string, alternatingPerSide: boolean, versionPending = false) =>
    render(
      <TooltipProvider>
        <ExerciseParametersFields
          surface="patientOverride"
          exerciseType="reps"
          values={{ ...(values as object), reps: 4, side } as never}
          onChange={() => {}}
          alternatingPerSide={alternatingPerSide}
          versionPending={versionPending}
        />
      </TooltipProvider>
    ).container;
  const total = (container: HTMLElement) =>
    container.querySelector('[data-testid$="-per-side-total"]')?.textContent ?? null;

  it('naprzemiennie w rekordzie 3.3: 4 na stronę = 8 w serii', () => {
    expect(total(renderWith('alternating', true))).toBe('8 w serii (4 lewa i 4 prawa naprzemiennie)');
  });

  it('na każdą stronę: 8 w serii, najpierw lewa, potem prawa', () => {
    expect(total(renderWith('both', false))).toBe('8 w serii (najpierw 4 lewa, potem 4 prawa)');
  });

  it('bez stron, jedna strona, stary rekord naprzemienny i nieznana wersja: bez linijki', () => {
    expect(total(renderWith('none', true))).toBeNull();
    expect(total(renderWith('left', true))).toBeNull();
    expect(total(renderWith('alternating', false))).toBeNull();
    expect(total(renderWith('alternating', true, true))).toBeNull();
  });

  it('podpowiedź „i” przy powtórzeniach na stronę jest krótka i z przykładem', async () => {
    renderWith('alternating', true);
    await userEvent.setup().hover(screen.getByRole('button', { name: 'Informacja: Powtórzenia' }));
    expect((await screen.findByRole('tooltip')).textContent).toContain('4 na stronę = 4 lewa i 4 prawa, razem 8 w serii.');
  });
});
