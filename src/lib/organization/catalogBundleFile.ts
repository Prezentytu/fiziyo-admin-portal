export const MAX_CATALOG_BUNDLE_CHARS = 2_000_000;

export type CatalogBundleFileCheck =
  | { ok: true }
  | { ok: false; error: string };

export function checkCatalogBundleText(text: string): CatalogBundleFileCheck {
  if (text.length > MAX_CATALOG_BUNDLE_CHARS) {
    return {
      ok: false,
      error: 'Plik za duży. Wgraj jedną paczkę (exercises-001.json, ok. 75 ćwiczeń), nie cały katalog naraz.',
    };
  }

  try {
    JSON.parse(text);
  } catch {
    return {
      ok: false,
      error: 'To nie jest poprawny JSON. Sprawdź, czy AI zwróciło kompletny obiekt.',
    };
  }

  return { ok: true };
}
