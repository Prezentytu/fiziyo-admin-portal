"use client";

import { useState, useCallback } from "react";
import { Clock, Repeat, MoreVertical, Pencil, Trash2, FolderPlus, Eye, ZoomIn, Plus, Check } from "lucide-react";
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
import { ColorBadge } from "@/components/shared/ColorBadge";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
import { ImageLightbox } from "@/components/shared/ImageLightbox";
import { getMediaUrl } from "@/utils/mediaUrl";

export interface ExerciseTag {
  id: string;
  name: string;
  color: string;
}

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
  mainTags?: string[] | ExerciseTag[];
  additionalTags?: string[] | ExerciseTag[];
  isActive?: boolean;
  creationTime?: string;
}

interface ExerciseCardProps {
  exercise: Exercise;
  onView?: (exercise: Exercise) => void;
  onEdit?: (exercise: Exercise) => void;
  onDelete?: (exercise: Exercise) => void;
  onAddToSet?: (exercise: Exercise) => void;
  /** Whether this exercise is currently in the builder */
  isInBuilder?: boolean;
  /** Toggle exercise in/out of builder */
  onToggleBuilder?: (exercise: Exercise) => void;
  className?: string;
  compact?: boolean;
}

function getTypeLabel(type?: string) {
  switch (type) {
    case "reps":
      return "Powtórzeniowe";
    case "time":
      return "Czasowe";
    default:
      return type || "Inne";
  }
}

function isTagObject(tag: string | ExerciseTag): tag is ExerciseTag {
  return typeof tag === "object" && "name" in tag;
}

function renderTags(tags: (string | ExerciseTag)[] | undefined, limit: number = 3) {
  if (!tags || tags.length === 0) return null;

  const visibleTags = tags.slice(0, limit);
  const remainingCount = tags.length - limit;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleTags.map((tag, index) => {
        if (isTagObject(tag)) {
          return (
            <ColorBadge key={tag.id} color={tag.color} size="sm">
              {tag.name}
            </ColorBadge>
          );
        }
        return (
          <Badge key={index} variant="secondary" className="text-[10px] px-2 py-0.5">
            {tag}
          </Badge>
        );
      })}
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-[10px] px-2 py-0.5">
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
}

