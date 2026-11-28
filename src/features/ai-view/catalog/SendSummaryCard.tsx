'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { formatExerciseCount } from '@/utils/polishPlural';
import { useChatActions } from '../ChatSessionContext';
import { patientLabel as labelAmongNamesakes } from '../utils/patientMatch';
import {
  describePlan,
  FLOW_CANCEL_LABEL,
  FLOW_CANCELLED_TEXT,
  formatPlanDate,
  PLAN_DAYS,
  PLAN_RHYTHMS,
  PLAN_STARTS,
  PLAN_WEEKS,
  planDays,
  planWeeksLabel,
  planWithDays,
  resolvePlanDates,
  type PlanDay,
  type PlanRhythm,
  type SchedulePlan,
} from '../utils/schedulePlan';
import { cn } from '@/lib/utils';
import { draftMinutes, planNote } from '../utils/setDraft';
import type { CardProps } from './cardProps';
import { ChatCard, ChatCardNote } from './ChatCard';
import { sentText } from '../utils/sendPlan';
import { useSendPlan } from './useChatWrites';

const WEEK_OPTIONS = PLAN_WEEKS.map((weeks) => ({ value: weeks, label: planWeeksLabel(weeks) }));
const CHOSEN_DAYS = 'days';
const RHYTHM_OPTIONS: ReadonlyArray<{ value: PlanRhythm | typeof CHOSEN_DAYS; label: string }> = [
  ...PLAN_RHYTHMS,
  { value: CHOSEN_DAYS, label: 'Wybrane dni' },
];

/** "Gotowe do wysłania": the last look before the patient gets the plan; only "Wyślij" writes. */
export function SendSummaryCard({ spec, testId, messageId, chosen }: CardProps<'SendSummary'>) {
  const { organizationId, patients, appendAssistant, appendExchange, markChosen, refetchCredits } = useChatActions();
  const [plan, setPlan] = useState<SchedulePlan>(spec.plan);
  const { send, sending } = useSendPlan();
  const patient = patients.find((candidate) => candidate.id === spec.draft.patientId);
  // Imiennicy: przed wysyłką widać, który to pacjent (powód, e-mail albo stan konta), nie samą nazwę.
  const patientLabel = patient ? labelAmongNamesakes(patient, patients) : undefined;
  const { endDate } = resolvePlanDates(plan);
  const isSent = chosen === 'sent';
  const isCancelled = chosen === 'cancelled';

  const handleSend = async () => {
    if (!patient) return;
    const result = await send(organizationId, patient.id, spec.draft, plan);
    if (!result) return;
    markChosen(messageId, 'sent');
    refetchCredits();
    appendAssistant({
      text: sentText(patient, describePlan(plan)),
      spec: { component: 'Sent', patientId: patient.id, setName: spec.draft.name, planLabel: describePlan(plan) },
    });
  };

  const update = (patch: Partial<SchedulePlan>) => setPlan((current) => ({ ...current, ...patch }));
  const activeDays = planDays(plan);
  const toggleDay = (day: PlanDay) =>
    setPlan((current) => {
      const days = planDays(current);
      const next = days.includes(day) ? days.filter((candidate) => candidate !== day) : [...days, day];
      return next.length > 0 ? planWithDays(current, next) : current;
    });
  const pickRhythm = (value: PlanRhythm | typeof CHOSEN_DAYS) =>
    setPlan((current) => {
      if (value === CHOSEN_DAYS) return { ...current, days: planDays(current) };
      const { days: _days, ...rest } = current;
      return { ...rest, rhythm: value };
    });

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
              {sending ? 'Wysyłam…' : 'Wyślij pacjentowi'}
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
          {formatExerciseCount(spec.draft.items.length)} · ok. {draftMinutes(spec.draft.items)} min{' '}
          {activeDays.length === 7 ? 'dziennie' : 'na trening'}
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
          value={plan.days?.length ? CHOSEN_DAYS : plan.rhythm}
          options={RHYTHM_OPTIONS}
          onChange={pickRhythm}
          disabled={isSent}
          className="justify-self-start"
          testId={`${testId}-rhythm`}
        />
        <span className="text-label-secondary">Dni</span>
        <div
          role="group"
          aria-label="Dni tygodnia"
          data-testid={`${testId}-days`}
          className="inline-flex flex-wrap gap-0.5 justify-self-start rounded-[10px] bg-fill-quaternary p-0.5"
        >
          {PLAN_DAYS.map((day) => {
            const isActive = activeDays.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                aria-pressed={isActive}
                aria-label={day.label}
                disabled={isSent}
                onClick={() => toggleDay(day.value)}
                data-testid={`${testId}-days-${day.value}-btn`}
                className={cn(
                  'h-[30px] min-w-9 rounded-[8px] px-2 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40',
                  isActive
                    ? 'bg-elevated font-semibold text-foreground shadow-raised'
                    : 'font-medium text-label-secondary hover:text-foreground'
                )}
              >
                {day.short}
              </button>
            );
          })}
        </div>
        <span className="text-label-secondary">Koniec</span>
        <span className="font-medium tabular-nums text-foreground">{formatPlanDate(endDate)}</span>
      </div>
      <ChatCardNote>{planNote(Boolean(spec.draft.sourceSetId))}</ChatCardNote>
    </ChatCard>
  );
}
