"use client";

import { useState, useMemo } from "react";
import { Pencil, Trash2, Dumbbell, Copy, Sparkles, Send, MoreVertical, Link as LinkIcon, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
import { getMediaUrl } from "@/utils/mediaUrl";
import type { ExerciseTag } from "@/types/apollo";

interface ExerciseMapping {
  id: string;
  exerciseId: string;
  order?: number;
  sets?: number;
  reps?: number;
  duration?: number;
  exercise?: {
    id: string;
    name: string;
    imageUrl?: string;
    images?: string[];
    mainTags?: string[];
    additionalTags?: string[];
    type?: string;
    sets?: number;
    reps?: number;
    duration?: number;
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
  tagsMap?: Map<string, ExerciseTag>;
  onView?: (set: ExerciseSet) => void;
  onEdit?: (set: ExerciseSet) => void;
  onDelete?: (set: ExerciseSet) => void;
  onDuplicate?: (set: ExerciseSet) => void;
  onAssign?: (set: ExerciseSet) => void;
  className?: string;
}

export function SetCard({
  set,
  tagsMap,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onAssign,
  className,
}: SetCardProps) {
  // State for Dynamic Preview (scrubbing)
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  const exerciseCount = set.exerciseMappings?.length || 0;
  const assignmentCount = set.patientAssignments?.length || 0;

  // Get first 4 exercise images for grid (default view)
  const exerciseImages = set.exerciseMappings
    ?.slice(0, 4)
    .map((m) => getMediaUrl(m.exercise?.imageUrl || m.exercise?.images?.[0]))
    .filter(Boolean) as string[];

  const remainingCount = exerciseCount > 4 ? exerciseCount - 4 : 0;

  // Get ALL exercise images with names for scrubbing
  const allExerciseImages = useMemo(() => {
    return (set.exerciseMappings || [])
      .map((m) => ({
        url: getMediaUrl(m.exercise?.imageUrl || m.exercise?.images?.[0]),
        name: m.exercise?.name || 'Ćwiczenie',
      }))
      .filter((img) => img.url);
  }, [set.exerciseMappings]);

  // Calculate estimated duration
  const estimatedDuration = useMemo(() => {
    let totalSeconds = 0;
    for (const mapping of set.exerciseMappings || []) {
      const sets = mapping.sets || mapping.exercise?.sets || 3;
      const duration = mapping.duration || mapping.exercise?.duration || 30;
      const reps = mapping.reps || mapping.exercise?.reps || 10;
      const type = mapping.exercise?.type;

      if (type === 'time') {
        // Time-based exercise: sets * duration
        totalSeconds += sets * duration;
      } else {
        // Reps-based exercise: ~3 sec/rep * reps * sets
        totalSeconds += sets * reps * 3;
      }
      // Add rest between sets (~30s)
      totalSeconds += (sets - 1) * 30;
    }
    return Math.round(totalSeconds / 60); // minutes
  }, [set.exerciseMappings]);

  // Aggregate unique tags from all exercises in this set
  const aggregatedTags = useMemo(() => {
    if (!tagsMap) return [];
    
    const tagIds = new Set<string>();
    for (const mapping of set.exerciseMappings || []) {
      const exercise = mapping.exercise;
      if (exercise?.mainTags) {
        for (const tagId of exercise.mainTags) {
          tagIds.add(tagId);
        }
      }
    }
    
    // Return full tag objects, sorted by name, limited to first 5
    return Array.from(tagIds)
      .map(id => tagsMap.get(id))
      .filter((tag): tag is ExerciseTag => tag !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 5);
  }, [set.exerciseMappings, tagsMap]);

  // Handler for scrubbing - change image based on mouse X position
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (allExerciseImages.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const index = Math.min(
      Math.floor(percentage * allExerciseImages.length),
      allExerciseImages.length - 1
    );
    setActiveExerciseIndex(index);
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setActiveExerciseIndex(null);
  };

  // Handler for copy link action
  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/set/share/${set.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Skopiowano link do zestawu", {
      description: "Wyślij go pacjentowi przez SMS lub WhatsApp"
    });
  };

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
      {/* Image section with Dynamic Preview */}
      <div 
        className="relative aspect-[4/3] overflow-hidden bg-surface-light"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
      >
        {allExerciseImages.length > 0 ? (
          <>
            {/* Dynamic Preview Mode - single large image with scrubbing + Blurred Backdrop */}
            {isHovering && activeExerciseIndex !== null && allExerciseImages.length > 1 ? (
              <div className="relative h-full">
                {/* Layer 1: Blurred background */}
                <img
                  src={allExerciseImages[activeExerciseIndex].url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-60"
                />
                {/* Layer 2: Main image with contain */}
                <img
                  src={allExerciseImages[activeExerciseIndex].url}
                  alt={allExerciseImages[activeExerciseIndex].name}
                  className="relative w-full h-full object-contain z-10"
                />
                {/* Exercise name overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8 z-20">
                  <p className="text-white text-sm font-medium truncate">
                    {allExerciseImages[activeExerciseIndex].name}
                  </p>
                </div>
              </div>
            ) : (
              /* Default Grid View 2x2 with Blurred Backdrop */
              <div className="grid grid-cols-2 grid-rows-2 h-full gap-0.5">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="relative overflow-hidden bg-surface">
                    {exerciseImages[index] ? (
                      <>
                        {/* Layer 1: Blurred background */}
                        <img
                          src={exerciseImages[index]}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover blur-lg scale-110 opacity-50"
                        />
                        {/* Layer 2: Main image with contain - full body visible */}
                        <img
                          src={exerciseImages[index]}
                          alt=""
                          className="relative w-full h-full object-contain z-10 transition-transform duration-500 group-hover:scale-105"
                        />
                      </>
                    ) : (
                      <div className="h-full w-full bg-surface flex items-center justify-center">
                        <Dumbbell className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                    {/* Show remaining count on last cell if there are more */}
                    {index === 3 && remainingCount > 0 && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-[2px] z-20">
                        <span className="text-white font-bold text-xl">+{remainingCount}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <ImagePlaceholder type="set" className="h-full" iconClassName="h-12 w-12" />
        )}

        {/* Layer A: Progress bars - Instagram Stories style (zawsze na hover) */}
        {isHovering && allExerciseImages.length > 1 && (
          <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
            {allExerciseImages.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors duration-150",
                  activeExerciseIndex !== null && i === activeExerciseIndex
                    ? "bg-white"
                    : "bg-white/40"
                )}
              />
            ))}
          </div>
        )}

        {/* Subtle gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

        {/* Info Pill - unified badge with exercise count and duration (above assign button) */}
        <div className="absolute bottom-14 left-3 z-10">
          <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md rounded-full px-2.5 py-1 text-xs text-white font-medium shadow-lg">
            <Dumbbell className="h-3 w-3" />
            <span>{exerciseCount}</span>
            {estimatedDuration > 0 && (
              <>
                <span className="text-white/60">•</span>
                <Clock className="h-3 w-3" />
                <span>~{estimatedDuration} min</span>
              </>
            )}
          </div>
        </div>

        {/* Template badge (below progress bars) */}
        {set.isTemplate && (
          <div className="absolute top-6 left-3 z-10">
            <Badge className="bg-primary text-primary-foreground border-0 shadow-lg gap-1.5">
              <Sparkles className="h-3 w-3" />
              Szablon
            </Badge>
          </div>
        )}

        {/* Layer D: Primary Action "Przypisz" - Floating na dole */}
        {onAssign && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 w-[90%]">
            <Button
              className={cn(
                "w-full bg-primary/90 hover:bg-primary text-white backdrop-blur-md",
                "shadow-xl shadow-black/20 rounded-lg font-semibold",
                "transform translate-y-4 opacity-0 transition-all duration-300",
                "group-hover:translate-y-0 group-hover:opacity-100"
              )}
              onClick={(e) => handleAction(e, () => onAssign(set))}
              data-testid={`set-card-${set.id}-assign-btn`}
            >
              <Send className="h-4 w-4 mr-2" />
              Przypisz
            </Button>
          </div>
        )}

        {/* Layer C: Top-right secondary actions (below progress bars) */}
        <div className="absolute top-6 right-3 z-20 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* Copy Link */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border-0"
            onClick={handleCopyLink}
            title="Kopiuj link publiczny"
            data-testid={`set-card-${set.id}-copy-link-btn`}
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>

          {/* Menu dropdown with Edit, Duplicate, Delete */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border-0"
                onClick={(e) => e.stopPropagation()}
                data-testid={`set-card-${set.id}-menu-trigger`}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(set)} data-testid={`set-card-${set.id}-edit-btn`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edytuj
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(set)} data-testid={`set-card-${set.id}-duplicate-btn`}>
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
                    data-testid={`set-card-${set.id}-delete-btn`}
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

      {/* Content section - Fixed heights for grid alignment */}
      <div className="flex flex-col flex-1 p-4 bg-surface">
        {/* Tags row - fixed height h-5, single line with fade */}
        <div className="h-5 flex items-center overflow-hidden relative">
          {aggregatedTags.length > 0 ? (
            <>
              <div className="flex items-center gap-1.5 whitespace-nowrap text-[11px]">
                {aggregatedTags.slice(0, 2).map((tag, index) => (
                  <span key={tag.id} className="flex items-center gap-1.5">
                    {index > 0 && <span className="text-muted-foreground/40">•</span>}
                    <span className="text-primary font-medium uppercase tracking-wider truncate max-w-[80px]">
                      {tag.name}
                    </span>
                  </span>
                ))}
                {aggregatedTags.length > 2 && (
                  <span className="text-muted-foreground text-[10px]">+{aggregatedTags.length - 2}</span>
                )}
              </div>
              {/* Fade gradient for overflow */}
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-surface to-transparent pointer-events-none" />
            </>
          ) : (
            <span className="text-[11px] text-muted-foreground/50">—</span>
          )}
        </div>

        {/* Title row - fixed height for 2 lines */}
        <div className="h-12 mt-1">
          <h3 className="text-base font-semibold leading-snug line-clamp-2 text-foreground group-hover:text-secondary transition-colors">
            {set.name}
          </h3>
        </div>

        {/* Footer - always at bottom with mt-auto */}
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-xs text-zinc-500">
            Przypisano {assignmentCount} razy
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
