"use client";

import { Dumbbell, Clock, Repeat, MoreVertical, Pencil, Trash2, FolderPlus, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  type?: string;
  sets?: number;
  reps?: number;
  duration?: number;
  exerciseSide?: string;
  imageUrl?: string;
  images?: string[];
  mainTags?: string[];
  additionalTags?: string[];
  isActive?: boolean;
}

interface ExerciseCardProps {
  exercise: Exercise;
  onView?: (exercise: Exercise) => void;
  onEdit?: (exercise: Exercise) => void;
  onDelete?: (exercise: Exercise) => void;
  onAddToSet?: (exercise: Exercise) => void;
  className?: string;
  compact?: boolean;
}

export function ExerciseCard({
  exercise,
  onView,
  onEdit,
  onDelete,
  onAddToSet,
  className,
  compact = false,
}: ExerciseCardProps) {
  const imageUrl = exercise.imageUrl || exercise.images?.[0];

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case "reps":
        return "Powtórzenia";
      case "time":
        return "Czasowe";
      case "hold":
        return "Utrzymywanie";
      default:
        return type || "Inne";
    }
  };

  const getSideLabel = (side?: string) => {
    switch (side) {
      case "left":
        return "Lewa strona";
      case "right":
        return "Prawa strona";
      case "both":
        return "Obie strony";
      default:
        return null;
    }
  };

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:bg-surface-light cursor-pointer",
          className
        )}
        onClick={() => onView?.(exercise)}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={exercise.name}
            className="h-12 w-12 rounded object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded bg-surface-light">
            <Dumbbell className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{exercise.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {exercise.sets && (
              <span className="flex items-center gap-1">
                <Repeat className="h-3 w-3" />
                {exercise.sets} serii
              </span>
            )}
            {exercise.reps && (
              <span className="flex items-center gap-1">
                {exercise.reps} powt.
              </span>
            )}
            {exercise.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {exercise.duration}s
              </span>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onView && (
              <DropdownMenuItem onClick={() => onView(exercise)}>
                <Eye className="mr-2 h-4 w-4" />
                Podgląd
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(exercise)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edytuj
              </DropdownMenuItem>
            )}
            {onAddToSet && (
              <DropdownMenuItem onClick={() => onAddToSet(exercise)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                Dodaj do zestawu
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(exercise)}
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
    );
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors hover:bg-surface-light",
        className
      )}
      onClick={() => onView?.(exercise)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={exercise.name}
                className="h-10 w-10 rounded object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded bg-surface-light">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
            )}
            <span className="truncate">{exercise.name}</span>
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(exercise)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Podgląd
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(exercise)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edytuj
                </DropdownMenuItem>
              )}
              {onAddToSet && (
                <DropdownMenuItem onClick={() => onAddToSet(exercise)}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Dodaj do zestawu
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(exercise)}
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
      </CardHeader>
      <CardContent>
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
          {exercise.description || "Brak opisu"}
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          {exercise.type && (
            <Badge variant="secondary">{getTypeLabel(exercise.type)}</Badge>
          )}
          {getSideLabel(exercise.exerciseSide) && (
            <Badge variant="outline">{getSideLabel(exercise.exerciseSide)}</Badge>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {exercise.sets !== undefined && exercise.sets > 0 && (
            <span className="flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              {exercise.sets} serii
            </span>
          )}
          {exercise.reps !== undefined && exercise.reps > 0 && (
            <span className="flex items-center gap-1">
              {exercise.reps} powt.
            </span>
          )}
          {exercise.duration !== undefined && exercise.duration > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {exercise.duration}s
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

