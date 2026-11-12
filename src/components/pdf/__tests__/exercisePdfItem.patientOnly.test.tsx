import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../pdfImagePreloader', () => ({ preloadPdfImages: vi.fn() }));
vi.mock('@react-pdf/renderer', () => ({
  View: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  Image: () => <img alt="" />,
  StyleSheet: { create: <T,>(styles: T) => styles },
  Font: { register: vi.fn(), registerHyphenationCallback: vi.fn() },
}));

import { goldenV33Document } from '@/components/shared/exercise/__tests__/fixtures/instructionRecords';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { ExercisePDFItem } from '../ExercisePDFItem';
import { toPdfExercise } from '../pdfExerciseUtils';

const MARK = 'TYLKO-DLA-FIZJO';

/** Every text outside `patient` (therapist, team, AI, classification, safety codes) gets a marker. */
function markNonPatientTexts(value: unknown, path: string): unknown {
  if (typeof value === 'string') return `${MARK}:${path}`;
  if (Array.isArray(value)) return value.map((item, index) => markNonPatientTexts(item, `${path}.${index}`));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, markNonPatientTexts(nested, `${path}.${key}`)])
    );
  }
  return value;
}

const { $schema, schemaVersion, patient, ...nonPatientSections } = goldenV33Document;
const markedDocument = {
  $schema,
  schemaVersion,
  patient,
  ...(markNonPatientTexts(nonPatientSections, 'enrichment') as object),
} as ExerciseEnrichmentData;

const exercise = {
  id: 'ex-v33',
  name: 'Izometria czworogłowego',
  type: 'REPS',
  patientDescription: `${MARK}:kolumna-opis`,
  clinicalDescription: `${MARK}:kolumna-opis-kliniczny`,
  notes: `${MARK}:kolumna-notatka`,
  audioCue: `${MARK}:kolumna-audio`,
  adminReviewNotes: `${MARK}:notatka-recenzenta`,
  internalNotes: `${MARK}:notatki-zespolu`,
  enrichmentData: markedDocument,
};

function renderedText(compact: boolean): string {
  const pdfExercise = toPdfExercise({ id: 'm-1', exercise });
  const { container } = render(<ExercisePDFItem exercise={pdfExercise} index={0} showImage={false} compact={compact} />);
  return container.textContent ?? '';
}

describe('wydruk dla pacjenta: rekord 3.3', () => {
  it('drukuje podsumowanie i kroki pacjenta', () => {
    const text = renderedText(false);

    expect(text).toContain(String(patient?.summary));
    for (const step of patient?.steps ?? []) expect(text).toContain(step);
  });

  it.each([
    ['pełna karta', false],
    ['karta zwarta', true],
  ])('%s nie zawiera żadnego pola fizjoterapeuty, zespołu ani wycofanej kolumny', (_label, compact) => {
    // The marked document really carries the sections this test guards.
    const marked = JSON.stringify(markedDocument);
    for (const section of ['therapist', 'safety', 'classification', 'provenance', 'lifecycle', 'ai', 'media']) {
      expect(marked).toContain(`${MARK}:enrichment.${section}`);
    }

    expect(renderedText(compact)).not.toContain(MARK);
  });

  it('uwaga z pozycji planu trafia na wydruk, notatka z katalogu nie', () => {
    const pdfExercise = toPdfExercise({ id: 'm-1', notes: 'Ćwicz rano.', exercise });
    const { container } = render(<ExercisePDFItem exercise={pdfExercise} index={0} showImage={false} compact={false} />);

    expect(container.textContent).toContain('Uwaga: Ćwicz rano.');
    expect(container.textContent).not.toContain(MARK);
  });
});
