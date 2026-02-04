"use client";

import { useState, useCallback, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight,
  Clock,
  StickyNote,
  Settings2,
  GripVertical,
  Trash2,
  ChevronUp
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getMediaUrl } from "@/utils/mediaUrl";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
import { parseLoad, formatLoad, hasLoad, getLoadBadgeColor, getLoadBadgeLabel } from "@/utils/loadParser";
import {
  calculateEstimatedTime,
  formatEstimatedTime,
  shouldShowSideBadge
} from "@/utils/exerciseTime";
import type { ExerciseMapping, ExerciseOverride } from "./types";

// --- GHOST INPUT (Czysta liczba - Linear Style) ---
interface GhostInputProps {
  value: number | undefined;
  onChange: (value: number) => void;
  label: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

function GhostInput({
  value,
  onChange,
  label,
  suffix = "",
  min = 0,
  max = 999,
  step = 1,
  disabled = false
}: GhostInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      onChange(min);
      return;
    }
    const parsed = Number.parseInt(val, 10);
    if (!Number.isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
    }
  };

  const increment = () => {
    if (disabled) return;
    const newVal = Math.min(max, (value || 0) + step);
    onChange(newVal);
  };

  const decrement = () => {
    if (disabled) return;
    const newVal = Math.max(min, (value || 0) - step);
    onChange(newVal);
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 group">
      <div className="flex items-center gap-0.5">
        {/* Decrement */}
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || (value || 0) <= min}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-light/50 text-muted-foreground hover:text-foreground hover:bg-surface-light active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="text-xl font-medium">−</span>
        </button>

        {/* Input */}
        <div className="relative mx-1">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className={cn(
              "w-14 h-10 bg-surface-light/80 rounded-lg text-center font-bold text-xl text-foreground",
              "placeholder-muted-foreground/30 outline-none border-2 border-transparent",
              "hover:border-border/50 focus:border-primary focus:bg-surface",
              "transition-all tabular-nums",
              disabled && "opacity-40 cursor-not-allowed"
            )}
            value={value ?? ""}
            onChange={handleChange}
            placeholder="-"
            disabled={disabled}
          />
          {suffix && value !== undefined && (
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/60 font-medium pointer-events-none">
              {suffix}
            </span>
          )}
        </div>

        {/* Increment */}
        <button
          type="button"
          onClick={increment}
          disabled={disabled || (value || 0) >= max}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-light/50 text-muted-foreground hover:text-foreground hover:bg-surface-light active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="text-xl font-medium">+</span>
        </button>
      </div>
      <span className="text-[10px] uppercase font-semibold text-muted-foreground/50 tracking-wider mt-2 group-hover:text-muted-foreground transition-colors">
        {label}
      </span>
    </div>
  );
}

// --- EXERCISE ROW PROPS ---
interface ExerciseRowProps {
  mapping: ExerciseMapping;
  index: number;
  override?: ExerciseOverride;
  onOverrideChange: (mappingId: string, updates: Partial<ExerciseOverride>) => void;
  onRemove?: () => void;
  isMultiPatient?: boolean;
  readOnly?: boolean;
  autoExpand?: boolean;
}

/**
 * ExerciseRow - Two-Floor Card Design (Apple Wallet Style)
 *
 * PIĘTRO 1 (Header): Nazwa (2 linie), Miniatura, Czas, Akcje
 * PIĘTRO 2 (Control Deck): Serie × Powt × Czas - pełna szerokość
 */
