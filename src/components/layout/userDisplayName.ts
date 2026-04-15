const NAME_ELLIPSIS = '...';

function normalizeWhitespace(value: string): string {
  return value.replaceAll(/\s+/g, ' ').trim();
}

export function resolveDisplayName(
  fullName?: string | null,
  firstName?: string | null,
  lastName?: string | null
): string {
  const composedName = normalizeWhitespace([firstName, lastName].filter(Boolean).join(' '));
  if (composedName) {
    return composedName;
  }

  return fullName ? normalizeWhitespace(fullName) : '';
}

export function getCompactDisplayName(displayName: string, maxLength: number = 30): string {
  const normalizedName = normalizeWhitespace(displayName);
  if (!normalizedName || normalizedName.length <= maxLength) {
    return normalizedName;
  }

  const truncationLength = maxLength - NAME_ELLIPSIS.length;
  if (truncationLength <= 1) {
    return normalizedName.slice(0, maxLength);
  }

  const nameParts = normalizedName.split(' ');
  if (nameParts.length >= 2) {
    const firstNamePart = nameParts[0];
    const lastNamePart = nameParts.at(-1) ?? '';
    const availableLastNameLength = truncationLength - firstNamePart.length - 1;

    if (availableLastNameLength >= 2) {
      return `${firstNamePart} ${lastNamePart.slice(0, availableLastNameLength)}${NAME_ELLIPSIS}`;
    }
  }

  return `${normalizedName.slice(0, truncationLength).trimEnd()}${NAME_ELLIPSIS}`;
}
