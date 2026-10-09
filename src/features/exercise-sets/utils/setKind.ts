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
