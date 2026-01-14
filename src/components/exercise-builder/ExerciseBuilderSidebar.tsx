"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Dumbbell, Trash2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useExerciseBuilder } from "@/contexts/ExerciseBuilderContext";
import { BuilderExerciseItem } from "./BuilderExerciseItem";
import { CreateSetDialog } from "./CreateSetDialog";

interface ExerciseBuilderSidebarProps {
  className?: string;
}

export function ExerciseBuilderSidebar({ className }: ExerciseBuilderSidebarProps) {
  const {
    selectedExercises,
    removeExercise,
    updateExercise,
    reorderExercises,
    clearBuilder,
    estimatedTime,
    hasExercises,
    exerciseCount,
    setIsChatOpen,
  } = useExerciseBuilder();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = selectedExercises.findIndex((e) => e.id === active.id);
      const newIndex = selectedExercises.findIndex((e) => e.id === over.id);
      reorderExercises(oldIndex, newIndex);
    }
  };

  return (
    <>
      <aside
        data-testid="exercise-builder-sidebar"
        className={cn(
          "z-40 w-[400px] border-l border-white/5 bg-zinc-950/80 backdrop-blur-2xl flex flex-col shrink-0 transition-all duration-300",
          !hasExercises && "w-0 opacity-0 pointer-events-none border-none overflow-hidden",
          className
        )}
      >
        {/* Header */}
        <div className="flex flex-col border-b border-white/5 bg-zinc-950/40 backdrop-blur-md sticky top-0 z-10 shrink-0">
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-foreground tracking-tight">Kreator Zestawu</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-primary">
                    {exerciseCount} {exerciseCount === 1 ? "Pozycja" : exerciseCount < 5 ? "Pozycje" : "Pozycji"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                onClick={clearBuilder}
                title="Wyczyść wszystko"
                data-testid="exercise-builder-clear-btn"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Exercise List */}
        <ScrollArea className="flex-1">
          <div className="px-4 py-6">
            {hasExercises ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={selectedExercises.map((e) => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {selectedExercises.map((exercise) => (
                      <BuilderExerciseItem
                        key={exercise.id}
                        exercise={exercise}
                        onUpdate={(updates) => updateExercise(exercise.id, updates)}
                        onRemove={() => removeExercise(exercise.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900/50 border border-white/5 mb-4">
                  <Plus className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Kliknij "+" na karcie ćwiczenia,<br />
                  aby dodać je do zestawu
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        {hasExercises && (
          <div className="border-t border-white/5 p-6 bg-zinc-950/80 backdrop-blur-xl sticky bottom-0 z-10 shrink-0 space-y-4">
            {/* Stats section restored */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Szacowany czas</span>
                <span className="text-xl font-bold text-foreground">~{estimatedTime} min</span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Intensywność</span>
                <span className={cn(
                  "text-[11px] font-bold uppercase px-2 py-0.5 rounded-full",
                  estimatedTime < 15 ? "bg-green-500/10 text-green-500" :
                  estimatedTime < 30 ? "bg-yellow-500/10 text-yellow-500" :
                  "bg-red-500/10 text-red-500"
                )}>
                  {estimatedTime < 15 ? "Niska" : estimatedTime < 30 ? "Średnia" : "Wysoka"}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              {/* Create button */}
              <Button
                className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20 text-base font-bold transition-all hover:scale-[1.02] active:scale-[0.98] group"
                onClick={() => setIsCreateDialogOpen(true)}
                data-testid="exercise-builder-create-btn"
              >
                Utwórz Zestaw
                <Plus className="ml-2 h-5 w-5 transition-transform group-hover:rotate-90" />
              </Button>

              {/* AI Magic Button */}
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 shrink-0 rounded-2xl border-white/10 bg-white/5 text-primary hover:bg-primary/10 hover:border-primary/30 transition-all active:scale-95 group"
                onClick={() => setIsChatOpen(true)}
                title="AI Magic - Optymalizuj zestaw"
              >
                <Sparkles className="h-6 w-6 group-hover:animate-pulse" />
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* Create Set Dialog */}
      <CreateSetDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </>
  );
}
