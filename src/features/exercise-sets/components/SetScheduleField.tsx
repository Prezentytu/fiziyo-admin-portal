'use client';

import type { ReactNode } from 'react';
import { CalendarClock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FrequencyFields } from '@/features/assignment/FrequencyFields';
import type { Frequency } from '@/features/assignment/types';
import { formatScheduleShort } from '@/utils/frequencyDisplay';

interface SetScheduleFieldProps {
  readonly value: Frequency;
  readonly onChange: (frequency: Frequency) => void;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  /** Własny wygląd przycisku (np. kafelek statystyki na karcie zestawu); domyślnie pigułka z opisem. */
  readonly trigger?: ReactNode;
  readonly testIdPrefix?: string;
}

/**
 * Domyślny harmonogram szablonu zestawu. Kreator przypisania bierze go jako punkt startowy
 * dla każdego pacjenta, a przy przypisaniu fizjoterapeuta może go zmienić.
 */
export function SetScheduleField({
  value,
  onChange,
  open,
  onOpenChange,
  trigger,
  testIdPrefix = 'set-frequency',
}: SetScheduleFieldProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/60 bg-surface-light/40 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid={`${testIdPrefix}-trigger`}
          >
            <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">Harmonogram:</span>
            <span className="truncate font-medium" data-testid={`${testIdPrefix}-summary`}>
              {formatScheduleShort(value)}
            </span>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex max-h-[var(--radix-popover-content-available-height)] w-[min(92vw,440px)] flex-col gap-4 overflow-y-auto p-5"
        data-testid={`${testIdPrefix}-popover`}
      >
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-foreground">Jak często ćwiczyć</h3>
          <p className="text-xs text-muted-foreground">
            Domyślne dla tego zestawu. Przy przypisaniu pacjentowi możesz to zmienić.
          </p>
        </div>
        <FrequencyFields frequency={value} onFrequencyChange={onChange} testIdPrefix={testIdPrefix} />
      </PopoverContent>
    </Popover>
  );
}
