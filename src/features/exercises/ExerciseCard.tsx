'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import {
  Clock,
  Repeat,
  MoreVertical,
  Pencil,
  Trash2,
  FolderPlus,
  Eye,
  ZoomIn,
  Plus,
  Check,
  Rocket,
  Globe,
  AlertCircle,
  Sparkles,
  Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ColorBadge } from '@/components/shared/ColorBadge';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { ImageLightbox } from '@/components/shared/ImageLightbox';
import { getMediaUrl } from '@/utils/mediaUrl';

export interface ExerciseTag {
  id: string;
  name: string;
  color: string;
}

export interface Exercise {
  id: string;
  name: string;
  // Nowe pola
  patientDescription?: string;
  clinicalDescription?: string;
  side?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultDuration?: number;
  defaultExecutionTime?: number;
  defaultRestBetweenSets?: number;
  defaultRestBetweenReps?: number;
  preparationTime?: number;
  thumbnailUrl?: string;
  videoUrl?: string;
  gifUrl?: string;
  createdAt?: string;
  // Status and scope for verification workflow
  status?:
    | 'DRAFT'
    | 'PENDING_REVIEW'
    | 'CHANGES_REQUESTED'
    | 'APPROVED'
    | 'PUBLISHED'
    | 'REJECTED'
    | 'ARCHIVED_GLOBAL'
    | 'UPDATE_PENDING';
  scope?: 'PERSONAL' | 'ORGANIZATION' | 'GLOBAL';
  adminReviewNotes?: string;
  // Global submission tracking (nowy model weryfikacji)
  globalSubmissionId?: string;
  sourceOrganizationExerciseId?: string;
  submittedToGlobalAt?: string;
  // Legacy aliasy
  description?: string;
  type?: string;
  sets?: number;
  reps?: number;
  duration?: number;
  executionTime?: number;
  restSets?: number;
  restReps?: number;
  exerciseSide?: string;
  notes?: string;
  tempo?: string;
  audioCue?: string;
  rangeOfMotion?: string;
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
  /** Callback to submit exercise to global database for verification */
  onSubmitToGlobal?: (exercise: Exercise) => void;
  /** Callback to report exercise issue */
  onReportIssue?: (exercise: Exercise) => void;
  /** Whether this exercise is currently in the builder */
  isInBuilder?: boolean;
  /** Toggle exercise in/out of builder */
  onToggleBuilder?: (exercise: Exercise) => void;
  className?: string;
  compact?: boolean;
}

