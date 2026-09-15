/**
 * Empty starter rows (placeholder-only) should not look deletable:
 * removing the last blank row just recreates the same placeholder.
 */
export function canRemovePlaceholderRow<T>(
  items: readonly T[],
  index: number,
  isRowEmpty: (item: T) => boolean
): boolean {
  if (index < 0 || index >= items.length) return false;
  if (items.length > 1) return true;
  return !isRowEmpty(items[index]);
}

export function isBlankText(value: string | null | undefined): boolean {
  return !value?.trim();
}

export function isMistakeRowEmpty(item: { mistake?: string | null; fix?: string | null }): boolean {
  return isBlankText(item.mistake) && isBlankText(item.fix);
}
