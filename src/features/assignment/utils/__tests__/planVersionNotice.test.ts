import { describe, expect, it } from 'vitest';
import {
  PLAN_EDIT_CORRECTION_SUMMARY,
  PLAN_EDIT_RESTART_SUMMARY,
  PLAN_RESTART_STARTS_TODAY,
  PLAN_RESTART_STARTS_TOMORROW,
  planEditSummary,
  planRestartNotice,
} from '../planVersionNotice';

describe('planEditSummary', () => {
  it('bez odnowienia mówi, że postęp pacjenta zostaje', () => {
    expect(planEditSummary(false)).toBe(PLAN_EDIT_CORRECTION_SUMMARY);
  });

  it('z odnowieniem mówi o postępie od zera i starcie od jutra', () => {
    expect(planEditSummary(true)).toBe(PLAN_EDIT_RESTART_SUMMARY);
  });
});

describe('planRestartNotice', () => {
  it('rozróżnia start dziś i jutro', () => {
    expect(planRestartNotice(false)).toBe(PLAN_RESTART_STARTS_TODAY);
    expect(planRestartNotice(true)).toBe(PLAN_RESTART_STARTS_TOMORROW);
  });
});
