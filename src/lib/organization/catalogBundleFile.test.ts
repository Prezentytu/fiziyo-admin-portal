import { describe, expect, it } from 'vitest';

import { checkCatalogBundleText, MAX_CATALOG_BUNDLE_CHARS } from './catalogBundleFile';

describe('checkCatalogBundleText', () => {
  it('akceptuje poprawny JSON', () => {
    expect(checkCatalogBundleText('{"exercises":[]}')).toEqual({ ok: true });
  });

  it('odrzuca uszkodzony JSON', () => {
    const result = checkCatalogBundleText('{');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/JSON/);
    }
  });

  it('odrzuca plik powyżej limitu znaków', () => {
    const result = checkCatalogBundleText('{"a":"' + 'x'.repeat(MAX_CATALOG_BUNDLE_CHARS) + '"}');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/za duży/);
    }
  });
});
