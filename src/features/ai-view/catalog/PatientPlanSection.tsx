'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Smartphone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { fromExerciseMapping } from '@/components/shared/exercise/adapters';
import type { ExerciseOverrideFields } from '@/components/shared/exercise/exerciseOverride';
import type { ExerciseExecutionCardData } from '@/components/shared/exercise/types';
import type { ExerciseMapping } from '@/features/assignment/types';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import { GET_PATIENT_WEEKLY_ADHERENCE_QUERY } from '@/graphql/queries/workoutSessions.queries';
import { summarizePatientPlans, type PlanAdherenceSource, type PlanAssignmentSource } from '../utils/patientPlan';
import { ChatCardEmpty } from './ChatCard';
import { ChatPhonePreviewDialog } from './ChatPhonePreviewDialog';

interface AssignmentsResponse {
  patientAssignments?: PlanAssignmentSource[];
}

interface AdherenceResponse {
  patientWeeklyAdherence?: PlanAdherenceSource[];
}

function parseOverrides(json?: string | null): Record<string, ExerciseOverrideFields> {
  if (!json) return {};
  try {
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, ExerciseOverrideFields>) : {};
  } catch {
    return {};
  }
}

/** Read-only plan for a follow-up visit: exercises with the patient's own dose, phone preview, and this week's sessions. */
export function PatientPlanSection({ patientId, testId }: { readonly patientId: string; readonly testId: string }) {
  const { data, loading } = useQuery<AssignmentsResponse>(GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY, {
    variables: { userId: patientId },
  });
  const { data: adherence } = useQuery<AdherenceResponse>(GET_PATIENT_WEEKLY_ADHERENCE_QUERY, {
    variables: { patientId },
  });
  const [previewState, setPreviewState] = useState<{
    exercises: ExerciseExecutionCardData[];
    index: number;
  } | null>(null);

  const previewCardsByPlan = useMemo(() => {
    const byPlan = new Map<
      string,
      { cards: ExerciseExecutionCardData[]; indexByMappingId: Map<string, number>; exerciseIdByMappingId: Map<string, string> }
    >();
    for (const assignment of data?.patientAssignments ?? []) {
      const mappings = assignment.exerciseSet?.exerciseMappings;
      if (!mappings) continue;
      const overrides = parseOverrides(assignment.exerciseOverrides);
      const cards: ExerciseExecutionCardData[] = [];
      const indexByMappingId = new Map<string, number>();
      const exerciseIdByMappingId = new Map<string, string>();
      const sorted = [...mappings].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      for (const mapping of sorted) {
        const override = overrides[mapping.id];
        if (override?.hidden) continue;
        const card = fromExerciseMapping(mapping as unknown as ExerciseMapping, override);
        indexByMappingId.set(mapping.id, cards.length);
        exerciseIdByMappingId.set(mapping.id, card.sourceExerciseId ?? mapping.id);
        cards.push(card);
      }
      byPlan.set(assignment.id, { cards, indexByMappingId, exerciseIdByMappingId });
    }
    return byPlan;
  }, [data?.patientAssignments]);

  if (loading && !data) return <ChatCardEmpty testId={`${testId}-loading`}>Wczytywanie planu…</ChatCardEmpty>;

  const plans = summarizePatientPlans(data?.patientAssignments ?? [], adherence?.patientWeeklyAdherence ?? []);
  if (plans.length === 0) {
    return <ChatCardEmpty testId={`${testId}-empty`}>Pacjent nie ma teraz aktywnego planu.</ChatCardEmpty>;
  }

  return (
    <div className="flex flex-col gap-3" data-testid={testId}>
      {plans.map((plan) => {
        const planPreview = previewCardsByPlan.get(plan.assignmentId);
        return (
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
              {plan.exercises.map((exercise) => {
                const cardIndex = planPreview?.indexByMappingId.get(exercise.mappingId);
                const exerciseTestKey =
                  planPreview?.exerciseIdByMappingId.get(exercise.mappingId) ?? exercise.mappingId;
                return (
                  <li key={exercise.mappingId} className="flex items-center justify-between gap-2 text-[14px]">
                    <span className="min-w-0 flex-1 truncate text-foreground">{exercise.name}</span>
                    <span className="shrink-0 tabular-nums text-label-secondary">{exercise.dose}</span>
                    {planPreview && cardIndex !== undefined && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-label-secondary hover:text-foreground"
                        aria-label={`Podgląd jak u pacjenta: ${exercise.name}`}
                        title="Jak zobaczy to pacjent"
                        onClick={() => setPreviewState({ exercises: planPreview.cards, index: cardIndex })}
                        data-testid={`${testId}-preview-${exerciseTestKey}-btn`}
                      >
                        <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <ChatPhonePreviewDialog
        open={previewState !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewState(null);
        }}
        exercises={previewState?.exercises ?? []}
        initialIndex={previewState?.index ?? 0}
      />
    </div>
  );
}