function isTagObject(tag: string | ExerciseTag): tag is ExerciseTag {
  return typeof tag === 'object' && 'name' in tag;
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

function normalizeTagLabel(tag: string | ExerciseTag): string {
  return isTagObject(tag) ? tag.name : tag;
}

export function ExerciseCard({
  exercise,
  onView,
  onEdit,
  onDelete,
  onAddToSet,
  onSubmitToGlobal,
  onReportIssue,
  isInBuilder = false,
  onToggleBuilder,
  className,
  compact = false,
}: Readonly<ExerciseCardProps>) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);

  // Check if exercise is from global FiziYo database (read-only)
  const isGlobalExercise = exercise.scope === 'GLOBAL';

  // Determine if "Submit to Global" should be shown
  // Only for ORGANIZATION scope exercises that don't have an active global submission
  const canSubmitToGlobal = onSubmitToGlobal && exercise.scope === 'ORGANIZATION' && !exercise.globalSubmissionId; // Nie ma jeszcze zgłoszenia

  // Check if exercise has been submitted to global (new model)
  const hasGlobalSubmission = !!exercise.globalSubmissionId;

  // Check if exercise is pending review (locked) - for legacy support
  const isPendingReview = exercise.status === 'PENDING_REVIEW';
  const isChangesRequested = exercise.status === 'CHANGES_REQUESTED';

  // For organization exercises with global submission, show as "submitted"
  const isSubmittedToGlobal = hasGlobalSubmission && exercise.scope === 'ORGANIZATION';

  // Global exercises and pending review exercises are read-only (no edit/delete)
  const isReadOnly = isGlobalExercise || isPendingReview;

  const handleToggleBuilder = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (onToggleBuilder) {
        setIsBouncing(true);
        setTimeout(() => setIsBouncing(false), 300);
        onToggleBuilder(exercise);
      }
    },
    [exercise, onToggleBuilder]
  );

  const runMenuAction = useCallback((event: Event | React.SyntheticEvent, action: () => void) => {
    event.preventDefault();
    event.stopPropagation();
    action();
  }, []);

  const rawImageUrl = exercise.thumbnailUrl || exercise.imageUrl || exercise.images?.[0];
  const imageUrl = getMediaUrl(rawImageUrl);

  // Collect all images for gallery
  const allImages = [exercise.imageUrl, ...(exercise.images || [])]
    .filter((img): img is string => !!img)
    .map((img) => getMediaUrl(img))
    .filter((img): img is string => !!img);

  // Support both new and legacy field names
  const sets = exercise.defaultSets ?? exercise.sets;
  const reps = exercise.defaultReps ?? exercise.reps;
  const duration = exercise.defaultDuration ?? exercise.duration;

  // Compact list view
  if (compact) {
    return (
      <TooltipProvider delayDuration={200}>
        <div
          data-testid={`exercise-card-${exercise.id}`}
          className={cn(
            'group relative flex items-center gap-4 rounded-xl border border-border/60 bg-surface p-3',
            'transition-all duration-200 ease-out cursor-pointer',
            'hover:bg-surface-light hover:border-primary/30 hover:shadow-md hover:shadow-primary/5',
            isInBuilder && 'border-primary bg-primary/5 ring-1 ring-primary/20',
            isPendingReview && 'border-yellow-500/30 bg-yellow-500/5 opacity-70',
            isChangesRequested && 'border-red-500/30 bg-red-500/5',
            className
          )}
          onClick={() => {
            // For CHANGES_REQUESTED, open edit directly to show feedback
            if (isChangesRequested && onEdit) {
              onEdit(exercise);
            } else {
              onView?.(exercise);
            }
          }}
        >
          {/* Notification dot for CHANGES_REQUESTED in compact mode */}
          {isChangesRequested && (
            <div className="absolute -top-1 -right-1 z-10">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
            </div>
          )}
          {/* Thumbnail */}
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-light">
            {imageUrl ? (
              <Image src={imageUrl} alt={exercise.name} fill className="object-cover" sizes="56px" />
            ) : (
              <ImagePlaceholder type="exercise" iconClassName="h-5 w-5" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold truncate">{exercise.name}</p>
              {/* Status badges in compact view */}
              {isGlobalExercise && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-[9px] bg-violet/10 text-violet border-violet/20 shrink-0"
                    >
                      <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                      FiziYo
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Ćwiczenie dostępne w globalnej bazie FiziYo
                  </TooltipContent>
                </Tooltip>
              )}
              {isSubmittedToGlobal && !isPendingReview && !isChangesRequested && !isGlobalExercise && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-[9px] bg-blue-500/10 text-blue-600 border-blue-500/20 shrink-0"
                    >
                      <Globe className="h-2.5 w-2.5 mr-0.5" />W FiziYo
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Zgłoszono do bazy globalnej FiziYo
                  </TooltipContent>
                </Tooltip>
              )}
              {isPendingReview && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-[9px] bg-yellow-500/10 text-yellow-600 border-yellow-500/20 shrink-0"
                    >
                      <Clock className="h-2.5 w-2.5 mr-0.5" />
                      Weryfikacja
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-[200px]">
                    Nasi eksperci sprawdzają to ćwiczenie. Średni czas: 24h.
                  </TooltipContent>
                </Tooltip>
              )}
              {isChangesRequested && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-[9px] bg-red-500/10 text-red-600 border-red-500/20 shrink-0"
                    >
                      <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                      Do poprawy
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Admin dodał uwagi. Kliknij aby zobaczyć.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {sets && sets > 0 && (
                <span className="flex items-center gap-1">
                  <Repeat className="h-3 w-3" />
                  {sets} serii
                </span>
              )}
              {reps && reps > 0 && <span>{reps} powt.</span>}
              {duration && duration > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {duration}s
                </span>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="hidden sm:block">{renderTags(exercise.mainTags, 2)}</div>

          {/* Add to builder button */}
          {onToggleBuilder && (
            <Button
              variant={isInBuilder ? 'default' : 'outline'}
              size="icon"
              className={cn(
                'h-8 w-8 shrink-0 transition-all duration-200',
                isInBuilder
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border-primary/50 text-primary hover:bg-primary/10 hover:border-primary',
                isBouncing && 'animate-bounce-once'
              )}
              onClick={handleToggleBuilder}
              data-testid={`exercise-card-${exercise.id}-toggle-builder-btn`}
              title={isInBuilder ? 'Usuń z zestawu' : 'Dodaj do zestawu'}
            >
              {isInBuilder ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
          )}

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={(event) => runMenuAction(event, () => onView(exercise))}>
                  <Eye className="mr-2 h-4 w-4" />
                  Podgląd
                </DropdownMenuItem>
              )}
              {onEdit && !isReadOnly && (
                <DropdownMenuItem onClick={(event) => runMenuAction(event, () => onEdit(exercise))}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edytuj
                </DropdownMenuItem>
              )}
              {onAddToSet && (
                <DropdownMenuItem onClick={(event) => runMenuAction(event, () => onAddToSet(exercise))}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Dodaj do zestawu
                </DropdownMenuItem>
              )}
              {canSubmitToGlobal && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(event) => runMenuAction(event, () => onSubmitToGlobal(exercise))}
                    className="text-primary focus:text-primary"
                  >
                    <Rocket className="mr-2 h-4 w-4" />
                    Zgłoś do Bazy Globalnej
                  </DropdownMenuItem>
                </>
              )}
              {onReportIssue && (
                <DropdownMenuItem
                  onClick={(event) => runMenuAction(event, () => onReportIssue(exercise))}
                  data-testid={`exercise-card-${exercise.id}-report-btn`}
                >
                  <Flag className="mr-2 h-4 w-4" />
                  Zgłoś do poprawki
                </DropdownMenuItem>
              )}
              {isGlobalExercise && (
                <div className="px-2 py-1.5 text-xs text-violet flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Ćwiczenie z bazy FiziYo
                </div>
              )}
              {isSubmittedToGlobal && (
                <div className="px-2 py-1.5 text-xs text-blue-600 flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Zgłoszono do FiziYo
                </div>
              )}
              {isPendingReview && (
                <div className="px-2 py-1.5 text-xs text-amber-600 flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Oczekuje na weryfikację
                </div>
              )}
              {onDelete && !isReadOnly && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(event) => runMenuAction(event, () => onDelete(exercise))}
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
      </TooltipProvider>
    );
  }

  // Grid card view - new design with large image
  return (
    <TooltipProvider delayDuration={200}>
      <>
        <div
          data-testid={`exercise-card-${exercise.id}`}
          className={cn(
            'group relative flex flex-col rounded-2xl border border-border/70 bg-card overflow-hidden',
            'transition-all duration-300 ease-out cursor-pointer',
            'hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10',
            isInBuilder && 'ring-2 ring-primary border-primary/50 shadow-lg shadow-primary/20',
            className
          )}
          onClick={() => {
            // For CHANGES_REQUESTED, open edit directly to show feedback
            if (isChangesRequested && onEdit) {
              onEdit(exercise);
            } else {
              onView?.(exercise);
            }
          }}
        >
          {/* Image section with Atlas pattern (Blurred backdrop + Contain) */}
          <div className="relative aspect-4/3 overflow-hidden bg-muted/60 dark:bg-background">
            {imageUrl ? (
              <>
                {/* Blurred background */}
                <div
                  className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-110"
                  style={{ backgroundImage: `url(${imageUrl})` }}
                />
                {/* Main image */}
                <Image
                  src={imageUrl}
                  alt={exercise.name}
                  fill
                  className="object-contain transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                  sizes="(max-width: 768px) 100vw, 400px"
                />
                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-black/50 dark:from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300" />

                {/* Selection state tint (Subtle) */}
                {isInBuilder && <div className="absolute inset-0 bg-primary/10 pointer-events-none" />}

                {/* Pending review overlay - dimmed state */}
                {isPendingReview && <div className="absolute inset-0 bg-black/30 pointer-events-none" />}

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
                      'absolute bottom-3 right-3 z-10',
                      'flex h-8 w-8 items-center justify-center rounded-full',
                      'bg-background/90 dark:bg-black/50 text-foreground dark:text-white/80 border border-border/70 dark:border-white/10 backdrop-blur-sm',
                      'opacity-0 group-hover:opacity-100 transition-all duration-200',
                      'hover:bg-background dark:hover:bg-black/70 hover:text-foreground dark:hover:text-white hover:scale-110'
                    )}
                    aria-label="Powiększ zdjęcie"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                )}
              </>
            ) : (
              <ImagePlaceholder type="exercise" className="aspect-4/3 bg-muted/50" iconClassName="h-12 w-12" />
            )}

            {/* Status badges - top left */}
            {(isGlobalExercise || isSubmittedToGlobal || isPendingReview || isChangesRequested) && (
              <div className="absolute top-3 left-3 z-10">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-semibold backdrop-blur-md border shadow-lg cursor-help',
                        isGlobalExercise && 'bg-violet/90 text-white border-violet-dark',
                        isSubmittedToGlobal &&
                          !isPendingReview &&
                          !isChangesRequested &&
                          !isGlobalExercise &&
                          'bg-blue-500/80 text-white border-blue-600',
                        isPendingReview && 'bg-yellow-500/90 text-black border-yellow-600',
                        isChangesRequested && 'bg-red-500/90 text-white border-red-600'
                      )}
                    >
                      {isGlobalExercise && (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          FiziYo
                        </>
                      )}
                      {isSubmittedToGlobal && !isPendingReview && !isChangesRequested && !isGlobalExercise && (
                        <>
                          <Globe className="h-3 w-3 mr-1" />W FiziYo
                        </>
                      )}
                      {isPendingReview && (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          Weryfikacja
                        </>
                      )}
                      {isChangesRequested && (
                        <>
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Do poprawy
                        </>
                      )}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs max-w-[220px]">
                    {isGlobalExercise && 'Ćwiczenie dostępne w globalnej bazie FiziYo'}
                    {isSubmittedToGlobal &&
                      !isPendingReview &&
                      !isChangesRequested &&
                      !isGlobalExercise &&
                      'Zgłoszono do bazy globalnej FiziYo'}
                    {isPendingReview && 'Nasi eksperci sprawdzają to ćwiczenie. Średni czas: 24h.'}
                    {isChangesRequested && 'Admin dodał uwagi. Kliknij aby zobaczyć.'}
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            {/* Notification dot - for CHANGES_REQUESTED */}
            {isChangesRequested && (
              <div className="absolute top-0 right-0 z-20 -translate-y-1 translate-x-1">
                <span className="flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-background" />
                </span>
              </div>
            )}

            {/* Actions buttons */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              {/* Add to builder button */}
              {onToggleBuilder && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-9 w-9 backdrop-blur-md transition-all duration-300 rounded-xl shadow-lg',
                    isInBuilder
                      ? 'bg-primary text-primary-foreground border-primary/50'
                      : 'bg-background/90 dark:bg-black/40 hover:bg-background dark:hover:bg-black/60 text-foreground dark:text-white border border-border/70 dark:border-white/10 hover:scale-105',
                    isBouncing && 'animate-bounce-once'
                  )}
                  onClick={handleToggleBuilder}
                  data-testid={`exercise-card-${exercise.id}-toggle-builder-btn`}
                  title={isInBuilder ? 'W zestawie' : 'Dodaj do zestawu'}
                >
                  {isInBuilder ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 bg-background/90 dark:bg-black/40 hover:bg-background dark:hover:bg-black/60 text-foreground dark:text-white backdrop-blur-sm rounded-xl border border-border/70 dark:border-white/10 shadow-lg"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && (
                    <DropdownMenuItem onClick={(event) => runMenuAction(event, () => onView(exercise))}>
                      <Eye className="mr-2 h-4 w-4" />
                      Podgląd
                    </DropdownMenuItem>
                  )}
                  {onEdit && !isReadOnly && (
                    <DropdownMenuItem onClick={(event) => runMenuAction(event, () => onEdit(exercise))}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edytuj
                    </DropdownMenuItem>
                  )}
                  {canSubmitToGlobal && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(event) => runMenuAction(event, () => onSubmitToGlobal(exercise))}
                        className="text-primary focus:text-primary"
                      >
                        <Rocket className="mr-2 h-4 w-4" />
                        Zgłoś do Bazy Globalnej
                      </DropdownMenuItem>
                    </>
                  )}
                  {onReportIssue && (
                    <DropdownMenuItem
                      onClick={(event) => runMenuAction(event, () => onReportIssue(exercise))}
                      data-testid={`exercise-card-${exercise.id}-report-btn`}
                    >
                      <Flag className="mr-2 h-4 w-4" />
                      Zgłoś do poprawki
                    </DropdownMenuItem>
                  )}
                  {isGlobalExercise && (
                    <div className="px-2 py-1.5 text-xs text-violet flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Ćwiczenie z bazy FiziYo
                    </div>
                  )}
                  {isSubmittedToGlobal && !isGlobalExercise && (
                    <div className="px-2 py-1.5 text-xs text-blue-600 flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      Zgłoszono do FiziYo
                    </div>
                  )}
                  {isPendingReview && (
                    <div className="px-2 py-1.5 text-xs text-amber-600 flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      Oczekuje na weryfikację
                    </div>
                  )}
                  {onDelete && !isReadOnly && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(event) => runMenuAction(event, () => onDelete(exercise))}
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
          <div className="flex flex-col p-4 pt-3 space-y-1 bg-card border-t border-border/50 backdrop-blur-sm">
            <h3 className="font-bold text-sm sm:text-base leading-tight line-clamp-1 text-foreground">
              {exercise.name}
            </h3>

            {/* Primary Metadata: Focus on Type & Body Parts */}
            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-muted-foreground/80 font-medium">
              {exercise.mainTags && exercise.mainTags.length > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="truncate">{exercise.mainTags.slice(0, 2).map(normalizeTagLabel).join(', ')}</span>
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
    </TooltipProvider>
  );
}
