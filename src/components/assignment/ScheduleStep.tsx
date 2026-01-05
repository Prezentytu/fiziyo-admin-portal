"use client";

import { Calendar, Clock } from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FrequencyPicker,
  type FrequencyValue,
} from "@/components/exercise-sets/FrequencyPicker";
import { cn } from "@/lib/utils";
import type { Frequency } from "./types";

interface ScheduleStepProps {
  startDate: Date;
  endDate: Date;
  frequency: Frequency;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onFrequencyChange: (frequency: Frequency) => void;
}

export function ScheduleStep({
  startDate,
  endDate,
  frequency,
  onStartDateChange,
  onEndDateChange,
  onFrequencyChange,
}: ScheduleStepProps) {
  const durationDays = differenceInDays(endDate, startDate);
  const durationWeeks = Math.ceil(durationDays / 7);
  const selectedDaysCount = [
    frequency.monday,
    frequency.tuesday,
    frequency.wednesday,
    frequency.thursday,
    frequency.friday,
    frequency.saturday,
    frequency.sunday,
  ].filter(Boolean).length;

  const totalSessions =
    Math.floor((durationDays / 7) * selectedDaysCount) * frequency.timesPerDay;

  // Convert FrequencyValue to Frequency and vice versa (they should be compatible)
  const handleFrequencyChange = (value: FrequencyValue) => {
    onFrequencyChange(value as Frequency);
  };

  return (
    <div className="flex flex-col space-y-6 h-full overflow-y-auto pr-2">
      {/* Date range */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Okres trwania</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Data rozpoczęcia</Label>
            <Input
              type="date"
              value={format(startDate, "yyyy-MM-dd")}
              onChange={(e) => {
                const newDate = new Date(e.target.value);
                onStartDateChange(newDate);
                // If end date is before start date, adjust it
                if (newDate > endDate) {
                  onEndDateChange(addDays(newDate, 30));
                }
              }}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Data zakończenia</Label>
            <Input
              type="date"
              value={format(endDate, "yyyy-MM-dd")}
              onChange={(e) => onEndDateChange(new Date(e.target.value))}
              min={format(startDate, "yyyy-MM-dd")}
              className="h-11"
            />
          </div>
        </div>

        {/* Quick duration buttons */}
        <div className="flex flex-wrap gap-2">
          {[
            { days: 7, label: "1 tydzień" },
            { days: 14, label: "2 tygodnie" },
            { days: 30, label: "1 miesiąc" },
            { days: 60, label: "2 miesiące" },
            { days: 90, label: "3 miesiące" },
          ].map(({ days, label }) => {
            const isSelected = durationDays === days;
            return (
              <button
                key={days}
                type="button"
                onClick={() => onEndDateChange(addDays(startDate, days))}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-light hover:bg-surface-hover"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Frequency */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Częstotliwość</h3>
        </div>

        <FrequencyPicker
          value={frequency as FrequencyValue}
          onChange={handleFrequencyChange}
        />
      </div>

      {/* Inline summary */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-light/50 border border-border/40 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            {durationDays} dni ({durationWeeks} tyg.)
          </span>
        </div>
        <span className="text-border">•</span>
        <span>{selectedDaysCount} dni/tydzień</span>
        <span className="text-border">•</span>
        <span className="text-primary font-medium">~{totalSessions} sesji</span>
      </div>
    </div>
  );
}
