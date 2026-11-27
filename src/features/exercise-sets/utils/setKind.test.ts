import { describe, expect, it } from 'vitest';
import { isFiziyoTemplate, isMyTemplate, isPatientPlan, isTemplateSet, setPatientCount } from './setKind';

describe('setKind', () => {
  it('treats kind TEMPLATE and legacy isTemplate as templates', () => {
    expect(isTemplateSet({ kind: 'TEMPLATE' })).toBe(true);
    expect(isTemplateSet({ kind: null, isTemplate: true })).toBe(true);
    expect(isTemplateSet({ kind: 'PATIENT_PLAN', isTemplate: false })).toBe(false);
  });

  it('splits templates by source', () => {
    expect(isFiziyoTemplate({ kind: 'TEMPLATE', templateSource: 'FIZIYO_VERIFIED' })).toBe(true);
    expect(isMyTemplate({ kind: 'TEMPLATE', templateSource: 'FIZIYO_VERIFIED' })).toBe(false);
    expect(isMyTemplate({ kind: 'TEMPLATE', templateSource: 'ORG_PRIVATE' })).toBe(true);
    expect(isMyTemplate({ kind: 'TEMPLATE', templateSource: 'ORGANIZATION_PRIVATE' })).toBe(true);
    expect(isMyTemplate({ isTemplate: true })).toBe(true);
    expect(isMyTemplate({ kind: 'PATIENT_PLAN' })).toBe(false);
  });

  it('detects patient plans', () => {
    expect(isPatientPlan({ kind: 'PATIENT_PLAN' })).toBe(true);
    expect(isPatientPlan({ kind: 'TEMPLATE' })).toBe(false);
  });

  it('counts template patients from the backend (starter set), plans from their visible assignments', () => {
    expect(setPatientCount({ kind: 'TEMPLATE', activeAssignmentCount: 12 }, 0)).toBe(12);
    expect(setPatientCount({ kind: 'TEMPLATE' }, 3)).toBe(0);
    expect(setPatientCount({ kind: 'PATIENT_PLAN', activeAssignmentCount: 5 }, 1)).toBe(1);
  });
});
