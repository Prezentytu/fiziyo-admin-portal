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
import { Dumbbell, Trash2, Clock, Plus, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useExerciseBuilder } from "@/contexts/ExerciseBuilderContext";
import { BuilderExerciseItem } from "./BuilderExerciseItem";
import { CreateSetDialog } from "./CreateSetDialog";

interface ExerciseBuilderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExerciseBuilderSheet({ open, onOpenChange }: ExerciseBuilderSheetProps) {
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
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[85vh] flex flex-col p-0 bg-zinc-950/80 backdrop-blur-2xl border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] rounded-t-[32px]"
          data-testid="exercise-builder-sheet"
        >
          {/* Header */}
          <SheetHeader className="border-b border-white/5 p-5 bg-zinc-950/40 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                  <Dumbbell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-foreground tracking-tight">Nowy Zestaw</SheetTitle>
                  <SheetDescription className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-zinc-800 text-zinc-400 border-0">
                      {exerciseCount} {exerciseCount === 1 ? "ćwiczenie" : exerciseCount < 5 ? "ćwiczenia" : "ćwiczeń"}
                    </Badge>
                  </SheetDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                onClick={clearBuilder}
                title="Wyczyść wszystko"
                data-testid="exercise-builder-sheet-clear-btn"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Exercise List */}
          <ScrollArea className="flex-1 px-4 py-6">
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
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-light mb-4">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Kliknij "+" na karcie ćwiczenia,<br />
                  aby dodać je do zestawu
                </p>
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {hasExercises && (
            <div className="border-t border-white/5 p-6 bg-zinc-950/60 backdrop-blur-xl space-y-4 sticky bottom-0">
              {/* Estimated time */}
              <div className="flex items-center justify-between text-sm mb-2">
                <div className="flex flex-col">
                  <span className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    Szacowany czas
                  </span>
                  <span className="text-lg font-bold text-foreground">~{estimatedTime} min</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Intensywność</span>
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full",
                    estimatedTime < 15 ? "bg-green-500/10 text-green-500" :
                    estimatedTime < 30 ? "bg-yellow-500/10 text-yellow-500" :
                    "bg-red-500/10 text-red-500"
                  )}>
                    {estimatedTime < 15 ? "Niska" : estimatedTime < 30 ? "Średnia" : "Wysoka"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                {/* Contextual AI Button */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-14 w-14 shrink-0 rounded-2xl border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-all active:scale-95"
                  onClick={() => setIsChatOpen?.(true)}
                  title="Asystent AI"
                >
                  <Sparkles className="h-6 w-6" />
                </Button>

                {/* Create button */}
                <Button
                  className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 shadow-lg shadow-primary/20 text-base font-bold"
                  onClick={() => setIsCreateDialogOpen(true)}
                  data-testid="exercise-builder-sheet-create-btn"
                >
                  Utwórz Zestaw
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Set Dialog */}
      <CreateSetDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </>
  );
}
