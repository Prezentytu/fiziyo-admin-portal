"use client";

import { useState, useMemo } from "react";
import { Calendar, Zap, Info, ArrowRight, Check } from "lucide-react";
import { format, addDays, addMonths, addWeeks, differenceInDays, startOfDay } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Frequency } from "./types";

interface ScheduleStepProps {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly frequency: Frequency;
  readonly onStartDateChange: (date: Date) => void;
  readonly onEndDateChange: (date: Date) => void;
  readonly onFrequencyChange: (frequency: Frequency) => void;
}

const DAYS = [
  { key: "monday", label: "Pn", fullLabel: "Poniedziałek" },
  { key: "tuesday", label: "Wt", fullLabel: "Wtorek" },
  { key: "wednesday", label: "Śr", fullLabel: "Środa" },
  { key: "thursday", label: "Cz", fullLabel: "Czwartek" },
  { key: "friday", label: "Pt", fullLabel: "Piątek" },
  { key: "saturday", label: "So", fullLabel: "Sobota" },
  { key: "sunday", label: "Nd", fullLabel: "Niedziela" },
] as const;

type DayKey = (typeof DAYS)[number]["key"];

// Presets z humanizowanym czasem
const DURATION_PRESETS = [
  { id: "2w", label: "2 Tygodnie", getDuration: (start: Date) => addWeeks(start, 2) },
  { id: "1m", label: "1 Miesiąc", getDuration: (start: Date) => addMonths(start, 1) },
  { id: "3m", label: "3 Miesiące", getDuration: (start: Date) => addMonths(start, 3) },
] as const;

type DurationPresetId = (typeof DURATION_PRESETS)[number]["id"];

// Helper dla polskich odmian
function pluralizeDay(n: number): string {
  return n === 1 ? "dzień" : "dni";
}

// Clean Stepper Component (inline)
interface CleanStepperProps {
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly label: string;
  readonly subLabel?: string;
  readonly min?: number;
  readonly max?: number;
}

