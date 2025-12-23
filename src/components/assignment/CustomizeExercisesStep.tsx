"use client";

import { useState, useCallback } from "react";
import {
  Dumbbell,
  Plus,
  Minus,
  RotateCcw,
  StickyNote,
  Clock,
  Video,
  FileText,
  Settings2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
import { cn } from "@/lib/utils";
import type { ExerciseSet, ExerciseMapping, ExerciseOverride } from "./types";

interface CustomizeExercisesStepProps {
  exerciseSet: ExerciseSet;
  overrides: Map<string, ExerciseOverride>;
  onOverridesChange: (overrides: Map<string, ExerciseOverride>) => void;
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
}: CustomizeExercisesStepProps) {
  const [selectedMappingId, setSelectedMappingId] = useState<string | null>(
    exerciseSet.exerciseMappings?.[0]?.id || null
  );

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

  // Render numeric input inline
  const renderNumericInput = (
    mapping: ExerciseMapping,
    label: string,
    field: keyof ExerciseOverride,
    step = 1,
    min = 0,
    suffix?: string
  ) => {
    const value = getEffectiveValue<number | undefined>(mapping, field);
    const defaultValue = getDefaultValue<number | undefined>(mapping, field);
    const override = overrides.get(mapping.id);
    const hasFieldOverride = override && override[field] !== undefined;

    // Display value: show effective value or default or empty
    const displayValue = value ?? defaultValue ?? "";

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">{label}</Label>
          {hasFieldOverride && defaultValue !== undefined && (
            <span className="text-[10px] text-muted-foreground">
              Oryginał: {defaultValue}
              {suffix}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => {
              const current = (typeof displayValue === "number" ? displayValue : 0);
              updateOverride(mapping.id, field, Math.max(min, current - step));
            }}
          >
            <Minus className="h-4 w-4" />
          </Button>
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
            className="h-10 text-center font-semibold"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => {
              const current = (typeof displayValue === "number" ? displayValue : 0);
              updateOverride(mapping.id, field, current + step);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // Render text input inline
  const renderTextInput = (
    mapping: ExerciseMapping,
    label: string,
    field: keyof ExerciseOverride,
    placeholder?: string
  ) => {
    const value = getEffectiveValue<string | undefined>(mapping, field);
    const defaultValue = getDefaultValue<string | undefined>(mapping, field);
    const override = overrides.get(mapping.id);
    const hasFieldOverride = override && override[field] !== undefined;

    // Display value: show effective value or default or empty
    const displayValue = value ?? defaultValue ?? "";

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">{label}</Label>
          {hasFieldOverride && defaultValue && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
              Oryginał: {defaultValue.slice(0, 20)}
              {defaultValue.length > 20 ? "..." : ""}
            </span>
          )}
        </div>
        <Input
          value={displayValue}
          onChange={(e) =>
            updateOverride(mapping.id, field, e.target.value || undefined)
          }
          placeholder={placeholder || "—"}
          className="h-10"
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
        />
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-hidden">
      {/* Left column - Exercise list */}
      <div className="flex flex-col min-h-0">
        <div className="mb-4">
          <h3 className="font-semibold">Ćwiczenia w zestawie</h3>
          <p className="text-sm text-muted-foreground">
            Kliknij na ćwiczenie, aby je spersonalizować
          </p>
        </div>

        <ScrollArea className="flex-1 rounded-xl border border-border">
          <div className="p-2 space-y-1">
            {mappings.map((mapping, index) => {
              const exercise = mapping.exercise;
              const imageUrl = exercise?.imageUrl || exercise?.images?.[0];
              const isSelected = selectedMappingId === mapping.id;
              const hasCustomization = hasOverride(mapping.id);

              return (
                <div
                  key={mapping.id}
                  className={cn(
                    "flex items-start gap-3 rounded-xl p-4 cursor-pointer transition-all",
                    isSelected
                      ? "bg-primary/10 border-2 border-primary/40"
                      : "hover:bg-surface-light border-2 border-transparent"
                  )}
                  onClick={() => setSelectedMappingId(mapping.id)}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold bg-surface text-muted-foreground shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="h-12 w-12 rounded-lg overflow-hidden shrink-0">
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
                    <div className="flex items-start gap-2">
                      <p className="font-medium line-clamp-2 flex-1">
                        {mapping.customName || exercise?.name || "Nieznane"}
                      </p>
                      {hasCustomization && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-primary text-primary shrink-0 mt-0.5"
                        >
                          Zmienione
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5 flex-wrap">
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
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="mt-3 flex items-center gap-2">
          <Badge variant="secondary">
            {mappings.filter((m) => hasOverride(m.id)).length} zmienione
          </Badge>
          <span className="text-xs text-muted-foreground">
            z {mappings.length} ćwiczeń
          </span>
        </div>
      </div>

      {/* Right column - Exercise editor */}
      <div className="flex flex-col min-h-0 rounded-xl border border-border bg-surface/50 overflow-hidden">
        {selectedMapping ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border shrink-0">
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 rounded-lg overflow-hidden shrink-0">
                  {selectedMapping.exercise?.imageUrl ||
                  selectedMapping.exercise?.images?.[0] ? (
                    <img
                      src={
                        selectedMapping.exercise.imageUrl ||
                        selectedMapping.exercise.images?.[0]
                      }
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlaceholder type="exercise" iconClassName="h-6 w-6" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">
                    {selectedMapping.customName ||
                      selectedMapping.exercise?.name ||
                      "Nieznane ćwiczenie"}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {selectedMapping.exercise?.type && (
                      <Badge variant="secondary" className="text-[10px]">
                        {getTypeLabel(selectedMapping.exercise.type)}
                      </Badge>
                    )}
                    {selectedMapping.exercise?.exerciseSide &&
                      selectedMapping.exercise.exerciseSide !== "none" && (
                        <Badge variant="outline" className="text-[10px]">
                          {getSideLabel(selectedMapping.exercise.exerciseSide)}
                        </Badge>
                      )}
                  </div>
                </div>
                {hasOverride(selectedMapping.id) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => resetOverride(selectedMapping.id)}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Resetuj
                  </Button>
                )}
              </div>
            </div>

            {/* Editor */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                {/* Custom name and description */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Personalizacja nazwy
                    </p>
                  </div>

                  {renderTextInput(
                    selectedMapping,
                    "Nazwa dla pacjenta",
                    "customName",
                    "Własna nazwa ćwiczenia..."
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm">Opis dla pacjenta</Label>
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
                        selectedMapping.exercise?.description ??
                        ""
                      }
                      onChange={(e) =>
                        updateOverride(
                          selectedMapping.id,
                          "customDescription",
                          e.target.value || undefined
                        )
                      }
                      placeholder="Opis ćwiczenia..."
                      className="min-h-[60px] resize-none"
                      autoComplete="off"
                      data-1p-ignore
                      data-lpignore="true"
                      data-form-type="other"
                    />
                  </div>
                </div>

                <Separator />

                {/* Main parameters */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-primary" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Główne parametry
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {renderNumericInput(selectedMapping, "Serie", "sets")}
                    {renderNumericInput(selectedMapping, "Powtórzenia", "reps")}
                  </div>

                  {renderNumericInput(
                    selectedMapping,
                    "Czas trwania",
                    "duration",
                    5,
                    0,
                    "s"
                  )}
                </div>

                <Separator />

                {/* Rest parameters */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Przerwy i czasy
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {renderNumericInput(
                      selectedMapping,
                      "Przerwa między seriami",
                      "restSets",
                      5,
                      0,
                      "s"
                    )}
                    {renderNumericInput(
                      selectedMapping,
                      "Przerwa między powt.",
                      "restReps",
                      1,
                      0,
                      "s"
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {renderNumericInput(
                      selectedMapping,
                      "Czas przygotowania",
                      "preparationTime",
                      5,
                      0,
                      "s"
                    )}
                    {renderNumericInput(
                      selectedMapping,
                      "Czas wykonania",
                      "executionTime",
                      5,
                      0,
                      "s"
                    )}
                  </div>
                </div>

                <Separator />

                {/* Media */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-primary" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Media
                    </p>
                  </div>

                  {renderTextInput(
                    selectedMapping,
                    "URL wideo",
                    "videoUrl",
                    "https://youtube.com/..."
                  )}

                  {renderTextInput(
                    selectedMapping,
                    "URL obrazu",
                    "imageUrl",
                    "https://..."
                  )}

                  {/* Preview current media */}
                  {(getEffectiveValue<string | undefined>(
                    selectedMapping,
                    "videoUrl"
                  ) ||
                    selectedMapping.exercise?.videoUrl) && (
                    <div className="p-3 bg-surface-light rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Video className="h-3 w-3" />
                        <span>Podgląd wideo</span>
                      </div>
                      <a
                        href={
                          getEffectiveValue<string>(selectedMapping, "videoUrl") ||
                          selectedMapping.exercise?.videoUrl
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline break-all"
                      >
                        {getEffectiveValue<string>(selectedMapping, "videoUrl") ||
                          selectedMapping.exercise?.videoUrl}
                      </a>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Notes */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4 text-primary" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Notatki dla pacjenta
                    </p>
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
                      selectedMapping.exercise?.notes ??
                      ""
                    }
                    onChange={(e) =>
                      updateOverride(
                        selectedMapping.id,
                        "notes",
                        e.target.value || undefined
                      )
                    }
                    placeholder="Dodaj wskazówki lub instrukcje dla tego pacjenta..."
                    className="min-h-[80px] resize-none"
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>
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
    </div>
  );
}
