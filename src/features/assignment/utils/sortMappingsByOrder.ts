interface OrderedMapping {
  order?: number | null;
}

/**
 * API does not guarantee mapping order; the wizard saves order from the builder index,
 * so mappings must be sorted before seeding. Returns a copy (Apollo cache objects stay untouched);
 * mappings without order keep their relative position after the ordered ones.
 */
export function sortMappingsByOrder<TMapping extends OrderedMapping>(
  mappings: readonly TMapping[] | null | undefined
): TMapping[] {
  return [...(mappings ?? [])].sort(
    (left, right) => (left.order ?? Number.POSITIVE_INFINITY) - (right.order ?? Number.POSITIVE_INFINITY)
  );
}
