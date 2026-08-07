'use client';

import { CalendarDays } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { DayData } from '@/lib/therapyStatus';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FeelingsHeatmapProps {
  readonly data: DayData[];
  readonly className?: string;
  readonly title?: string;
}

const dayLabels = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

export function FeelingsHeatmap({ data, className, title }: FeelingsHeatmapProps) {
  const today = new Date().toDateString();

  // Podziel dane na tygodnie (7 dni na tydzień)
  const weeks: DayData[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  const getSquareStyle = (day: DayData) => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    // Przyszłe dni (po dzisiaj) - wyszarzone
    if (day.date > now) {
      return 'bg-surface-light/50 border-border opacity-50';
    }

    // Przed rozpoczęciem planu - neutralne, bez alarmu
    if (day.isBeforeStart) {
      return 'bg-surface-light/40 border-border opacity-40';
    }

    // Wykonał trening
    if (day.hasActivity) {
      // Priorytet: dyskomfort > ciężko > OK
      if (day.wellbeing === 'discomfort') {
        return 'bg-red-500/20 border-red-500/50 hover:bg-red-500/30';
      }

      if (day.feeling === 'hard') {
        return 'bg-yellow-500/20 border-yellow-500/50 hover:bg-yellow-500/30';
      }

      // OK/Lekko - zielony z glow effect
      return 'bg-green-500/20 border-green-500/50 hover:bg-green-500/30 shadow-[0_0_10px_-2px_rgba(34,197,94,0.2)]';
    }

    // Nie ćwiczył
    if (day.isScheduled) {
      // Był zaplanowany ale nie ćwiczył - subtelne ostrzeżenie (nie czerwone!)
      return 'bg-surface-light/70 border-orange-500/30 hover:border-orange-500/50';
    }

    // Nie był zaplanowany - neutralne
    return 'bg-surface-light/80 border-border hover:border-border-light';
  };

  const formatTooltip = (day: DayData) => {
    const date = day.date;
    const dateStr = `${date.getDate()}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    // Przyszły dzień
    if (day.date > now) {
      return day.isScheduled ? `${dateStr} - Zaplanowany` : `${dateStr}`;
    }

    // Przed rozpoczęciem planu
    if (day.isBeforeStart) {
      return `${dateStr} - Przed rozpoczęciem planu`;
    }

    if (day.hasActivity) {
      let status = '';
      if (day.wellbeing === 'discomfort') {
        status = 'Zgłoszono dyskomfort';
      } else if (day.feeling === 'hard') {
        status = 'Trening wykonany: Ciężko';
      } else if (day.feeling === 'easy') {
        status = 'Trening wykonany: Lekko';
      } else {
        status = 'Trening wykonany: OK';
      }

      let tooltip = `${dateStr} - ${status}`;
      if (day.notes) {
        tooltip += `\n"${day.notes}"`;
      }
      return tooltip;
    }

    // Nie ćwiczył
    if (day.isScheduled) {
      return `${dateStr} - Pominięty trening`;
    }

    return `${dateStr} - Dzień wolny`;
  };

  return (
    <div
      className={cn(
        'rounded-xl md:rounded-2xl border border-border/60 bg-background/40 dark:bg-background/20 p-5 md:p-6',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-info/10">
            <CalendarDays className="h-3.5 w-3.5 text-info" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            {title ?? `Regularność (Ostatnie ${data.length} dni)`}
          </h3>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            <span>OK</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-yellow-500" />
            <span>Ciężko</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-red-500" />
            <span>Dyskomfort</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-surface-light border border-border" />
            <span>Brak</span>
          </div>
        </div>
      </div>

      <TooltipProvider delayDuration={100}>
        <div className="mx-auto max-w-md space-y-1.5">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1.5">
            {dayLabels.map((label) => (
              <div key={label} className="text-center text-muted-foreground text-[10px] uppercase pb-1">
                {label}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week) => (
            <div key={week[0]?.dateStr || `week-${week.map((d) => d.dateStr).join('-')}`} className="grid grid-cols-7 gap-1.5">
              {week.map((day) => {
                const isToday = day.date.toDateString() === today;

                return (
                  <Tooltip key={day.dateStr}>
                    <TooltipTrigger asChild>
                      <div className="mx-auto aspect-square w-full max-w-9">
                        <div
                          className={cn(
                            'relative h-full w-full rounded-md border transition-colors',
                            getSquareStyle(day)
                          )}
                        >
                          {/* Marker dla "dzisiaj" - biała kropka */}
                          {isToday && day.hasActivity && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-popover border-border text-popover-foreground max-w-[200px]">
                      <p className="whitespace-pre-line text-xs">{formatTooltip(day)}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
