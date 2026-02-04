"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { Search, Dumbbell, Clock, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getMediaUrl } from "@/utils/mediaUrl";
import type { Exercise, ExerciseOverride, LocalExerciseMapping } from "./types";
import { createLocalMapping } from "./types";
import { ExerciseRow } from "./ExerciseRow";
import { calculateEstimatedTime } from "@/utils/exerciseTime";

interface RapidExerciseBuilderProps {
  exercises: LocalExerciseMapping[];
  onExercisesChange: (exercises: LocalExerciseMapping[]) => void;
  planName: string;
  onPlanNameChange: (name: string) => void;
  sourceTemplateName?: string;
  availableExercises: Exercise[];
  saveAsTemplate?: boolean;
  onSaveAsTemplateChange?: (save: boolean) => void;
  templateName?: string;
  onTemplateNameChange?: (name: string) => void;
  overrides?: Map<string, ExerciseOverride>;
  onOverridesChange?: (overrides: Map<string, ExerciseOverride>) => void;
  selectedPatientsCount?: number;
}

/**
 * RapidExerciseBuilder - Liquid Assignment Flow
 *
 * Drag & Drop sorting, premium design, tooltips.
 */
export function RapidExerciseBuilder({
  exercises,
  onExercisesChange,
  planName,
  onPlanNameChange,
  sourceTemplateName: _sourceTemplateName,
  availableExercises,
  saveAsTemplate = false,
  onSaveAsTemplateChange,
  templateName = "",
  onTemplateNameChange,
  overrides = new Map(),
  onOverridesChange,
  selectedPatientsCount = 0,
}: RapidExerciseBuilderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const lastRemovedRef = useRef<{
    exercise: LocalExerciseMapping;
    index: number;
    exercises: LocalExerciseMapping[];
  } | null>(null);

  // Drag & Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = exercises.findIndex((e) => e.id === active.id);
      const newIndex = exercises.findIndex((e) => e.id === over.id);

      const newExercises = arrayMove(exercises, oldIndex, newIndex);
      onExercisesChange(newExercises);
    }
  }, [exercises, onExercisesChange]);

  // Handle exercise field change - update localExercises directly (ghost copy)
  const handleOverrideChange = (mappingId: string, updates: Partial<ExerciseOverride>) => {
    // Update localExercises directly - this is the source of truth for the wizard
    const newExercises = exercises.map(ex => {
      if (ex.id === mappingId) {
        return { ...ex, ...updates };
      }
      return ex;
    });
    onExercisesChange(newExercises);
  };

  // Filter available exercises
  const addedExerciseIds = useMemo(
    () => new Set(exercises.map((m) => m.exerciseId)),
    [exercises]
  );

  // Filtered search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return availableExercises
      .filter(
        (ex) =>
          !addedExerciseIds.has(ex.id) &&
          (ex.name.toLowerCase().includes(query) ||
            ex.patientDescription?.toLowerCase().includes(query) ||
            ex.notes?.toLowerCase().includes(query))
      )
      .slice(0, 6);
  }, [searchQuery, availableExercises, addedExerciseIds]);

  // Reset selected index
  useMemo(() => {
    setSelectedIndex(0);
  }, [searchResults.length]);

  // Add exercise
  const addExercise = useCallback(
    (exercise: Exercise) => {
      const newMapping = createLocalMapping(exercise, exercises.length + 1);
      onExercisesChange([...exercises, newMapping]);
      setSearchQuery("");
      setSelectedIndex(0);
      inputRef.current?.focus();
    },
    [exercises, onExercisesChange]
  );

  // Remove exercise
  const removeExercise = useCallback(
    (mappingId: string) => {
      const index = exercises.findIndex(e => e.id === mappingId);
      const removed = exercises.find(e => e.id === mappingId);

      if (!removed) return;

      lastRemovedRef.current = {
        exercise: removed,
        index,
        exercises: [...exercises],
      };

      const newExercises = exercises.filter(e => e.id !== mappingId);
      onExercisesChange(newExercises);

      toast(`Usunięto "${removed.exercise?.name || 'ćwiczenie'}"`, {
        action: {
          label: "Cofnij",
          onClick: () => {
            if (lastRemovedRef.current) {
              onExercisesChange(lastRemovedRef.current.exercises);
              lastRemovedRef.current = null;
            }
          },
        },
        duration: 5000,
      });
    },
    [exercises, onExercisesChange]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, searchResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && searchResults[selectedIndex]) {
        e.preventDefault();
        addExercise(searchResults[selectedIndex]);
      } else if (e.key === "Escape") {
        setSearchQuery("");
      }
    },
    [searchResults, selectedIndex, addExercise]
  );

  // Total time - obliczany bezpośrednio z exercises (ghost copy)
  const totalSeconds = exercises.reduce((acc, m) => {
    const exerciseType = m.exercise?.type?.toLowerCase();
    const isTimeBased = exerciseType === "time";
    
    const sets = m.sets ?? m.exercise?.defaultSets ?? 3;
    const reps = m.reps ?? m.exercise?.defaultReps ?? 10;
    const rest = m.restSets ?? m.exercise?.defaultRestBetweenSets ?? 60;
    const executionTime = m.executionTime ?? m.exercise?.defaultExecutionTime;
    
    // Duration tylko dla ćwiczeń time-based, dla rep-based używamy executionTime
    const duration = isTimeBased ? (m.duration ?? m.exercise?.defaultDuration) : undefined;

    return acc + calculateEstimatedTime({
      sets,
      reps,
      duration,
      executionTime,
      rest,
    });
  }, 0);
  const totalMinutes = totalSeconds / 60;

  // Exercise IDs for sortable
  const exerciseIds = useMemo(() => exercises.map(e => e.id), [exercises]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Header - Plan Name */}
        <div className="p-4 border-b border-border/50">
          <div className="group relative flex items-center gap-2 -mx-2 px-2 py-1.5 rounded-lg hover:bg-surface-light/50 transition-colors cursor-text">
            <input
              type="text"
              value={planName}
              onChange={(e) => onPlanNameChange(e.target.value)}
              className="flex-1 bg-transparent text-lg font-semibold text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-0 border-none p-0 cursor-text"
              placeholder="Kliknij aby nazwać plan..."
              data-testid="rapid-builder-plan-name"
            />
            <Pencil className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 group-focus-within:opacity-0 transition-opacity shrink-0" />
          </div>
        </div>

        {/* Command Bar */}
        <div className="p-4 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              ref={inputRef}
              placeholder="Dodaj ćwiczenie... (↓↑ Enter)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 h-11 bg-surface border-border/50 focus:border-primary"
              data-testid="rapid-builder-search"
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 rounded-xl border border-border/50 bg-surface overflow-hidden shadow-xl">
              {searchResults.map((ex, i) => {
                const imageUrl = getMediaUrl(ex.thumbnailUrl || ex.imageUrl || ex.images?.[0]);

                return (
                  <button
                    type="button"
                    key={ex.id}
                    className={cn(
                      "flex items-center gap-3 p-3 cursor-pointer transition-all w-full text-left",
                      i === selectedIndex
                        ? "bg-primary/10 border-l-2 border-l-primary"
                        : "border-l-2 border-l-transparent hover:bg-surface-light/50"
                    )}
                    onClick={() => addExercise(ex)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    data-testid={`rapid-builder-result-${ex.id}`}
                  >
                    <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0 bg-surface-light ring-1 ring-border/30">
                      {imageUrl ? (
                        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Dumbbell className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{ex.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ex.defaultSets || 3}×{ex.defaultReps || 10}
                        {ex.defaultDuration && ` • ${ex.defaultDuration}s`}
                      </p>
                    </div>
                    <kbd className={cn(
                      "text-xs px-2 py-1 rounded text-muted-foreground shrink-0 transition-opacity",
                      i === selectedIndex ? "bg-primary/20 text-primary opacity-100" : "opacity-0"
                    )}>
                      Enter ↵
                    </kbd>
                  </button>
                );
              })}
            </div>
          )}

          {/* No results */}
          {searchQuery.trim() && searchResults.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground text-center py-2">
              Nie znaleziono ćwiczeń
            </p>
          )}
        </div>

        {/* Exercise List with Drag & Drop */}
        <ScrollArea className="flex-1 px-4 py-3">
          {exercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
              <div className="w-16 h-16 rounded-2xl bg-surface-light/50 flex items-center justify-center mb-4">
                <Dumbbell className="h-8 w-8 opacity-30" />
              </div>
              <p className="font-medium text-foreground">Plan jest pusty</p>
              <p className="text-sm mt-1 text-center text-muted-foreground/70">
                Użyj wyszukiwarki powyżej, aby dodać ćwiczenia
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            >
              <SortableContext items={exerciseIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {/* Multi-patient warning */}
                  {selectedPatientsCount > 1 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-200 text-xs mb-3">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span>
                        <strong>Zmiana grupowa:</strong> Edycja parametrów wyłączona dla {selectedPatientsCount} pacjentów.
                      </span>
                    </div>
                  )}

                  {exercises.map((m, i) => (
                    <ExerciseRow
                      key={m.id}
                      mapping={m}
                      index={i}
                      override={overrides.get(m.id)}
                      onOverrideChange={handleOverrideChange}
                      onRemove={() => removeExercise(m.id)}
                      isMultiPatient={selectedPatientsCount > 1}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 bg-linear-to-t from-surface-light/30 to-transparent">
          {/* Save as template */}
          {onSaveAsTemplateChange && (
            <div className="mb-3 space-y-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <Switch
                  checked={saveAsTemplate}
                  onCheckedChange={onSaveAsTemplateChange}
                  data-testid="rapid-builder-save-template-switch"
                />
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  Zapisz również jako <span className="font-medium">szablon</span> w bibliotece
                </span>
              </label>

              {saveAsTemplate && onTemplateNameChange && (
                <Input
                  value={templateName}
                  onChange={(e) => onTemplateNameChange(e.target.value)}
                  placeholder="Nazwa szablonu..."
                  className="h-9 text-sm bg-surface border-border/50"
                  data-testid="rapid-builder-template-name"
                />
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground/50" />
              <span className="text-muted-foreground">Szacowany czas:</span>
              <span className="font-semibold text-primary">
                {exercises.length > 0 ? `${Math.round(totalMinutes)} min` : "—"}
              </span>
            </div>
            <Badge variant="secondary" className="bg-surface-light/50">
              {exercises.length} ćwiczeń
            </Badge>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
