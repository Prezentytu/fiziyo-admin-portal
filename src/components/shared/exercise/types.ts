import type { ReactNode } from 'react';

/**
 * Unified UI model for ExerciseExecutionCard.
 * Use adapters to map from ExerciseMapping, BuilderExercise, etc.
 */
export interface ExerciseExecutionCardData {
  id: string;
  displayName: string;
  /** Primary image for thumbnail (single URL). */
  thumbnailUrl?: string;
  /** Full list of image URLs for gallery/lightbox (thumbnail first, then rest). */
  imageUrls?: string[];
  /** Optional video URL displayed in exercise preview. */
  videoUrl?: string;
  /** Main dosage */
  sets: number;
  reps: number;
  /** Duration per set in seconds (display mode in patient app). */
  duration?: number;
  /** Repetition duration in seconds. If > 0, app shows timer for patient. */
  executionTime?: number;
  restSets?: number;
  restReps?: number;
  /** Preparation time in seconds before exercise. */
  preparationTime?: number;
  tempo?: string;
  /** Load value in kg (FiziYo uses kg only in UI). */
  loadKg?: number;
  loadDisplayText?: string;
  notes?: string;
  patientDescription?: string;
  clinicalDescription?: string;
  audioCue?: string;
  rangeOfMotion?: string;
  difficultyLevel?: string;
  mainTags?: string[];
  additionalTags?: string[];
  customName?: string;
  customDescription?: string;
  /** Side: none | left | right | both | alternating */
  side?: string;
  /** When true, second primary column shows duration (s) instead of repetitions. */
  isTimeBased?: boolean;
}

export type EditableField =
  | 'sets'
  | 'reps'
  | 'duration'
  | 'executionTime'
  | 'restSets'
  | 'restReps'
  | 'preparationTime'
  | 'tempo'
  | 'loadKg'
  | 'notes'
  | 'customName'
  | 'customDescription'
  | 'side';

export interface ExerciseExecutionCardProps {
  mode: 'view' | 'edit';
  exercise: ExerciseExecutionCardData;
  /** View mode presentation: compact values on right or readable labeled values under title */
  viewVariant?: 'compact' | 'readable';
  /** Hide timer hint in title area (view mode) */
  hideTimerBadge?: boolean;
  /** In edit mode, which fields are editable. Omit or empty = all editable. */
  editableFields?: EditableField[];
  /** Current expanded state when controlled */
  expanded?: boolean;
  /** Initial expanded when uncontrolled */
  defaultExpanded?: boolean;
  onExpand?: (expanded: boolean) => void;
  onChange?: (patch: Partial<ExerciseExecutionCardData>) => void;
  onSave?: () => void;
  onRemove?: () => void;
  /** Optional: show preview icon on thumbnail and call on click */
  onPreview?: () => void;
  /** Optional: opens full read-only details dialog */
  onOpenDetails?: () => void;
  /** Optional slot: drag handle (e.g. for sortable list) */
  dragHandle?: ReactNode;
  /** Optional index badge (e.g. "1") */
  index?: number;
  /** Reason for read-only (e.g. "Edycja niedostępna przy grupowym przypisywaniu") */
  readOnlyReason?: string;
  className?: string;
  /** For data-testid: card will use exercise-execution-card-{id} */
  testIdPrefix?: string;
  /** Layout variant: sidebar = wąski panel (Kreator Zestawu), domyślny = dialogi/szerokie layouty */
  layoutVariant?: 'default' | 'sidebar';
}

/**
 * Business rule: exercise uses timer in patient app when executionTime > 0.
 * Used for badge/tooltip in UI.
 */
export function isTimerExercise(data: { executionTime?: number }): boolean {
  return (data.executionTime ?? 0) > 0;
}

/**
 * Whether a field is editable given mode and editableFields list.
 */
export function isFieldEditable(
  field: EditableField,
  mode: 'view' | 'edit',
  editableFields?: EditableField[]
): boolean {
  if (mode === 'view') return false;
  if (!editableFields || editableFields.length === 0) return true;
  return editableFields.includes(field);
}
