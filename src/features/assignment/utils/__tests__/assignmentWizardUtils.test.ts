import { describe, expect, it } from 'vitest';
import { canProceedFromStep, type CanProceedContext } from '../assignmentWizardUtils';

function ctx(overrides: Partial<CanProceedContext> = {}): CanProceedContext {
  return {
    selectedSet: null,
    builderInstancesLength: 0,
    planNameTrimLength: 0,
    selectedPatientsCount: 0,
    ...overrides,
  };
}

describe('canProceedFromStep', () => {
  describe('select-set', () => {
    it('returns false when no set selected', () => {
      expect(canProceedFromStep('select-set', ctx())).toBe(false);
    });
    it('returns true when set is selected', () => {
      expect(canProceedFromStep('select-set', ctx({ selectedSet: { id: '1', name: 'Set' } }))).toBe(true);
    });
  });

  describe('customize-set', () => {
    it('returns false when no exercises in builder', () => {
      expect(canProceedFromStep('customize-set', ctx({ planNameTrimLength: 5 }))).toBe(false);
    });
    it('returns false when plan name too short', () => {
      expect(canProceedFromStep('customize-set', ctx({ builderInstancesLength: 1, planNameTrimLength: 1 }))).toBe(false);
    });
    it('returns true when at least one exercise and name has 2+ chars', () => {
      expect(canProceedFromStep('customize-set', ctx({ builderInstancesLength: 1, planNameTrimLength: 2 }))).toBe(true);
      expect(canProceedFromStep('customize-set', ctx({ builderInstancesLength: 3, planNameTrimLength: 10 }))).toBe(true);
    });
  });

  describe('select-patients', () => {
    it('returns false when no patients selected', () => {
      expect(canProceedFromStep('select-patients', ctx())).toBe(false);
    });
    it('returns true when at least one patient selected', () => {
      expect(canProceedFromStep('select-patients', ctx({ selectedPatientsCount: 1 }))).toBe(true);
    });
  });

  describe('schedule and summary', () => {
    it('returns true regardless of context', () => {
      expect(canProceedFromStep('schedule', ctx())).toBe(true);
      expect(canProceedFromStep('summary', ctx())).toBe(true);
    });
  });
});
