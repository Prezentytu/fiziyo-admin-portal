"use client";

import { useState } from "react";
import {
  Calendar,
  Dumbbell,
  Users,
  FolderKanban,
  CheckCircle2,
  ChevronDown,
  Settings2,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { pl } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
import { getMediaUrl } from "@/utils/mediaUrl";
import type {
  ExerciseSet,
  Patient,
  Frequency,
  ExerciseOverride,
} from "./types";

interface SummaryStepProps {
  exerciseSet: ExerciseSet;
  selectedPatients: Patient[];
  startDate: Date;
  endDate: Date;
  frequency: Frequency;
  overrides: Map<string, ExerciseOverride>;
  excludedExercises: Set<string>;
}

export function SummaryStep({
  exerciseSet,
  selectedPatients,
  startDate,
  endDate,
  frequency,
  overrides,
  excludedExercises,
}: SummaryStepProps) {
  const [showExercises, setShowExercises] = useState(false);
  const [showPatients, setShowPatients] = useState(false);

  const durationDays = differenceInDays(endDate, startDate);
  const selectedDaysCount = [
    frequency.monday,
    frequency.tuesday,
    frequency.wednesday,
    frequency.thursday,
    frequency.friday,
    frequency.saturday,
    frequency.sunday,
  ].filter(Boolean).length;

  const customizedCount = [...overrides.values()].filter(
    (o) =>
      Object.keys(o).some(
        (key) =>
          key !== "exerciseMappingId" && o[key as keyof ExerciseOverride] !== undefined
      )
  ).length;

  const getDayNames = () => {
    const days: string[] = [];
    if (frequency.monday) days.push("Pn");
    if (frequency.tuesday) days.push("Wt");
    if (frequency.wednesday) days.push("Śr");
    if (frequency.thursday) days.push("Cz");
    if (frequency.friday) days.push("Pt");
    if (frequency.saturday) days.push("So");
    if (frequency.sunday) days.push("Nd");
    return days.join(", ");
  };

  // Filter out excluded exercises
  const visibleMappings = exerciseSet.exerciseMappings?.filter(
    (m) => !excludedExercises.has(m.id)
  ) || [];
  const exerciseCount = visibleMappings.length;
  const excludedCount = excludedExercises.size;

  return (
    <div className="max-w-2xl mx-auto p-6 overflow-y-auto">
      {/* Hero confirmation */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center mb-4 shadow-lg shadow-primary/30 animate-success-check">
          <CheckCircle2 className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Gotowe do przypisania
        </h2>
        <p className="text-muted-foreground">
          Sprawdź podsumowanie i potwierdź przyciskiem poniżej
        </p>
      </div>

      {/* Main info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {/* Set */}
        <div className="col-span-2 rounded-xl border border-border bg-surface/50 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FolderKanban className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Zestaw</p>
              <p className="font-semibold truncate">{exerciseSet.name}</p>
            </div>
          </div>
        </div>

        {/* Patients */}
        <div className="rounded-xl border border-border bg-surface/50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Pacjenci</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{selectedPatients.length}</p>
        </div>

        {/* Duration */}
        <div className="rounded-xl border border-border bg-surface/50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Okres</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{durationDays} <span className="text-sm font-normal text-muted-foreground">dni</span></p>
        </div>
      </div>

      {/* Schedule summary */}
      <div className="rounded-xl border border-border bg-surface/50 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(startDate, "d MMM", { locale: pl })} — {format(endDate, "d MMM yyyy", { locale: pl })}
            </span>
          </div>
          <span className="text-border hidden sm:inline">•</span>
          <span className="text-muted-foreground">{getDayNames()}</span>
          <span className="text-border hidden sm:inline">•</span>
          <span className="text-muted-foreground">{frequency.timesPerDay}x dziennie</span>
          {customizedCount > 0 && (
            <>
              <span className="text-border hidden sm:inline">•</span>
              <Badge variant="outline" className="border-primary/50 text-primary text-xs">
                <Settings2 className="h-3 w-3 mr-1" />
                {customizedCount} dostosowane
              </Badge>
            </>
          )}
        </div>
      </div>

      {/* Collapsible exercises */}
      <Collapsible open={showExercises} onOpenChange={setShowExercises} className="mb-3">
        <CollapsibleTrigger className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-surface/50 hover:bg-surface-light transition-colors">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Ćwiczenia</span>
            <Badge variant="secondary" className="text-xs">{exerciseCount}</Badge>
            {excludedCount > 0 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                -{excludedCount} wykluczone
              </Badge>
            )}
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            showExercises && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto rounded-xl border border-border bg-surface/30 p-2">
            {visibleMappings.map((mapping, index) => {
              const exercise = mapping.exercise;
              const imageUrl = getMediaUrl(exercise?.imageUrl || exercise?.images?.[0]);
              const override = overrides.get(mapping.id);
              const hasOverride = override && Object.keys(override).some(
                (key) => key !== "exerciseMappingId" && override[key as keyof ExerciseOverride] !== undefined
              );

              return (
                <div
                  key={mapping.id}
                  className="flex items-center gap-2 rounded-lg p-2 bg-surface-light/50"
                >
                  <span className="text-xs text-muted-foreground w-5 text-center shrink-0">
                    {index + 1}
                  </span>
                  <div className="h-8 w-8 rounded-md overflow-hidden shrink-0">
                    {imageUrl ? (
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlaceholder type="exercise" iconClassName="h-3 w-3" />
                    )}
                  </div>
                  <span className="text-sm truncate flex-1">
                    {mapping.customName || exercise?.name || "Nieznane"}
                  </span>
                  {hasOverride && (
                    <Badge variant="outline" className="text-[10px] border-primary/50 text-primary shrink-0">
                      Zmienione
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Collapsible patients */}
      <Collapsible open={showPatients} onOpenChange={setShowPatients}>
        <CollapsibleTrigger className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-surface/50 hover:bg-surface-light transition-colors">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Pacjenci</span>
            <Badge variant="secondary" className="text-xs">{selectedPatients.length}</Badge>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            showPatients && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto rounded-xl border border-border bg-surface/30 p-2">
            {selectedPatients.map((patient) => (
              <div
                key={patient.id}
                className="flex items-center gap-2 rounded-lg p-2 bg-surface-light/50"
              >
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold shrink-0",
                    patient.isShadowUser
                      ? "bg-muted-foreground/60 text-white"
                      : "bg-gradient-to-br from-primary to-primary-dark text-primary-foreground"
                  )}
                >
                  {patient.name[0]?.toUpperCase()}
                </div>
                <span className="text-sm truncate flex-1">{patient.name}</span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Keyboard hint */}
      <p className="text-xs text-muted-foreground text-center mt-6">
        Naciśnij <kbd className="px-1.5 py-0.5 rounded bg-surface-light border border-border text-xs">Enter</kbd> aby przypisać
      </p>
    </div>
  );
}
