import { describe, expect, it } from 'vitest';
import { PLAN_VERSION_STARTS_TOMORROW, planVersionSavedNotice } from '../planVersionNotice';

describe('planVersionSavedNotice', () => {
  const now = new Date('2026-11-15T10:00:00Z');

  it('mówi o starcie od jutra, gdy wersja startuje w przyszłości', () => {
    expect(planVersionSavedNotice('2026-11-15T23:00:00Z', now)).toBe(PLAN_VERSION_STARTS_TOMORROW);
  });

  it('nic nie dodaje, gdy wersja już obowiązuje', () => {
    expect(planVersionSavedNotice('2026-11-15T09:59:59Z', now)).toBeNull();
  });

  it('nic nie dodaje bez wersji albo przy nieczytelnej dacie (starszy backend)', () => {
    expect(planVersionSavedNotice(null, now)).toBeNull();
    expect(planVersionSavedNotice(undefined, now)).toBeNull();
    expect(planVersionSavedNotice('nie-data', now)).toBeNull();
  });
});
