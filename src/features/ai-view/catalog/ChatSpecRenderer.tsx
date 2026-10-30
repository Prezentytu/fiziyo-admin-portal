'use client';

import type { ChatViewSpec } from '../utils/viewSpec';
import { AssignSummaryCard } from './AssignSummaryCard';
import { ClarifyCard } from './ClarifyCard';
import { ExerciseResultsCard } from './ExerciseResultsCard';
import { NavigateCard } from './NavigateCard';
import { PatientPeekCard } from './PatientPeekCard';
import { SetDraftCard } from './SetDraftCard';

/** The only place that maps a dispatcher spec (AI or rules) to UI. */
export function ChatSpecRenderer({ spec, testId }: { readonly spec: ChatViewSpec; readonly testId: string }) {
  switch (spec.component) {
    case 'SetDraft':
      return <SetDraftCard spec={spec} testId={`${testId}-set-draft`} />;
    case 'AssignSummary':
      return <AssignSummaryCard spec={spec} testId={`${testId}-assign-summary`} />;
    case 'ExerciseResults':
      return <ExerciseResultsCard spec={spec} testId={`${testId}-exercise-results`} />;
    case 'PatientPeek':
      return <PatientPeekCard spec={spec} testId={`${testId}-patient-peek`} />;
    case 'Navigate':
      return <NavigateCard spec={spec} testId={`${testId}-navigate`} />;
    case 'Clarify':
      return <ClarifyCard spec={spec} testId={`${testId}-clarify`} />;
  }
}
