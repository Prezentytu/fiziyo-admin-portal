'use client';

import { useMemo, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExerciseExecutionCard, fromExerciseMapping } from '@/components/shared/exercise';
import type { ExerciseExecutionCardData } from '@/components/shared/exercise';
import type { ExerciseMapping, ExerciseOverride } from './types';

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

function cardPatchToOverride(patch: Partial<ExerciseExecutionCardData>): Partial<ExerciseOverride> {
  const out: Partial<ExerciseOverride> = {};
  if ('sets' in patch) out.sets = patch.sets;
  if ('reps' in patch) out.reps = patch.reps;
  if ('duration' in patch) out.duration = patch.duration;
  if ('executionTime' in patch) out.executionTime = patch.executionTime;
  if ('restSets' in patch) out.restSets = patch.restSets;
  if ('restReps' in patch) out.restReps = patch.restReps;
  if ('preparationTime' in patch) out.preparationTime = patch.preparationTime;
  if ('tempo' in patch) out.tempo = patch.tempo;
  if ('notes' in patch) out.notes = patch.notes;
  if ('customName' in patch) out.customName = patch.customName;
  if ('loadKg' in patch) {
    if (patch.loadKg == null || Number.isNaN(patch.loadKg)) {
      out.load = { type: 'other', text: '' };
    } else {
      out.load = { type: 'weight', value: patch.loadKg, unit: 'kg', text: `${patch.loadKg} kg` };
    }
  }
  return out;
}

function getReadOnlyReason(isMultiPatient: boolean, readOnly: boolean): string | undefined {
  if (isMultiPatient) return 'Edycja niedostępna przy grupowym przypisywaniu';
  if (readOnly) return 'Edycja wyłączona';
  return undefined;
}

/**
 * ExerciseRow - sortable row that delegates to ExerciseExecutionCard.
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: mapping.id,
  });

  const cardData = useMemo(
    () => fromExerciseMapping(mapping, override),
    [mapping, override]
  );

  const handleChange = useCallback(
    (patch: Partial<ExerciseExecutionCardData>) => {
      onOverrideChange(mapping.id, cardPatchToOverride(patch));
    },
    [mapping.id, onOverrideChange]
  );

  const readOnlyReason = getReadOnlyReason(isMultiPatient, readOnly);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'group relative transition-all duration-200',
        isDragging && 'opacity-50 shadow-2xl scale-[1.02] z-50'
      )}
      data-testid={`exercise-row-${mapping.id}`}
    >
      <ExerciseExecutionCard
        mode="edit"
        exercise={cardData}
        defaultExpanded={autoExpand}
        onChange={handleChange}
        onRemove={onRemove}
        dragHandle={
          <button
            type="button"
            className={cn(
              'flex items-center justify-center w-5 h-5 rounded transition-colors shrink-0',
              'text-muted-foreground/30 hover:text-muted-foreground',
              'cursor-grab active:cursor-grabbing focus:outline-none'
            )}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        }
        index={index + 1}
        readOnlyReason={readOnlyReason}
        testIdPrefix="exercise-row"
      />
    </div>
  );
}
