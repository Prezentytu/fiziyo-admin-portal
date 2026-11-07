/**
 * One-click presets for short text parameters (opór, sprzęt).
 * `replace`: chip sets the value; clicking the active chip clears it.
 * `append`: chip toggles an item in a comma-separated list.
 */

export type TextSuggestionMode = 'replace' | 'append';

const LIST_SEPARATOR = ', ';

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function sameItem(left: string, right: string): boolean {
  return left.localeCompare(right, 'pl', { sensitivity: 'base' }) === 0;
}

export function isTextSuggestionActive(
  value: string,
  suggestion: string,
  mode: TextSuggestionMode
): boolean {
  if (mode === 'replace') return sameItem(value.trim(), suggestion);
  return splitList(value).some((item) => sameItem(item, suggestion));
}

export function applyTextSuggestion(
  value: string,
  suggestion: string,
  mode: TextSuggestionMode
): string {
  if (mode === 'replace') {
    return sameItem(value.trim(), suggestion) ? '' : suggestion;
  }
  const items = splitList(value);
  const withoutSuggestion = items.filter((item) => !sameItem(item, suggestion));
  if (withoutSuggestion.length !== items.length) {
    return withoutSuggestion.join(LIST_SEPARATOR);
  }
  return [...items, suggestion].join(LIST_SEPARATOR);
}

/** Stable data-testid fragment: "Bardzo mocny" → "bardzo-mocny", "Ręcznik" → "recznik". */
export function suggestionTestIdSlug(suggestion: string): string {
  return suggestion
    .toLowerCase()
    .replaceAll('ł', 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
