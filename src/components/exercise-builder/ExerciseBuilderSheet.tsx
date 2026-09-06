'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Dumbbell, Trash2, Plus, Sparkles, Timer } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useExerciseBuilder } from '@/contexts/ExerciseBuilderContext';
import { formatExerciseDuration } from '@/utils/exerciseTime';
import { BuilderExerciseItem } from './BuilderExerciseItem';
import { CreateSetDialog } from './CreateSetDialog';

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
    totalSetDuration,
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

  const durationLabel =
    totalSetDuration.seconds > 0 ? formatExerciseDuration(totalSetDuration.seconds, totalSetDuration.isEstimate) : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[85vh] flex flex-col p-0 bg-surface/95 backdrop-blur-2xl border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.5)] rounded-t-[32px]"
          data-testid="exercise-builder-sheet"
        >
          <SheetHeader className="border-b border-border p-5 bg-surface/70 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                  <Dumbbell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-foreground tracking-tight">Kreator zestawu</SheetTitle>
                  <SheetDescription className="flex items-center gap-2 mt-0.5">
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4 bg-surface-light text-muted-foreground border-border"
                    >
                      {exerciseCount} {exerciseCount === 1 ? 'ćwiczenie' : exerciseCount < 5 ? 'ćwiczenia' : 'ćwiczeń'}
                    </Badge>
                    {durationLabel && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                        <Timer className="h-3 w-3" />
                        {durationLabel}
                      </span>
                    )}
                  </SheetDescription>
                </div>
              </div>
              <Button
                aria-label="Akcja"
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

          <ScrollArea className="flex-1 px-4 py-6">
            {hasExercises ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={selectedExercises.map((e) => e.id)} strategy={verticalListSortingStrategy}>
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
                  Kliknij &quot;+&quot; na karcie ćwiczenia,
                  <br />
                  aby dodać je do zestawu
                </p>
              </div>
            )}
          </ScrollArea>

          {hasExercises && (
            <div className="border-t border-border p-6 bg-surface/90 backdrop-blur-xl space-y-4 sticky bottom-0">
              {durationLabel && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 w-fit">
                  <Timer className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mr-1">
                    Szacowany czas
                  </span>
                  <span className="text-sm font-bold text-primary">{durationLabel}</span>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  aria-label="Akcja"
                  variant="outline"
                  size="icon"
                  className="h-14 w-14 shrink-0 rounded-2xl border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-all active:scale-95"
                  onClick={() => setIsChatOpen?.(true)}
                  title="Asystent AI"
                  data-testid="exercise-builder-sheet-ai-btn"
                >
                  <Sparkles className="h-6 w-6" />
                </Button>

                <Button
                  className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 shadow-lg shadow-primary/20 text-base font-bold"
                  onClick={() => setIsCreateDialogOpen(true)}
                  data-testid="exercise-builder-sheet-create-btn"
                >
                  Utwórz zestaw
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <CreateSetDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
    </>
  );
}
