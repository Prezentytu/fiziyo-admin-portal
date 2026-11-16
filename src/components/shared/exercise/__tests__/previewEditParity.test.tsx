import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { fromExerciseMapping } from '../adapters';
import { computeExerciseTimeLabels } from '../computedExerciseTime';
import { CANONICAL_PARAMETER_ORDER, formatParameterValue } from '../displayRegistry';
import { resolveExerciseEquipmentText } from '../displayNormalizer';
import { ExercisePreviewDialog } from '../ExercisePreviewDialog';
import { buildMappingOverridesJson } from '../mappingOverrides';
import { FX_7001_BREATHING, FX_7001_STEPS, fx7001Mapping } from './fixtures/adrianFx7001';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));

type Mapping = Parameters<typeof fromExerciseMapping>[0];

function renderPreview(mapping: Mapping) {
  const card = fromExerciseMapping(mapping);
  render(<ExercisePreviewDialog open exercise={card} onOpenChange={() => {}} testIdPrefix="pv" />);
  return card;
}

/** Wartość kafelka parametru w podglądzie, po etykiecie pola. */
function previewTile(label: string): string | null {
  const params = screen.getByTestId('pv-params');
  const labelNode = within(params).getByText(label, { exact: true });
  return labelNode.closest('div')?.parentElement?.querySelector('p.mt-1')?.textContent ?? null;
}

describe('formatParameterValue: brak wartości a zero (KONTRAKT-v3.3)', () => {
  it('zero jest wartością, brak klucza i null to „—”', () => {
    expect(formatParameterValue('restReps', { restReps: 0 })).toBe('0 s');
    expect(formatParameterValue('restReps', { restReps: null })).toBe('—');
    expect(formatParameterValue('restReps', {})).toBe('—');
    expect(formatParameterValue('preparationTime', { preparationTime: 10 })).toBe('10 s');
    expect(formatParameterValue('sets', { sets: 0 })).toBe('0');
  });

  it('strona, trudność i obciążenie tym samym tekstem co kafelek podglądu', () => {
    expect(formatParameterValue('side', { side: 'alternating' }, { alternatingPerSide: true })).toBe(
      'Naprzemiennie, na każdą stronę'
    );
    expect(formatParameterValue('difficultyLevel', { difficultyLevel: 'EASY' })).toBe('Łatwy');
    expect(formatParameterValue('load', { loadKg: 4 })).toBe('4 kg');
    expect(formatParameterValue('tempo', { tempo: '  ' })).toBe('—');
  });
});

describe('computeExerciseTimeLabels', () => {
  it('fx-7001 naprzemiennie na stronę: seria 1 min 20 s, ćwiczenie 3 min 20 s (jak edycja w zgłoszeniu)', () => {
    const times = computeExerciseTimeLabels(
      { sets: 2, reps: 8, executionTime: 5, restSets: 30, restReps: 0, preparationTime: 10, side: 'alternating' },
      { type: 'reps', alternatingPerSide: true }
    );
    expect(times).toEqual({ series: '1 min 20 s', total: '3 min 20 s' });
  });

  it('nieznana wersja przy „naprzemiennie” nie pokazuje liczby', () => {
    expect(
      computeExerciseTimeLabels({ sets: 2, reps: 8, executionTime: 5 }, { type: 'reps', timeUnknown: true })
    ).toEqual({ series: null, total: null });
  });
});

describe('sprzęt rekordu 3.3 w zestawie', () => {
  it('pozycja zestawu bez nadpisania pokazuje sprzęt z equipment_items', () => {
    expect(fromExerciseMapping(fx7001Mapping as Mapping).equipment).toBe('krzesło');
  });

  it('nadpisanie sprzętu w pozycji wygrywa, także puste (wyczyszczone)', () => {
    const withOverride = { ...fx7001Mapping, overridesJson: JSON.stringify({ equipment: 'Ręcznik' }) };
    expect(fromExerciseMapping(withOverride as Mapping).equipment).toBe('Ręcznik');
    const cleared = { ...fx7001Mapping, overridesJson: JSON.stringify({ equipment: '' }) };
    expect(fromExerciseMapping(cleared as Mapping).equipment).toBe('');
  });

  it('zapis nieruszonej pozycji nie tworzy kopii sprzętu w nadpisaniu (D-11)', () => {
    const card = fromExerciseMapping(fx7001Mapping as Mapping);
    const overrides = buildMappingOverridesJson(
      { equipment: resolveExerciseEquipmentText(fx7001Mapping.exercise) },
      { equipment: card.equipment }
    );
    expect(overrides).toBeNull();
  });
});

describe('ExercisePreviewDialog: fx-7001 ze zgłoszenia 16.11', () => {
  it('przerwa między powtórzeniami 0 to „0 s”, jak „0” w polu edycji, nie „—”', () => {
    renderPreview(fx7001Mapping as Mapping);
    expect(previewTile('Przerwa między powt.')).toBe('0 s');
    expect(previewTile('Przerwa między seriami')).toBe('30 s');
    expect(previewTile('Czas przygotowania')).toBe('10 s');
    expect(previewTile('Obciążenie')).toBe('—');
  });

  it('każdy parametr podglądu ma tekst wspólnego formattera', () => {
    const card = renderPreview(fx7001Mapping as Mapping);
    const params = screen.getByTestId('pv-params');
    for (const key of CANONICAL_PARAMETER_ORDER) {
      if (key === 'load') continue; // karta niesie gotowy tekst obciążenia, formularz kilogramy
      const expected = formatParameterValue(key, card, { alternatingPerSide: card.alternatingPerSide });
      expect(within(params).getByTestId(`pv-field-help-${key}`).closest('div')?.parentElement?.textContent).toContain(
        expected
      );
    }
  });

  it('sprzęt z equipment_items zamiast „—”', () => {
    renderPreview(fx7001Mapping as Mapping);
    expect(previewTile('Sprzęt')).toBe('krzesło');
  });

  it('kroki w całości, każdy osobno i po kolei, oddech i wskazówki z dokumentu 3.3', () => {
    renderPreview(fx7001Mapping as Mapping);
    const instruction = screen.getByTestId('pv-instruction');
    const steps = within(instruction).getAllByRole('listitem').filter((item) => item.dataset.testid?.startsWith('exercise-execution-step-'));
    expect(steps.map((step) => step.textContent?.replace(/^\d+/, ''))).toEqual(FX_7001_STEPS);
    expect(within(instruction).getByTestId('exercise-detail-breathing-text')).toHaveTextContent(FX_7001_BREATHING);
    expect(within(instruction).getByText('Broda sunie po mostku.')).toBeInTheDocument();
  });

  it('nie pokazuje kolumn wycofanych w 3.3 ani starego kafelka „Opis dla pacjenta”', () => {
    renderPreview(fx7001Mapping as Mapping);
    const params = screen.getByTestId('pv-params');
    expect(within(params).queryByText('Opis dla pacjenta')).toBeNull();
    expect(within(params).queryByText('Polecenia audio')).toBeNull();
    expect(within(params).queryByTestId('pv-field-help-clinicalDescription')).toBeNull();
  });

  it('czas ćwiczenia główny, czas serii pomocniczy, te same liczby co w edycji', () => {
    renderPreview(fx7001Mapping as Mapping);
    expect(screen.getByTestId('pv-total-time')).toHaveTextContent('3 min 20 s');
    expect(screen.getByTestId('pv-series-time')).toHaveTextContent('Jedna seria');
    expect(screen.getByTestId('pv-series-time')).toHaveTextContent('1 min 20 s');
  });
});
