import { describe, expect, it } from 'vitest';
import { computeVerificationCompletion } from '../computeVerificationCompletion';

const validInput = {
  name: 'Przysiad',
  patientDescription: 'A'.repeat(50),
  clinicalDescription: 'B'.repeat(20),
  sets: 3,
  reps: 10,
  executionTime: null,
  duration: null,
  hasMedia: true,
};

describe('computeVerificationCompletion', () => {
  it('marks completion as valid at 100% when all critical checks pass', () => {
    const result = computeVerificationCompletion(validInput);

    expect(result.isValid).toBe(true);
    expect(result.missingFields).toHaveLength(0);
    expect(result.percentage).toBe(100);
  });

  it('accepts executionTime or duration as an alternative to reps for volume', () => {
    const byExecutionTime = computeVerificationCompletion({ ...validInput, reps: null, executionTime: 30 });
    const byDuration = computeVerificationCompletion({ ...validInput, reps: null, duration: 30 });

    expect(byExecutionTime.isValid).toBe(true);
    expect(byDuration.isValid).toBe(true);
  });

  it('flags a too-short patient description as missing', () => {
    const result = computeVerificationCompletion({ ...validInput, patientDescription: 'zbyt krótki' });

    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Opis pacjenta (min. 50 znaków)');
  });

  it('flags a too-short clinical description as missing', () => {
    const result = computeVerificationCompletion({ ...validInput, clinicalDescription: 'krótko' });

    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Opis kliniczny (min. 20 znaków)');
  });

  it('flags missing sets', () => {
    const result = computeVerificationCompletion({ ...validInput, sets: null });

    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Liczba serii');
  });

  it('flags missing volume when reps, executionTime and duration are all empty', () => {
    const result = computeVerificationCompletion({ ...validInput, reps: null, executionTime: null, duration: null });

    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Powtórzenia lub czas');
  });

  it('flags a missing or too-short name', () => {
    const result = computeVerificationCompletion({ ...validInput, name: 'A' });

    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Nazwa ćwiczenia');
  });

  it('flags missing media', () => {
    const result = computeVerificationCompletion({ ...validInput, hasMedia: false });

    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('Media (wideo lub zdjęcie)');
  });

  it('does not flag missing tags since tags are hidden globally', () => {
    const result = computeVerificationCompletion({ ...validInput, mainTagsCount: 0 });

    expect(result.missingFields).not.toContain('Tagi główne');
  });

  it('clamps percentage to 0 when every critical check fails', () => {
    const result = computeVerificationCompletion({
      name: '',
      patientDescription: '',
      clinicalDescription: '',
      sets: null,
      reps: null,
      executionTime: null,
      duration: null,
      hasMedia: false,
    });

    expect(result.percentage).toBe(0);
    expect(result.isValid).toBe(false);
  });
});
