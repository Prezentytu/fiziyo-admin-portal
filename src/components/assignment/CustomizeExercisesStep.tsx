"use client";

import { useState, useCallback } from "react";
import {
  Dumbbell,
  Plus,
  Minus,
  RotateCcw,
  StickyNote,
  Clock,
  ChevronDown,
  EyeOff,
  Eye,
  Pencil,
  Settings,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { cn } from "@/lib/utils";
import { getMediaUrl } from "@/utils/mediaUrl";
import type { ExerciseSet, ExerciseMapping, ExerciseOverride } from "./types";

interface CustomizeExercisesStepProps {
  exerciseSet: ExerciseSet;
  overrides: Map<string, ExerciseOverride>;
  onOverridesChange: (overrides: Map<string, ExerciseOverride>) => void;
  excludedExercises: Set<string>;
  onExcludedExercisesChange: (excluded: Set<string>) => void;
}

// Helper functions outside component
const getTypeLabel = (type?: string) => {
  const types: Record<string, string> = {
    reps: "Powtórzenia",
    time: "Czasowe",
  };
  return type ? types[type] || type : "";
};

const getSideLabel = (side?: string) => {
  const sides: Record<string, string> = {
    left: "Lewa strona",
    right: "Prawa strona",
    both: "Obie strony",
    alternating: "Naprzemiennie",
    none: "Bez strony",
  };
  return side ? sides[side] || side : "";
};

export function CustomizeExercisesStep({
  exerciseSet,
  overrides,
  onOverridesChange,
  excludedExercises,
  onExcludedExercisesChange,
}: CustomizeExercisesStepProps) {
  const [selectedMappingId, setSelectedMappingId] = useState<string | null>(
    exerciseSet.exerciseMappings?.[0]?.id || null
  );
  const [excludeConfirm, setExcludeConfirm] = useState<{
    mappingId: string;
    name: string;
  } | null>(null);

  const mappings = exerciseSet.exerciseMappings || [];
  const selectedMapping = mappings.find((m) => m.id === selectedMappingId);

  // Get effective value (override → mapping → exercise)
  const getEffectiveValue = useCallback(
    <T extends string | number | string[] | undefined>(
      mapping: ExerciseMapping,
      field: keyof ExerciseOverride
    ): T => {
      const override = overrides.get(mapping.id);
      if (override && override[field] !== undefined) {
        return override[field] as T;
      }
      const mappingValue = mapping[field as keyof ExerciseMapping];
      if (mappingValue !== undefined && mappingValue !== null) {
        return mappingValue as T;
      }
      return mapping.exercise?.[field as keyof typeof mapping.exercise] as T;
    },
    [overrides]
  );

  // Get default value for display (from mapping or exercise)
  const getDefaultValue = useCallback(
    <T extends string | number | string[] | undefined>(
      mapping: ExerciseMapping,
      field: keyof ExerciseOverride
    ): T => {
      const mappingValue = mapping[field as keyof ExerciseMapping];
      if (mappingValue !== undefined && mappingValue !== null) {
        return mappingValue as T;
      }
      return mapping.exercise?.[field as keyof typeof mapping.exercise] as T;
    },
    []
  );

  const updateOverride = useCallback(
    (
      mappingId: string,
      field: keyof ExerciseOverride,
      value: number | string | string[] | undefined
    ) => {
      const newOverrides = new Map(overrides);
      const existing = newOverrides.get(mappingId) || {
        exerciseMappingId: mappingId,
      };
      newOverrides.set(mappingId, { ...existing, [field]: value });
      onOverridesChange(newOverrides);
    },
    [overrides, onOverridesChange]
  );

  const resetOverride = useCallback(
    (mappingId: string) => {
      const newOverrides = new Map(overrides);
      newOverrides.delete(mappingId);
      onOverridesChange(newOverrides);
    },
    [overrides, onOverridesChange]
  );

  const hasOverride = useCallback(
    (mappingId: string): boolean => {
      const override = overrides.get(mappingId);
      if (!override) return false;
      return Object.keys(override).some(
        (key) =>
          key !== "exerciseMappingId" &&
          override[key as keyof ExerciseOverride] !== undefined
      );
    },
    [overrides]
  );

  // Toggle exercise exclusion
  const toggleExclude = useCallback(
    (mappingId: string, exerciseName: string) => {
      const isCurrentlyExcluded = excludedExercises.has(mappingId);
      if (isCurrentlyExcluded) {
        // Re-include immediately
        const newExcluded = new Set(excludedExercises);
        newExcluded.delete(mappingId);
        onExcludedExercisesChange(newExcluded);
      } else {
        // Show confirmation before excluding
        setExcludeConfirm({ mappingId, name: exerciseName });
      }
    },
    [excludedExercises, onExcludedExercisesChange]
  );

  const confirmExclude = useCallback(() => {
    if (!excludeConfirm) return;
    const newExcluded = new Set(excludedExercises);
    newExcluded.add(excludeConfirm.mappingId);
    onExcludedExercisesChange(newExcluded);
    setExcludeConfirm(null);
    // If excluded mapping was selected, select another
    if (selectedMappingId === excludeConfirm.mappingId) {
      const remaining = mappings.filter(m => !newExcluded.has(m.id));
      setSelectedMappingId(remaining[0]?.id || null);
    }
  }, [excludeConfirm, excludedExercises, onExcludedExercisesChange, selectedMappingId, mappings]);

  // Full-width stepper with clear label
  const renderFullWidthStepper = (
    mapping: ExerciseMapping,
    label: string,
    field: keyof ExerciseOverride,
    unit?: string,
    step = 1,
    min = 0
  ) => {
    const value = getEffectiveValue<number | undefined>(mapping, field);
    const defaultValue = getDefaultValue<number | undefined>(mapping, field);
    const override = overrides.get(mapping.id);
    const hasFieldOverride = override && override[field] !== undefined;
    const displayValue = value ?? defaultValue ?? 0;

    return (
      <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-surface-light/30 border border-border/40">
        <span className="text-sm text-foreground font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => {
              const current = typeof displayValue === "number" ? displayValue : 0;
              updateOverride(mapping.id, field, Math.max(min, current - step));
            }}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <div className={cn(
            "min-w-[60px] text-center font-bold text-xl tabular-nums",
            hasFieldOverride && "text-primary"
          )}>
            {displayValue}
            {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => {
              const current = typeof displayValue === "number" ? displayValue : 0;
              updateOverride(mapping.id, field, current + step);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // Small inline input for advanced section
  const renderSmallInput = (
    mapping: ExerciseMapping,
    label: string,
    field: keyof ExerciseOverride,
    unit?: string,
    step = 1,
    min = 0
  ) => {
    const value = getEffectiveValue<number | undefined>(mapping, field);
    const defaultValue = getDefaultValue<number | undefined>(mapping, field);
    const displayValue = value ?? defaultValue ?? "";

    return (
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={displayValue}
            onChange={(e) =>
              updateOverride(
                mapping.id,
                field,
                e.target.value ? Math.max(min, Number(e.target.value)) : undefined
              )
            }
            placeholder="—"
            className="h-7 w-16 text-center text-sm"
            step={step}
            min={min}
          />
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0 p-6">
      {/* Left column - Exercise list */}
      <div className="flex flex-col min-h-0">
        <div className="mb-4">
          <h3 className="font-semibold">Ćwiczenia w zestawie</h3>
          <p className="text-sm text-muted-foreground">
            Kliknij na ćwiczenie, aby je spersonalizować
          </p>
        </div>

        <ScrollArea className="flex-1 rounded-xl border border-border">
          <div className="p-3 pr-4 space-y-2">
            {mappings.map((mapping, index) => {
              const exercise = mapping.exercise;
              const imageUrl = getMediaUrl(exercise?.imageUrl || exercise?.images?.[0]);
              const isSelected = selectedMappingId === mapping.id;
              const hasCustomization = hasOverride(mapping.id);
              const isExcluded = excludedExercises.has(mapping.id);
              const exerciseName = mapping.customName || exercise?.name || "Nieznane";

              return (
                <div
                  key={mapping.id}
                  className={cn(
                    "flex items-center gap-4 rounded-xl p-4 cursor-pointer transition-all group",
                    isExcluded && "opacity-50",
                    isSelected && !isExcluded
                      ? "bg-primary/10 border-2 border-primary/40"
                      : isExcluded
                      ? "bg-destructive/5 border-2 border-destructive/20"
                      : "hover:bg-surface-light border-2 border-transparent"
                  )}
                  onClick={() => !isExcluded && setSelectedMappingId(mapping.id)}
                >
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold shrink-0",
                    isExcluded ? "bg-destructive/10 text-destructive" : "bg-surface text-muted-foreground"
                  )}>
                    {isExcluded ? <EyeOff className="h-4 w-4" /> : index + 1}
                  </div>
                  <div className={cn(
                    "h-12 w-12 rounded-lg overflow-hidden shrink-0",
                    isExcluded && "grayscale"
                  )}>
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImagePlaceholder type="exercise" iconClassName="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        "font-medium line-clamp-2 flex-1",
                        isExcluded && "line-through text-muted-foreground"
                      )}>
                        {exerciseName}
                      </p>
                      {isExcluded ? (
                        <Badge
                          variant="destructive"
                          className="text-[10px] shrink-0"
                        >
                          Wykluczone
                        </Badge>
                      ) : hasCustomization ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-primary text-primary shrink-0"
                        >
                          Zmienione
                        </Badge>
                      ) : null}
                    </div>
                    <div className={cn(
                      "flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap",
                      isExcluded && "hidden"
                    )}>
                      {getEffectiveValue<number | undefined>(mapping, "sets") && (
                        <span>
                          {getEffectiveValue<number>(mapping, "sets")} serie
                        </span>
                      )}
                      {getEffectiveValue<number | undefined>(mapping, "reps") && (
                        <span>
                          • {getEffectiveValue<number>(mapping, "reps")} powt.
                        </span>
                      )}
                      {getEffectiveValue<number | undefined>(mapping, "duration") && (
                        <span>
                          • {getEffectiveValue<number>(mapping, "duration")}s
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Exclude/include button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 shrink-0 transition-opacity",
                      isExcluded
                        ? "text-primary hover:text-primary"
                        : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExclude(mapping.id, exerciseName);
                    }}
                    title={isExcluded ? "Przywróć ćwiczenie" : "Wyklucz z przypisania"}
                  >
                    {isExcluded ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">
            {mappings.filter((m) => hasOverride(m.id)).length} zmienione
          </Badge>
          {excludedExercises.size > 0 && (
            <Badge variant="destructive">
              {excludedExercises.size} wykluczone
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            z {mappings.length} ćwiczeń
          </span>
        </div>
      </div>

      {/* Right column - Exercise editor */}
      <div className="flex flex-col min-h-0 rounded-xl border border-border bg-surface/50 overflow-hidden">
        {selectedMapping ? (
          <>
            {/* Compact Header with image */}
            <div className="p-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg overflow-hidden shrink-0">
                  {getMediaUrl(selectedMapping.exercise?.imageUrl ||
                  selectedMapping.exercise?.images?.[0]) ? (
                    <img
                      src={
                        getMediaUrl(selectedMapping.exercise?.imageUrl ||
                        selectedMapping.exercise?.images?.[0]) || ""
                      }
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlaceholder type="exercise" iconClassName="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight">
                    {selectedMapping.customName ||
                      selectedMapping.exercise?.name ||
                      "Nieznane ćwiczenie"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {selectedMapping.exercise?.type && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {getTypeLabel(selectedMapping.exercise.type)}
                      </Badge>
                    )}
                    {selectedMapping.exercise?.exerciseSide &&
                      selectedMapping.exercise.exerciseSide !== "none" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {getSideLabel(selectedMapping.exercise.exerciseSide)}
                        </Badge>
                      )}
                  </div>
                </div>
                {hasOverride(selectedMapping.id) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => resetOverride(selectedMapping.id)}
                    title="Resetuj zmiany"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Editor - physio-friendly layout */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {/* Main parameters - vertical, full width, clear labels */}
                {renderFullWidthStepper(selectedMapping, "Serie", "sets")}
                {renderFullWidthStepper(selectedMapping, "Powtórzenia", "reps")}
                {renderFullWidthStepper(selectedMapping, "Czas trwania ćwiczenia", "duration", "s", 5)}
                {renderFullWidthStepper(selectedMapping, "Przerwa między seriami", "restSets", "s", 5)}

                {/* Notes - always visible, bigger */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-medium">Notatka dla pacjenta</Label>
                  </div>
                  <Textarea
                    value={
                      getEffectiveValue<string | undefined>(
                        selectedMapping,
                        "notes"
                      ) ??
                      getDefaultValue<string | undefined>(
                        selectedMapping,
                        "notes"
                      ) ??
                      ""
                    }
                    onChange={(e) =>
                      updateOverride(
                        selectedMapping.id,
                        "notes",
                        e.target.value || undefined
                      )
                    }
                    placeholder="Wskazówki dla pacjenta, np. Na co uważać, jak wykonywać..."
                    className="min-h-[120px] resize-none"
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>

                {/* More options - collapsible */}
                <Collapsible>
                  <CollapsibleTrigger className="flex w-full items-center justify-between py-3 px-4 rounded-xl hover:bg-surface-light/50 transition-colors group border border-border/40">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Więcej opcji</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-4">
                    {/* Custom name */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        <Label className="text-sm text-muted-foreground">Własna nazwa ćwiczenia</Label>
                      </div>
                      <Input
                        value={
                          getEffectiveValue<string | undefined>(
                            selectedMapping,
                            "customName"
                          ) ??
                          getDefaultValue<string | undefined>(
                            selectedMapping,
                            "customName"
                          ) ??
                          ""
                        }
                        onChange={(e) =>
                          updateOverride(
                            selectedMapping.id,
                            "customName",
                            e.target.value || undefined
                          )
                        }
                        placeholder={selectedMapping.exercise?.name || "Nazwa dla pacjenta..."}
                        className="h-10"
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                        data-form-type="other"
                      />
                    </div>

                    {/* Custom description */}
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Własny opis</Label>
                      <Textarea
                        value={
                          getEffectiveValue<string | undefined>(
                            selectedMapping,
                            "customDescription"
                          ) ??
                          getDefaultValue<string | undefined>(
                            selectedMapping,
                            "customDescription"
                          ) ??
                          ""
                        }
                        onChange={(e) =>
                          updateOverride(
                            selectedMapping.id,
                            "customDescription",
                            e.target.value || undefined
                          )
                        }
                        placeholder={selectedMapping.exercise?.description || "Opis dla pacjenta..."}
                        className="min-h-[80px] resize-none"
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                        data-form-type="other"
                      />
                    </div>

                    {/* Advanced times */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <Label className="text-sm text-muted-foreground">Zaawansowane czasy</Label>
                      </div>
                      <div className="space-y-2 p-3 rounded-xl bg-surface-light/30 border border-border/30">
                        {renderSmallInput(selectedMapping, "Przerwa między powtórzeniami", "restReps", "s", 1)}
                        {renderSmallInput(selectedMapping, "Czas przygotowania", "preparationTime", "s", 5)}
                        {renderSmallInput(selectedMapping, "Czas wykonania powtórzenia", "executionTime", "s", 5)}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <Dumbbell className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Wybierz ćwiczenie
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Kliknij na ćwiczenie po lewej, aby je spersonalizować
            </p>
          </div>
        )}
      </div>

      {/* Exclude confirmation dialog */}
      <ConfirmDialog
        open={!!excludeConfirm}
        onOpenChange={(open) => !open && setExcludeConfirm(null)}
        title="Wyklucz ćwiczenie z przypisania?"
        description={`Ćwiczenie "${excludeConfirm?.name}" zostanie wykluczone tylko z tego przypisania. Oryginalny zestaw nie zostanie zmieniony.`}
        confirmText="Tak, wyklucz"
        cancelText="Anuluj"
        variant="destructive"
        onConfirm={confirmExclude}
      />
    </div>
  );
}
