'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { UPDATE_EXERCISE_SET_FREQUENCY_MUTATION } from '@/graphql/mutations/exercises.mutations';
import type { Frequency } from '@/features/assignment/types';
import {
  buildAssignmentFrequencyPayload,
  normalizeFrequencySeed,
  type FrequencyInput,
} from '@/features/assignment/utils/scheduleFrequencyUtils';
import { formatScheduleStat } from '@/utils/frequencyDisplay';
import { SetScheduleField } from './SetScheduleField';

interface SetScheduleStatProps {
  readonly exerciseSetId: string;
  readonly frequency?: FrequencyInput | null;
  readonly className?: string;
}

/**
 * Kafelek „Harmonogram” na karcie szablonu: pokazuje domyślną częstotliwość i pozwala ją zmienić.
 * Zapis idzie po zamknięciu okienka, tylko gdy coś się zmieniło.
 */
export function SetScheduleStat({ exerciseSetId, frequency, className }: SetScheduleStatProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Frequency>(() => normalizeFrequencySeed(frequency));
  const [updateFrequency, { loading }] = useMutation(UPDATE_EXERCISE_SET_FREQUENCY_MUTATION);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraft(normalizeFrequencySeed(frequency));
      setOpen(true);
      return;
    }
    setOpen(false);

    const payload = buildAssignmentFrequencyPayload(draft);
    const unchanged = JSON.stringify(payload) === JSON.stringify(buildAssignmentFrequencyPayload(frequency ?? {}));
    if (unchanged || (!payload.isFlexible && Number(payload.timesPerWeek) === 0)) return;

    updateFrequency({ variables: { exerciseSetId, frequency: payload } })
      .then(() => toast.success('Zapisano harmonogram zestawu'))
      .catch((error: unknown) => {
        console.error('Błąd zapisu harmonogramu zestawu:', error);
        toast.error('Nie udało się zapisać harmonogramu');
      });
  };

  const stat = formatScheduleStat(open ? draft : (frequency ?? undefined));

  return (
    <SetScheduleField
      value={draft}
      onChange={setDraft}
      open={open}
      onOpenChange={handleOpenChange}
      testIdPrefix="set-detail-frequency"
      trigger={
        <button
          type="button"
          className={cn(
            'group flex flex-1 flex-col rounded-[10px] border-l-[0.5px] border-separator px-3 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className
          )}
          aria-label="Zmień harmonogram zestawu"
          data-testid="set-detail-frequency-trigger"
        >
          <span className="flex items-center gap-1.5 text-[28px] font-bold leading-[34px] tabular-nums text-foreground">
            {stat.value}
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
            ) : (
              <Pencil className="h-4 w-4 text-muted-foreground opacity-60 group-hover:opacity-100" aria-hidden="true" />
            )}
          </span>
          <span className="text-[13px] text-label-secondary" data-testid="set-detail-frequency-summary">
            {stat.label}
          </span>
        </button>
      }
    />
  );
}
