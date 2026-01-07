"use client";

import { useState } from "react";
import { Dumbbell, Clock, Repeat, MoreVertical, Pencil, Trash2, FolderPlus, Eye, ZoomIn } from "lucide-react";
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
  className?: string;
  compact?: boolean;
}

function getTypeLabel(type?: string) {
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
  className,
  compact = false,
}: ExerciseCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

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
        "group relative flex flex-col rounded-xl border border-border/60 bg-surface overflow-hidden",
        "transition-all duration-300 ease-out cursor-pointer",
        "hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10",
        className
      )}
      onClick={() => onView?.(exercise)}
    >
      {/* Image section with overlay */}
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-light">
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={exercise.name}
              loading="lazy"
              className="h-full w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300" />

            {/* Zoom button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setLightboxOpen(true);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
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
          </>
        ) : (
          <ImagePlaceholder type="exercise" className="aspect-[16/10]" iconClassName="h-12 w-12" />
        )}

        {/* Tags overlay on image */}
        {(exercise.mainTags?.length || 0) > 0 && (
          <div className="absolute bottom-3 left-3 right-12">
            {renderTags(exercise.mainTags, 3)}
          </div>
        )}

        {/* Type badge */}
        {exercise.type && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-black/60 text-white border-0 backdrop-blur-sm">
              {getTypeLabel(exercise.type)}
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
                data-testid={`exercise-card-${exercise.id}-menu-trigger`}
                className="h-8 w-8 bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem data-testid={`exercise-card-${exercise.id}-view-btn`} onClick={() => onView(exercise)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Podgląd
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem data-testid={`exercise-card-${exercise.id}-edit-btn`} onClick={() => onEdit(exercise)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edytuj
                </DropdownMenuItem>
              )}
              {onAddToSet && (
                <DropdownMenuItem data-testid={`exercise-card-${exercise.id}-add-to-set-btn`} onClick={() => onAddToSet(exercise)}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Dodaj do zestawu
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    data-testid={`exercise-card-${exercise.id}-delete-btn`}
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
      <div className="flex flex-col flex-1 p-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-base leading-tight line-clamp-1">
          {exercise.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
          {exercise.description || "Brak opisu"}
        </p>

        {/* Parameters footer */}
        {hasParams && (
          <div className="flex items-center gap-4 pt-2 border-t border-border text-xs text-muted-foreground">
            {exercise.sets !== undefined && exercise.sets > 0 && (
              <span className="flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-foreground">{exercise.sets}</span> serii
              </span>
            )}
            {exercise.reps !== undefined && exercise.reps > 0 && (
              <span className="flex items-center gap-1.5">
                <Dumbbell className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-foreground">{exercise.reps}</span> powt.
              </span>
            )}
            {exercise.duration !== undefined && exercise.duration > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-foreground">{exercise.duration}</span>s
              </span>
            )}
          </div>
        )}
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
