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
  hasPendingPhoto: boolean;
  parameters: ParameterEvaluation;
  /** Numbers in the patient description that were not fixed or acknowledged. */
  descriptionNumberCount: number;
  hasPendingProposal: boolean;
  stopIfCount: number;
}

export interface VerificationStagesResult {
  issues: Record<VerificationStageKey, StageIssue[]>;
  openStages: VerificationStageKey[];
  canPublish: boolean;
}

/** Content an exercise needs before it can be published; the exercise page shows the same gaps. */
export type ContentGapsInput = Pick<
  VerificationStagesInput,
  'name' | 'patientDescription' | 'therapistDescription' | 'hasVideo' | 'imageCount' | 'stopIfCount'
>;

export function listContentGaps(input: ContentGapsInput): StageIssue[] {
  const gaps: StageIssue[] = [];
  if (!input.hasVideo && input.imageCount === 0) {
    gaps.push({ stage: 'material', text: 'Dodaj nagranie albo zdjęcie.' });
  }
  if (input.name.trim().length < MIN_NAME_LENGTH) {
    gaps.push({ stage: 'instruction', text: 'Wpisz nazwę ćwiczenia.' });
  }
  if (input.patientDescription.trim().length < MIN_PATIENT_DESCRIPTION_LENGTH) {
    gaps.push({
      stage: 'instruction',
      text: `Opis dla pacjenta: co najmniej ${MIN_PATIENT_DESCRIPTION_LENGTH} znaków.`,
    });
  }
  if (input.stopIfCount === 0) {
    gaps.push({ stage: 'safety', text: 'Dodaj co najmniej jeden objaw przerwania.' });
  }
  if (input.therapistDescription.trim().length < MIN_THERAPIST_DESCRIPTION_LENGTH) {
    gaps.push({
      stage: 'safety',
      text: `Opis dla fizjoterapeuty: co najmniej ${MIN_THERAPIST_DESCRIPTION_LENGTH} znaków.`,
    });
  }
  return gaps;
}

function gapsFor(stage: VerificationStageKey, gaps: StageIssue[]): StageIssue[] {
  return gaps.filter((gap) => gap.stage === stage);
}

function materialIssues(input: VerificationStagesInput, gaps: StageIssue[]): StageIssue[] {
  const issues = gapsFor('material', gaps);
  if (input.hasPendingPhoto) {
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

function instructionIssues(input: VerificationStagesInput, gaps: StageIssue[]): StageIssue[] {
  const issues = gapsFor('instruction', gaps);
  if (input.hasPendingProposal) {
    issues.push({ stage: 'instruction', text: 'Wstaw propozycję agenta albo ją pomiń.' });
  }
  return issues;
}

export function computeVerificationStages(input: VerificationStagesInput): VerificationStagesResult {
  const gaps = listContentGaps(input);
  const material = materialIssues(input, gaps);
  const parameters = parameterIssues(input);
  const instruction = instructionIssues(input, gaps);
  const safety = gapsFor('safety', gaps);
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

/**
 * `safety.stop_if` is free text the patient app shows as is: group headings end with „:”,
 * symptoms sit on their own lines, often with „- ”. Only symptom lines count.
 */
export function countStopIfSymptoms(value: string | null | undefined): number {
  if (!value) return 0;
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.endsWith(':')).length;
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
