import type { ContentStatus } from '@/graphql/types/adminExercise.types';
import { polishPlural } from '@/utils/polishPlural';

import type { ParameterEvaluation } from './parameterRules';

export const VERIFICATION_STAGES = ['material', 'parameters', 'instruction', 'safety', 'decision'] as const;

export type VerificationStageKey = (typeof VERIFICATION_STAGES)[number];

export const STAGE_TITLES: Record<VerificationStageKey, string> = {
  material: 'Materiał',
  parameters: 'Parametry',
  instruction: 'Instrukcja',
  safety: 'Bezpieczeństwo',
  decision: 'Decyzja',
};

export const MIN_NAME_LENGTH = 2;
export const MIN_PATIENT_DESCRIPTION_LENGTH = 50;
export const MIN_THERAPIST_DESCRIPTION_LENGTH = 20;

export interface StageIssue {
  stage: VerificationStageKey;
  text: string;
}

export interface VerificationStagesInput {
  name: string;
  patientDescription: string;
  therapistDescription: string;
  hasVideo: boolean;
  imageCount: number;
  pendingPhotoCount: number;
  parameters: ParameterEvaluation;
  /** Numbers in the patient description that were not fixed or acknowledged. */
  descriptionNumberCount: number;
  pendingProposalCount: number;
  stopIfCount: number;
}

export interface VerificationStagesResult {
  issues: Record<VerificationStageKey, StageIssue[]>;
  openStages: VerificationStageKey[];
  canPublish: boolean;
}

function materialIssues(input: VerificationStagesInput): StageIssue[] {
  const issues: StageIssue[] = [];
  if (!input.hasVideo && input.imageCount === 0) {
    issues.push({ stage: 'material', text: 'Dodaj nagranie albo zdjęcie.' });
  }
  if (input.pendingPhotoCount > 0) {
    issues.push({ stage: 'material', text: 'Przyjmij albo odrzuć nowe zdjęcie.' });
  }
  return issues;
}

function parameterIssues(input: VerificationStagesInput): StageIssue[] {
  const issues: StageIssue[] = input.parameters.findings.map((finding) => ({
    stage: 'parameters',
    text: finding.text,
  }));
  if (input.descriptionNumberCount > 0) {
    issues.push({ stage: 'parameters', text: 'Opis dla pacjenta zawiera liczbę powtórzeń lub serii.' });
  }
  return issues;
}

function instructionIssues(input: VerificationStagesInput): StageIssue[] {
  const issues: StageIssue[] = [];
  if (input.name.trim().length < MIN_NAME_LENGTH) {
    issues.push({ stage: 'instruction', text: 'Wpisz nazwę ćwiczenia.' });
  }
  if (input.patientDescription.trim().length < MIN_PATIENT_DESCRIPTION_LENGTH) {
    issues.push({
      stage: 'instruction',
      text: `Opis dla pacjenta: co najmniej ${MIN_PATIENT_DESCRIPTION_LENGTH} znaków.`,
    });
  }
  if (input.pendingProposalCount > 0) {
    issues.push({ stage: 'instruction', text: 'Wstaw propozycję agenta albo ją pomiń.' });
  }
  return issues;
}

function safetyIssues(input: VerificationStagesInput): StageIssue[] {
  const issues: StageIssue[] = [];
  if (input.stopIfCount === 0) {
    issues.push({ stage: 'safety', text: 'Dodaj co najmniej jeden objaw przerwania.' });
  }
  if (input.therapistDescription.trim().length < MIN_THERAPIST_DESCRIPTION_LENGTH) {
    issues.push({
      stage: 'safety',
      text: `Opis dla fizjoterapeuty: co najmniej ${MIN_THERAPIST_DESCRIPTION_LENGTH} znaków.`,
    });
  }
  return issues;
}

export function computeVerificationStages(input: VerificationStagesInput): VerificationStagesResult {
  const material = materialIssues(input);
  const parameters = parameterIssues(input);
  const instruction = instructionIssues(input);
  const safety = safetyIssues(input);
  const decision = [...material, ...parameters, ...instruction, ...safety];

  const issues: Record<VerificationStageKey, StageIssue[]> = {
    material,
    parameters,
    instruction,
    safety,
    decision,
  };

  const openStages = VERIFICATION_STAGES.filter((stage) => stage !== 'decision' && issues[stage].length > 0);

  return { issues, openStages, canPublish: openStages.length === 0 };
}

export function parseStopIf(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function serializeStopIf(entries: string[]): string {
  return entries
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .join('\n');
}

/** Count with its Polish noun form, e.g. „3 etapy”. */
export function pluralizePl(count: number, one: string, few: string, many: string): string {
  return `${count} ${polishPlural(count, one, few, many)}`;
}

export function formatStageCount(count: number): string {
  return pluralizePl(count, 'etap', 'etapy', 'etapów');
}

const DECIDED_STATUSES: ReadonlySet<ContentStatus> = new Set(['PUBLISHED', 'ARCHIVED_GLOBAL']);

/** Publish and „To duplikat” only make sense before the exercise is in (or withdrawn from) the database. */
export function canDecideOnExercise(status: ContentStatus): boolean {
  return !DECIDED_STATUSES.has(status);
}
