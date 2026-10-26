import type { ParameterEvaluation } from './parameterRules';
import {
  STAGE_TITLES,
  formatStageCount,
  pluralizePl,
  type VerificationStageKey,
  type VerificationStagesResult,
} from './verificationStages';

export interface StageCopyInput {
  stages: VerificationStagesResult;
  parameters: Pick<ParameterEvaluation, 'findings' | 'blockingCount' | 'sessionLevel'>;
  hasPendingPhoto: boolean;
  hasPendingProposal: boolean;
  hasVideo: boolean;
  photoLabel: string;
  sessionLine: string;
  stopIfCount: number;
  canDecide: boolean;
  signerName: string;
}

interface StageCopy {
  /** Short status under each stage in the navigation. */
  subs: Record<VerificationStageKey, string>;
  /** One next step shown in the floating bar. */
  hints: Record<VerificationStageKey, string>;
}

function materialSub({ stages, hasPendingPhoto, hasVideo, photoLabel }: StageCopyInput): string {
  if (hasPendingPhoto) return 'Nowe zdjęcie do przyjęcia';
  if (stages.issues.material.length > 0) return 'Brak materiału';
  return `${photoLabel}${hasVideo ? ' · nagranie' : ' · bez nagrania'}`;
}

function parametersSub({ stages, parameters, sessionLine }: StageCopyInput): string {
  if (stages.issues.parameters.length === 0) return sessionLine;
  if (parameters.blockingCount > 0) return `Do poprawy: ${parameters.blockingCount}`;
  return `Sprawdź: ${stages.issues.parameters.length}`;
}

function instructionSub({ stages, hasPendingProposal }: StageCopyInput): string {
  if (hasPendingProposal) return 'Propozycja do decyzji';
  if (stages.issues.instruction.length > 0) return `Do poprawy: ${stages.issues.instruction.length}`;
  return 'Opis, kroki, wskazówki';
}

function safetySub({ stages, stopIfCount }: StageCopyInput): string {
  if (stages.issues.safety.length === 0) {
    return pluralizePl(stopIfCount, 'objaw przerwania', 'objawy przerwania', 'objawów przerwania');
  }
  return stopIfCount === 0 ? 'Brak objawów przerwania' : `Do poprawy: ${stages.issues.safety.length}`;
}

function decisionSub({ stages, canDecide }: StageCopyInput): string {
  if (!canDecide) return 'Już w bazie';
  return stages.canPublish ? 'Zatwierdź' : `Do poprawy: ${formatStageCount(stages.openStages.length)}`;
}

function materialHint({ stages, hasPendingPhoto, hasVideo }: StageCopyInput): string {
  if (hasPendingPhoto) return 'Przyjmij nowe zdjęcie albo zostaw stare.';
  if (stages.issues.material.length > 0) return 'Dodaj nagranie albo zdjęcie.';
  return hasVideo ? 'Obejrzyj nagranie i zdjęcia.' : 'Sprawdź zdjęcia krok po kroku.';
}

function parametersHint({ stages, parameters }: StageCopyInput): string {
  const blockingFieldCount = parameters.findings.filter(
    (finding) => finding.level === 'limit' && finding.key !== 'session'
  ).length;
  if (blockingFieldCount > 0) return `Popraw zaznaczone parametry: ${blockingFieldCount}.`;
  if (parameters.sessionLevel === 'limit') return 'Za długie ćwiczenie: zmniejsz serie, powtórzenia albo przerwę.';
  if (stages.issues.parameters.length > 0) return 'Popraw albo potwierdź „Tak ma być”.';
  return 'Porównaj parametry z nagraniem.';
}

function instructionHint({ stages, hasPendingProposal }: StageCopyInput): string {
  if (hasPendingProposal) return 'Wstaw propozycję agenta albo ją pomiń.';
  return stages.issues.instruction[0]?.text ?? 'Przeczytaj opis oczami pacjenta.';
}

function decisionHint({ stages, canDecide, signerName }: StageCopyInput): string {
  if (!canDecide) return 'Ćwiczenie jest już w bazie. Poprawki zapisują się od razu.';
  if (stages.canPublish) return `Trafi do bazy z podpisem: ${signerName}.`;
  return `Najpierw popraw: ${stages.openStages.map((key) => STAGE_TITLES[key]).join(', ')}.`;
}

export function buildStageCopy(input: StageCopyInput): StageCopy {
  return {
    subs: {
      material: materialSub(input),
      parameters: parametersSub(input),
      instruction: instructionSub(input),
      safety: safetySub(input),
      decision: decisionSub(input),
    },
    hints: {
      material: materialHint(input),
      parameters: parametersHint(input),
      instruction: instructionHint(input),
      safety: input.stages.issues.safety[0]?.text ?? 'Sprawdź objawy i przeciwwskazania.',
      decision: decisionHint(input),
    },
  };
}
