"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
import { cn } from "@/lib/utils";
import { getMediaUrl } from "@/utils/mediaUrl";
import type { BuilderExercise } from "@/contexts/ExerciseBuilderContext";

interface CompactStepperProps {
  value: number;
  onUpdate: (value: number) => void;
  min?: number;
  max?: number;
  prefix?: string;
  unit?: string;
}

function CompactStepper({
  value,
  onUpdate,
  min = 0,
  max = 999,
  prefix,
  unit,
}: CompactStepperProps) {
  return (
    <div className="flex items-center bg-zinc-800/50 hover:bg-zinc-800/80 rounded-full p-0.5 border border-white/5 transition-colors h-7 shrink-0">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onUpdate(Math.max(min, value - 1));
        }}
        className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-white/10 text-muted-foreground/80 hover:text-foreground transition-colors"
      >
        <Minus className="h-3 w-3" />
      </button>
      <div className="min-w-[2.5rem] px-1 text-center text-[11px] font-bold tabular-nums text-foreground flex items-center justify-center gap-1">
        <span>{value}</span>
        {unit && <span className="text-[9px] text-muted-foreground/50 font-medium uppercase tracking-tighter">{prefix}</span>}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onUpdate(Math.min(max, value + 1));
        }}
        className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-white/10 text-muted-foreground/80 hover:text-foreground transition-colors"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

interface BuilderExerciseItemProps {
  exercise: BuilderExercise;
  onUpdate: (updates: Partial<BuilderExercise>) => void;
  onRemove: () => void;
}

export function BuilderExerciseItem({
  exercise,
  onUpdate,
  onRemove,
}: BuilderExerciseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const imageUrl = getMediaUrl(exercise.imageUrl);
  const isTimeExercise = exercise.type === "time";

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`builder-exercise-item-${exercise.id}`}
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-white/5 bg-zinc-900/40 p-3",
        "transition-all duration-200 group relative hover:bg-zinc-900/60",
        isDragging && "opacity-50 shadow-2xl scale-[1.02] ring-2 ring-primary/40 z-50"
      )}
    >
      {/* Drag handle - Always visible as requested */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground/40 hover:text-primary transition-colors shrink-0"
        data-testid={`builder-exercise-item-${exercise.id}-drag-handle`}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Thumbnail */}
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-950 border border-white/10 shadow-inner">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={exercise.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <ImagePlaceholder type="exercise" iconClassName="h-5 w-5" />
        )}
      </div>

      {/* Content Stack */}
      <div className="flex-1 flex flex-col min-w-0 gap-1.5">
        {/* Row 1: Name and Delete */}
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-sm truncate text-foreground leading-tight">
            {exercise.name}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 -mt-1 -mr-1 transition-colors opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            data-testid={`builder-exercise-item-${exercise.id}-remove-btn`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Row 2: Controls - Spotify Aesthetic Pills */}
        <div className="flex items-center gap-1.5">
          {/* Sets input */}
          <CompactStepper
            value={exercise.sets || 0}
            onUpdate={(val) => onUpdate({ sets: val })}
            min={1}
            prefix="SET"
            unit="sets"
          />

          <span className="text-muted-foreground/20 font-light px-0.5">/</span>

          {/* Reps or Duration input based on type */}
          {isTimeExercise ? (
            <CompactStepper
              value={exercise.duration || 0}
              onUpdate={(val) => onUpdate({ duration: val })}
              min={1}
              max={9999}
              prefix="SEC"
              unit="sec"
            />
          ) : (
            <CompactStepper
              value={exercise.reps || 0}
              onUpdate={(val) => onUpdate({ reps: val })}
              min={1}
              prefix="REP"
              unit="reps"
            />
          )}
        </div>
      </div>
    </div>
  );
}
