import type {
  EnrichmentCuePhaseLinkV3,
  EnrichmentCuePhaseV3,
  EnrichmentStepImageV3,
  ExerciseEnrichmentPatientV3,
} from '@/graphql/types/exerciseEnrichment.types';

export const CUE_PHASE_OPTIONS: ReadonlyArray<{ value: EnrichmentCuePhaseV3; label: string }> = [
  { value: 'preparation', label: 'Przygotowanie' },
  { value: 'work', label: 'Praca' },
  { value: 'rest', label: 'Odpoczynek' },
];

const DEFAULT_CUE_PHASE: EnrichmentCuePhaseV3 = 'work';

function sortByStep(links: EnrichmentStepImageV3[]): EnrichmentStepImageV3[] {
  return [...links].sort((first, second) => first.step - second.step);
}

export function getStepImage(links: EnrichmentStepImageV3[] | undefined, stepIndex: number): string | null {
  return links?.find((link) => link.step === stepIndex + 1)?.url ?? null;
}

function setStepImage(
  links: EnrichmentStepImageV3[] | undefined,
  stepIndex: number,
  url: string | null
): EnrichmentStepImageV3[] {
  const others = (links ?? []).filter((link) => link.step !== stepIndex + 1);
  return sortByStep(url ? [...others, { step: stepIndex + 1, url }] : others);
}

/** Next photo for a step: unpinned → photo 1 → photo 2 → … → unpinned. */
export function cycleStepImage(
  links: EnrichmentStepImageV3[] | undefined,
  stepIndex: number,
  imageUrls: string[]
): EnrichmentStepImageV3[] {
  if (imageUrls.length === 0) return setStepImage(links, stepIndex, null);
  const current = getStepImage(links, stepIndex);
  const currentIndex = current ? imageUrls.indexOf(current) : -1;
  const nextUrl = currentIndex + 1 < imageUrls.length ? imageUrls[currentIndex + 1] : null;
  return setStepImage(links, stepIndex, nextUrl);
}

export function removeStepImageAt(
  links: EnrichmentStepImageV3[] | undefined,
  stepIndex: number
): EnrichmentStepImageV3[] {
  const removedStep = stepIndex + 1;
  return (links ?? [])
    .filter((link) => link.step !== removedStep)
    .map((link) => (link.step > removedStep ? { ...link, step: link.step - 1 } : link));
}

export function stepsForImage(links: EnrichmentStepImageV3[] | undefined, url: string): number[] {
  return sortByStep((links ?? []).filter((link) => link.url === url)).map((link) => link.step);
}

export function replaceLinkedImage(
  links: EnrichmentStepImageV3[] | undefined,
  previousUrl: string,
  nextUrl: string
): EnrichmentStepImageV3[] {
  return (links ?? []).map((link) => (link.url === previousUrl ? { ...link, url: nextUrl } : link));
}

export function keepExistingImages(
  links: EnrichmentStepImageV3[] | undefined,
  imageUrls: string[]
): EnrichmentStepImageV3[] {
  return (links ?? []).filter((link) => imageUrls.includes(link.url));
}

export function getCuePhase(links: EnrichmentCuePhaseLinkV3[] | undefined, cueIndex: number): EnrichmentCuePhaseV3 {
  return links?.find((link) => link.cue === cueIndex)?.phase ?? DEFAULT_CUE_PHASE;
}

export function setCuePhase(
  links: EnrichmentCuePhaseLinkV3[] | undefined,
  cueIndex: number,
  phase: EnrichmentCuePhaseV3
): EnrichmentCuePhaseLinkV3[] {
  const others = (links ?? []).filter((link) => link.cue !== cueIndex);
  return [...others, { cue: cueIndex, phase }].sort((first, second) => first.cue - second.cue);
}

export function removeCuePhaseAt(
  links: EnrichmentCuePhaseLinkV3[] | undefined,
  cueIndex: number
): EnrichmentCuePhaseLinkV3[] {
  return (links ?? [])
    .filter((link) => link.cue !== cueIndex)
    .map((link) => (link.cue > cueIndex ? { ...link, cue: link.cue - 1 } : link));
}

function blankIndexesDescending(values: string[] | undefined): number[] {
  return (values ?? [])
    .map((value, index) => (value.trim().length === 0 ? index : -1))
    .filter((index) => index >= 0)
    .reverse();
}

/**
 * Saving drops blank steps and cues, so photo and phase links must shift with them;
 * otherwise a cleared middle step hands its photo to the next one.
 */
export function realignMediaForBlankEntries(patient: ExerciseEnrichmentPatientV3): ExerciseEnrichmentPatientV3 {
  const blankSteps = blankIndexesDescending(patient.steps);
  const blankCues = blankIndexesDescending(patient.cues);
  if (blankSteps.length === 0 && blankCues.length === 0) return patient;

  const next = { ...patient };
  if (blankSteps.length > 0 && patient.step_images) {
    next.step_images = blankSteps.reduce((links, index) => removeStepImageAt(links, index), patient.step_images);
  }
  if (blankCues.length > 0 && patient.cue_phases) {
    next.cue_phases = blankCues.reduce((links, index) => removeCuePhaseAt(links, index), patient.cue_phases);
  }
  return next;
}
