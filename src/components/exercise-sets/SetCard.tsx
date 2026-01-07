"use client";

import { Pencil, Trash2, Users, Dumbbell, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
import { getMediaUrl } from "@/utils/mediaUrl";

interface ExerciseMapping {
  id: string;
  exerciseId: string;
  order?: number;
  exercise?: {
    id: string;
    name: string;
    imageUrl?: string;
    images?: string[];
  };
}

export interface ExerciseSet {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
  isTemplate?: boolean;
  creationTime?: string;
  exerciseMappings?: ExerciseMapping[];
  patientAssignments?: { id: string }[];
}

interface SetCardProps {
  set: ExerciseSet;
  onView?: (set: ExerciseSet) => void;
  onEdit?: (set: ExerciseSet) => void;
  onDelete?: (set: ExerciseSet) => void;
  onDuplicate?: (set: ExerciseSet) => void;
  className?: string;
}

export function SetCard({
  set,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  className,
}: SetCardProps) {
  const exerciseCount = set.exerciseMappings?.length || 0;
  const assignmentCount = set.patientAssignments?.length || 0;

  // Get first 4 exercise images for grid
  const exerciseImages = set.exerciseMappings
    ?.slice(0, 4)
    .map((m) => getMediaUrl(m.exercise?.imageUrl || m.exercise?.images?.[0]))
    .filter(Boolean) as string[];

  const remainingCount = exerciseCount > 4 ? exerciseCount - 4 : 0;

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div
      data-testid={`set-card-${set.id}`}
      className={cn(
        "group relative flex flex-col rounded-xl border border-border/60 bg-surface overflow-hidden",
        "transition-all duration-200 hover:border-border hover:shadow-lg hover:shadow-black/5",
        "cursor-pointer h-full",
        className
      )}
      onClick={() => onView?.(set)}
    >
      {/* Image grid section - bardziej kompaktowe proporcje */}
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-light">
        {exerciseImages.length > 0 ? (
          <div className="grid grid-cols-2 grid-rows-2 h-full gap-0.5">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="relative overflow-hidden">
                {exerciseImages[index] ? (
                  <img
                    src={exerciseImages[index]}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="h-full w-full bg-surface flex items-center justify-center">
                    <Dumbbell className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                )}
                {/* Show remaining count on last cell if there are more */}
                {index === 3 && remainingCount > 0 && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-[2px]">
                    <span className="text-white font-bold text-xl">+{remainingCount}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <ImagePlaceholder type="set" className="h-full" iconClassName="h-12 w-12" />
        )}

        {/* Subtle gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

        {/* Exercise count badge */}
        <div className="absolute bottom-3 left-3 z-10">
          <Badge className="bg-black/70 text-white border-0 backdrop-blur-md gap-1.5 shadow-lg">
            <Dumbbell className="h-3.5 w-3.5" />
            <span className="font-semibold">{exerciseCount}</span>
          </Badge>
        </div>

        {/* Template badge */}
        {set.isTemplate && (
          <div className="absolute top-3 left-3 z-10">
            <Badge className="bg-primary text-primary-foreground border-0 shadow-lg gap-1.5">
              <Sparkles className="h-3 w-3" />
              Szablon
            </Badge>
          </div>
        )}

        {/* Hover Actions */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border-0"
              onClick={(e) => handleAction(e, () => onEdit(set))}
              title="Edytuj"
              data-testid={`set-card-${set.id}-edit-btn`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDuplicate && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border-0"
              onClick={(e) => handleAction(e, () => onDuplicate(set))}
              title="Duplikuj"
              data-testid={`set-card-${set.id}-duplicate-btn`}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-black/60 hover:bg-red-600/80 text-white backdrop-blur-md border-0"
              onClick={(e) => handleAction(e, () => onDelete(set))}
              title="Usuń"
              data-testid={`set-card-${set.id}-delete-btn`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Content section */}
      <div className="flex flex-col flex-1 p-4 space-y-2.5 bg-surface">
        {/* Title */}
        <h3 className="font-semibold text-base leading-tight line-clamp-1 text-foreground group-hover:text-secondary transition-colors">
          {set.name}
        </h3>

        {/* Description */}
        {set.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed min-h-[2.5rem]">
            {set.description}
          </p>
        )}

        {/* Stats footer */}
        <div className="flex items-center justify-between pt-2.5 mt-auto border-t border-border/60">
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-3.5 w-3.5 text-secondary" />
              <span className="font-semibold text-foreground">{assignmentCount}</span>
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Dumbbell className="h-3.5 w-3.5 text-secondary" />
              <span className="font-semibold text-foreground">{exerciseCount}</span>
            </span>
          </div>
          {set.isActive === false && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Nieaktywny
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
