"use client";

import {
  Calendar,
  Clock,
  Dumbbell,
  Users,
  FolderKanban,
  CheckCircle2,
  Settings2,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { pl } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
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
}

export function SummaryStep({
  exerciseSet,
  selectedPatients,
  startDate,
  endDate,
  frequency,
  overrides,
}: SummaryStepProps) {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left column - Main summary */}
      <div className="lg:col-span-2 flex flex-col min-h-0">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Gotowe do przypisania</h2>
            <p className="text-sm text-muted-foreground">
              Sprawdź szczegóły przed potwierdzeniem
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Set info */}
          <div className="rounded-xl border border-border bg-surface/50 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <FolderKanban className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Zestaw ćwiczeń
              </span>
            </div>
            <p className="font-semibold text-lg">{exerciseSet.name}</p>
            {exerciseSet.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {exerciseSet.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="secondary">
                {exerciseSet.exerciseMappings?.length || 0} ćwiczeń
              </Badge>
              {customizedCount > 0 && (
                <Badge
                  variant="outline"
                  className="border-primary text-primary"
                >
                  <Settings2 className="h-3 w-3 mr-1" />
                  {customizedCount} dostosowane
                </Badge>
              )}
            </div>
          </div>

          {/* Schedule info */}
          <div className="rounded-xl border border-border bg-surface/50 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Harmonogram
              </span>
            </div>
            <p className="font-semibold">
              {format(startDate, "d MMMM", { locale: pl })} —{" "}
              {format(endDate, "d MMMM yyyy", { locale: pl })}
            </p>
            <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
              <span>{durationDays} dni</span>
              <span>•</span>
              <span>{getDayNames()}</span>
              <span>•</span>
              <span>{frequency.timesPerDay}x/dzień</span>
            </div>
          </div>
        </div>

        {/* Exercises list */}
        <div className="flex-1 rounded-xl border border-border bg-surface/50 p-4 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Dumbbell className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Lista ćwiczeń
              </span>
            </div>
            <Badge variant="outline">
              {exerciseSet.exerciseMappings?.length || 0}
            </Badge>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {exerciseSet.exerciseMappings?.map((mapping, index) => {
                const exercise = mapping.exercise;
                const imageUrl = exercise?.imageUrl || exercise?.images?.[0];
                const override = overrides.get(mapping.id);
                const hasOverride =
                  override &&
                  Object.keys(override).some(
                    (key) =>
                      key !== "exerciseMappingId" &&
                      override[key as keyof ExerciseOverride] !== undefined
                  );

                // Get effective values
                const sets =
                  override?.sets ?? mapping.sets ?? exercise?.sets;
                const reps =
                  override?.reps ?? mapping.reps ?? exercise?.reps;
                const duration =
                  override?.duration ?? mapping.duration ?? exercise?.duration;

                return (
                  <div
                    key={mapping.id}
                    className="flex items-center gap-3 rounded-lg p-2 bg-surface-light/50"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold bg-surface text-muted-foreground shrink-0">
                      {index + 1}
                    </div>
                    <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImagePlaceholder
                          type="exercise"
                          iconClassName="h-4 w-4"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {mapping.customName || exercise?.name || "Nieznane"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {sets && <span>{sets} serie</span>}
                        {reps && <span>• {reps} powt.</span>}
                        {duration && <span>• {duration}s</span>}
                      </div>
                    </div>
                    {hasOverride && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-primary/50 text-primary shrink-0"
                      >
                        Zmienione
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Right column - Patients */}
      <div className="flex flex-col min-h-0 rounded-xl border border-border bg-surface/50 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Pacjenci
            </span>
          </div>
          <Badge variant="default">{selectedPatients.length}</Badge>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {selectedPatients.map((patient) => (
              <div
                key={patient.id}
                className="flex items-center gap-3 rounded-lg p-2 bg-surface-light/50"
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold shrink-0 ${
                    patient.isShadowUser
                      ? "bg-muted-foreground/60 text-white"
                      : "bg-gradient-to-br from-primary to-primary-dark text-primary-foreground"
                  }`}
                >
                  {patient.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{patient.name}</p>
                  {patient.email && (
                    <p className="text-xs text-muted-foreground truncate">
                      {patient.email}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Separator className="my-4" />

        {/* Final summary */}
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Zestaw:</span>
            <span className="font-medium truncate max-w-[150px]">
              {exerciseSet.name}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Ćwiczenia:</span>
            <span className="font-medium">
              {exerciseSet.exerciseMappings?.length || 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Okres:</span>
            <span className="font-medium">{durationDays} dni</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Częstotliwość:</span>
            <span className="font-medium">
              {frequency.timesPerDay}x/{selectedDaysCount} dni
            </span>
          </div>
        </div>

        {/* Confirmation message */}
        <div className="mt-4 rounded-xl bg-primary/10 border border-primary/20 p-3">
          <p className="text-xs text-center text-primary font-medium">
            Po kliknięciu „Przypisz" zestaw zostanie przypisany do{" "}
            {selectedPatients.length} pacjent
            {selectedPatients.length === 1
              ? "a"
              : selectedPatients.length < 5
              ? "ów"
              : "ów"}
          </p>
        </div>
      </div>
    </div>
  );
}






