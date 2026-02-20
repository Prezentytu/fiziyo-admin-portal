'use client';

import { useState, useCallback, useMemo } from 'react';
import { Clock, Settings2, ChevronUp, ChevronDown, X, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LabeledStepper } from '@/components/shared/LabeledStepper';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { ImageLightbox } from '@/components/shared/ImageLightbox';
import { getMediaUrl } from '@/utils/mediaUrl';
import { cn } from '@/lib/utils';
import {
  type ExerciseExecutionCardProps,
  type EditableField,
  isTimerExercise,
  isFieldEditable,
} from './types';

const SIDE_OPTIONS = [
  { value: 'none', label: 'Bez podziału' },
  { value: 'both', label: 'Obie strony' },
  { value: 'left', label: 'Lewa strona' },
  { value: 'right', label: 'Prawa strona' },
  { value: 'alternating', label: 'Naprzemiennie' },
] as const;

export function ExerciseExecutionCard({
  mode,
  exercise,
  viewVariant = 'compact',
  hideTimerBadge = false,
  editableFields,
  expanded: controlledExpanded,
  defaultExpanded = false,
  onExpand,
  onChange,
  onRemove,
  onPreview,
  dragHandle,
  readOnlyReason,
  className,
  testIdPrefix = 'exercise-execution-card',
}: Readonly<ExerciseExecutionCardProps>) {
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(defaultExpanded);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [internalPreviewOpen, setInternalPreviewOpen] = useState(false);

  const isExpanded = controlledExpanded ?? uncontrolledExpanded;
  const setExpanded = useCallback(
    (value: boolean) => {
      if (onExpand) onExpand(value);
      else setUncontrolledExpanded(value);
    },
    [onExpand]
  );

  const canEdit = mode === 'edit' && !readOnlyReason;
  const showTimerBadge = isTimerExercise(exercise);
  const shouldShowTimerBadge = showTimerBadge && !hideTimerBadge;
  const showReadableView = mode === 'view' && viewVariant === 'readable';
  const id = exercise.id;
  const testId = `${testIdPrefix}-${id}`;
  const imageUrl = getMediaUrl(exercise.thumbnailUrl ?? exercise.imageUrls?.[0]);
  const galleryImages = useMemo(() => {
    if (exercise.imageUrls && exercise.imageUrls.length > 0) return exercise.imageUrls;
    return imageUrl ? [imageUrl] : [];
  }, [exercise.imageUrls, imageUrl]);
  const hasGallery = galleryImages.length > 0;

  const canEditField = (field: EditableField) => canEdit && isFieldEditable(field, mode, editableFields);
  const handlePreviewTrigger = useCallback(() => {
    if (!hasGallery) return;
    if (onPreview) {
      onPreview();
      return;
    }
    setInternalPreviewOpen(true);
  }, [hasGallery, onPreview]);

  const handleChange = useCallback(
    (patch: Partial<typeof exercise>) => {
      onChange?.(patch);
    },
    [onChange]
  );

  return (
    <Collapsible open={isExpanded} onOpenChange={setExpanded}>
      {/*
        @container on the card — container queries let the card self-adapt:
        < 460px  → 2-row (narrow sidebar)
        ≥ 460px  → 1-row (dialogs, wide builders)
      */}
      <div
        className={cn(
          '@container w-full overflow-hidden rounded-xl border border-border bg-surface transition-colors',
          mode === 'edit' && 'hover:border-border/80',
          isExpanded && 'border-primary/30 bg-surface/95',
          className
        )}
        data-testid={testId}
      >
        {/* ── EDIT MODE ── */}
        {mode === 'edit' && (
          <div className="w-full p-4 flex flex-col @[460px]:flex-row gap-3 @[460px]:gap-2 @[460px]:items-center">

            {/* Info section: CSS Grid (1fr name = hard-bounded, truncate guaranteed) */}
            <div
              className="grid items-center gap-2 @[460px]:flex-1 @[460px]:min-w-0"
              style={{ gridTemplateColumns: dragHandle ? 'auto auto 1fr' : 'auto 1fr' }}
            >
              {dragHandle && <div className="shrink-0">{dragHandle}</div>}
              <button
                type="button"
                className={cn(
                  'h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-light border border-border/60 relative group/thumb',
                  hasGallery ? 'cursor-pointer' : 'cursor-default'
                )}
                onClick={handlePreviewTrigger}
                disabled={!hasGallery}
                aria-label={hasGallery ? 'Otwórz galerię ćwiczenia' : 'Miniatura ćwiczenia'}
                data-testid={hasGallery ? `${testId}-thumbnail-btn` : undefined}
              >
                {imageUrl ? (
                  <>
                    <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    {hasGallery && (
                      <div
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
                        data-testid={`${testId}-preview-btn`}
                      >
                        <Eye className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <ImagePlaceholder type="exercise" iconClassName="h-4 w-4" />
                    {hasGallery && (
                      <div
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
                        data-testid={`${testId}-preview-btn`}
                      >
                        <Eye className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </>
                )}
              </button>
              <div className="min-w-0 overflow-hidden">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p
                        className="font-medium text-sm text-foreground truncate"
                        data-testid={`${testId}-name`}
                      >
                        {exercise.displayName}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs max-w-[300px] wrap-break-word">
                      {exercise.displayName}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {shouldShowTimerBadge && (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-primary font-medium">
                          <Clock className="h-3 w-3" />
                          Timer ({exercise.executionTime}s)
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-[220px]">
                        Dla pacjenta w aplikacji mobilnej zostanie uruchomiony timer na czas jednego powtórzenia.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>

            {/* Controls: steppers + actions — always flex-row, aligned by h-8 controls top */}
            <div className="flex items-start gap-3 shrink-0">
              {/* h-8 clip: only control row participates in vertical alignment, label overflows below */}
              <div className="h-8 overflow-visible shrink-0">
                <LabeledStepper
                  value={exercise.sets}
                  onChange={(v) => handleChange({ sets: v })}
                  label="SERIE"
                  min={1}
                  max={20}
                  disabled={!canEditField('sets')}
                />
              </div>
              <div className="h-8 overflow-visible shrink-0">
                <LabeledStepper
                  value={exercise.reps}
                  onChange={(v) => handleChange({ reps: v })}
                  label="POWT."
                  min={1}
                  max={100}
                  disabled={!canEditField('reps')}
                />
              </div>
              <div className="flex items-center gap-1 @[460px]:ml-0 ml-auto">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-surface-light transition-colors data-[state=open]:bg-primary/10 data-[state=open]:text-primary cursor-pointer"
                    title={isExpanded ? 'Zwiń' : 'Więcej opcji'}
                    data-testid={`${testId}-expand-btn`}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <Settings2 className="h-4 w-4" />
                    )}
                  </button>
                </CollapsibleTrigger>
                {onRemove && (
                  <button
                    type="button"
                    onClick={onRemove}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    title="Usuń"
                    data-testid={`${testId}-remove-btn`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW & READABLE MODE: single-row layout ── */}
        {mode === 'view' && (
          <div
            className={cn(
              'w-full p-4',
              showReadableView ? 'flex flex-row items-center gap-3' : 'flex flex-row items-center justify-between'
            )}
          >
            {/* Left: CSS Grid — 1fr ensures name is bounded regardless of container */}
            <div
              className="grid items-center gap-3 flex-1 min-w-0"
              style={{ gridTemplateColumns: dragHandle ? 'auto auto 1fr' : 'auto 1fr' }}
            >
              {dragHandle && <div className="shrink-0">{dragHandle}</div>}
              <button
                type="button"
                className={cn(
                  'h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-light border border-border/60 relative group/thumb',
                  hasGallery ? 'cursor-pointer' : 'cursor-default'
                )}
                onClick={handlePreviewTrigger}
                disabled={!hasGallery}
                aria-label={hasGallery ? 'Otwórz galerię ćwiczenia' : 'Miniatura ćwiczenia'}
                data-testid={hasGallery ? `${testId}-thumbnail-btn` : undefined}
              >
                {imageUrl ? (
                  <>
                    <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    {hasGallery && (
                      <div
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
                        data-testid={`${testId}-preview-btn`}
                      >
                        <Eye className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <ImagePlaceholder type="exercise" iconClassName="h-4 w-4" />
                    {hasGallery && (
                      <div
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
                        data-testid={`${testId}-preview-btn`}
                      >
                        <Eye className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p
                        className={cn(
                          'font-medium text-sm text-foreground',
                          showReadableView ? 'leading-snug whitespace-normal wrap-break-word' : 'truncate'
                        )}
                        data-testid={`${testId}-name`}
                      >
                        {exercise.displayName}
                      </p>
                    </TooltipTrigger>
                    {!showReadableView && (
                      <TooltipContent side="top" className="text-xs max-w-[300px] wrap-break-word">
                        {exercise.displayName}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                {showReadableView ? (
                  <p className="mt-1 text-xs text-muted-foreground whitespace-normal wrap-break-word">
                    {exercise.sets} serie • {exercise.reps} powt.
                    {exercise.executionTime != null && exercise.executionTime > 0
                      ? ` • Czas powtórzenia: ${exercise.executionTime}s`
                      : ''}
                  </p>
                ) : shouldShowTimerBadge ? (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-primary font-medium">
                          <Clock className="h-3 w-3" />
                          Timer ({exercise.executionTime}s)
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-[220px]">
                        Dla pacjenta w aplikacji mobilnej zostanie uruchomiony timer na czas jednego powtórzenia.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : null}
              </div>
            </div>
            {/* Right: dosage summary */}
            {viewVariant === 'compact' && (
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground tabular-nums shrink-0 ml-3">
                <span>{exercise.sets}×</span>
                <span>{exercise.reps}</span>
                {shouldShowTimerBadge && exercise.executionTime != null && (
                  <span className="text-primary">×{exercise.executionTime}s</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Expanded panel (edit only) - below main row, border-t */}
        {mode === 'edit' && (
          <CollapsibleContent>
            <div className="w-full border-t border-border bg-surface/50 p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor={`${testId}-execution-time-input`}
                    className="text-[10px] uppercase text-muted-foreground/60 font-bold tracking-wide mb-1.5 block"
                  >
                    Czas powtórzenia (s)
                  </label>
                  <Input
                    id={`${testId}-execution-time-input`}
                    type="number"
                    min={0}
                    max={300}
                    value={exercise.executionTime ?? ''}
                    onChange={(e) =>
                      handleChange({
                        executionTime: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="h-9 bg-surface-light border-border/50 focus:border-primary"
                    disabled={!canEditField('executionTime')}
                    data-testid={`${testId}-execution-time-input`}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`${testId}-rest-sets-input`}
                    className="text-[10px] uppercase text-muted-foreground/60 font-bold tracking-wide mb-1.5 block"
                  >
                    Przerwa między seriami (s)
                  </label>
                  <Input
                    id={`${testId}-rest-sets-input`}
                    type="number"
                    value={exercise.restSets ?? ''}
                    onChange={(e) =>
                      handleChange({ restSets: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="h-9 bg-surface-light border-border/50 focus:border-primary"
                    disabled={!canEditField('restSets')}
                    data-testid={`${testId}-rest-sets-input`}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`${testId}-load-input`}
                    className="text-[10px] uppercase text-muted-foreground/60 font-bold tracking-wide mb-1.5 block"
                  >
                    Obciążenie (kg)
                  </label>
                  <Input
                    id={`${testId}-load-input`}
                    type="number"
                    placeholder="np. 5"
                    value={exercise.loadKg ?? ''}
                    onChange={(e) =>
                      handleChange({
                        loadKg: e.target.value ? Number(e.target.value) : undefined,
                        loadDisplayText: e.target.value ? `${e.target.value} kg` : undefined,
                      })
                    }
                    className="h-9 bg-surface-light border-border/50 focus:border-primary"
                    disabled={!canEditField('loadKg')}
                    data-testid={`${testId}-load-input`}
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor={`${testId}-notes-input`}
                  className="text-[10px] uppercase text-muted-foreground/60 font-bold tracking-wide mb-1.5 block"
                >
                  Notatka dla pacjenta
                </label>
                <Textarea
                  id={`${testId}-notes-input`}
                  placeholder="Instrukcje, wskazówki..."
                  value={exercise.notes ?? ''}
                  onChange={(e) => handleChange({ notes: e.target.value })}
                  className="min-h-[60px] resize-none bg-surface-light border-border/50 focus:border-primary"
                  disabled={!canEditField('notes')}
                  data-testid={`${testId}-notes-input`}
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
                  data-testid={`${testId}-advanced-toggle`}
                >
                  {showAdvanced ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  Zaawansowane
                </button>
                {showAdvanced && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-border/20">
                    <div>
                      <label
                        htmlFor={`${testId}-rest-reps-input`}
                        className="text-[10px] uppercase text-muted-foreground/60 font-bold tracking-wide mb-1.5 block"
                      >
                        Przerwa między powt. (s)
                      </label>
                      <Input
                        id={`${testId}-rest-reps-input`}
                        type="number"
                        min={0}
                        max={60}
                        value={exercise.restReps ?? ''}
                        onChange={(e) =>
                          handleChange({ restReps: e.target.value ? Number(e.target.value) : undefined })
                        }
                        className="h-9 bg-surface-light border-border/50"
                        disabled={!canEditField('restReps')}
                        data-testid={`${testId}-rest-reps-input`}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`${testId}-preparation-time-input`}
                        className="text-[10px] uppercase text-muted-foreground/60 font-bold tracking-wide mb-1.5 block"
                      >
                        Czas przygotowania (s)
                      </label>
                      <Input
                        id={`${testId}-preparation-time-input`}
                        type="number"
                        min={0}
                        max={120}
                        value={exercise.preparationTime ?? ''}
                        onChange={(e) =>
                          handleChange({
                            preparationTime: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        className="h-9 bg-surface-light border-border/50"
                        disabled={!canEditField('preparationTime')}
                        data-testid={`${testId}-preparation-time-input`}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`${testId}-tempo-input`}
                        className="text-[10px] uppercase text-muted-foreground/60 font-bold tracking-wide mb-1.5 block"
                      >
                        Tempo
                      </label>
                      <Input
                        id={`${testId}-tempo-input`}
                        placeholder="np. 2-1-2-0"
                        value={exercise.tempo ?? ''}
                        onChange={(e) => handleChange({ tempo: e.target.value })}
                        className="h-9 bg-surface-light border-border/50"
                        disabled={!canEditField('tempo')}
                        data-testid={`${testId}-tempo-input`}
                      />
                    </div>
                    <div>
                      <span
                        id={`${testId}-side-label`}
                        className="text-[10px] uppercase text-muted-foreground/60 font-bold tracking-wide mb-1.5 block"
                      >
                        Strona ciała
                      </span>
                      <Select
                        value={(exercise.side ?? 'none').toLowerCase()}
                        onValueChange={(v) => handleChange({ side: v })}
                        disabled={!canEditField('side')}
                      >
                        <SelectTrigger className="h-9 bg-surface-light border-border/50" aria-labelledby={`${testId}-side-label`}>
                          <SelectValue placeholder="Wybierz" />
                        </SelectTrigger>
                        <SelectContent>
                          {SIDE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <label
                        htmlFor={`${testId}-custom-name-input`}
                        className="text-[10px] uppercase text-muted-foreground/60 font-bold tracking-wide mb-1.5 block"
                      >
                        Własna nazwa
                      </label>
                      <Input
                        id={`${testId}-custom-name-input`}
                        placeholder="Nadpisz nazwę dla pacjenta"
                        value={exercise.customName ?? ''}
                        onChange={(e) => handleChange({ customName: e.target.value })}
                        className="h-9 bg-surface-light border-border/50"
                        disabled={!canEditField('customName')}
                        data-testid={`${testId}-custom-name-input`}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label
                        htmlFor={`${testId}-custom-description-input`}
                        className="text-[10px] uppercase text-muted-foreground/60 font-bold tracking-wide mb-1.5 block"
                      >
                        Własny opis
                      </label>
                      <Textarea
                        id={`${testId}-custom-description-input`}
                        placeholder="Opis dla pacjenta (opcjonalnie)"
                        value={exercise.customDescription ?? ''}
                        onChange={(e) => handleChange({ customDescription: e.target.value })}
                        className="min-h-[60px] resize-none bg-surface-light border-border/50"
                        disabled={!canEditField('customDescription')}
                        data-testid={`${testId}-custom-description-input`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleContent>
        )}

        {readOnlyReason && (
          <div className="px-3 pb-2 pt-1 bg-surface-light/10 border-t border-border/30">
            <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              {readOnlyReason}
            </p>
          </div>
        )}

        {!onPreview && hasGallery && (
          <ImageLightbox
            src={galleryImages[0]}
            alt={exercise.displayName}
            open={internalPreviewOpen}
            onOpenChange={setInternalPreviewOpen}
            images={galleryImages}
          />
        )}
      </div>
    </Collapsible>
  );
}
