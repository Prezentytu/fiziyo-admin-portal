'use client';

import { useMemo, useCallback, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BuilderExercise } from '@/contexts/ExerciseBuilderContext';
import { ImageLightbox } from '@/components/shared/ImageLightbox';
import { ExerciseExecutionCard, fromBuilderExercise, buildExerciseImageUrls } from '@/components/shared/exercise';
import type { ExerciseExecutionCardData } from '@/components/shared/exercise';

interface BuilderExerciseItemProps {
  exercise: BuilderExercise;
  onUpdate: (updates: Partial<BuilderExercise>) => void;
  onRemove: () => void;
}

export function BuilderExerciseItem({ exercise, onUpdate, onRemove }: BuilderExerciseItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: exercise.id });
  const [previewOpen, setPreviewOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cardData = useMemo(
    () =>
      fromBuilderExercise(
        {
          id: exercise.id,
          name: exercise.name,
          type: exercise.type,
          thumbnailUrl: exercise.thumbnailUrl,
          imageUrl: exercise.imageUrl,
          images: exercise.images,
        },
        {
          sets: exercise.sets,
          reps: exercise.reps,
          duration: exercise.duration,
        }
      ),
    [exercise]
  );

  const handleChange = useCallback(
    (patch: Partial<ExerciseExecutionCardData>) => {
      const updates: Partial<BuilderExercise> = {};
      if (patch.sets !== undefined) updates.sets = patch.sets;
      if (patch.reps !== undefined) updates.reps = patch.reps;
      if (patch.duration !== undefined) updates.duration = patch.duration;
      if (Object.keys(updates).length > 0) onUpdate(updates);
    },
    [onUpdate]
  );
  const galleryImages = useMemo(
    () =>
      buildExerciseImageUrls({
        thumbnailUrl: exercise.thumbnailUrl,
        imageUrl: exercise.imageUrl,
        images: exercise.images,
      }),
    [exercise.thumbnailUrl, exercise.imageUrl, exercise.images]
  );

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        data-testid={`builder-exercise-item-${exercise.id}`}
        className={cn(
          'min-w-0 transition-all duration-200',
          isDragging && 'opacity-70 shadow-lg z-50'
        )}
      >
        <ExerciseExecutionCard
          mode="edit"
          exercise={cardData}
          onChange={handleChange}
          onRemove={onRemove}
          onPreview={galleryImages.length > 0 ? () => setPreviewOpen(true) : undefined}
          dragHandle={
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab touch-none text-muted-foreground/40 hover:text-foreground transition-colors shrink-0 flex items-center justify-center h-10 w-10"
              data-testid={`builder-exercise-item-${exercise.id}-drag-handle`}
              type="button"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          }
          layoutVariant="sidebar"
          testIdPrefix="builder-exercise-item"
        />
      </div>
      {galleryImages.length > 0 && (
        <ImageLightbox
          src={galleryImages[0]}
          alt={exercise.name}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          images={galleryImages}
        />
      )}
    </>
  );
}
