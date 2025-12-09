"use client";

import { MoreVertical, Pencil, Trash2, Users, Dumbbell, Eye, Copy } from "lucide-react";
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

  // Get first 3 exercise images for stack effect
  const exerciseImages = set.exerciseMappings
    ?.slice(0, 3)
    .map((m) => m.exercise?.imageUrl || m.exercise?.images?.[0])
    .filter(Boolean) as string[];

  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors hover:bg-surface-light",
        className
      )}
      onClick={() => onView?.(set)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {/* Stack effect for exercise images */}
            <div className="relative h-10 w-10">
              {exerciseImages.length > 0 ? (
                exerciseImages.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt=""
                    className="absolute h-8 w-8 rounded border-2 border-surface object-cover"
                    style={{
                      left: i * 4,
                      top: i * 2,
                      zIndex: 3 - i,
                    }}
                  />
                ))
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded bg-surface-light">
                  <Dumbbell className="h-5 w-5 text-primary" />
                </div>
              )}
            </div>
            <span className="truncate">{set.name}</span>
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
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
      </CardHeader>
      <CardContent>
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
          {set.description || "Brak opisu"}
        </p>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Dumbbell className="h-4 w-4" />
            <span>{exerciseCount} ćwiczeń</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{assignmentCount} pacjentów</span>
          </div>
          {set.isTemplate && (
            <Badge variant="secondary">Szablon</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

