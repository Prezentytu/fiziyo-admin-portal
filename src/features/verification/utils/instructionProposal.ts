import type { EnrichmentPatientMistakeV3, ExerciseEnrichmentPatientV3 } from '@/graphql/types/exerciseEnrichment.types';

export interface InstructionProposal {
  steps?: string[];
  cues?: string[];
  mistakes?: EnrichmentPatientMistakeV3[];
}

function filledStrings(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0);
}

function normalizeMistake(entry: EnrichmentPatientMistakeV3): EnrichmentPatientMistakeV3 | null {
  const mistake = entry.mistake?.trim() ?? '';
  const fix = entry.fix?.trim() ?? '';
  return mistake ? { mistake, fix } : null;
}

/**
 * Agent output is a proposal, never a silent merge: steps and cues are offered only when the
 * therapist has none, mistakes only when they are not on the list yet.
 */
export function buildInstructionProposal(
  current: ExerciseEnrichmentPatientV3 | undefined,
  suggested: ExerciseEnrichmentPatientV3 | undefined
): InstructionProposal | null {
  const proposal: InstructionProposal = {};

  const suggestedSteps = filledStrings(suggested?.steps);
  if (filledStrings(current?.steps).length === 0 && suggestedSteps.length > 0) {
    proposal.steps = suggestedSteps;
  }

  const suggestedCues = filledStrings(suggested?.cues);
  if (filledStrings(current?.cues).length === 0 && suggestedCues.length > 0) {
    proposal.cues = suggestedCues;
  }

  const known = new Set((current?.mistakes ?? []).map((entry) => entry.mistake?.trim().toLowerCase()).filter(Boolean));
  const newMistakes = (suggested?.mistakes ?? [])
    .map(normalizeMistake)
    .filter((entry): entry is EnrichmentPatientMistakeV3 => entry !== null)
    .filter((entry) => !known.has(entry.mistake?.toLowerCase()));
  if (newMistakes.length > 0) {
    proposal.mistakes = newMistakes;
  }

  return Object.keys(proposal).length > 0 ? proposal : null;
}

export function applyInstructionProposal(
  current: ExerciseEnrichmentPatientV3 | undefined,
  proposal: InstructionProposal
): ExerciseEnrichmentPatientV3 {
  return {
    ...current,
    ...(proposal.steps ? { steps: proposal.steps } : {}),
    ...(proposal.cues ? { cues: proposal.cues } : {}),
    ...(proposal.mistakes ? { mistakes: [...(current?.mistakes ?? []), ...proposal.mistakes] } : {}),
  };
}
