'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { formatExerciseCount } from '@/utils/polishPlural';
import { useChatActions } from '../ChatSessionContext';
import {
  describePlan,
  formatPlanDate,
  PLAN_RHYTHMS,
  PLAN_STARTS,
  PLAN_WEEKS,
  planWeeksLabel,
  resolvePlanDates,
  type SchedulePlan,
} from '../utils/schedulePlan';
import { draftMinutes } from '../utils/setDraft';
import type { CardProps } from './cardProps';
import { ChatCard, ChatCardNote } from './ChatCard';
import { useSendPlan } from './useChatWrites';

const WEEK_OPTIONS = PLAN_WEEKS.map((weeks) => ({ value: weeks, label: planWeeksLabel(weeks) }));

/** "Gotowe do wysłania": the last look before the patient gets the plan; only "Wyślij" writes. */
export function SendSummaryCard({ spec, testId, messageId, chosen }: CardProps<'SendSummary'>) {
  const { organizationId, patients, appendAssistant, markChosen, refetchCredits } = useChatActions();
  const [plan, setPlan] = useState<SchedulePlan>(spec.plan);
  const { send, sending } = useSendPlan();
  const patient = patients.find((candidate) => candidate.id === spec.draft.patientId);
  const { endDate } = resolvePlanDates(plan);
  const isSent = chosen === 'sent';

  const handleSend = async () => {
    if (!patient) return;
    const result = await send(organizationId, patient.id, spec.draft, plan);
    if (!result) return;
    markChosen(messageId, 'sent');
    refetchCredits();
    appendAssistant({
      text: `Wysłane. ${patient.name} zobaczy plan w aplikacji: ${describePlan(plan)}.`,
      spec: { component: 'Sent', patientId: patient.id, setName: spec.draft.name, planLabel: describePlan(plan) },
    });
  };

  const update = (patch: Partial<SchedulePlan>) => setPlan((current) => ({ ...current, ...patch }));

  return (
    <ChatCard
      testId={testId}
      title={isSent ? 'Wysłane' : 'Gotowe do wysłania'}
      footer={
        isSent ? (
          <span className="text-[13px] text-label-secondary">Plan jest już u pacjenta</span>
        ) : (
          <>
            <span className="text-[13px] text-label-secondary">Pacjent dostanie powiadomienie w aplikacji</span>
            <Button
              onClick={() => void handleSend()}
              disabled={!patient || sending}
              data-testid={`${testId}-primary-btn`}
            >
              <Send aria-hidden="true" />
              {sending ? 'Wysyłam…' : 'Wyślij pacjentowi'}
            </Button>
          </>
        )
      }
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-[15px]">
        <dt className="text-label-secondary">Pacjent</dt>
        <dd className="font-medium text-foreground">{patient?.name ?? 'pacjent niedostępny'}</dd>
        <dt className="text-label-secondary">Zestaw</dt>
        <dd className="font-medium text-foreground">
          {formatExerciseCount(spec.draft.items.length)} · ok. {draftMinutes(spec.draft.items)} min dziennie
        </dd>
      </dl>
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
      <ChatCardNote>Plan pacjenta to kopia zestawu: zmiany tutaj nie ruszają katalogu.</ChatCardNote>
    </ChatCard>
  );
}
