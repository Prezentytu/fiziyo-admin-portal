'use client';

import type { ChangeEvent, RefObject } from 'react';
import Image from 'next/image';
import { Loader2, Sparkles, Trash2, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ImageStyle } from '@/types/ai.types';
import { ImageStylePicker } from './ImageStylePicker';
import { MAX_EXERCISE_IMAGES, imageLimitHint } from './utils/exerciseMedia';

interface ExerciseDetailMediaEditorProps {
  images: readonly string[];
  uploading: boolean;
  generating: boolean;
  /** Bez nazwy ćwiczenia AI nie ma z czego wygenerować obrazu. */
  canGenerate: boolean;
  imageStyle: ImageStyle;
  onImageStyleChange: (style: ImageStyle) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDelete: (imageUrl: string) => void;
  onGenerate: () => void;
}

/** „Zarządzaj zdjęciami” w edycji szczegółów ćwiczenia: miniatury z usuwaniem, dodanie i generowanie AI. */
export function ExerciseDetailMediaEditor({
  images,
  uploading,
  generating,
  canGenerate,
  imageStyle,
  onImageStyleChange,
  fileInputRef,
  onFileChange,
  onDelete,
  onGenerate,
}: ExerciseDetailMediaEditorProps) {
  const isFull = images.length >= MAX_EXERCISE_IMAGES;
  const limitHint = imageLimitHint(images.length);

  return (
    <div
      className="rounded-2xl border border-border/40 bg-surface/50 p-4 space-y-3"
      data-testid="exercise-detail-media-edit-section"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Zarządzaj zdjęciami</p>
        <span className="text-xs tabular-nums text-muted-foreground" data-testid="exercise-detail-image-count">
          {images.length}/{MAX_EXERCISE_IMAGES}
        </span>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((imageUrl) => (
            <div
              key={imageUrl}
              className="relative group aspect-square rounded-lg overflow-hidden border border-border/40"
            >
              <Image src={imageUrl} alt="" fill className="object-cover" sizes="80px" />
              <button
                data-testid="exercise-detail-delete-image-btn"
                type="button"
                onClick={() => onDelete(imageUrl)}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/50"
                aria-label="Usuń zdjęcie"
              >
                {/* Przy pełnej galerii kosz widać od razu w rogu: usunięcie to jedyna droga do nowego zdjęcia. */}
                <span
                  className={cn(
                    'flex items-center justify-center transition-opacity',
                    isFull
                      ? 'absolute right-1 top-1 h-6 w-6 rounded-full bg-black/60 group-hover:static group-hover:h-auto group-hover:w-auto group-hover:bg-transparent'
                      : 'opacity-0 group-hover:opacity-100'
                  )}
                >
                  <Trash2 className="h-4 w-4 text-white" />
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      {generating && (
        <div
          className="mb-3 aspect-video w-full max-w-[220px] animate-pulse rounded-xl border border-dashed border-border bg-muted/40"
          aria-hidden
          data-testid="exercise-detail-ai-image-skeleton"
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          data-testid="exercise-detail-upload-image-btn"
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || generating || isFull}
        >
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Dodaj zdjęcie
        </Button>
        <ImageStylePicker
          value={imageStyle}
          onChange={onImageStyleChange}
          disabled={generating || uploading}
          testIdPrefix="exercise-detail-ai-style"
        />
        <Button
          data-testid="exercise-detail-ai-image-btn"
          size="sm"
          variant="outline"
          onClick={onGenerate}
          disabled={uploading || generating || !canGenerate || isFull}
          aria-busy={generating}
          aria-describedby={limitHint ? 'exercise-detail-image-limit-hint' : undefined}
        >
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {generating ? 'Generowanie…' : 'Generuj AI'}
        </Button>
      </div>

      {limitHint && (
        <p
          id="exercise-detail-image-limit-hint"
          className="text-xs text-muted-foreground"
          data-testid="exercise-detail-image-limit-hint"
        >
          {limitHint}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
        data-testid="exercise-detail-image-file-input"
      />
    </div>
  );
}
