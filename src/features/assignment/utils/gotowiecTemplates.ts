import type { ExerciseSet, WizardStep, WizardStepConfig } from '../types';

export interface ClinicalCaseChip {
  id: string;
  label: string;
  patterns: readonly string[];
}

/** Body-region chips derived from name/description/exercise titles — no GraphQL field. */
export const CLINICAL_CASE_CHIPS: readonly ClinicalCaseChip[] = [
  { id: 'kolano', label: 'Kolano', patterns: ['kolan', 'skoczka'] },
  { id: 'bark', label: 'Bark', patterns: ['bark'] },
  { id: 'kregoslup', label: 'Kręgosłup', patterns: ['kręgosłup', 'kregoslup', 'lędźwi', 'ledzwi', 'plecy'] },
  { id: 'biodro', label: 'Biodro', patterns: ['biodr'] },
  { id: 'kostka', label: 'Kostka', patterns: ['kostk', 'skokow'] },
  { id: 'szyja', label: 'Szyja', patterns: ['szyj', 'kark'] },
  { id: 'lokiec', label: 'Łokieć', patterns: ['łok', 'lokiec'] },
];

const GOTOWIEC_SKIP_STEPS = new Set<WizardStep>(['customize-set', 'schedule']);

export function isFiziyoVerifiedTemplate(set: Pick<ExerciseSet, 'kind' | 'isTemplate' | 'templateSource'>): boolean {
  const isTemplate = set.kind === 'TEMPLATE' || set.isTemplate === true;
  return isTemplate && set.templateSource === 'FIZIYO_VERIFIED';
}

export function exerciseCount(set: Pick<ExerciseSet, 'exerciseMappings'>): number {
  return set.exerciseMappings?.length ?? 0;
}

export function canFastAssignGotowiec(set: ExerciseSet): boolean {
  return isFiziyoVerifiedTemplate(set) && exerciseCount(set) > 0;
}

export function collectGotowiecHaystack(set: Pick<ExerciseSet, 'name' | 'description' | 'exerciseMappings'>): string {
  const exerciseText = (set.exerciseMappings ?? [])
    .flatMap((mapping) => [
      mapping.customName,
      mapping.exercise?.name,
      mapping.exercise?.description,
      ...(mapping.exercise?.mainTags ?? []),
      ...(mapping.exercise?.additionalTags ?? []),
    ])
    .filter((value): value is string => Boolean(value));
  return [set.name, set.description, ...exerciseText].join(' ').toLowerCase();
}

export function clinicalCasesForSet(set: Pick<ExerciseSet, 'name' | 'description' | 'exerciseMappings'>): ClinicalCaseChip[] {
  const haystack = collectGotowiecHaystack(set);
  return CLINICAL_CASE_CHIPS.filter((chip) => chip.patterns.some((pattern) => haystack.includes(pattern)));
}

export function availableClinicalCases(sets: ReadonlyArray<ExerciseSet>): ClinicalCaseChip[] {
  const present = new Set<string>();
  for (const set of sets) {
    for (const chip of clinicalCasesForSet(set)) {
      present.add(chip.id);
    }
  }
  return CLINICAL_CASE_CHIPS.filter((chip) => present.has(chip.id));
}

export function matchesClinicalCase(
  set: Pick<ExerciseSet, 'name' | 'description' | 'exerciseMappings'>,
  caseId: string | null
): boolean {
  if (!caseId) return true;
  return clinicalCasesForSet(set).some((chip) => chip.id === caseId);
}

export function filterGotowce(
  sets: ReadonlyArray<ExerciseSet>,
  query: string,
  caseId: string | null
): ExerciseSet[] {
  const lower = query.trim().toLowerCase();
  return sets.filter((set) => {
    if (!matchesClinicalCase(set, caseId)) return false;
    if (!lower) return true;
    return collectGotowiecHaystack(set).includes(lower);
  });
}

export function partitionAssignableSets(sets: ReadonlyArray<ExerciseSet>): {
  gotowce: ExerciseSet[];
  otherTemplates: ExerciseSet[];
} {
  const gotowce: ExerciseSet[] = [];
  const otherTemplates: ExerciseSet[] = [];
  for (const set of sets) {
    if (isFiziyoVerifiedTemplate(set)) {
      gotowce.push(set);
    } else {
      otherTemplates.push(set);
    }
  }
  return { gotowce, otherTemplates };
}

export function mergeTemplateSets(
  organizationSets: ReadonlyArray<ExerciseSet>,
  fiziyoSets: ReadonlyArray<ExerciseSet>
): ExerciseSet[] {
  const byId = new Map<string, ExerciseSet>();
  for (const set of fiziyoSets) {
    byId.set(set.id, set);
  }
  for (const set of organizationSets) {
    if (!byId.has(set.id)) {
      byId.set(set.id, set);
    }
  }
  return [...byId.values()];
}

export function nextWizardStepAfterGotowiecSelect(
  steps: ReadonlyArray<WizardStepConfig>,
  currentStep: WizardStep
): WizardStep {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);
  for (let index = currentIndex + 1; index < steps.length; index += 1) {
    const candidate = steps[index];
    if (candidate && !GOTOWIEC_SKIP_STEPS.has(candidate.id)) {
      return candidate.id;
    }
  }
  return steps[steps.length - 1]?.id ?? 'summary';
}
