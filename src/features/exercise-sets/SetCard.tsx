'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Pencil, Trash2, Dumbbell, Copy, Send, MoreVertical, Link as LinkIcon, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { getMediaUrl } from '@/utils/mediaUrl';
import type { ExerciseTag } from '@/types/apollo';

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
  kind?: 'TEMPLATE' | 'PATIENT_PLAN';
  templateSource?: 'FIZIYO_VERIFIED' | 'ORGANIZATION_PRIVATE' | 'ORG_PRIVATE';
  reviewStatus?: 'DRAFT' | 'PENDING_REVIEW' | 'CHANGES_REQUESTED' | 'PUBLISHED';
  sourceExerciseSetId?: string;
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

export function SetCard({ set, tagsMap, onView, onEdit, onDelete, onDuplicate, onAssign, className }: SetCardProps) {
  // State for Dynamic Preview (scrubbing) - tracks which exercise image is shown
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(null);
  // Keep actions visible while dropdown is open so menu does not disappear when moving cursor to it
  const [menuOpen, setMenuOpen] = useState(false);

  const exerciseCount = set.exerciseMappings?.length || 0;
  const assignmentCount = set.patientAssignments?.length || 0;
  const isTemplateSet = set.kind === 'TEMPLATE' || set.isTemplate === true;
  const isPatientPlan = set.kind === 'PATIENT_PLAN';

  const setTypeBadge = useMemo(() => {
    if (isPatientPlan) {
      return {
        label: 'Spersonalizowany zestaw ćwiczeń',
        className: 'border-info/30 bg-info/10 text-info',
      };
    }

    if (isTemplateSet && set.templateSource === 'FIZIYO_VERIFIED') {
      return {
        label: 'Zestaw FiziYo',
        className: 'border-primary/30 bg-primary/10 text-primary',
      };
    }

    if (isTemplateSet) {
      return {
        label: 'Zestaw organizacji',
        className: 'border-info/30 bg-info/10 text-info',
      };
    }

    return null;
  }, [isPatientPlan, isTemplateSet, set.templateSource]);

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
      .map((id) => tagsMap.get(id))
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
    const index = Math.min(Math.floor(percentage * allExerciseImages.length), allExerciseImages.length - 1);
    setActiveExerciseIndex(index);
  };

  const handleMouseLeave = () => {
    setActiveExerciseIndex(null);
  };

  // Handler for copy link action
  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/set/share/${set.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Skopiowano link do zestawu', {
      description: 'Wyślij go pacjentowi przez SMS lub WhatsApp',
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
        'group relative flex flex-col rounded-xl border border-border/60 bg-surface overflow-hidden',
        'transition-all duration-200 hover:border-border hover:shadow-lg hover:shadow-black/5',
        'cursor-pointer h-full',
        className
      )}
      onClick={() => onView?.(set)}
    >
      {/* ImageArea - Interactive section with state-based rendering */}
      <div
        className="relative aspect-[4/3] overflow-hidden bg-surface-light"
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
      >
        {/* LAYER 1: IMAGE - Cover (IDLE) or Scrubbing (HOVER) */}
        {allExerciseImages.length > 0 && allExerciseImages[0]?.url ? (
          <>
            {/* Blurred background layer */}
            <Image
              src={
                activeExerciseIndex !== null && allExerciseImages[activeExerciseIndex]?.url
                  ? allExerciseImages[activeExerciseIndex].url
                  : allExerciseImages[0].url
              }
              alt=""
              fill
              className="object-cover blur-xl scale-110 opacity-50"
              sizes="(max-width: 768px) 100vw, 400px"
            />
            {/* Main image - shows first image (cover) in IDLE, active image in HOVER */}
            <Image
              src={
                activeExerciseIndex !== null && allExerciseImages[activeExerciseIndex]?.url
                  ? allExerciseImages[activeExerciseIndex].url
                  : allExerciseImages[0].url
              }
              alt={
                activeExerciseIndex !== null && allExerciseImages[activeExerciseIndex]?.name
                  ? allExerciseImages[activeExerciseIndex].name
                  : allExerciseImages[0].name
              }
              fill
              className="object-contain z-10 transition-opacity duration-200"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </>
        ) : (
          <ImagePlaceholder type="set" className="h-full" iconClassName="h-12 w-12" />
        )}

        {/* GRADIENT SCRIM - Subtle vignette for text readability (top & bottom) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60 z-[15] pointer-events-none" />

        {/* LAYER 2: TOP - Progress bars (HOVER only) */}
        {allExerciseImages.length > 1 && (
          <div
            className={cn(
              'absolute top-2 left-2 right-2 flex gap-1 z-20 transition-opacity duration-300',
              'opacity-0 group-hover:opacity-100'
            )}
          >
            {allExerciseImages.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors duration-150',
                  activeExerciseIndex !== null && i === activeExerciseIndex ? 'bg-white' : 'bg-white/40'
                )}
              />
            ))}
          </div>
        )}

        {/* TOP HEADER AREA - Actions visible on hover or while menu open (so cursor can move to menu) */}
        <div
          className={cn(
            'absolute top-4 left-0 right-0 px-3 flex items-start justify-between z-20 pointer-events-none transition-opacity duration-200',
            'opacity-0 group-hover:opacity-100',
            menuOpen && 'opacity-100'
          )}
        >
          {/* A. Exercise Name when scrubbing (multiple images) */}
          {allExerciseImages.length > 1 && allExerciseImages[activeExerciseIndex ?? 0]?.name && (
            <div className="flex-1 pr-2 pt-1 pointer-events-none min-w-0">
              <span className="text-white text-xs font-bold leading-tight drop-shadow-md line-clamp-2">
                {allExerciseImages[activeExerciseIndex ?? 0].name}
              </span>
            </div>
          )}

          {/* B. Action Buttons - pointer-events-auto so clickable */}
          <div className="flex gap-1 flex-none pointer-events-auto ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-black/40 hover:bg-black/80 backdrop-blur-sm rounded-full border border-white/10 text-white transition-colors"
              onClick={handleCopyLink}
              title="Kopiuj link publiczny"
              data-testid={`set-card-${set.id}-copy-link-btn`}
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </Button>

            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 bg-black/40 hover:bg-black/80 backdrop-blur-sm rounded-full border border-white/10 text-white transition-colors"
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

        {/* LAYER 4: BOTTOM - Assign button only (metadata moved to content under name) */}
        <div className="absolute bottom-3 left-3 right-3 z-20 h-9">
          {/* ASSIGN BUTTON - Compact Pill (Hidden in IDLE, slides up on HOVER) */}
          {onAssign && (
            <div
              className={cn(
                'absolute inset-0 flex items-center justify-center transition-all duration-300',
                'opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0'
              )}
            >
              <Button
                className="h-9 px-5 bg-primary/90 hover:bg-primary text-primary-foreground backdrop-blur-sm shadow-lg rounded-full font-medium"
                onClick={(e) => handleAction(e, () => onAssign(set))}
                data-testid={`set-card-${set.id}-assign-btn`}
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Personalizuj i przypisz
              </Button>
            </div>
          )}
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

        {/* Type badge under title - removed from image to keep media clean */}
        <div className="h-6 mt-1 flex items-center">
          {setTypeBadge ? (
            <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5 font-medium', setTypeBadge.className)}>
              {setTypeBadge.label}
            </Badge>
          ) : (
            <span className="text-[11px] text-muted-foreground/50">—</span>
          )}
        </div>

        {/* Metadata: exercise count and estimated time under type (fixed height for grid alignment) */}
        <div className="h-5 flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
          <Dumbbell className="h-3 w-3 shrink-0" />
          <span>{exerciseCount} ćw</span>
          {estimatedDuration > 0 && (
            <>
              <span className="text-muted-foreground/60">•</span>
              <Clock className="h-3 w-3 shrink-0" />
              <span>~{estimatedDuration} min</span>
            </>
          )}
        </div>

        {/* Footer - always at bottom with mt-auto */}
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-xs text-muted-foreground">
            {isTemplateSet
              ? assignmentCount > 0
                ? `Legacy przypisania: ${assignmentCount}`
                : 'Zestaw zrodlowy'
              : assignmentCount > 0
                ? `Przypisany do ${assignmentCount} ${assignmentCount === 1 ? 'pacjenta' : 'pacjentow'}`
                : 'Oczekuje na przypisanie'}
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
