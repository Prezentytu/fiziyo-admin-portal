'use client';

import { useMemo, useState } from 'react';
import { Send, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';
import { isV33ExerciseRecord } from '@/utils/exerciseRecordVersion';
import { formatExerciseCount } from '@/utils/polishPlural';
import { useChatActions } from '../ChatSessionContext';
import { useAvailableExercises } from '../useAvailableExercises';
import { patientLabel as labelAmongNamesakes } from '../utils/patientMatch';
import {
  FLOW_CANCEL_LABEL,
  formatPlanDate,
  PLAN_DAYS,
  PLAN_STARTS,
  PLAN_WEEKS,
  planWeeksLabel,
  resolvePlanDates,
} from '../utils/schedulePlan';
import { seedDraftItems } from '../utils/seedDraft';
import { sentText } from '../utils/sendPlan';
import { draftMinutes, proposeDraftName, type DraftItem, type SetDraftPayload } from '../utils/setDraft';
import {
  DEFAULT_WEEK_PERIOD,
  entryPlan,
  formatSetCount,
  toggleWeekDay,
  unsentEntries,
  weekOverview,
  weekPlanLabel,
  weekReady,
  type WeekEntry,
  type WeekPeriod,
} from '../utils/weekPlan';
import type { CardProps } from './cardProps';
import { ChatCard, ChatCardNote } from './ChatCard';
import { useSendPlan } from './useChatWrites';

const WEEK_OPTIONS = PLAN_WEEKS.map((weeks) => ({ value: weeks, label: planWeeksLabel(weeks) }));
const MAX_PATIENTS = 6;
/** `chosen` of a send that stopped half way: the sets already with the patient, so a retry sends only the rest. */
const PARTIAL_PREFIX = 'partial:';

function sentSetIdsOf(chosen: string | undefined): string[] {
  return chosen?.startsWith(PARTIAL_PREFIX) ? chosen.slice(PARTIAL_PREFIX.length).split(',').filter(Boolean) : [];
}

/**
 * SPEC-067 „Plan tygodnia”: several catalog sets for one patient, each on its own weekdays, with one start and
 * length. „Wyślij” writes each set the same way as the single-set flow (patient plan + assignment with its days).
 */
export function WeekPlanCard({ spec, testId, messageId, chosen }: CardProps<'WeekPlan'>) {
  const {
    organizationId,
    patients,
    contextPatient,
    organizationSets,
    setsReady,
    appendAssistant,
    appendExchange,
    markChosen,
    refetchCredits,
  } = useChatActions();
  const [week, setWeek] = useState<WeekEntry[]>(spec.week);
  const [period, setPeriod] = useState<WeekPeriod>(spec.period ?? DEFAULT_WEEK_PERIOD);
  const [patientId, setPatientId] = useState(spec.patientId);
  const { send, sending } = useSendPlan();

  const isSent = chosen === 'sent';
  const isCancelled = chosen === 'cancelled';
  const sentSetIds = sentSetIdsOf(chosen);
  const locked = isSent || isCancelled || sentSetIds.length > 0;

  const setsById = useMemo(() => new Map(organizationSets.map((set) => [set.id, set])), [organizationSets]);
  const exerciseIds = useMemo(
    () =>
      week.flatMap((entry) => (setsById.get(entry.setId)?.exerciseMappings ?? []).map((mapping) => mapping.exerciseId)),
    [setsById, week]
  );
  const { exercises, loading, detailsReady } = useAvailableExercises(organizationId, true, exerciseIds);
  const byId = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise])), [exercises]);

  const itemsOf = (setId: string): DraftItem[] | null => {
    const seed = seedDraftItems({
      setId,
      exerciseIds: [],
      sets: organizationSets,
      setsReady,
      exercises,
      exercisesReady: !loading,
    });
    if (!seed || seed.missingSet) return null;
    // Wersja rekordu jak w karcie zestawu: od niej zależy, czy „naprzemiennie” liczy na stronę.
    return seed.items.map((item) =>
      isV33ExerciseRecord(byId.get(item.exerciseId)) ? { ...item, alternatingPerSide: true } : item
    );
  };

  const patient = patientId ? patients.find((candidate) => candidate.id === patientId) : undefined;
  const patientNames = patients.map((candidate) => candidate.name);
  const candidates = useMemo(
    () =>
      [...patients]
        .sort((left, right) => Number(right.id === contextPatient?.id) - Number(left.id === contextPatient?.id))
        .slice(0, MAX_PATIENTS),
    [contextPatient?.id, patients]
  );
  const overview = weekOverview(week);
  const rest = unsentEntries(week, sentSetIds);
  const contentReady = setsReady && !loading && detailsReady;
  const canSend = Boolean(patient) && weekReady(week) && contentReady && !sending && !isSent && !isCancelled;
  const { endDate } = resolvePlanDates({ ...period, rhythm: 'daily' });
  const setLabel = (setId: string) => setsById.get(setId)?.name ?? 'Zestaw niedostępny';

  const handleSend = async () => {
    if (!patient) return;
    const done = [...sentSetIds];
    for (const entry of rest) {
      const set = setsById.get(entry.setId);
      const items = itemsOf(entry.setId);
      if (!set || !items || items.length === 0) continue;
      const draft: SetDraftPayload = {
        name: proposeDraftName({ setName: set.name, avoid: patientNames }),
        patientId: patient.id,
        sourceSetId: set.id,
        items,
      };
      const result = await send(organizationId, patient.id, draft, entryPlan(period, entry));
      if (!result) {
        if (done.length > 0) markChosen(messageId, `${PARTIAL_PREFIX}${done.join(',')}`);
        return;
      }
      done.push(entry.setId);
    }
    markChosen(messageId, 'sent');
    refetchCredits();
    const planLabel = weekPlanLabel(done.length, period);
    appendAssistant({
      text: sentText(patient, planLabel),
      spec: { component: 'Sent', patientId: patient.id, setName: formatSetCount(done.length), planLabel },
    });
  };

  return (
    <ChatCard
      testId={testId}
      title={isSent ? 'Wysłane' : isCancelled ? 'Anulowane' : 'Plan tygodnia'}
      footer={
        isSent || isCancelled ? (
          <span className="text-[13px] text-label-secondary">
            {isSent
              ? patient?.isShadowUser
                ? 'Plany zapisane, pacjent nie ma jeszcze konta w aplikacji'
                : 'Plany są już u pacjenta'
              : 'Nic nie zostało wysłane'}
          </span>
        ) : (
          <>
            <Button
              variant="ghost"
              disabled={sending || sentSetIds.length > 0}
              onClick={() => {
                markChosen(messageId, 'cancelled');
                appendExchange(FLOW_CANCEL_LABEL, { text: 'Anulowane. Nic nie zostało wysłane.' });
              }}
              data-testid={`${testId}-cancel-btn`}
            >
              {FLOW_CANCEL_LABEL}
            </Button>
            <Button onClick={() => void handleSend()} disabled={!canSend} data-testid={`${testId}-primary-btn`}>
              <Send aria-hidden="true" />
              {sending
                ? 'Wysyłam…'
                : sentSetIds.length > 0
                  ? `Wyślij resztę (${rest.length})`
                  : `Wyślij pacjentowi (${week.length})`}
            </Button>
          </>
        )
      }
    >
      {patient ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-5 text-[15px]">
          <dt className="text-label-secondary">Pacjent</dt>
          <dd className="flex items-center gap-2 font-medium text-foreground">
            {labelAmongNamesakes(patient, patients)}
            {!locked && (
              <button
                type="button"
                onClick={() => setPatientId(undefined)}
                className="text-[13px] font-medium text-primary hover:underline"
                data-testid={`${testId}-change-patient-btn`}
              >
                Zmień
              </button>
            )}
          </dd>
        </dl>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-[15px] text-label-secondary">Dla kogo?</span>
          <div className="flex flex-wrap gap-1.5">
            {candidates.map((candidate) => (
              <Button
                key={candidate.id}
                variant="outline"
                size="sm"
                disabled={locked}
                onClick={() => setPatientId(candidate.id)}
                data-testid={`${testId}-patient-${candidate.id}-btn`}
              >
                {labelAmongNamesakes(candidate, patients)}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div
        className="grid grid-cols-7 gap-1 rounded-[12px] bg-fill-quaternary p-1.5 text-center"
        data-testid={`${testId}-overview`}
      >
        {overview.map(({ day, setIds }) => {
          const meta = PLAN_DAYS.find((option) => option.value === day);
          return (
            <div key={day} className="flex min-w-0 flex-col gap-0.5" aria-label={meta?.label}>
              <span className="text-[12px] font-semibold text-label-secondary">{meta?.short}</span>
              {setIds.length === 0 ? (
                <span className="text-[12px] text-label-tertiary">–</span>
              ) : (
                setIds.map((setId) => (
                  <span key={setId} className="truncate text-[12px] text-foreground" title={setLabel(setId)}>
                    {setLabel(setId)}
                  </span>
                ))
              )}
            </div>
          );
        })}
      </div>

      <ul className="flex flex-col divide-y-[0.5px] divide-hairline">
        {week.map((entry) => {
          const items = itemsOf(entry.setId);
          const isEntrySent = isSent || sentSetIds.includes(entry.setId);
          return (
            <li
              key={entry.setId}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 py-2"
              data-testid={`${testId}-row-${entry.setId}`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-foreground">{setLabel(entry.setId)}</p>
                <p className="text-[13px] text-label-secondary">
                  {items
                    ? `${formatExerciseCount(items.length)} · ok. ${draftMinutes(items)} min`
                    : setsById.has(entry.setId)
                      ? 'Wczytywanie…'
                      : 'Zestawu nie ma już w katalogu'}
                  {isEntrySent ? ' · wysłany' : ''}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <div
                  role="group"
                  aria-label={`Dni: ${setLabel(entry.setId)}`}
                  className="inline-flex gap-0.5 rounded-[10px] bg-fill-quaternary p-0.5"
                >
                  {PLAN_DAYS.map((day) => {
                    const isActive = entry.days.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        aria-pressed={isActive}
                        aria-label={day.label}
                        disabled={locked}
                        onClick={() => setWeek((current) => toggleWeekDay(current, entry.setId, day.value))}
                        data-testid={`${testId}-row-${entry.setId}-days-${day.value}-btn`}
                        className={cn(
                          'h-7 min-w-8 rounded-[8px] px-1.5 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40',
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
                {!locked && week.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={`Usuń z tygodnia: ${setLabel(entry.setId)}`}
                    onClick={() => setWeek((current) => current.filter((candidate) => candidate.setId !== entry.setId))}
                    data-testid={`${testId}-row-${entry.setId}-remove-btn`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-2.5 border-t-[0.5px] border-hairline pt-3 text-[15px]">
        <span className="text-label-secondary">Start</span>
        <SegmentedControl
          label="Start"
          value={period.start}
          options={PLAN_STARTS}
          onChange={(start) => setPeriod((current) => ({ ...current, start }))}
          disabled={locked}
          className="justify-self-start"
          testId={`${testId}-start`}
        />
        <span className="text-label-secondary">Czas</span>
        <SegmentedControl
          label="Czas trwania"
          value={period.weeks}
          options={WEEK_OPTIONS}
          onChange={(weeks) => setPeriod((current) => ({ ...current, weeks }))}
          disabled={locked}
          className="justify-self-start"
          testId={`${testId}-weeks`}
        />
        <span className="text-label-secondary">Koniec</span>
        <span className="font-medium tabular-nums text-foreground">{formatPlanDate(endDate)}</span>
      </div>
      <ChatCardNote>
        {sentSetIds.length > 0
          ? `Wysłane ${sentSetIds.length} z ${week.length}. „Wyślij resztę” wyśle tylko pozostałe.`
          : 'Każdy zestaw trafia do pacjenta jako osobny plan z wybranymi dniami. Zestawy w katalogu zostają bez zmian.'}
      </ChatCardNote>
    </ChatCard>
  );
}
