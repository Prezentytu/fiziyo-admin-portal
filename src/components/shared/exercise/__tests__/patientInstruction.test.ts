import { describe, expect, it } from 'vitest';

import { applyEnrichmentOverride } from '../enrichmentOverride';
import { resolvePatientInstruction } from '../patientInstruction';
import {
  emptyExercise,
  goldenV33Document,
  LEGACY_DESCRIPTION,
  LEGACY_STEPS_TEXT,
  legacyStepsOnly,
  legacyWithDescription,
  V33_STEPS_TEXT,
  v33WithStaleColumn,
} from './fixtures/instructionRecords';

describe('resolvePatientInstruction', () => {
  it('rekord stary z opisem: opis z kolumny, z pustymi liniami w środku', () => {
    expect(resolvePatientInstruction({ exercise: legacyWithDescription })).toEqual({
      text: LEGACY_DESCRIPTION,
      source: 'description',
    });
  });

  it('rekord stary czyta też starszą nazwę kolumny opisu', () => {
    expect(resolvePatientInstruction({ exercise: { description: 'Opis ze starej nazwy' } }).text).toBe(
      'Opis ze starej nazwy'
    );
  });

  it('rekord stary bez opisu: podsumowanie i ponumerowane kroki', () => {
    expect(resolvePatientInstruction({ exercise: legacyStepsOnly })).toEqual({
      text: LEGACY_STEPS_TEXT,
      source: 'steps',
    });
  });

  it('rekord 3.3: podsumowanie i kroki, kolumna opisu pominięta, choć wypełniona', () => {
    expect(resolvePatientInstruction({ exercise: v33WithStaleColumn })).toEqual({
      text: V33_STEPS_TEXT,
      source: 'steps',
    });
  });

  it('nadpisanie wygrywa w obu wersjach', () => {
    for (const exercise of [legacyWithDescription, v33WithStaleColumn]) {
      expect(resolvePatientInstruction({ override: ' Opis dla Jana ', exercise })).toEqual({
        text: 'Opis dla Jana',
        source: 'override',
      });
    }
  });

  it('puste nadpisanie nie jest nadpisaniem', () => {
    for (const override of ['', '   ', null, undefined]) {
      expect(resolvePatientInstruction({ override, exercise: legacyWithDescription }).source).toBe('description');
      expect(resolvePatientInstruction({ override, exercise: v33WithStaleColumn }).source).toBe('steps');
    }
  });

  it('kroki po nadpisaniach pozycji wygrywają z krokami szablonu', () => {
    const enrichment = applyEnrichmentOverride(goldenV33Document, { patient: { steps: ['Tylko napnij udo.'] } });
    expect(resolvePatientInstruction({ exercise: v33WithStaleColumn, enrichment }).text).toBe(
      `${goldenV33Document.patient?.summary}\n1. Tylko napnij udo.`
    );
  });

  it('rekord 3.3 bez znacznika $schema nie wraca do kolumny, gdy treść przeszła przez nadpisania', () => {
    const { $schema: _schema, ...withoutMarker } = goldenV33Document;
    const exercise = { ...v33WithStaleColumn, enrichmentData: withoutMarker };
    const enrichment = applyEnrichmentOverride(withoutMarker, null);
    expect(resolvePatientInstruction({ exercise, enrichment }).text).toBe(V33_STEPS_TEXT);
  });

  it('rekord 3.3 bez kroków i podsumowania nie ma instrukcji mimo wypełnionej kolumny', () => {
    const exercise = { patientDescription: 'STARY OPIS', enrichmentData: { schemaVersion: '3.3' } };
    expect(resolvePatientInstruction({ exercise })).toEqual({ text: null, source: 'none' });
  });

  it('brak rekordu albo brak treści: brak instrukcji', () => {
    expect(resolvePatientInstruction({})).toEqual({ text: null, source: 'none' });
    expect(resolvePatientInstruction({ exercise: emptyExercise })).toEqual({ text: null, source: 'none' });
  });
});
