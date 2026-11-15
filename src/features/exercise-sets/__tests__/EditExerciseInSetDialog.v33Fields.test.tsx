// Błąd P-2 (lab 15.11.2026): okno „Edytuj parametry” ćwiczenia w zestawie dla rekordu 3.3 oferuje pola wycofane
// w kontrakcie 3.3: „Opis dla pacjenta” (patientDescription), „Opis dla fizjoterapeuty” (clinicalDescription),
// „Polecenia audio” (audioCue) i „Wskazówki dot. intensywności” (`safety.intensity_guide`).
// Przyczyna: `getMappingEditableCardFields()` nie zna wersji rekordu, a karta nie przekazuje `contentVersion`
// do ExercisePatientContentFields, więc sekcja bezpieczeństwa rysuje się jak dla rekordu starego.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EditExerciseInSetDialog } from '../EditExerciseInSetDialog';

vi.mock('@apollo/client/react', () => ({ useMutation: () => [vi.fn(), { loading: false }] }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));

// Minimalny wycinek prawdziwego rekordu 3.3 (fiziyo-fx-2011). Kolumny starego formatu bywają jeszcze wypełnione.
const mappingV33 = {
  id: 'm1',
  exerciseId: 'fiziyo-fx-2011',
  sets: 2,
  reps: 10,
  exercise: {
    id: 'fiziyo-fx-2011',
    name: 'Uginanie łokcia z hantlem chwytem młotkowym',
    patientDescription: 'Stary opis z kolumny',
    clinicalDescription: 'Stary opis kliniczny',
    audioCue: 'Stara komenda',
    enrichmentData: {
      $schema: 'fiziyo-exercise-v3',
      schemaVersion: '3.3',
      patient: {
        summary: 'Uginanie łokcia z hantlem w staniu.',
        steps: ['Stań prosto.', 'Z wydechem zegnij łokieć.'],
        cues: ['Łokieć zostaje przy boku.'],
        cue_phases: [{ cue: 0, phase: 'work' }],
      },
      safety: { stop_if: 'Ostry ból w łokciu – przerwij.', pain_rule: 'WS-3', contraindications: [] },
      equipment_items: [{ code: 'dumbbells', label: 'hantel', qty: 1, required: true, substitutes: [] }],
    },
  },
} as never;

async function renderAndExpandAll() {
  const user = userEvent.setup();
  render(<EditExerciseInSetDialog open onOpenChange={() => {}} exerciseSetId="set-1" exerciseMapping={mappingV33} />);
  await user.click(screen.getByTestId('set-edit-exercise-m1-advanced-toggle'));
  await user.click(screen.getByTestId('set-edit-exercise-m1-instructions-toggle'));
}

describe('EditExerciseInSetDialog: rekord 3.3 bez pól wycofanych (P-2)', () => {
  it('nie oferuje „Opis dla pacjenta” (patientDescription)', async () => {
    await renderAndExpandAll();
    expect(screen.queryByTestId('set-edit-exercise-m1-patient-description-input')).not.toBeInTheDocument();
  });

  it('nie oferuje „Opis dla fizjoterapeuty” (clinicalDescription)', async () => {
    await renderAndExpandAll();
    expect(screen.queryByTestId('set-edit-exercise-m1-clinical-description-input')).not.toBeInTheDocument();
  });

  it('nie oferuje „Polecenia audio” (audioCue)', async () => {
    await renderAndExpandAll();
    expect(screen.queryByTestId('set-edit-exercise-m1-audio-cue-input')).not.toBeInTheDocument();
  });

  it('nie oferuje „Wskazówki dot. intensywności” (safety.intensity_guide)', async () => {
    await renderAndExpandAll();
    // Sekcja instrukcji się zamontowała (stop_if jest), więc brak pola intensywności nie jest przypadkiem.
    expect(await screen.findByTestId('exercise-detail-stop-if-input')).toBeInTheDocument();
    expect(screen.queryByTestId('exercise-detail-intensity-guide-input')).not.toBeInTheDocument();
  });
});
