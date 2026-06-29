'use client';

import { useMemo } from 'react';
import { Sparkles, Trash2, Upload } from 'lucide-react';

import { MediaGallery, buildMediaItems } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { AdminExercise } from '@/graphql/types/adminExercise.types';
import type { MediaItem } from '@/components/shared/media/mediaItems';
import { useExerciseMediaManager } from './useExerciseMediaManager';

interface MasterVideoPlayerProps {
  exercise: AdminExercise;
  disabled?: boolean;
  onUploadImage?: (file: File) => Promise<void>;
  onDeleteImage?: (imageUrl: string) => Promise<void>;
  className?: string;
}

export function MasterVideoPlayer({
  exercise,
  disabled = false,
  onUploadImage,
  onDeleteImage,
  className,
}: MasterVideoPlayerProps) {
  const {
    fileInputRef,
    existingImages,
    remainingSlots,
    canManageMedia,
    isUploading,
    isGenerating,
    isDeleting,
    openFilePicker,
    handleUploadFiles,
    generateAiImage,
    deleteImage,
  } = useExerciseMediaManager({
    exercise,
    disabled,
    onUploadImage,
    onDeleteImage,
  });

  const mediaItems = useMemo(
    () =>
      buildMediaItems({
        thumbnailUrl: exercise.thumbnailUrl,
        imageUrl: exercise.imageUrl,
        images: exercise.images,
        videoUrl: exercise.videoUrl,
        gifUrl: exercise.gifUrl,
        title: exercise.name,
      }),
    [exercise.thumbnailUrl, exercise.imageUrl, exercise.images, exercise.videoUrl, exercise.gifUrl, exercise.name]
  );

  const renderToolbar = (selected: MediaItem | null) => {
    if (!canManageMedia) return null;
    const selectedImageUrl =
      selected?.kind === 'image' || selected?.kind === 'gif'
        ? (existingImages.includes(selected.src) ? selected.src : null)
        : null;

    return (
      <TooltipProvider>
        <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-background/85 p-1 backdrop-blur-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={openFilePicker}
                disabled={disabled || isUploading || remainingSlots === 0}
                className="h-8 w-8"
                aria-label="Dodaj zdjęcia"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {remainingSlots === 0 ? 'Osiągnięto limit zdjęć' : 'Dodaj zdjęcia'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => void generateAiImage()}
                disabled={disabled || isGenerating || remainingSlots === 0}
                className="h-8 w-8"
                aria-label="Generuj zdjęcie AI"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {remainingSlots === 0 ? 'Osiągnięto limit zdjęć' : 'Generuj zdjęcie AI'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => selectedImageUrl && void deleteImage(selectedImageUrl)}
                disabled={disabled || isDeleting || !selectedImageUrl}
                className="h-8 w-8 text-destructive hover:text-destructive"
                aria-label="Usuń bieżące zdjęcie"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {!selectedImageUrl ? 'Zaznacz zdjęcie, aby usunąć' : 'Usuń bieżące zdjęcie'}
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => void handleUploadFiles(event.target.files)}
      />

      <MediaGallery
        items={mediaItems}
        title={exercise.name}
        layout="fill"
        rootTestId="master-video-player"
        testIdPrefix="master-player"
        className={cn('h-full', className)}
        toolbar={renderToolbar}
      />
    </>
  );
}
