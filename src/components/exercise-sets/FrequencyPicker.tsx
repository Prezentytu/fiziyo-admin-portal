"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";

const DAYS = [
  { key: "monday", label: "Pn", fullLabel: "Poniedziałek" },
  { key: "tuesday", label: "Wt", fullLabel: "Wtorek" },
  { key: "wednesday", label: "Śr", fullLabel: "Środa" },
  { key: "thursday", label: "Cz", fullLabel: "Czwartek" },
  { key: "friday", label: "Pt", fullLabel: "Piątek" },
  { key: "saturday", label: "So", fullLabel: "Sobota" },
  { key: "sunday", label: "Nd", fullLabel: "Niedziela" },
] as const;

export interface FrequencyValue {
  timesPerDay: number;
  breakBetweenSets: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

interface FrequencyPickerProps {
  value: FrequencyValue;
  onChange: (value: FrequencyValue) => void;
  className?: string;
}

export function FrequencyPicker({
  value,
  onChange,
  className,
}: FrequencyPickerProps) {
  const toggleDay = (day: keyof FrequencyValue) => {
    if (typeof value[day] === "boolean") {
      onChange({ ...value, [day]: !value[day] });
    }
  };

  const selectedDaysCount = DAYS.filter(
    (d) => value[d.key as keyof FrequencyValue]
  ).length;

  const selectAllDays = () => {
    onChange({
      ...value,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
      sunday: true,
    });
  };

  const selectWeekdays = () => {
    onChange({
      ...value,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    });
  };

  const clearDays = () => {
    onChange({
      ...value,
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    });
  };

  return (
    <div className={cn("space-y-5", className)}>
      {/* Days of week */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Dni tygodnia</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllDays}
              className="text-xs text-primary hover:underline"
            >
              Wszystkie
            </button>
            <span className="text-muted-foreground">·</span>
            <button
              type="button"
              onClick={selectWeekdays}
              className="text-xs text-primary hover:underline"
            >
              Pn-Pt
            </button>
            <span className="text-muted-foreground">·</span>
            <button
              type="button"
              onClick={clearDays}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Wyczyść
            </button>
          </div>
        </div>
        <div className="flex gap-1.5 sm:gap-2">
          {DAYS.map((day) => {
            const isSelected = value[day.key as keyof FrequencyValue] === true;
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => toggleDay(day.key as keyof FrequencyValue)}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105"
                    : "bg-surface-light text-muted-foreground hover:bg-surface hover:text-foreground border border-transparent hover:border-border/50"
                )}
                title={day.fullLabel}
              >
                {day.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Wybrano: {selectedDaysCount} {selectedDaysCount === 1 ? "dzień" : "dni"}
        </p>
      </div>

      {/* Times per day and break */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="timesPerDay" className="text-sm font-medium">
            Ile razy dziennie
          </Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() =>
                onChange({
                  ...value,
                  timesPerDay: Math.max(1, value.timesPerDay - 1),
                })
              }
              disabled={value.timesPerDay <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              id="timesPerDay"
              type="number"
              min={1}
              max={10}
              value={value.timesPerDay}
              onChange={(e) =>
                onChange({
                  ...value,
                  timesPerDay: Math.max(1, parseInt(e.target.value) || 1),
                })
              }
              className="h-11 text-center text-lg font-semibold"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() =>
                onChange({
                  ...value,
                  timesPerDay: Math.min(10, value.timesPerDay + 1),
                })
              }
              disabled={value.timesPerDay >= 10}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Liczba wykonań zestawu dziennie
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="breakBetweenSets" className="text-sm font-medium">
            Przerwa między wykonaniami (godz.)
          </Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() =>
                onChange({
                  ...value,
                  breakBetweenSets: Math.max(0, value.breakBetweenSets - 1),
                })
              }
              disabled={value.breakBetweenSets <= 0}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              id="breakBetweenSets"
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={value.breakBetweenSets}
              onChange={(e) =>
                onChange({
                  ...value,
                  breakBetweenSets: Math.max(0, parseFloat(e.target.value) || 0),
                })
              }
              className="h-11 text-center text-lg font-semibold"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() =>
                onChange({
                  ...value,
                  breakBetweenSets: Math.min(24, value.breakBetweenSets + 1),
                })
              }
              disabled={value.breakBetweenSets >= 24}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Minimalny odstęp między sesjami
          </p>
        </div>
      </div>
    </div>
  );
}

export const defaultFrequency: FrequencyValue = {
  timesPerDay: 1,
  breakBetweenSets: 4,
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
};

