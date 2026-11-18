'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client/react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityStatusLabel, InitialsAvatar } from '@/components/shared/page';
import { getPatientActivityStatus } from '@/features/patients/utils/patientActivityStatus';
import { PATIENT_FEEDBACK_SCALE_MAX } from '@/features/patients/utils/patientFeedbackScale';
import { GET_PATIENT_LAST_VISIT_QUERY } from '@/graphql/queries/clinicalNotes.queries';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import { GET_PATIENT_ACTIVITY_REPORT_QUERY } from '@/graphql/queries/therapists.queries';
import { GET_PATIENT_WEEKLY_ADHERENCE_QUERY } from '@/graphql/queries/workoutSessions.queries';
import { useChatSession } from './ChatSessionContext';
import type { ChatPatient } from './useChatData';
import { contextPlanFacts, type PlanAdherenceSource, type PlanAssignmentSource } from './utils/patientPlan';
import { formatPlanDate } from './utils/schedulePlan';

interface AdherenceResponse {
  patientWeeklyAdherence?: PlanAdherenceSource[];
}

interface ActivityReportResponse {
  patientActivityReport?: {
    exerciseSets?: Array<{ exerciseSetId: string; name: string; avgPainLevel?: number | null }>;
  };
}

interface AssignmentsResponse {
  patientAssignments?: PlanAssignmentSource[];
}

interface LastVisitResponse {
  patientClinicalNotes?: Array<{ id: string; visitDate: string; title?: string | null }>;
}

function Fact({ label, value, testId }: { readonly label: string; readonly value: string; readonly testId: string }) {
  return (
    <div
      data-testid={testId}
      className="flex justify-between gap-3 border-t-[0.5px] border-hairline py-[11px] text-[14px] first:border-t-0"
    >
      <span className="text-label-secondary">{label}</span>
      <b className="text-right font-semibold text-foreground">{value}</b>
    </div>
  );
}

function PatientFacts({ patient }: { readonly patient: ChatPatient }) {
  const { organizationId, appendExchange } = useChatSession();
  const { data: adherence, loading: adherenceLoading } = useQuery<AdherenceResponse>(
    GET_PATIENT_WEEKLY_ADHERENCE_QUERY,
    {
      variables: { patientId: patient.id },
      errorPolicy: 'all',
    }
  );
  // Te same przypisania co karta planu w rozmowie: „Zestaw” i „Ten tydzień” mówią o aktualnych planach.
  const { data: assignments, loading: assignmentsLoading } = useQuery<AssignmentsResponse>(
    GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY,
    { variables: { userId: patient.id }, errorPolicy: 'all' }
  );
  const { data: report } = useQuery<ActivityReportResponse>(GET_PATIENT_ACTIVITY_REPORT_QUERY, {
    variables: { patientId: patient.id },
    errorPolicy: 'all',
  });
  const { data: lastVisit } = useQuery<LastVisitResponse>(GET_PATIENT_LAST_VISIT_QUERY, {
    variables: { patientId: patient.id, organizationId },
    skip: !organizationId,
    errorPolicy: 'all',
  });

  const planFacts = contextPlanFacts(assignments?.patientAssignments ?? [], adherence?.patientWeeklyAdherence ?? []);
  const sets = report?.patientActivityReport?.exerciseSets ?? [];
  const pains = sets
    .map((set) => set.avgPainLevel)
    .filter((pain): pain is number => typeof pain === 'number' && pain > 0);
  const averagePain = pains.length > 0 ? Math.max(...pains) : undefined;
  // Najwyższy ból od przejrzenia (SPEC-039, D-5): pojedyncze 5/5 nie rozmywa się w średniej zestawu.
  const maxPain = patient.attention?.maxPainLevel;
  const visit = lastVisit?.patientClinicalNotes?.[0];
  const activity = getPatientActivityStatus(patient.lastActivity, undefined, patient.attention);

  return (
    <>
      <div className="flex items-center gap-3">
        <InitialsAvatar
          name={patient.name}
          imageUrl={patient.image}
          muted={patient.isShadowUser}
          className="h-12 w-12"
        />
        <div className="min-w-0">
          <b className="block truncate text-[17px] text-foreground">{patient.name}</b>
          <ActivityStatusLabel tone={activity.tone} label={activity.label} />
        </div>
      </div>
      <div className="flex flex-col">
        <Fact label="Powód" value={patient.contextLabel || 'nie podano'} testId="common-chat-context-reason" />
        {adherenceLoading || assignmentsLoading ? (
          <Skeleton className="my-2 h-5 w-full" />
        ) : (
          <Fact label="Ten tydzień" value={planFacts.week} testId="common-chat-context-week" />
        )}
        <Fact
          label="Ból"
          value={
            maxPain
              ? `najwyżej ${maxPain} / ${PATIENT_FEEDBACK_SCALE_MAX}`
              : averagePain !== undefined && !patient.attention
                ? `${averagePain.toFixed(1)} / ${PATIENT_FEEDBACK_SCALE_MAX}`
                : 'brak zgłoszeń'
          }
          testId="common-chat-context-pain"
        />
        <Fact label="Zestaw" value={assignmentsLoading ? '…' : planFacts.set} testId="common-chat-context-set" />
        <Fact
          label="Ostatnia wizyta"
          value={visit ? formatPlanDate(new Date(visit.visitDate)) : 'brak notatki'}
          testId="common-chat-context-visit"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() =>
            appendExchange(`Ułóż zestaw: ${patient.name}`, {
              text: `Dodaj ćwiczenia z katalogu albo napisz, na jaki problem, np. „${patient.name}, kolano”.`,
              spec: { component: 'SetDraft', patientId: patient.id, exerciseIds: [] },
            })
          }
          data-testid="common-chat-context-set-btn"
        >
          Ułóż zestaw
        </Button>
        <Button variant="outline" size="sm" asChild data-testid="common-chat-context-open-link">
          <Link href={`/patients/${patient.id}`}>Karta pacjenta</Link>
        </Button>
      </div>
    </>
  );
}

/** Context only on demand (design "Czat v2"): the patient the conversation is about, at a glance. */
export function PatientContextPanel() {
  const { contextPatient, setContextOpen } = useChatSession();
  return (
    <aside
      aria-label="Kontekst pacjenta"
      data-testid="common-chat-context-panel"
      className="flex min-h-0 flex-col gap-[18px] overflow-y-auto border-l-[0.5px] border-hairline bg-card p-5 animate-fade-in"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold text-label-tertiary">Pacjent</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setContextOpen(false)}
          aria-label="Zamknij kontekst"
          data-testid="common-chat-context-close-btn"
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      {contextPatient ? (
        <PatientFacts key={contextPatient.id} patient={contextPatient} />
      ) : (
        <p className="text-[14px] text-label-secondary">Ta rozmowa nie dotyczy jeszcze żadnego pacjenta.</p>
      )}
    </aside>
  );
}
