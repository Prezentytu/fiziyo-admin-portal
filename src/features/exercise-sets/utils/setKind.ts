interface SetKindFields {
  kind?: string | null;
  isTemplate?: boolean | null;
  templateSource?: string | null;
}

/** Szablon zestawu: nowe `kind` albo legacy flaga `isTemplate`. */
export function isTemplateSet(set: SetKindFields): boolean {
  return set.kind === 'TEMPLATE' || set.isTemplate === true;
}

export function isFiziyoTemplate(set: SetKindFields): boolean {
  return isTemplateSet(set) && set.templateSource === 'FIZIYO_VERIFIED';
}

/** Szablon prywatny organizacji (brak `templateSource` traktujemy jak prywatny). */
export function isMyTemplate(set: SetKindFields): boolean {
  return (
    isTemplateSet(set) &&
    (set.templateSource === 'ORGANIZATION_PRIVATE' || set.templateSource === 'ORG_PRIVATE' || !set.templateSource)
  );
}

export function isPatientPlan(set: SetKindFields): boolean {
  return set.kind === 'PATIENT_PLAN';
}

/**
 * Liczba pacjentów na karcie zestawu. Plan pacjenta liczy swoje przypisania z listy. Szablon nie ma przypisań
 * wprost (przypisanie robi kopię), z wyjątkiem zestawu na start (SPEC-064 w fizjo-app): wtedy liczy backend
 * (`activeAssignmentCount`, tylko aktywne i widoczne dla wołającego).
 */
export function setPatientCount(
  set: SetKindFields & { activeAssignmentCount?: number | null },
  visibleAssignmentCount: number
): number {
  return isTemplateSet(set) ? (set.activeAssignmentCount ?? 0) : visibleAssignmentCount;
}