function CleanStepper({ value, onChange, label, subLabel, min = 1, max = 10 }: CleanStepperProps) {
  const handleDec = () => onChange(Math.max(min, value - 1));
  const handleInc = () => onChange(Math.min(max, value + 1));

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between bg-surface-light/50 border border-border/40 rounded-xl p-2 group hover:border-border/60 transition-colors">
        <button
          type="button"
          onClick={handleDec}
          disabled={value <= min}
          className="w-12 h-12 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-light transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="text-2xl font-medium">−</span>
        </button>
        <div className="font-bold text-3xl text-foreground tabular-nums min-w-[2ch] text-center">
          {value}
        </div>
        <button
          type="button"
          onClick={handleInc}
          disabled={value >= max}
          className="w-12 h-12 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-light transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="text-2xl font-medium">+</span>
        </button>
      </div>
      <div className="flex justify-between items-baseline mt-2 px-1">
        <span className="text-xs uppercase font-bold text-muted-foreground/70 tracking-wider">
          {label}
        </span>
        {subLabel && (
          <span className="text-xs font-medium text-primary animate-in fade-in duration-300">
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * CompactScheduleStep - "Time & Effort Grid"
 *
 * Układ horyzontalny (Dashboard):
 * - LEWA KOLUMNA: Czas (Kiedy?)
 * - PRAWA KOLUMNA: Wysiłek (Ile?)
 *
 * Wszystko "above the fold" - bez przewijania.
 */
export function ScheduleStep({
  startDate,
  endDate,
  frequency,
  onStartDateChange,
  onEndDateChange,
  onFrequencyChange,
}: ScheduleStepProps) {
  // === LOCAL STATE ===
  const [selectedPreset, setSelectedPreset] = useState<DurationPresetId | null>(() => {
    // Auto-detect preset based on current duration
    const days = differenceInDays(endDate, startDate);
    if (days >= 13 && days <= 15) return "2w";
    if (days >= 28 && days <= 32) return "1m";
    if (days >= 88 && days <= 93) return "3m";
    return null;
  });

  const [frequencyType, setFrequencyType] = useState<"flexible" | "specific">(() => {
    const selectedDays = [
      frequency.monday,
      frequency.tuesday,
      frequency.wednesday,
      frequency.thursday,
      frequency.friday,
      frequency.saturday,
      frequency.sunday,
    ].filter(Boolean).length;
    return selectedDays > 0 ? "specific" : "flexible";
  });

  // === COMPUTED VALUES ===
  const today = startOfDay(new Date());
  const durationDays = differenceInDays(endDate, startDate);
  const daysToStart = differenceInDays(startOfDay(startDate), today);
  const isDelayed = daysToStart > 0;

  const selectedDaysCount = useMemo(() => {
    return [
      frequency.monday,
      frequency.tuesday,
      frequency.wednesday,
      frequency.thursday,
      frequency.friday,
      frequency.saturday,
      frequency.sunday,
    ].filter(Boolean).length;
  }, [frequency]);

  const effectiveWeeklyFrequency = frequencyType === "flexible"
    ? (frequency.timesPerWeek || 3)
    : selectedDaysCount;

  const totalSessions = Math.round((durationDays / 7) * effectiveWeeklyFrequency * frequency.timesPerDay);

  // === HANDLERS ===
  const handlePresetClick = (presetId: DurationPresetId) => {
    setSelectedPreset(presetId);
    const preset = DURATION_PRESETS.find(p => p.id === presetId);
    if (preset) {
      onEndDateChange(preset.getDuration(startDate));
    }
  };

  const handleWeeklyFrequencyChange = (value: number) => {
    onFrequencyChange({
      ...frequency,
      timesPerWeek: value,
    });
  };

  const handleDailyFrequencyChange = (value: number) => {
    onFrequencyChange({
      ...frequency,
      timesPerDay: value,
    });
  };

  const toggleFrequencyType = () => {
    if (frequencyType === "flexible") {
      setFrequencyType("specific");
      onFrequencyChange({
        ...frequency,
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: false,
        friday: true,
        saturday: false,
        sunday: false,
      });
    } else {
      setFrequencyType("flexible");
      onFrequencyChange({
        ...frequency,
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
      });
    }
  };

  const toggleDay = (day: DayKey) => {
    onFrequencyChange({
      ...frequency,
      [day]: !frequency[day],
    });
  };

  // Smart Feedback
  const getIntensityLabel = (value: number): string | undefined => {
    if (value <= 2) return "Utrzymaniowo";
    if (value >= 3 && value <= 5) return "Optymalnie";
    if (value >= 6) return "Intensywnie";
    return undefined;
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* === GRID LAYOUT - Dwie równe kolumny === */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">

          {/* === KOLUMNA LEWA: CZAS (Kiedy?) === */}
          <div className="bg-surface border border-border/60 rounded-2xl p-6 lg:p-7 flex flex-col min-h-[340px]">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2.5 mb-6">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              Czas trwania
            </h3>

            {/* 1. Quick Chips (Humanizowane) */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetClick(preset.id)}
                  className={cn(
                    "text-sm py-3 rounded-xl border font-medium transition-all duration-200",
                    selectedPreset === preset.id
                      ? "bg-primary/10 border-primary/50 text-primary shadow-[0_0_15px_-3px] shadow-primary/20"
                      : "bg-surface-light/50 border-border/40 text-muted-foreground hover:border-border/60 hover:text-foreground"
                  )}
                  data-testid={`assign-schedule-preset-${preset.id}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* 2. Daty (Wizualnie połączone) */}
            <div className="flex items-center gap-3 mb-5">
              {/* Start */}
              <div className="flex-1 bg-surface-light/50 border border-border/40 rounded-xl p-4 hover:border-border/60 transition-colors">
                <span className="block text-xs uppercase text-muted-foreground/70 font-bold tracking-wider mb-1.5">
                  Start
                </span>
                <Input
                  type="date"
                  value={format(startDate, "yyyy-MM-dd")}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    onStartDateChange(newDate);
                    setSelectedPreset(null); // Reset preset on manual edit
                    if (newDate > endDate) {
                      onEndDateChange(addDays(newDate, 30));
                    }
                  }}
                  className="font-mono text-base bg-transparent border-0 p-0 h-auto shadow-none focus-visible:ring-0"
                  data-testid="assign-schedule-start-date"
                />
              </div>

              <ArrowRight className="w-5 h-5 text-border shrink-0" />

              {/* Koniec */}
              <div className="flex-1 bg-surface-light/50 border border-border/40 rounded-xl p-4 hover:border-border/60 transition-colors">
                <span className="block text-xs uppercase text-muted-foreground/70 font-bold tracking-wider mb-1.5">
                  Koniec
                </span>
                <Input
                  type="date"
                  value={format(endDate, "yyyy-MM-dd")}
                  onChange={(e) => {
                    onEndDateChange(new Date(e.target.value));
                    setSelectedPreset(null); // Reset preset on manual edit
                  }}
                  min={format(startDate, "yyyy-MM-dd")}
                  className="font-mono text-base bg-transparent border-0 p-0 h-auto shadow-none focus-visible:ring-0"
                  data-testid="assign-schedule-end-date"
                />
              </div>
            </div>

            {/* 3. Info o aktywacji (Na dole kolumny) */}
            <div className="mt-auto">
              {isDelayed ? (
                <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-4 flex gap-3">
                  <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-300/80 leading-relaxed">
                    Aktywacja za <strong>{daysToStart} {pluralizeDay(daysToStart)}</strong>.
                    Pacjent otrzyma powiadomienie{" "}
                    <strong>{format(startDate, "d MMMM", { locale: pl })}</strong>.
                  </div>
                </div>
              ) : (
                <div className="bg-surface-light/30 border border-border/30 rounded-xl p-4 flex gap-3">
                  <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    Plan aktywny przez <strong>{durationDays} dni</strong>.
                    Pacjent otrzyma powiadomienie w dniu startu.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* === KOLUMNA PRAWA: INTENSYWNOŚĆ (Ile?) === */}
          <div className="bg-surface border border-border/60 rounded-2xl p-6 lg:p-7 flex flex-col min-h-[340px]">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2.5 mb-6">
              <Zap className="w-5 h-5 text-primary" />
              Intensywność
            </h3>

            <div className="space-y-6">
              {/* 1. Tygodniowo */}
              <div className={cn(
                "transition-all duration-300",
                frequencyType === "specific" && "opacity-40 pointer-events-none"
              )}>
                <CleanStepper
                  value={frequency.timesPerWeek || 3}
                  onChange={handleWeeklyFrequencyChange}
                  min={1}
                  max={7}
                  label="Sesje w tygodniu"
                  subLabel={frequencyType === "flexible" ? getIntensityLabel(frequency.timesPerWeek || 3) : undefined}
                />
              </div>

              {/* 2. Dziennie */}
              <CleanStepper
                value={frequency.timesPerDay}
                onChange={handleDailyFrequencyChange}
                min={1}
                max={5}
                label="Razy dziennie"
                subLabel={frequency.timesPerDay > 1 ? "Rozłóż w ciągu dnia" : undefined}
              />
            </div>

            {/* 3. Toggle (Na dole) */}
            <div className="mt-auto pt-6">
              <Collapsible open={frequencyType === "specific"}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    onClick={toggleFrequencyType}
                    className="flex items-center justify-between w-full group p-2.5 -mx-2.5 rounded-xl hover:bg-surface-light/50 transition-colors"
                    data-testid="assign-schedule-specific-days-toggle"
                  >
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      Ustaw konkretne dni tygodnia
                    </span>
                    <div
                      className={cn(
                        "w-11 h-6 rounded-full relative transition-colors duration-200",
                        frequencyType === "specific" ? "bg-primary" : "bg-surface-light border border-border/60"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm",
                          frequencyType === "specific" ? "translate-x-5 left-1" : "translate-x-0 left-1"
                        )}
                      />
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="flex gap-1.5 mt-4 animate-in slide-in-from-top-2 fade-in duration-300">
                    {DAYS.map((day) => {
                      const isSelected = frequency[day.key] === true;
                      return (
                        <button
                          key={day.key}
                          type="button"
                          onClick={() => toggleDay(day.key)}
                          className={cn(
                            "flex-1 h-10 text-xs font-bold rounded-lg border transition-all duration-200",
                            isSelected
                              ? "bg-primary/20 border-primary/50 text-primary"
                              : "bg-surface-light/50 border-border/40 text-muted-foreground hover:border-border/60 hover:text-foreground"
                          )}
                          title={day.fullLabel}
                          data-testid={`assign-schedule-day-${day.key}`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Wybrano: <span className="font-medium text-foreground">{selectedDaysCount}</span> {pluralizeDay(selectedDaysCount)}
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </div>

        {/* === FOOTER: PODSUMOWANIE === */}
        <div className="mt-5 flex items-center justify-between bg-surface-light/30 border border-border/30 rounded-2xl px-6 py-4">
          <div className="flex items-center gap-5 text-base">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Calendar className="w-5 h-5" />
              <span>{durationDays} dni</span>
            </div>
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-2.5 text-primary font-semibold">
              <Check className="w-5 h-5" />
              <span>~{totalSessions} sesji łącznie</span>
            </div>
          </div>

          {/* Micro formula */}
          <div className="hidden sm:flex items-center gap-2.5 text-sm text-muted-foreground">
            <span>{effectiveWeeklyFrequency}×/tyg</span>
            <span>×</span>
            <span>{frequency.timesPerDay}×/dzień</span>
            <span>×</span>
            <span>{Math.round(durationDays / 7)} tyg</span>
          </div>
        </div>

      </div>
    </div>
  );
}
