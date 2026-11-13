import { describe, expect, it } from 'vitest';

import fixture from '@/components/shared/exercise/__tests__/fixtures/enrichmentV33.fx-0073.json';
import { collectV33Edits } from '@/components/shared/exercise/writeExerciseContent';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

import {
  acceptTherapistNoteInput,
  countV33AiFillSections,
  mergeV33AiFill,
  parseV33JsonDocument,
  pickV33AiFill,
  THERAPIST_NOTE_MAX_LENGTH,
} from '../enrichmentV33Document';

type Doc = Record<string, unknown>;

const loaded = fixture as ExerciseEnrichmentData;

function draftOf(document: ExerciseEnrichmentData = loaded): Doc {
  return JSON.parse(JSON.stringify(document)) as Doc;
}

function section(document: unknown, key: string): Doc {
  return (document as Doc)[key] as Doc;
}

describe('limit uwag klinicznych', () => {
  const full = 'a'.repeat(THERAPIST_NOTE_MAX_LENGTH);

  it('przyjmuje tekst do 600 znaków i ucina wklejony dłuższy', () => {
    expect(acceptTherapistNoteInput('', full)).toBe(full);
    expect(acceptTherapistNoteInput(full, `${full}b`)).toBe(full);
    expect(acceptTherapistNoteInput('', `${full}bcd`)).toHaveLength(THERAPIST_NOTE_MAX_LENGTH);
  });

  it('za długi tekst zapisany wcześniej wolno tylko skracać', () => {
    const tooLong = `${full}${'b'.repeat(40)}`;

    expect(acceptTherapistNoteInput(tooLong, `${tooLong}c`)).toBe(tooLong);
    expect(acceptTherapistNoteInput(tooLong, tooLong.slice(0, -1))).toBe(tooLong.slice(0, -1));
  });
});

describe('uzupełnianie przez AI', () => {
  const aiAnswer: ExerciseEnrichmentData = {
    patient: {
      summary: 'Podsumowanie AI.',
      steps: ['Krok AI.'],
      cues: ['Wskazówka AI.'],
      mistakes: [{ mistake: 'Błąd AI.', fix: 'Korekta AI.' }],
      why: 'Po co AI.',
      when_to_do: 'Kiedy AI.',
      should_feel: 'Czuć AI.',
      should_not_feel: 'Nie czuć AI.',
    },
    safety: { stop_if: 'Przerwij AI.', intensity_guide: '5/10', requires_supervision: true },
    therapist: { clinical_notes: 'Notatka AI.', indications: ['Wskazanie AI'], contraindications: ['Przeciwwskazanie AI'] },
    ai: { keywords: ['słowo'], problems: ['problem'] },
    equipment: ['mata'],
  };

  it('z odpowiedzi generatora zostają tylko pola o tym samym miejscu w 3.3', () => {
    expect(pickV33AiFill(aiAnswer)).toEqual({ patient: aiAnswer.patient, safety: { stop_if: 'Przerwij AI.' } });
    expect(pickV33AiFill(null)).toEqual({});
  });

  it('odpowiedź w starym kształcie v2 jest mapowana na te same pola', () => {
    expect(
      pickV33AiFill({ simplified_instruction: 'Skrót.', common_mistakes: [{ mistake: 'Błąd.', fix: 'Korekta.' }] })
    ).toEqual({ patient: { summary: 'Skrót.', mistakes: [{ mistake: 'Błąd.', fix: 'Korekta.' }] } });
  });

  it('wypełnia tylko puste pola i nie dopisuje do szkicu nic poza nimi', () => {
    const base = draftOf() as Doc;
    delete section(base, 'patient').why;
    section(base, 'safety').stop_if = '';

    const merged = mergeV33AiFill(base as ExerciseEnrichmentData, aiAnswer);

    expect(merged.patient?.why).toBe('Po co AI.');
    expect(merged.safety?.stop_if).toBe('Przerwij AI.');
    expect(merged.patient?.steps).toEqual(loaded.patient?.steps);
    expect(merged.breathing).toEqual(loaded.breathing);
    expect(merged.therapist).toEqual(loaded.therapist);
    expect(merged.equipment).toBeUndefined();
    expect(merged.safety?.intensity_guide).toBeUndefined();
    expect(Object.keys(collectV33Edits(base as ExerciseEnrichmentData, merged)).sort()).toEqual([
      'patient.why',
      'safety.stop_if',
    ]);
  });

  it('liczy sekcje, które AI umie uzupełnić', () => {
    expect(countV33AiFillSections(loaded)).toEqual({ filled: 7, total: 7 });
    expect(countV33AiFillSections({ schemaVersion: '3.3', patient: { summary: 'Opis.' } })).toEqual({ filled: 1, total: 7 });
  });
});

describe('panel JSON', () => {
  it('przyjmuje dokument, który zachował wersję', () => {
    expect(parseV33JsonDocument(JSON.stringify(loaded))).toEqual(loaded);
  });

  it.each([
    ['bez schemaVersion', { $schema: 'fiziyo-exercise-v3', patient: { summary: 'Opis.' } }],
    ['ze starszą wersją', { $schema: 'fiziyo-exercise-v3', schemaVersion: '3.2' }],
  ])('odrzuca dokument %s', (_name, document) => {
    expect(() => parseV33JsonDocument(JSON.stringify(document))).toThrow(/schemaVersion/);
  });
});
