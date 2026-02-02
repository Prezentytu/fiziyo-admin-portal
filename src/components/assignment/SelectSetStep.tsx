"use client";

import { useState } from "react";
import { Search, FolderKanban, Check, Dumbbell, ChevronRight, X, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
import { cn } from "@/lib/utils";
import { getMediaUrl } from "@/utils/mediaUrl";
import type { ExerciseSet, AssignedSetInfo, Exercise, ExerciseOverride, LocalExerciseMapping } from "./types";
import { translateExerciseTypeShort } from "@/components/pdf/polishUtils";
import { RapidExerciseBuilder } from "./RapidExerciseBuilder";

interface SelectSetStepProps {
  exerciseSets: ExerciseSet[];
  selectedSet: ExerciseSet | null;
  onSelectSet: (set: ExerciseSet | null) => void;
  assignedSets?: AssignedSetInfo[];
  onUnassign?: (assignmentId: string, setName: string) => void;
  loading?: boolean;
  // Ghost Copy props
  localExercises: LocalExerciseMapping[];
  onLocalExercisesChange: (exercises: LocalExerciseMapping[]) => void;
  planName: string;
  onPlanNameChange: (name: string) => void;
  sourceTemplateName?: string;
  // Exercise overrides (Progressive Disclosure)
  overrides?: Map<string, ExerciseOverride>;
  onOverridesChange?: (overrides: Map<string, ExerciseOverride>) => void;
  selectedPatientsCount?: number;
  // Phantom Set props
  onCreateSet?: () => Promise<void>;
  isCreatingSet?: boolean;
  patientName?: string;
  // Rapid Builder props
  availableExercises?: Exercise[];
  organizationId?: string;
  // Save as template props
  saveAsTemplate?: boolean;
  onSaveAsTemplateChange?: (save: boolean) => void;
  templateName?: string;
  onTemplateNameChange?: (name: string) => void;
}

export function SelectSetStep({
  exerciseSets,
  selectedSet,
  onSelectSet,
  assignedSets = [],
  onUnassign,
  loading = false,
  // Ghost Copy props
  localExercises,
  onLocalExercisesChange,
  planName,
  onPlanNameChange,
  sourceTemplateName,
  // Exercise overrides (Progressive Disclosure)
  overrides = new Map(),
  onOverridesChange,
  selectedPatientsCount = 0,
  // Phantom Set props
  onCreateSet,
  isCreatingSet = false,
  patientName,
  // Rapid Builder props
  availableExercises = [],
  organizationId,
  // Save as template props
  saveAsTemplate = false,
  onSaveAsTemplateChange,
  templateName = "",
  onTemplateNameChange,
}: SelectSetStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [previewSet, setPreviewSet] = useState<ExerciseSet | null>(selectedSet);
  const [selectedToUnassign, setSelectedToUnassign] = useState<string | null>(null);

  // Create a map for quick lookup of assigned sets
  const assignedSetsMap = new Map(
    assignedSets.map((a) => [a.exerciseSetId, a])
  );

  // Filter sets by search query (show all, including assigned)
  const filteredSets = exerciseSets.filter(
    (set) =>
      set.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      set.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort: empty sets first (newly created), then by exercise count, then assigned at bottom
  const sortedSets = [...filteredSets].sort((a, b) => {
    const aAssigned = assignedSetsMap.has(a.id);
    const bAssigned = assignedSetsMap.has(b.id);
    const aEmpty = (a.exerciseMappings?.length || 0) === 0;
    const bEmpty = (b.exerciseMappings?.length || 0) === 0;

    // Assigned sets always at the bottom
    if (aAssigned !== bAssigned) return aAssigned ? 1 : -1;

    // Empty sets (newly created) at the top
    if (aEmpty !== bEmpty) return aEmpty ? -1 : 1;

    return 0;
  });

  const availableCount = exerciseSets.filter(
    (set) => !assignedSetsMap.has(set.id)
  ).length;

  const handleSetClick = (set: ExerciseSet) => {
    const isAssigned = assignedSetsMap.has(set.id);

    if (isAssigned) {
      // Toggle unassign selection for assigned sets
      if (selectedToUnassign === set.id) {
        setSelectedToUnassign(null);
        setPreviewSet(null);
      } else {
        setSelectedToUnassign(set.id);
        setPreviewSet(set);
        // Clear normal selection when selecting for unassign
        onSelectSet(null);
      }
    } else {
      // Normal selection for available sets
      setSelectedToUnassign(null);
      setPreviewSet(set);
      onSelectSet(set);
    }
  };

  const handleUnassign = () => {
    if (!selectedToUnassign) return;
    const assignmentInfo = assignedSetsMap.get(selectedToUnassign);
    const set = exerciseSets.find((s) => s.id === selectedToUnassign);
    if (assignmentInfo && set && onUnassign) {
      onUnassign(assignmentInfo.assignmentId, set.name);
    }
    setSelectedToUnassign(null);
    setPreviewSet(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0 p-6">
      {/* Left column - Set list */}
      <div className="flex flex-col min-h-0">
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Szukaj zestawów..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11"
              data-testid="assign-set-search"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {availableCount} dostępnych
              {assignedSets.length > 0 && (
                <span className="text-muted-foreground/60"> • {assignedSets.length} przypisanych</span>
              )}
            </p>
            {(selectedSet || selectedToUnassign) && (
              <button
                type="button"
                onClick={() => {
                  setPreviewSet(null);
                  onSelectSet(null);
                  setSelectedToUnassign(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Wyczyść wybór
              </button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 rounded-xl border border-border">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="p-3 pr-4 space-y-2">
              {/* Phantom Set - Karta "Stwórz nowy" */}
              {onCreateSet && !searchQuery && (
                <div
                  className={cn(
                    "flex items-center gap-4 rounded-xl p-4 cursor-pointer transition-all",
                    "border-2 border-dashed border-border/60",
                    "hover:border-primary hover:bg-primary/5",
                    isCreatingSet && "opacity-50 pointer-events-none"
                  )}
                  onClick={() => !isCreatingSet && onCreateSet()}
                  data-testid="assign-set-create-btn"
                >
                  <div className="h-14 w-14 shrink-0 rounded-lg bg-surface-light flex items-center justify-center border border-dashed border-border">
                    {isCreatingSet ? (
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    ) : (
                      <Plus className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">Stwórz nowy zestaw</p>
                    <p className="text-sm text-muted-foreground">
                      {patientName
                        ? `Terapia dla ${patientName}`
                        : "Pusty zestaw do wypełnienia"}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              )}

              {/* Empty state */}
              {sortedSets.length === 0 && !onCreateSet && (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">
                    {searchQuery
                      ? "Nie znaleziono zestawów"
                      : "Brak zestawów"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {searchQuery
                      ? "Spróbuj innej frazy"
                      : "Utwórz nowy zestaw ćwiczeń"}
                  </p>
                </div>
              )}
              {sortedSets.map((set) => {
                const isAssigned = assignedSetsMap.has(set.id);
                const isSelectedForAssign = selectedSet?.id === set.id;
                const isSelectedForUnassign = selectedToUnassign === set.id;
                const isPreview = previewSet?.id === set.id;
                const exerciseCount = set.exerciseMappings?.length || 0;
                const firstImage = getMediaUrl(set.exerciseMappings?.[0]?.exercise?.imageUrl ||
                  set.exerciseMappings?.[0]?.exercise?.images?.[0]);

                return (
                  <div
                    key={set.id}
                    className={cn(
                      "flex items-center gap-4 rounded-xl p-4 cursor-pointer transition-all",
                      isSelectedForUnassign
                        ? "bg-destructive/10 border-2 border-destructive/50"
                        : isSelectedForAssign
                        ? "bg-primary/10 border-2 border-primary/40"
                        : isPreview
                        ? "bg-surface-light border-2 border-border"
                        : isAssigned
                        ? "opacity-70 hover:opacity-100 hover:bg-surface-light border-2 border-transparent"
                        : "hover:bg-surface-light border-2 border-transparent"
                    )}
                    onClick={() => handleSetClick(set)}
                    data-testid={`assign-set-item-${set.id}`}
                  >
                    {/* Preview image */}
                    <div className="h-14 w-14 shrink-0 rounded-lg overflow-hidden">
                      {firstImage ? (
                        <img
                          src={firstImage}
                          alt=""
                          className={cn("h-full w-full object-cover", isAssigned && !isSelectedForUnassign && "grayscale")}
                        />
                      ) : (
                        <div className="h-full w-full bg-surface-light flex items-center justify-center">
                          <FolderKanban className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn(
                          "font-semibold line-clamp-2 flex-1",
                          isAssigned && !isSelectedForUnassign && "text-muted-foreground"
                        )}>
                          {set.name}
                        </p>
                        {isAssigned && (
                          <Badge
                            variant={isSelectedForUnassign ? "destructive" : "secondary"}
                            className="text-[10px] shrink-0"
                          >
                            Przypisany
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {exerciseCount} ćw.
                        </Badge>
                      </div>
                      {set.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {set.description}
                        </p>
                      )}
                    </div>

                    {/* Selection indicator */}
                    <div className="shrink-0">
                      {isSelectedForUnassign ? (
                        <div className="h-6 w-6 rounded-full bg-destructive flex items-center justify-center">
                          <X className="h-4 w-4 text-destructive-foreground" />
                        </div>
                      ) : isSelectedForAssign ? (
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right column - Rapid Builder (zawsze dla wybranego zestawu) */}
      <div className="flex flex-col min-h-0 h-full rounded-xl border border-border bg-surface/50">
        {previewSet ? (
          // Rapid Builder dla każdego zestawu - szybkie dodawanie i Time Counter
          (availableExercises.length > 0 && organizationId) ? (
            <RapidExerciseBuilder
              // Ghost Copy - lokalna tablica (nie z bazy)
              exercises={localExercises}
              onExercisesChange={onLocalExercisesChange}
              // Plan name (dla pacjenta)
              planName={planName}
              onPlanNameChange={onPlanNameChange}
              // Bazowy szablon (read-only info)
              sourceTemplateName={sourceTemplateName}
              // Dodawanie ćwiczeń
              availableExercises={availableExercises}
              // Save as template props
              saveAsTemplate={saveAsTemplate}
              onSaveAsTemplateChange={onSaveAsTemplateChange}
              templateName={templateName}
              onTemplateNameChange={onTemplateNameChange}
              // Progressive Disclosure props
              overrides={overrides}
              onOverridesChange={onOverridesChange}
              selectedPatientsCount={selectedPatientsCount}
            />
          ) : (
          // Fallback gdy brak danych do Rapid Builder - prosty podgląd
          <>
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-lg">{previewSet.name}</h3>
              {previewSet.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {previewSet.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline">
                  {previewSet.exerciseMappings?.length || 0} ćwiczeń
                </Badge>
                {selectedToUnassign === previewSet.id && (
                  <Badge variant="destructive">
                    Wybrany do odpisania
                  </Badge>
                )}
              </div>
              {selectedToUnassign === previewSet.id && onUnassign && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={handleUnassign}
                >
                  <X className="h-4 w-4 mr-2" />
                  Odpisz ten zestaw od pacjenta
                </Button>
              )}
            </div>

            <div className="px-4 pt-3 pb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Ćwiczenia w zestawie
              </p>
            </div>

            <ScrollArea className="flex-1 px-4 pb-4">
              <div className="space-y-2">
                {previewSet.exerciseMappings?.map((mapping, index) => {
                  const exercise = mapping.exercise;
                  const imageUrl = getMediaUrl(exercise?.imageUrl || exercise?.images?.[0]);

                  return (
                    <div
                      key={mapping.id}
                      className="flex items-center gap-3 rounded-lg p-3 bg-surface-light/50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold shrink-0 bg-surface text-muted-foreground">
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
                        <p className="text-sm font-medium line-clamp-2">
                          {mapping.customName || exercise?.name || "Nieznane ćwiczenie"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {(mapping.sets || exercise?.sets) && (
                            <span>{mapping.sets || exercise?.sets} serie</span>
                          )}
                          {(mapping.reps || exercise?.reps) && (
                            <span>• {mapping.reps || exercise?.reps} powt.</span>
                          )}
                          {(mapping.duration || exercise?.duration) && (
                            <span>• {mapping.duration || exercise?.duration}s</span>
                          )}
                        </div>
                      </div>
                      {exercise?.type && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {translateExerciseTypeShort(exercise.type)}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <Dumbbell className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Wybierz zestaw
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Kliknij na zestaw, aby zobaczyć jego ćwiczenia
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
