import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { StageIssue } from '@/features/verification/utils/verificationStages';

import { ContentGapsNotice, listExerciseContentGaps } from './ContentGapsNotice';

const gaps: StageIssue[] = [
  { stage: 'material', text: 'Dodaj zdjęcie albo wideo' },
  { stage: 'instruction', text: 'Dodaj opis dla pacjenta' },
];

describe('ContentGapsNotice', () => {
  afterEach(cleanup);

  it('każdy brak włącza edycję, gdy ćwiczenie da się edytować', async () => {
    const onFix = vi.fn();
    render(<ContentGapsNotice gaps={gaps} onFix={onFix} />);

    await userEvent.click(screen.getByRole('button', { name: 'Dodaj opis dla pacjenta' }));

    expect(onFix).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('bez edycji braki zostają tekstem', () => {
    render(<ContentGapsNotice gaps={gaps} />);

    expect(screen.getByTestId('exercise-detail-content-gaps')).toHaveTextContent('Dodaj zdjęcie albo wideo');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('nic nie renderuje bez braków', () => {
    const { container } = render(<ContentGapsNotice gaps={[]} onFix={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('listExerciseContentGaps', () => {
  const media = { hasVideo: true, imageCount: 1 };
  const longDescription = 'Stań prosto, stopy na szerokość bioder, zrób przysiad do krzesła i wróć.';

  it('rekord 3.3 z krokami nie ma braków, choć stare kolumny opisu i „Przerwij, gdy” są puste', () => {
    const enrichmentData = { schemaVersion: '3.3', patient: { steps: ['Usiądź.', 'Wstań.'] } };

    expect(
      listExerciseContentGaps({
        exercise: { name: 'Przysiad do krzesła', patientDescription: '', clinicalDescription: '', enrichmentData },
        enrichment: enrichmentData,
        ...media,
      })
    ).toEqual([]);
  });

  it('rekord 3.3 bez kroków zgłasza brak kroków, nawet gdy stara kolumna opisu jest wypełniona', () => {
    const enrichmentData = { schemaVersion: '3.3', patient: { steps: [' '] }, safety: { stop_if: 'Ostry ból' } };

    expect(
      listExerciseContentGaps({
        exercise: {
          name: 'Przysiad do krzesła',
          patientDescription: longDescription,
          clinicalDescription: 'Wzorzec przysiadu, kontrola kolan.',
          enrichmentData,
        },
        enrichment: enrichmentData,
        ...media,
      })
    ).toEqual([{ stage: 'instruction', text: 'Dodaj co najmniej jeden krok wykonania.' }]);
  });

  it('rekord stary liczy braki jak dotąd: z kolumn opisu i „Przerwij, gdy” ze szkicu', () => {
    const texts = (gaps: StageIssue[]) => gaps.map((gap) => gap.stage);
    const exercise = { name: 'Przysiad', description: longDescription, clinicalDescription: 'Wzorzec przysiadu, kontrola kolan.' };

    expect(listExerciseContentGaps({ exercise, enrichment: { safety: { stop_if: 'Ostry ból' } }, ...media })).toEqual([]);
    expect(texts(listExerciseContentGaps({ exercise, enrichment: {}, ...media }))).toEqual(['safety']);
    expect(
      texts(listExerciseContentGaps({ exercise: { ...exercise, description: '' }, enrichment: {}, ...media }))
    ).toEqual(['instruction', 'safety']);
  });
});
