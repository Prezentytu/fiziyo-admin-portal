"use client";

import { useState } from "react";
import { Search, FolderKanban, Check, Dumbbell, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
import { cn } from "@/lib/utils";
import type { ExerciseSet } from "./types";

interface SelectSetStepProps {
  exerciseSets: ExerciseSet[];
  selectedSet: ExerciseSet | null;
  onSelectSet: (set: ExerciseSet | null) => void;
  existingSetIds?: string[];
  loading?: boolean;
}

export function SelectSetStep({
  exerciseSets,
  selectedSet,
  onSelectSet,
  existingSetIds = [],
  loading = false,
}: SelectSetStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [previewSet, setPreviewSet] = useState<ExerciseSet | null>(selectedSet);

  // Filter out already assigned sets and apply search
  const availableSets = exerciseSets.filter(
    (set) => !existingSetIds.includes(set.id)
  );

  const filteredSets = availableSets.filter(
    (set) =>
      set.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      set.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSetClick = (set: ExerciseSet) => {
    setPreviewSet(set);
    onSelectSet(set);
  };

  // Helper to get exercise type label
  const getTypeLabel = (type?: string) => {
    const types: Record<string, string> = {
      reps: "Powtórzenia",
      time: "Czasowe",
    };
    return type ? types[type] || type : "";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
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
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {availableSets.length} dostępnych zestawów
            </p>
            {selectedSet && (
              <button
                type="button"
                onClick={() => {
                  setPreviewSet(null);
                  onSelectSet(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Wyczyść wybór
              </button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 rounded-xl border border-border">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredSets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">
                {searchQuery
                  ? "Nie znaleziono zestawów"
                  : availableSets.length === 0
                  ? "Wszystkie zestawy są już przypisane"
                  : "Brak zestawów"}
              </p>
              <p className="text-xs text-muted-foreground">
                {searchQuery
                  ? "Spróbuj innej frazy"
                  : "Utwórz nowy zestaw ćwiczeń"}
              </p>
            </div>
          ) : (
            <div className="p-3 pr-4 space-y-2">
              {filteredSets.map((set) => {
                const isSelected = selectedSet?.id === set.id;
                const isPreview = previewSet?.id === set.id;
                const exerciseCount = set.exerciseMappings?.length || 0;
                const firstImage = set.exerciseMappings?.[0]?.exercise?.imageUrl ||
                  set.exerciseMappings?.[0]?.exercise?.images?.[0];

                return (
                  <div
                    key={set.id}
                    className={cn(
                      "flex items-center gap-4 rounded-xl p-4 cursor-pointer transition-all",
                      isSelected
                        ? "bg-primary/10 border-2 border-primary/40"
                        : isPreview
                        ? "bg-surface-light border-2 border-border"
                        : "hover:bg-surface-light border-2 border-transparent"
                    )}
                    onClick={() => handleSetClick(set)}
                  >
                    {/* Preview image */}
                    <div className="h-14 w-14 shrink-0 rounded-lg overflow-hidden">
                      {firstImage ? (
                        <img
                          src={firstImage}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-surface-light flex items-center justify-center">
                          <FolderKanban className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold line-clamp-2 flex-1">{set.name}</p>
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
                      {isSelected ? (
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

      {/* Right column - Exercise preview */}
      <div className="flex flex-col min-h-0 rounded-xl border border-border bg-surface/50 p-4">
        {previewSet ? (
          <>
            <div className="mb-4">
              <h3 className="font-semibold text-lg">{previewSet.name}</h3>
              {previewSet.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {previewSet.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">
                  {previewSet.exerciseMappings?.length || 0} ćwiczeń
                </Badge>
              </div>
            </div>

            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Ćwiczenia w zestawie
            </p>

            <ScrollArea className="flex-1">
              <div className="pr-4 space-y-2">
                {previewSet.exerciseMappings?.map((mapping, index) => {
                  const exercise = mapping.exercise;
                  const imageUrl = exercise?.imageUrl || exercise?.images?.[0];

                  return (
                    <div
                      key={mapping.id}
                      className="flex items-center gap-3 rounded-lg p-3 bg-surface-light/50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold bg-surface text-muted-foreground shrink-0">
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
                          {getTypeLabel(exercise.type)}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
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


