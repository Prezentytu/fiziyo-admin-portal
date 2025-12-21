"use client";

import { useState } from "react";
import { Dumbbell, Plus, Minus, RotateCcw, StickyNote } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
import { cn } from "@/lib/utils";
import type { ExerciseSet, ExerciseMapping, ExerciseOverride } from "./types";

interface CustomizeExercisesStepProps {
  exerciseSet: ExerciseSet;
  overrides: Map<string, ExerciseOverride>;
  onOverridesChange: (overrides: Map<string, ExerciseOverride>) => void;
}

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
  const selectedOverride = selectedMappingId
    ? overrides.get(selectedMappingId)
    : undefined;

  // Get effective value (override or original)
  const getEffectiveValue = (
    mapping: ExerciseMapping,
    field: keyof ExerciseOverride
  ): number | string | undefined => {
    const override = overrides.get(mapping.id);
    if (override && override[field] !== undefined) {
      return override[field];
    }
    // Fallback to mapping value, then exercise value
    const mappingValue = mapping[field as keyof ExerciseMapping];
    if (mappingValue !== undefined) return mappingValue as number | string;
    return mapping.exercise?.[field as keyof typeof mapping.exercise] as
      | number
      | string
      | undefined;
  };

  const updateOverride = (
    mappingId: string,
    field: keyof ExerciseOverride,
    value: number | string | undefined
  ) => {
    const newOverrides = new Map(overrides);
    const existing = newOverrides.get(mappingId) || {
      exerciseMappingId: mappingId,
    };
    newOverrides.set(mappingId, { ...existing, [field]: value });
    onOverridesChange(newOverrides);
  };

  const resetOverride = (mappingId: string) => {
    const newOverrides = new Map(overrides);
    newOverrides.delete(mappingId);
    onOverridesChange(newOverrides);
  };

  const hasOverride = (mappingId: string): boolean => {
    const override = overrides.get(mappingId);
    if (!override) return false;
    return Object.keys(override).some(
      (key) => key !== "exerciseMappingId" && override[key as keyof ExerciseOverride] !== undefined
    );
  };

  // Helper for type labels
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
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
                    "flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all",
                    isSelected
                      ? "bg-primary/10 border-2 border-primary/40"
                      : "hover:bg-surface-light border-2 border-transparent"
                  )}
                  onClick={() => setSelectedMappingId(mapping.id)}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold bg-surface text-muted-foreground shrink-0">
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
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {mapping.customName || exercise?.name || "Nieznane"}
                      </p>
                      {hasCustomization && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-primary text-primary shrink-0"
                        >
                          Zmienione
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {getEffectiveValue(mapping, "sets") && (
                        <span>
                          {getEffectiveValue(mapping, "sets")} serie
                        </span>
                      )}
                      {getEffectiveValue(mapping, "reps") && (
                        <span>
                          • {getEffectiveValue(mapping, "reps")} powt.
                        </span>
                      )}
                      {getEffectiveValue(mapping, "duration") && (
                        <span>
                          • {getEffectiveValue(mapping, "duration")}s
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
      <div className="flex flex-col min-h-0 rounded-xl border border-border bg-surface/50">
        {selectedMapping ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border">
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
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6">
                {/* Main parameters */}
                <div className="space-y-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Główne parametry
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Sets */}
                    <div className="space-y-2">
                      <Label className="text-sm">Serie</Label>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          onClick={() => {
                            const current =
                              (getEffectiveValue(selectedMapping, "sets") as number) ||
                              0;
                            updateOverride(
                              selectedMapping.id,
                              "sets",
                              Math.max(0, current - 1)
                            );
                          }}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={getEffectiveValue(selectedMapping, "sets") ?? ""}
                          onChange={(e) =>
                            updateOverride(
                              selectedMapping.id,
                              "sets",
                              e.target.value
                                ? Math.max(0, parseInt(e.target.value))
                                : undefined
                            )
                          }
                          className="h-10 text-center font-semibold"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          onClick={() => {
                            const current =
                              (getEffectiveValue(selectedMapping, "sets") as number) ||
                              0;
                            updateOverride(selectedMapping.id, "sets", current + 1);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Reps */}
                    <div className="space-y-2">
                      <Label className="text-sm">Powtórzenia</Label>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          onClick={() => {
                            const current =
                              (getEffectiveValue(selectedMapping, "reps") as number) ||
                              0;
                            updateOverride(
                              selectedMapping.id,
                              "reps",
                              Math.max(0, current - 1)
                            );
                          }}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={getEffectiveValue(selectedMapping, "reps") ?? ""}
                          onChange={(e) =>
                            updateOverride(
                              selectedMapping.id,
                              "reps",
                              e.target.value
                                ? Math.max(0, parseInt(e.target.value))
                                : undefined
                            )
                          }
                          className="h-10 text-center font-semibold"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          onClick={() => {
                            const current =
                              (getEffectiveValue(selectedMapping, "reps") as number) ||
                              0;
                            updateOverride(selectedMapping.id, "reps", current + 1);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <Label className="text-sm">Czas trwania (sekundy)</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => {
                          const current =
                            (getEffectiveValue(
                              selectedMapping,
                              "duration"
                            ) as number) || 0;
                          updateOverride(
                            selectedMapping.id,
                            "duration",
                            Math.max(0, current - 5)
                          );
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={
                          getEffectiveValue(selectedMapping, "duration") ?? ""
                        }
                        onChange={(e) =>
                          updateOverride(
                            selectedMapping.id,
                            "duration",
                            e.target.value
                              ? Math.max(0, parseInt(e.target.value))
                              : undefined
                          )
                        }
                        className="h-10 text-center font-semibold"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => {
                          const current =
                            (getEffectiveValue(
                              selectedMapping,
                              "duration"
                            ) as number) || 0;
                          updateOverride(
                            selectedMapping.id,
                            "duration",
                            current + 5
                          );
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Rest parameters */}
                <div className="space-y-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Przerwy
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        Między seriami (s)
                      </Label>
                      <Input
                        type="number"
                        value={
                          getEffectiveValue(selectedMapping, "restSets") ?? ""
                        }
                        onChange={(e) =>
                          updateOverride(
                            selectedMapping.id,
                            "restSets",
                            e.target.value
                              ? Math.max(0, parseInt(e.target.value))
                              : undefined
                          )
                        }
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        Między powtórzeniami (s)
                      </Label>
                      <Input
                        type="number"
                        value={
                          getEffectiveValue(selectedMapping, "restReps") ?? ""
                        }
                        onChange={(e) =>
                          updateOverride(
                            selectedMapping.id,
                            "restReps",
                            e.target.value
                              ? Math.max(0, parseInt(e.target.value))
                              : undefined
                          )
                        }
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <StickyNote className="h-4 w-4" />
                    Notatki dla pacjenta
                  </Label>
                  <Textarea
                    value={(selectedOverride?.notes as string) || ""}
                    onChange={(e) =>
                      updateOverride(
                        selectedMapping.id,
                        "notes",
                        e.target.value || undefined
                      )
                    }
                    placeholder="Dodaj wskazówki lub instrukcje dla tego pacjenta..."
                    className="min-h-[80px] resize-none"
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

