import { describe, expect, it } from 'vitest';

import { resolveCatalogEmptyCopy } from './catalogEmptyState';

describe('resolveCatalogEmptyCopy', () => {
  it('does not use w przygotowaniu or on demand', () => {
    const copy = resolveCatalogEmptyCopy({
      sourceFilter: 'fiziyo',
      isSearch: false,
      fiziyoCount: 0,
      ownCount: 0,
    });
    const blob = `${copy.title} ${copy.description}`.toLowerCase();
    expect(blob).not.toContain('przygotowaniu');
    expect(blob).not.toContain('on demand');
    expect(blob).not.toContain('wkrótce');
    expect(copy.showImport).toBe(true);
    expect(copy.showCreate).toBe(true);
  });

  it('offers browse catalog from the mine tab when FiziYo rows exist', () => {
    const copy = resolveCatalogEmptyCopy({
      sourceFilter: 'organization',
      isSearch: false,
      fiziyoCount: 200,
      ownCount: 0,
    });
    expect(copy.showBrowseCatalog).toBe(true);
    expect(copy.title).toBe('Nie masz jeszcze własnych ćwiczeń');
  });
});
