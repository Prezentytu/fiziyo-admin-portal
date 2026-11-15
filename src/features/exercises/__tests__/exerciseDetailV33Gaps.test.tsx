// Błąd P-3 (lab 15.11.2026): karta ćwiczenia 3.3 w portalu
//  (a) kafelek parametrów pokazuje „Sprzęt: Nie ustawiono”, choć `equipment_items` jest wypełnione
//      (normalizeExerciseFieldValues czyta tylko starą kolumnę `equipment`);
//  (b) `safety.pain_rule` i wskazania pokazuje jako surowe kody („WS-3”, `return_to_sport`) zamiast polskich etykiet;
//  (c) zakresy `prescription` (min/max, RPE) i `relations[]` z dokumentu nie trafiają do modelu widoku ani na kartę.
// Uwaga: w 3.3 wskazania leżą w `classification.indications` (tak czyta je readExerciseContent i tak są w bazie),
// nie w `therapist.indications`.
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { normalizeExerciseFieldValues } from '@/components/shared/exercise';
import { readExerciseContent } from '@/components/shared/exercise/readExerciseContent';
import { ExerciseParametersPanel } from '../ExerciseParametersPanel';
import { SafetySection, TherapistSection } from '../ExerciseDetailSections';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));

// Wycinek prawdziwych rekordów 3.3 z bazy lab v33_1114 (fiziyo-fx-2011 + wskazania i relacje z fx-2321).
const documentV33 = {
  $schema: 'fiziyo-exercise-v3',
  schemaVersion: '3.3',
  patient: { summary: 'Uginanie łokcia z hantlem w staniu.', steps: ['Stań prosto.', 'Zegnij łokieć.'] },
  safety: {
    stop_if: 'Ostry ból w łokciu albo nadgarstku – przerwij.',
    pain_rule: 'WS-3',
    contraindications: [],
    flags: [],
    requires_supervision: false,
  },
  therapist: { checkpoints: [{ text: 'łokieć przy boku', view: 'front', evidence: 'frame' }] },
  classification: { indications: ['return_to_sport'] },
  equipment_items: [{ qty: 1, code: 'dumbbells', label: 'hantel', required: true, substitutes: [] }],
  prescription: {
    goal: 'strength',
    mode: 'reps',
    params: {
      reps: { min: 8, max: 15, default: 10 },
      sets: { min: 1, max: 3, default: 2 },
      intensity: { min: 4, max: 8, default: { scale: 'rpe10', value: 7 } },
    },
  },
  relations: [
    {
      key: 'fx-2319',
      type: 'progression',
      order: 1,
      verified: false,
      difference: 'pompki na palcach stóp z dłońmi na kopule',
      source_key: null,
      ai_suggested: true,
      when_to_switch: null,
    },
  ],
} as unknown as ExerciseEnrichmentData;

// Rekord z GraphQL: stara kolumna sprzętu pusta, bo nowy rekord trzyma sprzęt tylko w dokumencie (D-11).
const exerciseV33 = {
  id: 'fiziyo-fx-2011',
  name: 'Uginanie łokcia z hantlem chwytem młotkowym',
  defaultSets: 2,
  defaultReps: 10,
  equipment: null,
  enrichmentData: documentV33,
};

describe('karta ćwiczenia 3.3 (P-3)', () => {
  it('(a) kafelek „Sprzęt” pokazuje sprzęt z `equipment_items`, nie „Nie ustawiono”', () => {
    render(<ExerciseParametersPanel source={normalizeExerciseFieldValues(exerciseV33 as never)} />);
    const tile = screen.getByTestId('exercise-param-equipment');
    expect(tile.textContent).not.toContain('Nie ustawiono');
    expect(tile.textContent).toContain('hantel');
  });

  it('(b) reguła bólu ma polską etykietę zamiast samego kodu „WS-3”', () => {
    const noop = () => false;
    render(<SafetySection data={documentV33} editable={false} isPathDirty={noop} setPath={vi.fn()} />);
    const text = screen.getByTestId('exercise-detail-pain-rule-text').textContent ?? '';
    const withoutLabelAndCode = text.replace('Reguła bólu:', '').replace(/WS-\d+/g, '').replace(/[\s():–-]/g, '');
    expect(withoutLabelAndCode.length).toBeGreaterThan(0);
  });

  it('(b) wskazania mają polskie etykiety zamiast kodów słownika (`return_to_sport`)', () => {
    render(
      <TherapistSection
        data={documentV33}
        clinicalDescription=""
        editable={false}
        clinicalDescriptionDirty={false}
        onClinicalDescriptionChange={vi.fn()}
        setPath={vi.fn()}
        persist={async () => {}}
      />
    );
    const items = within(screen.getByTestId('exercise-detail-indications'))
      .getAllByRole('listitem')
      .map((item) => item.textContent ?? '');
    expect(items).toHaveLength(1);
    expect(items[0]).not.toBe('return_to_sport');
    expect(items[0]).not.toMatch(/_/);
  });

  it('(c) kafelek „Powtórzenia” pokazuje zakres z `prescription` (8–15), nie samą wartość domyślną', () => {
    render(<ExerciseParametersPanel source={normalizeExerciseFieldValues(exerciseV33 as never)} />);
    expect(screen.getByTestId('exercise-param-reps').textContent).toMatch(/8\s*[–-]\s*15/);
  });

  it('(c) model widoku treści 3.3 niesie `prescription` i `relations` z dokumentu', () => {
    const content = readExerciseContent({ enrichmentData: documentV33 }) as unknown as Record<string, unknown>;
    expect(content.prescription).toBeDefined();
    expect(content.relations).toEqual([expect.objectContaining({ key: 'fx-2319', type: 'progression' })]);
  });
});