export function ExerciseRow({
  mapping,
  index,
  override,
  onOverrideChange,
  onRemove,
  isMultiPatient = false,
  readOnly = false,
  autoExpand = false,
}: ExerciseRowProps) {
  const [isExpanded, setIsExpanded] = useState(autoExpand);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const exercise = mapping.exercise;

  // Drag & Drop setup
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: mapping.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Compute effective values - mapping has priority (updated directly via ghost copy)
  const effectiveValues = useMemo(() => ({
    sets: mapping.sets ?? override?.sets ?? exercise?.defaultSets ?? 3,
    reps: mapping.reps ?? override?.reps ?? exercise?.defaultReps ?? 10,
    duration: mapping.duration ?? override?.duration ?? exercise?.defaultDuration,
    restSets: mapping.restSets ?? override?.restSets ?? exercise?.defaultRestBetweenSets ?? 60,
    tempo: mapping.tempo ?? override?.tempo ?? exercise?.tempo ?? "",
    load: mapping.load ?? override?.load ?? exercise?.defaultLoad,
    notes: mapping.notes ?? override?.notes ?? "",
    executionTime: mapping.executionTime ?? override?.executionTime ?? exercise?.defaultExecutionTime,
    side: exercise?.side ?? "none",
  }), [override, mapping, exercise]);

  // Czy pokazywać kolumnę CZAS (Izometria/Hybryda)?
  const exerciseType = exercise?.type?.toLowerCase();
  const isTimeBased = exerciseType === "time";
  const showDurationColumn = !isTimeBased && effectiveValues.executionTime && effectiveValues.executionTime > 0;

  // Auto Czas - kalkulacja szacowanego czasu
  const estimatedTime = useMemo(() => {
    return calculateEstimatedTime({
      sets: effectiveValues.sets,
      reps: effectiveValues.reps,
      // Duration tylko dla ćwiczeń time-based, dla rep-based używamy executionTime
      duration: isTimeBased ? effectiveValues.duration : undefined,
      executionTime: effectiveValues.executionTime,
      rest: effectiveValues.restSets,
    });
  }, [effectiveValues, isTimeBased]);

  // Check if user has modified any fields (override exists)
  const hasProTuneData = useMemo(() => ({
    // Only show indicators when user has actually changed something (override exists)
    hasLoadValue: override?.load !== undefined && hasLoad(override.load),
    hasCustomRest: override?.restSets !== undefined,
    hasNotes: override?.notes !== undefined && Boolean(override.notes?.trim()),
    hasSide: shouldShowSideBadge(effectiveValues.side),
  }), [override, effectiveValues.side]);

  // Handle field updates
  const handleFieldChange = useCallback((field: keyof ExerciseOverride, value: unknown) => {
    onOverrideChange(mapping.id, { [field]: value });
  }, [mapping.id, onOverrideChange]);

  // Handle load input blur
  const handleLoadBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const parsed = parseLoad(e.target.value);
    handleFieldChange("load", parsed);
  }, [handleFieldChange]);

  // Get display values
  const imageUrl = getMediaUrl(
    exercise?.thumbnailUrl || exercise?.imageUrl || exercise?.images?.[0]
  );

  const exerciseName = mapping.customName || exercise?.name || "Ćwiczenie";
  const isDisabled = readOnly || isMultiPatient;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl overflow-hidden transition-all duration-200",
        "bg-surface border border-border/60",
        "hover:border-border/80 hover:shadow-lg hover:shadow-black/5",
        isExpanded && "border-primary/30",
        isDragging && "opacity-50 shadow-2xl scale-[1.02] z-50"
      )}
      data-testid={`exercise-row-${mapping.id}`}
    >
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* PIĘTRO 1: HEADER (Tożsamość)                                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-start p-3 gap-3 border-b border-border/30">
        {/* Grip Handle */}
        <button
          type="button"
          className={cn(
            "flex items-center justify-center w-5 h-5 mt-1 rounded transition-colors shrink-0",
            "text-muted-foreground/30 hover:text-muted-foreground",
            "cursor-grab active:cursor-grabbing focus:outline-none"
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Thumbnail */}
        <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-surface-light border border-border/50">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlaceholder type="exercise" iconClassName="h-4 w-4" />
          )}
        </div>

        {/* Name & Meta */}
        <div className="flex-1 min-w-0 pt-0.5">
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <p className="font-medium text-foreground text-sm leading-tight line-clamp-2 cursor-default pr-2">
                {exerciseName}
              </p>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="font-medium">{exerciseName}</p>
            </TooltipContent>
          </Tooltip>

          {/* Meta badges */}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatEstimatedTime(estimatedTime)}
            </span>

            {hasProTuneData.hasLoadValue && (
              <span className={cn("text-[10px] font-medium", getLoadBadgeColor(effectiveValues.load))}>
                {getLoadBadgeLabel(effectiveValues.load)}
              </span>
            )}

            {hasProTuneData.hasNotes && (
              <StickyNote className="h-3 w-3 text-muted-foreground/40" />
            )}
          </div>
        </div>

        {/* Actions (przyklejone do prawej góry) */}
        <div className="flex items-center gap-0.5 shrink-0">
          {!isMultiPatient && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "relative p-1.5 rounded-md transition-all",
                isExpanded
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground/40 hover:text-foreground hover:bg-surface-light"
              )}
              title={isExpanded ? "Zwiń" : "Więcej opcji"}
              data-testid={`exercise-row-toggle-${mapping.id}`}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <Settings2 className="h-4 w-4" />
              )}
              {!isExpanded && (hasProTuneData.hasLoadValue || hasProTuneData.hasNotes || hasProTuneData.hasCustomRest) && (
                <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          )}

          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"
              title="Usuń"
              data-testid={`exercise-row-remove-${mapping.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* PIĘTRO 2: CONTROL DECK (Dawkowanie - Matematyka)               */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="bg-surface-light/20 px-3 py-3 flex items-center justify-center">
        {/* KOLUMNA 1: SERIE */}
        <GhostInput
          value={effectiveValues.sets}
          onChange={(val) => handleFieldChange("sets", val)}
          label="Serie"
          min={1}
          max={20}
          disabled={isDisabled}
        />

        {/* KOLUMNA 2: POWTÓRZENIA lub CZAS (dla time-based) */}
        {isTimeBased ? (
          <GhostInput
            value={effectiveValues.duration || 30}
            onChange={(val) => handleFieldChange("duration", val)}
            label="Czas"
            suffix="s"
            min={1}
            max={600}
            step={1}
            disabled={isDisabled}
          />
        ) : (
          <GhostInput
            value={effectiveValues.reps}
            onChange={(val) => handleFieldChange("reps", val)}
            label="Powt."
            min={1}
            max={100}
            disabled={isDisabled}
          />
        )}

        {/* KOLUMNA 3: CZAS WYKONANIA POWTÓRZENIA */}
        {showDurationColumn && (
          <GhostInput
            value={effectiveValues.executionTime}
            onChange={(val) => handleFieldChange("executionTime", val)}
            label="Czas"
            suffix="s"
            min={1}
            max={300}
            step={1}
            disabled={isDisabled}
          />
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SZUFLADA (Opcje zaawansowane)                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {isExpanded && !isMultiPatient && (
        <div className="px-4 pb-4 pt-3 border-t border-border/30 bg-surface">
          <div className="grid grid-cols-2 gap-4">
            {/* Przerwa */}
            <div>
              <label className="text-[10px] uppercase text-muted-foreground/60 font-bold tracking-wide mb-1.5 block">
                Przerwa po serii (s)
              </label>
              <Input
                type="number"
                value={effectiveValues.restSets}
                onChange={(e) => handleFieldChange("restSets", Number(e.target.value))}
                className="bg-surface-light border-border/50 focus:border-primary h-9"
                disabled={readOnly}
              />
            </div>

            {/* Obciążenie */}
            <div>
              <label className="text-[10px] uppercase text-muted-foreground/60 font-bold tracking-wide mb-1.5 block">
                Obciążenie
              </label>
              <Input
                placeholder="np. 5kg"
                defaultValue={formatLoad(effectiveValues.load)}
                onBlur={handleLoadBlur}
                className="bg-surface-light border-border/50 focus:border-primary h-9"
                disabled={readOnly}
                data-testid={`exercise-row-load-${mapping.id}`}
              />
            </div>

            {/* Notatka */}
            <div className="col-span-2">
              <label className="text-[10px] uppercase text-muted-foreground/60 font-bold tracking-wide mb-1.5 block">
                Notatka dla pacjenta
              </label>
              <Textarea
                placeholder="Instrukcje, wskazówki..."
                value={effectiveValues.notes}
                onChange={(e) => handleFieldChange("notes", e.target.value)}
                className="bg-surface-light border-border/50 focus:border-primary min-h-[60px] resize-none"
                disabled={readOnly}
                data-testid={`exercise-row-notes-${mapping.id}`}
              />
            </div>
          </div>

          {/* Więcej opcji */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  showMoreOptions && "rotate-90"
                )}
              />
              Zaawansowane
            </button>

            {showMoreOptions && (
              <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-border/20">
                {/* Tempo */}
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground/60 font-bold tracking-wide mb-1.5 block">
                    Tempo
                  </label>
                  <Input
                    placeholder="np. 3-1-2-0"
                    value={effectiveValues.tempo}
                    onChange={(e) => handleFieldChange("tempo", e.target.value)}
                    className="bg-surface-light border-border/50 h-9"
                    disabled={readOnly}
                    data-testid={`exercise-row-tempo-${mapping.id}`}
                  />
                </div>

                {/* Strona */}
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground/60 font-bold tracking-wide mb-1.5 block">
                    Strona ciała
                  </label>
                  <Select
                    value={effectiveValues.side.toLowerCase()}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="h-9 bg-surface-light border-border/50">
                      <SelectValue placeholder="Wybierz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Obustronne</SelectItem>
                      <SelectItem value="both">Obie po kolei</SelectItem>
                      <SelectItem value="left">Tylko lewa</SelectItem>
                      <SelectItem value="right">Tylko prawa</SelectItem>
                      <SelectItem value="alternating">Naprzemiennie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Multi-Patient Info */}
      {isMultiPatient && (
        <div className="px-3 pb-2 bg-surface-light/10">
          <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Edycja niedostępna przy grupowym przypisywaniu
          </p>
        </div>
      )}
    </div>
  );
}
