'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import { formatExerciseCount } from '@/utils/polishPlural';
import { useChatActions } from '../ChatSessionContext';
import { patientLabel as labelAmongNamesakes } from '../utils/patientMatch';
import { isCurrentAssignmentStatus } from '../utils/patientPlan';
import {
  describePlan,
  FLOW_CANCEL_LABEL,
  FLOW_CANCELLED_TEXT,
  formatPlanDate,
  PLAN_RHYTHMS,
  PLAN_STARTS,
  PLAN_WEEKS,
  planWeeksLabel,
  resolvePlanDates,
  type SchedulePlan,
} from '../utils/schedulePlan';
import { draftMinutes, planNote } from '../utils/setDraft';
import type { CardProps } from './cardProps';
import { ChatCard, ChatCardNote } from './ChatCard';
import { sentText } from '../utils/sendPlan';
import { useSendPlan } from './useChatWrites';

const WEEK_OPTIONS = PLAN_WEEKS.map((weeks) => ({ value: weeks, label: planWeeksLabel(weeks) }));
const REPLACE_MODE_OPTIONS = [
  { value: 'replace' as const, label: 'Zastąp obecny plan' },
  { value: 'add' as const, label: 'Dodaj obok' },
];

interface PatientAssignmentSummary {
  id: string;
  status?: string | null;
  exerciseSet?: { id: string; name?: string | null; organizationId?: string | null } | null;
}

