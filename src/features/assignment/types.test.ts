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
    expect(ids).not.toContain('summary');
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
  });

  it('from-set with no preselected patient returns customize-set, select-patients, schedule', () => {
    const steps = getWizardSteps('from-set', true, false, false);
    const ids = steps.map((s) => s.id);
    expect(ids).not.toContain('select-set');
    expect(ids).toEqual(['customize-set', 'select-patients', 'schedule']);
  });

  it('dashboard flow has the four v4 steps: Zestaw, Plan, Pacjenci, Harmonogram', () => {
    const steps = getWizardSteps('from-patient', false, false, false);
    expect(steps.map((step) => step.label)).toEqual(['Zestaw', 'Plan', 'Pacjenci', 'Harmonogram']);
  });

  it('customize-set is labelled "Plan" also when creating a new set', () => {
    const steps = getWizardSteps('from-patient', false, false, true);
    const customize = steps.find((s) => s.id === 'customize-set');
    expect(customize?.label).toBe('Plan');
    expect(customize?.description).toBe('Utwórz plan pacjenta');
  });

  it('schedule is always the last step (summary lives in its aside)', () => {
    expect(getWizardSteps('from-patient', false, false, false).slice(-1)[0].id).toBe('schedule');
    expect(getWizardSteps('from-set', true, true, false).slice(-1)[0].id).toBe('schedule');
  });

  it('returns edit flow steps when edit mode is enabled', () => {
    const steps = getWizardSteps('from-patient', true, true, false, true);
    expect(steps.map((step) => step.id)).toEqual(['customize-set', 'schedule']);
    expect(steps[0]?.label).toBe('Plan');
  });
});
