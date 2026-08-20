import { describe, expect, it } from 'vitest';

import { canImportCatalog } from './catalogImportAccess';

describe('canImportCatalog', () => {
  it('wpuszcza fizjo i zarządzających org, bez extra uprawnień', () => {
    expect(canImportCatalog('therapist')).toBe(true);
    expect(canImportCatalog('Owner')).toBe(true);
    expect(canImportCatalog('admin')).toBe(true);
    expect(canImportCatalog('staff')).toBe(true);
  });

  it('blokuje pacjenta i brak roli', () => {
    expect(canImportCatalog('patient')).toBe(false);
    expect(canImportCatalog('member')).toBe(false);
    expect(canImportCatalog(null)).toBe(false);
    expect(canImportCatalog(undefined)).toBe(false);
  });
});
