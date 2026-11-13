'use client';

import { useQuery } from '@apollo/client/react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import { GET_PATIENT_WEEKLY_ADHERENCE_QUERY } from '@/graphql/queries/workoutSessions.queries';
import { summarizePatientPlans, type PlanAdherenceSource, type PlanAssignmentSource } from '../utils/patientPlan';
import { ChatCardEmpty } from './ChatCard';

interface AssignmentsResponse {
  patientAssignments?: PlanAssignmentSource[];
}

interface AdherenceResponse {
  patientWeeklyAdherence?: PlanAdherenceSource[];
}

/** Read-only plan for a follow-up visit: exercises with the patient's own dose and this week's sessions. */
export function PatientPlanSection({ patientId, testId }: { readonly patientId: string; readonly testId: string }) {
  const { data, loading } = useQuery<AssignmentsResponse>(GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY, {
    variables: { userId: patientId },
  });
  const { data: adherence } = useQuery<AdherenceResponse>(GET_PATIENT_WEEKLY_ADHERENCE_QUERY, {
    variables: { patientId },
  });

  if (loading && !data) return <ChatCardEmpty testId={`${testId}-loading`}>Wczytywanie planu…</ChatCardEmpty>;

  const plans = summarizePatientPlans(data?.patientAssignments ?? [], adherence?.patientWeeklyAdherence ?? []);
  if (plans.length === 0) {
    return <ChatCardEmpty testId={`${testId}-empty`}>Pacjent nie ma teraz aktywnego planu.</ChatCardEmpty>;
  }

  return (
    <div className="flex flex-col gap-3" data-testid={testId}>
      {plans.map((plan) => (
        <section
          key={plan.assignmentId}
          aria-label={plan.name}
          className="rounded-[14px] bg-fill-quaternary px-4 py-3"
          data-testid={`${testId}-${plan.assignmentId}`}
        >
          <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h4 className="text-[15px] font-semibold text-foreground">{plan.name}</h4>
            <p className="text-[13px] text-label-secondary">
              {plan.thisWeek && `W tym tygodniu ${plan.thisWeek.completed} z ${plan.thisWeek.target}`}
              {plan.thisWeek && plan.endDate && ' · '}
              {plan.endDate && `do ${format(new Date(plan.endDate), 'd MMM', { locale: pl })}`}
            </p>
          </header>
          <ul className="mt-2 flex flex-col gap-1">
            {plan.exercises.map((exercise) => (
              <li key={exercise.mappingId} className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="min-w-0 truncate text-foreground">{exercise.name}</span>
                <span className="shrink-0 tabular-nums text-label-secondary">{exercise.dose}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