/** "Gotowe do wysłania": the last look before the patient gets the plan; only "Wyślij" writes. */
export function SendSummaryCard({ spec, testId, messageId, chosen }: CardProps<'SendSummary'>) {
  const { organizationId, patients, appendAssistant, appendExchange, markChosen, refetchCredits } = useChatActions();
  const [plan, setPlan] = useState<SchedulePlan>(spec.plan);
  const [modeOverride, setModeOverride] = useState<'replace' | 'add' | null>(null);
  const { send, sending } = useSendPlan();
  const patient = patients.find((candidate) => candidate.id === spec.draft.patientId);
  const { data: assignmentsData } = useQuery<{ patientAssignments?: PatientAssignmentSummary[] }>(
    GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY,
    { variables: { userId: patient?.id ?? '' }, skip: !patient?.id }
  );
  const activeAssignments = useMemo(
    () =>
      (assignmentsData?.patientAssignments ?? []).filter(
        (assignment) =>
          isCurrentAssignmentStatus(assignment.status) &&
          (!assignment.exerciseSet?.organizationId || assignment.exerciseSet.organizationId === organizationId)
      ),
    [assignmentsData?.patientAssignments, organizationId]
  );
  const targetAssignment = useMemo(() => {
    if (activeAssignments.length === 0) return undefined;
    if (spec.draft.replacesAssignmentId) {
      const exact = activeAssignments.find((assignment) => assignment.id === spec.draft.replacesAssignmentId);
      if (exact) return exact;
    }
    if (spec.draft.sourceSetId) {
      const bySet = activeAssignments.find((assignment) => assignment.exerciseSet?.id === spec.draft.sourceSetId);
      if (bySet) return bySet;
    }
    return activeAssignments[0];
  }, [activeAssignments, spec.draft.replacesAssignmentId, spec.draft.sourceSetId]);
  const defaultMode: 'replace' | 'add' =
    targetAssignment &&
    (spec.draft.replacesAssignmentId === targetAssignment.id ||
      (spec.draft.sourceSetId !== undefined && targetAssignment.exerciseSet?.id === spec.draft.sourceSetId))
      ? 'replace'
      : 'add';
  const sendMode = modeOverride ?? defaultMode;
  // Imiennicy: przed wysyłką widać, który to pacjent (powód, e-mail albo stan konta), nie samą nazwę.
  const patientLabel = patient ? labelAmongNamesakes(patient, patients) : undefined;
  const { endDate } = resolvePlanDates(plan);
  const isSent = chosen === 'sent';
  const isCancelled = chosen === 'cancelled';

  const handleSend = async () => {
    if (!patient) return;
    const replaceId = sendMode === 'replace' ? targetAssignment?.id : undefined;
    const result = await send(organizationId, patient.id, spec.draft, plan, replaceId);
    if (!result) return;
    markChosen(messageId, 'sent');
    refetchCredits();
    appendAssistant({
      text: sentText(patient, describePlan(plan), { replaced: Boolean(result.replacedAssignmentId) }),
      spec: { component: 'Sent', patientId: patient.id, setName: spec.draft.name, planLabel: describePlan(plan) },
    });
  };

  const update = (patch: Partial<SchedulePlan>) => setPlan((current) => ({ ...current, ...patch }));

  return (
    <ChatCard
      testId={testId}
      title={isSent ? 'Wysłane' : isCancelled ? 'Anulowane' : 'Gotowe do wysłania'}
      footer={
        isSent || isCancelled ? (
          <span className="text-[13px] text-label-secondary">
            {isSent
              ? patient?.isShadowUser
                ? 'Plan zapisany, pacjent nie ma jeszcze konta w aplikacji'
                : 'Plan jest już u pacjenta'
              : 'Nic nie zostało wysłane'}
          </span>
        ) : (
          <>
            <Button
              variant="ghost"
              disabled={sending}
              onClick={() => {
                markChosen(messageId, 'cancelled');
                appendExchange(FLOW_CANCEL_LABEL, { text: FLOW_CANCELLED_TEXT });
              }}
              data-testid={`${testId}-cancel-btn`}
            >
              {FLOW_CANCEL_LABEL}
            </Button>
            <Button
              onClick={() => void handleSend()}
              disabled={!patient || sending}
              data-testid={`${testId}-primary-btn`}
            >
              <Send aria-hidden="true" />
              {sending ? 'Wysyłam…' : sendMode === 'replace' && targetAssignment ? 'Zastąp i wyślij' : 'Wyślij pacjentowi'}
            </Button>
          </>
        )
      }
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-[15px]">
        <dt className="text-label-secondary">Pacjent</dt>
        <dd className="font-medium text-foreground">{patientLabel ?? 'pacjent niedostępny'}</dd>
        <dt className="text-label-secondary">Zestaw</dt>
        <dd className="font-medium text-foreground">
          {formatExerciseCount(spec.draft.items.length)} · ok. {draftMinutes(spec.draft.items)} min dziennie
        </dd>
      </dl>
      {targetAssignment && (
        <div className="flex flex-col gap-1.5 border-t-[0.5px] border-hairline pt-3 text-[14px]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-label-secondary">Tryb</span>
            <SegmentedControl
              label="Tryb aktualizacji planu"
              value={sendMode}
              options={REPLACE_MODE_OPTIONS}
              onChange={(value) => setModeOverride(value)}
              disabled={isSent || isCancelled}
              className="justify-self-start"
              testId={`${testId}-replace-mode`}
            />
          </div>
          {sendMode === 'replace' && (
            <p className="text-[13px] text-label-secondary" data-testid={`${testId}-replace-target`}>
              Zastąpi aktywny plan: <b className="font-medium text-foreground">„{targetAssignment.exerciseSet?.name ?? 'Obecny plan'}”</b>
            </p>
          )}
        </div>
      )}
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-2.5 border-t-[0.5px] border-hairline pt-3 text-[15px]">
        <span className="text-label-secondary">Start</span>
        <SegmentedControl
          label="Start"
          value={plan.start}
          options={PLAN_STARTS}
          onChange={(start) => update({ start })}
          disabled={isSent}
          className="justify-self-start"
          testId={`${testId}-start`}
        />
        <span className="text-label-secondary">Czas</span>
        <SegmentedControl
          label="Czas trwania"
          value={plan.weeks}
          options={WEEK_OPTIONS}
          onChange={(weeks) => update({ weeks })}
          disabled={isSent}
          className="justify-self-start"
          testId={`${testId}-weeks`}
        />
        <span className="text-label-secondary">Rytm</span>
        <SegmentedControl
          label="Rytm"
          value={plan.rhythm}
          options={PLAN_RHYTHMS}
          onChange={(rhythm) => update({ rhythm })}
          disabled={isSent}
          className="justify-self-start"
          testId={`${testId}-rhythm`}
        />
        <span className="text-label-secondary">Koniec</span>
        <span className="font-medium tabular-nums text-foreground">{formatPlanDate(endDate)}</span>
      </div>
      <ChatCardNote>{planNote(Boolean(spec.draft.sourceSetId))}</ChatCardNote>
    </ChatCard>
  );
}