export function ExerciseCard({
  exercise,
  onView,
  onEdit,
  onDelete,
  onAddToSet,
  isInBuilder = false,
  onToggleBuilder,
  className,
  compact = false,
}: ExerciseCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);

  const handleToggleBuilder = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleBuilder) {
      setIsBouncing(true);
      setTimeout(() => setIsBouncing(false), 300);
      onToggleBuilder(exercise);
    }
  }, [exercise, onToggleBuilder]);

  const rawImageUrl = exercise.imageUrl || exercise.images?.[0];
  const imageUrl = getMediaUrl(rawImageUrl);

  // Collect all images for gallery
  const allImages = [
    exercise.imageUrl,
    ...(exercise.images || []),
  ]
    .filter((img): img is string => !!img)
    .map((img) => getMediaUrl(img))
    .filter((img): img is string => !!img);

  const hasParams = (exercise.sets && exercise.sets > 0) ||
                    (exercise.reps && exercise.reps > 0) ||
                    (exercise.duration && exercise.duration > 0);

  // Compact list view
  if (compact) {
    return (
      <div
        data-testid={`exercise-card-${exercise.id}`}
        className={cn(
          "group flex items-center gap-4 rounded-xl border border-border/60 bg-surface p-3",
          "transition-all duration-200 ease-out cursor-pointer",
          "hover:bg-surface-light hover:border-primary/30 hover:shadow-md hover:shadow-primary/5",
          isInBuilder && "border-primary bg-primary/5 ring-1 ring-primary/20",
          className
        )}
        onClick={() => onView?.(exercise)}
      >
        {/* Thumbnail */}
        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-surface-light">
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

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-semibold truncate">{exercise.name}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {exercise.type && (
              <span className="text-primary font-medium">{getTypeLabel(exercise.type)}</span>
            )}
            {exercise.sets && exercise.sets > 0 && (
              <span className="flex items-center gap-1">
                <Repeat className="h-3 w-3" />
                {exercise.sets} serii
              </span>
            )}
            {exercise.reps && exercise.reps > 0 && (
              <span>{exercise.reps} powt.</span>
            )}
            {exercise.duration && exercise.duration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {exercise.duration}s
              </span>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="hidden sm:block">
          {renderTags(exercise.mainTags, 2)}
        </div>

        {/* Add to builder button */}
        {onToggleBuilder && (
          <Button
            variant={isInBuilder ? "default" : "outline"}
            size="icon"
            className={cn(
              "h-8 w-8 shrink-0 transition-all duration-200",
              isInBuilder
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "border-primary/50 text-primary hover:bg-primary/10 hover:border-primary",
              isBouncing && "animate-bounce-once"
            )}
            onClick={handleToggleBuilder}
            data-testid={`exercise-card-${exercise.id}-toggle-builder-btn`}
            title={isInBuilder ? "Usuń z zestawu" : "Dodaj do zestawu"}
          >
            {isInBuilder ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        )}

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
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

  // Grid card view - new design with large image
  return (
    <>
    <div
      data-testid={`exercise-card-${exercise.id}`}
      className={cn(
        "group relative flex flex-col rounded-2xl border border-border/60 bg-zinc-900/40 overflow-hidden",
        "transition-all duration-300 ease-out cursor-pointer",
        "hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10",
        isInBuilder && "ring-2 ring-primary border-primary/50 shadow-lg shadow-primary/20",
        className
      )}
      onClick={() => onView?.(exercise)}
    >
      {/* Image section with Atlas pattern (Blurred backdrop + Contain) */}
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-950">
        {imageUrl ? (
          <>
            {/* Blurred background */}
            <div 
              className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-110"
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
            {/* Main image */}
            <img
              src={imageUrl}
              alt={exercise.name}
              loading="lazy"
              className="relative h-full w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.05]"
            />
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300" />

            {/* Selection state tint (Subtle) */}
            {isInBuilder && (
              <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
            )}

            {/* Zoom button */}
            {!isInBuilder && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setLightboxOpen(true);
                }}
                className={cn(
                  "absolute bottom-3 right-3 z-10",
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  "bg-black/50 text-white/80 backdrop-blur-sm",
                  "opacity-0 group-hover:opacity-100 transition-all duration-200",
                  "hover:bg-black/70 hover:text-white hover:scale-110"
                )}
                aria-label="Powiększ zdjęcie"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <ImagePlaceholder type="exercise" className="aspect-[4/3]" iconClassName="h-12 w-12" />
        )}

        {/* Actions buttons */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {/* Add to builder button */}
          {onToggleBuilder && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9 backdrop-blur-md transition-all duration-300 rounded-xl shadow-lg",
                isInBuilder
                  ? "bg-primary text-white border-primary/50"
                  : "bg-black/40 hover:bg-black/60 text-white border border-white/10 hover:scale-105",
                isBouncing && "animate-bounce-once"
              )}
              onClick={handleToggleBuilder}
              data-testid={`exercise-card-${exercise.id}-toggle-builder-btn`}
              title={isInBuilder ? "W zestawie" : "Dodaj do zestawu"}
            >
              {isInBuilder ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm rounded-xl border border-white/10 shadow-lg"
              >
                <MoreVertical className="h-5 w-5" />
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
      </div>

      {/* Content section */}
      <div className="flex flex-col p-4 pt-3 space-y-1 bg-zinc-900/20 backdrop-blur-sm">
        <h3 className="font-bold text-sm sm:text-base leading-tight line-clamp-1 text-foreground">
          {exercise.name}
        </h3>
        
        {/* Primary Metadata: Focus on Type & Body Parts */}
        <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-muted-foreground/80 font-medium">
          {exercise.type && (
            <span className="text-primary/90 font-bold uppercase tracking-widest">{getTypeLabel(exercise.type)}</span>
          )}
          {exercise.mainTags && (exercise.mainTags as any).length > 0 && (
            <>
              <span className="w-1 h-1 rounded-full bg-zinc-700" />
              <span className="truncate">
                {(exercise.mainTags as any)
                  .slice(0, 2)
                  .map((t: any) => (isTagObject(t) ? t.name : t))
                  .join(", ")}
              </span>
            </>
          )}
        </div>
      </div>
    </div>

    {/* Image Lightbox - outside card to prevent click propagation */}
    {imageUrl && (
      <ImageLightbox
        src={imageUrl}
        alt={exercise.name}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        images={allImages.length > 1 ? allImages : undefined}
      />
    )}
  </>
  );
}
