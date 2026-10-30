'use client';

import type { ChatCardSpec } from '../utils/chatCards';
import { AddPatientCard } from './AddPatientCard';
import { ClarifyCard } from './ClarifyCard';
import { CreateExerciseCard } from './CreateExerciseCard';
import { DocumentResultCard } from './DocumentResultCard';
import { ExerciseResultsCard } from './ExerciseResultsCard';
import { NavigateCard } from './NavigateCard';
import { PatientPeekCard } from './PatientPeekCard';
import { PickPatientCard } from './PickPatientCard';
import { ScanVisitCard } from './ScanVisitCard';
import { ScheduleCard } from './ScheduleCard';
import { SendSummaryCard } from './SendSummaryCard';
import { SentCard } from './SentCard';
import { SetDraftCard } from './SetDraftCard';
import { SetSavedCard } from './SetSavedCard';
import { PatientAddedCard } from './PatientAddedCard';
import { ExerciseCreatedCard } from './ExerciseCreatedCard';

interface ChatSpecRendererProps {
  readonly spec: ChatCardSpec;
  readonly testId: string;
  readonly messageId: string;
  readonly chosen?: string;
}

/** The only place that maps a card spec (dispatcher, AI or rules, or a flow step) to UI. */
export function ChatSpecRenderer({ spec, testId, messageId, chosen }: ChatSpecRendererProps) {
  const common = { messageId, chosen };
  switch (spec.component) {
    case 'SetDraft':
      return <SetDraftCard spec={spec} testId={`${testId}-set-draft`} {...common} />;
    case 'AssignSummary':
      // A known set for a known patient is the same flow: check the exercises, then the schedule.
      return (
        <SetDraftCard
          spec={{ component: 'SetDraft', setId: spec.setId, patientId: spec.patientId, exerciseIds: [] }}
          testId={`${testId}-assign-summary`}
          {...common}
        />
      );
    case 'ExerciseResults':
      return <ExerciseResultsCard spec={spec} testId={`${testId}-exercise-results`} {...common} />;
    case 'PatientPeek':
      return <PatientPeekCard spec={spec} testId={`${testId}-patient-peek`} {...common} />;
    case 'Navigate':
      if (spec.route === 'patient-new') {
        return <AddPatientCard spec={{ component: 'AddPatient' }} testId={`${testId}-add-patient`} {...common} />;
      }
      return <NavigateCard spec={spec} testId={`${testId}-navigate`} {...common} />;
    case 'Clarify':
      return <ClarifyCard spec={spec} testId={`${testId}-clarify`} {...common} />;
    case 'AddPatient':
      return <AddPatientCard spec={spec} testId={`${testId}-add-patient`} {...common} />;
    case 'CreateExercise':
      return <CreateExerciseCard spec={spec} testId={`${testId}-create-exercise`} {...common} />;
    case 'PickPatient':
      return <PickPatientCard spec={spec} testId={`${testId}-pick-patient`} {...common} />;
    case 'Schedule':
      return <ScheduleCard spec={spec} testId={`${testId}-schedule`} {...common} />;
    case 'SendSummary':
      return <SendSummaryCard spec={spec} testId={`${testId}-send-summary`} {...common} />;
    case 'Sent':
      return <SentCard spec={spec} testId={`${testId}-sent`} {...common} />;
    case 'SetSaved':
      return <SetSavedCard spec={spec} testId={`${testId}-set-saved`} {...common} />;
    case 'PatientAdded':
      return <PatientAddedCard spec={spec} testId={`${testId}-patient-added`} {...common} />;
    case 'ExerciseCreated':
      return <ExerciseCreatedCard spec={spec} testId={`${testId}-exercise-created`} {...common} />;
    case 'ScanVisit':
      return <ScanVisitCard spec={spec} testId={`${testId}-scan-visit`} {...common} />;
    case 'DocumentResult':
      return <DocumentResultCard spec={spec} testId={`${testId}-document`} {...common} />;
  }
}
