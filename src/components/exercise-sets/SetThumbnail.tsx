'use client';

import { Dumbbell } from 'lucide-react';

interface ExerciseMapping {
  exercise?: {
    imageUrl?: string;
    images?: string[];
  };
}

interface SetThumbnailProps {
  exerciseMappings?: ExerciseMapping[];
  size?: 'sm' | 'md';
  className?: string;
}

export function SetThumbnail({ exerciseMappings, size = 'sm', className = '' }: SetThumbnailProps) {
  const images = exerciseMappings
    ?.slice(0, 4)
    .map((m) => m.exercise?.imageUrl || m.exercise?.images?.[0])
    .filter(Boolean) as string[];

  const gridSize = size === 'sm' ? 'h-11 w-11' : 'h-16 w-16';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  if (!images || images.length === 0) {
    return (
      <div
        className={`${gridSize} flex items-center justify-center rounded-xl bg-gradient-to-br from-secondary/80 to-teal-600/80 shadow-sm ${className}`}
      >
        <Dumbbell className="h-5 w-5 text-white" />
      </div>
    );
  }

  return (
    <div
      className={`${gridSize} grid grid-cols-2 gap-px rounded-xl overflow-hidden bg-surface-light shrink-0 ${className}`}
    >
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="relative overflow-hidden">
          {images[i] ? (
            <img src={images[i]} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-surface flex items-center justify-center">
              <Dumbbell className={`${iconSize} text-muted-foreground/40`} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}







