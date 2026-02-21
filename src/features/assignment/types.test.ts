import { describe, expect, it } from 'vitest';
import { getWizardSteps } from './types';

describe('getWizardSteps', () => {
  it('includes select-set only in from-patient mode when no set is preselected', () => {
    const steps = getWizardSteps('from-patient', false, false, false);
    const ids = steps.map((s) => s.id);
    expect(ids[0]).toBe('select-set');
    expect(ids).toContain('customize-set');
    expect(ids).toContain('select-patients');
    expect(ids).toContain('schedule');
    expect(ids).toContain('summary');
  });

  it('omits select-set when set is preselected (from-patient)', () => {
    const steps = getWizardSteps('from-patient', true, false, false);
    const ids = steps.map((s) => s.id);
    expect(ids[0]).toBe('customize-set');
    expect(ids).not.toContain('select-set');
  });

  it('omits select-patients when patient is preselected', () => {
    const steps = getWizardSteps('from-patient', true, true, false);
    const ids = steps.map((s) => s.id);
    expect(ids).not.toContain('select-patients');
    expect(ids).toContain('customize-set');
    expect(ids).toContain('schedule');
    expect(ids).toContain('summary');
  });

  it('from-set with no preselected patient returns customize-set, select-patients, schedule, summary', () => {
    const steps = getWizardSteps('from-set', true, false, false);
    const ids = steps.map((s) => s.id);
    expect(ids).not.toContain('select-set');
    expect(ids).toEqual(['customize-set', 'select-patients', 'schedule', 'summary']);
  });

  it('customize-set label is "Nowy zestaw" when isCreatingNewSet is true', () => {
    const steps = getWizardSteps('from-patient', false, false, true);
    const customize = steps.find((s) => s.id === 'customize-set');
    expect(customize?.label).toBe('Nowy zestaw');
    expect(customize?.description).toBe('Utwórz zestaw ćw.');
  });

  it('customize-set label is "Personalizacja" when isCreatingNewSet is false', () => {
    const steps = getWizardSteps('from-patient', true, false, false);
    const customize = steps.find((s) => s.id === 'customize-set');
    expect(customize?.label).toBe('Personalizacja');
    expect(customize?.description).toBe('Dostosuj ćwiczenia');
  });

  it('summary is always the last step', () => {
    expect(getWizardSteps('from-patient', false, false, false).slice(-1)[0].id).toBe('summary');
    expect(getWizardSteps('from-set', true, true, false).slice(-1)[0].id).toBe('summary');
  });
});
