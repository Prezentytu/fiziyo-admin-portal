"use client";

import { MoreVertical, Pencil, Trash2, Users, Dumbbell, Eye, Copy, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";

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
    .map((m) => m.exercise?.imageUrl || m.exercise?.images?.[0])
    .filter(Boolean) as string[];

  const remainingCount = exerciseCount > 4 ? exerciseCount - 4 : 0;

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden",
        "card-interactive cursor-pointer",
        className
      )}
      onClick={() => onView?.(set)}
    >
      {/* Image grid section */}
      <div className="relative aspect-[16/10] overflow-hidden bg-surface">
        {exerciseImages.length > 0 ? (
          <div className="grid grid-cols-2 grid-rows-2 h-full gap-0.5">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="relative overflow-hidden">
                {exerciseImages[index] ? (
                  <img
                    src={exerciseImages[index]}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-surface-light flex items-center justify-center">
                    <Dumbbell className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                )}
                {/* Show remaining count on last cell if there are more */}
                {index === 3 && remainingCount > 0 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">+{remainingCount}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <ImagePlaceholder type="set" className="h-full" iconClassName="h-12 w-12" />
        )}

        {/* Gradient overlay */}
        <div className="gradient-overlay-subtle" />

        {/* Exercise count badge */}
        <div className="absolute bottom-3 left-3">
          <Badge className="bg-black/60 text-white border-0 backdrop-blur-sm gap-1.5">
            <Dumbbell className="h-3 w-3" />
            {exerciseCount} ćwiczeń
          </Badge>
        </div>

        {/* Template badge */}
        {set.isTemplate && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-primary text-primary-foreground border-0">
              Szablon
            </Badge>
          </div>
        )}

        {/* Actions button */}
        <div className="absolute top-3 right-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(set)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Podgląd
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(set)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edytuj
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(set)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplikuj
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(set)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Usuń
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content section */}
      <div className="flex flex-col flex-1 p-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-base leading-tight line-clamp-1">
          {set.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
          {set.description || "Brak opisu"}
        </p>

        {/* Stats footer */}
        <div className="flex items-center gap-4 pt-2 border-t border-border text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-secondary" />
            <span className="font-medium text-foreground">{assignmentCount}</span> pacjentów
          </span>
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
