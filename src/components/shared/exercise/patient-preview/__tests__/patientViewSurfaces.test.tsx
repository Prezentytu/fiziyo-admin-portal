import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ExerciseDetailsDialog } from '@/features/assignment/ExerciseDetailsDialog';
import type { ExerciseMapping as AssignmentExerciseMapping } from '@/features/assignment/types';
import { ExercisePreviewDrawer } from '@/features/patients/ExercisePreviewDrawer';
import type { ExerciseMapping, ExerciseOverride } from '@/features/patients/PatientAssignmentCard';
import { ExercisePreviewDialog } from '../../ExercisePreviewDialog';
import type { ExerciseExecutionCardData } from '../../types';
import { PatientPreviewDialog } from '../PatientPreviewDialog';
import { buildPreviewGallery } from '../previewGallery';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));

const exercise = {
  id: 'ex-1',
  name: 'Mostek biodrowy',
  type: 'reps',
  side: 'both',
  patientDescription: 'Unieś biodra.',
  imageUrl: '/ex-1.jpg',
  defaultSets: 3,
  defaultReps: 10,
  defaultExecutionTime: 4,
  defaultRestBetweenSets: 30,
};

const cardData: ExerciseExecutionCardData = {
  id: 'ex-1',
  displayName: 'Mostek biodrowy',
  imageUrls: ['/ex-1.jpg'],
  sets: 3,
  reps: 10,
  executionTime: 4,
  restSets: 30,
  patientDescription: 'Unieś biodra.',
};

const patientMapping = {
  id: 'm-1',
  exerciseId: 'ex-1',
  sets: 3,
  reps: 10,
  exercise,
} as unknown as ExerciseMapping;

/** Otwiera zakładkę „Jak u pacjenta” i zwraca czas przebiegu z przycisku „Przebieg”. */
async function openPatientView(prefix: string): Promise<string> {
  await userEvent.setup().click(screen.getByTestId(`${prefix}-tab-patient`));
  expect(screen.getByTestId(`${prefix}-patient-view`)).toBeInTheDocument();
  expect(screen.getByTestId(`${prefix}-patient-phone`)).toBeInTheDocument();
  return screen.getByTestId(`${prefix}-flow-btn`).textContent ?? '';
}

describe('„Jak u pacjenta” w każdym podglądzie ćwiczenia', () => {
  it('podgląd w zestawie (ExercisePreviewDialog) ma zakładkę z telefonem pacjenta', async () => {
    render(<ExercisePreviewDialog open exercise={cardData} onOpenChange={() => {}} testIdPrefix="set-preview" />);
    expect(await openPatientView('set-preview')).toMatch(/\d+:\d{2}/);
  });

  it('podgląd w planie pacjenta (ExercisePreviewDrawer) ma zakładkę z telefonem pacjenta', async () => {
    render(<ExercisePreviewDrawer open onOpenChange={() => {}} mapping={patientMapping} />);
    expect(await openPatientView('patient-exercise-preview')).toMatch(/\d+:\d{2}/);
  });

  it('nadpisanie z planu pacjenta zmienia przebieg na telefonie', async () => {
    const { unmount } = render(<ExercisePreviewDrawer open onOpenChange={() => {}} mapping={patientMapping} />);
    const planTime = await openPatientView('patient-exercise-preview');
    unmount();

    render(
      <ExercisePreviewDrawer
        open
        onOpenChange={() => {}}
        mapping={patientMapping}
        override={{ exerciseMappingId: 'm-1', sets: 1 } as ExerciseOverride}
      />
    );
    const overrideTime = await openPatientView('patient-exercise-preview');

    expect(overrideTime).not.toBe(planTime);
  });

  it('podgląd w kreatorze przypisania (ExerciseDetailsDialog) ma zakładkę z telefonem pacjenta', async () => {
    render(
      <ExerciseDetailsDialog
        open
        mapping={patientMapping as unknown as AssignmentExerciseMapping}
        onOpenChange={() => {}}
      />
    );
    expect(await openPatientView('assign-set-preview-exercise-details')).toMatch(/\d+:\d{2}/);
  });

  it('strona ćwiczenia i weryfikacja otwierają sam telefon (PatientPreviewDialog)', () => {
    render(
      <PatientPreviewDialog
        open
        onOpenChange={() => {}}
        exercise={cardData}
        testIdPrefix="exercise-detail-patient-preview"
      />
    );
    const dialog = screen.getByTestId('exercise-detail-patient-preview-dialog');
    expect(within(dialog).getByTestId('exercise-detail-patient-preview-title')).toHaveTextContent('Mostek biodrowy');
    expect(within(dialog).getByTestId('exercise-detail-patient-preview-patient-phone')).toBeInTheDocument();
  });

  it('zamknięty podgląd pacjenta nie renderuje telefonu', () => {
    render(<PatientPreviewDialog open={false} onOpenChange={() => {}} exercise={cardData} testIdPrefix="closed" />);
    expect(screen.queryByTestId('closed-patient-phone')).not.toBeInTheDocument();
  });
});

describe('buildPreviewGallery', () => {
  it('stawia miniaturę na początku, gdy nie ma jej w galerii', () => {
    expect(buildPreviewGallery({ imageUrls: ['/a.jpg'], thumbnailUrl: '/thumb.jpg' })).toEqual([
      '/thumb.jpg',
      '/a.jpg',
    ]);
  });

  it('nie dubluje miniatury obecnej w galerii i pomija puste wpisy', () => {
    expect(buildPreviewGallery({ imageUrls: ['/a.jpg', '  ', '/thumb.jpg'], thumbnailUrl: '/thumb.jpg' })).toEqual([
      '/a.jpg',
      '/thumb.jpg',
    ]);
  });

  it('bez ćwiczenia zwraca pustą listę', () => {
    expect(buildPreviewGallery(null)).toEqual([]);
  });
});
