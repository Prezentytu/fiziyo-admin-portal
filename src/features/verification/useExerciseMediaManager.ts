import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useExerciseImageGeneration } from '@/features/exercises/useExerciseImageGeneration';
import { getMediaUrls } from '@/utils/mediaUrl';
import type { AdminExercise } from '@/graphql/types/adminExercise.types';
import type { ImageStyle } from '@/types/ai.types';

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface UseExerciseMediaManagerOptions {
  exercise: AdminExercise;
  disabled?: boolean;
  onUploadImage?: (file: File) => Promise<void>;
  onDeleteImage?: (imageUrl: string) => Promise<void>;
}

export function useExerciseMediaManager({
  exercise,
  disabled = false,
  onUploadImage,
  onDeleteImage,
}: Readonly<UseExerciseMediaManagerOptions>) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    generate,
    isGenerating,
    imageStyle,
    setImageStyle,
  } = useExerciseImageGeneration({
    showSuccessToast: false,
  });

  const existingImages = useMemo(
    () => getMediaUrls([exercise.thumbnailUrl, exercise.imageUrl, ...(exercise.images ?? [])]),
    [exercise.thumbnailUrl, exercise.imageUrl, exercise.images]
  );

  const remainingSlots = Math.max(0, MAX_IMAGES - existingImages.length);
  const canManageMedia = Boolean(onUploadImage && onDeleteImage);

  const openFilePicker = () => {
    if (!canManageMedia || disabled || isUploading || remainingSlots === 0) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!canManageMedia || !fileList || disabled || !onUploadImage) {
      return;
    }

    const incomingFiles = Array.from(fileList);
    const acceptedFiles: File[] = [];

    for (const file of incomingFiles) {
      if (!file.type.startsWith('image/')) {
        toast.error(`Plik ${file.name} nie jest obrazem`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Plik ${file.name} przekracza limit 10MB`);
        continue;
      }

      if (acceptedFiles.length >= remainingSlots) {
        toast.error(`Maksymalna liczba zdjęć to ${MAX_IMAGES}`);
        break;
      }

      acceptedFiles.push(file);
    }

    if (acceptedFiles.length === 0) {
      return;
    }

    setIsUploading(true);
    try {
      for (const file of acceptedFiles) {
        await onUploadImage(file);
      }
      toast.success(`Dodano ${acceptedFiles.length} zdjęć`);
    } catch (error) {
      console.error('Błąd uploadu zdjęcia w weryfikacji:', error);
      toast.error('Nie udało się dodać wszystkich zdjęć');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const generateAiImage = useCallback(async () => {
    if (!canManageMedia || disabled || !onUploadImage) {
      return;
    }

    if (existingImages.length >= MAX_IMAGES) {
      toast.error(`Maksymalna liczba zdjęć to ${MAX_IMAGES}`);
      return;
    }

    const description = [exercise.patientDescription, exercise.description].filter(Boolean).join(' ');
    const generatedFile = await generate({
      exerciseName: exercise.name,
      exerciseDescription: description,
      exerciseType: exercise.type?.toLowerCase() === 'time' ? 'time' : 'reps',
      style: imageStyle,
    });

    if (!generatedFile) {
      return;
    }

    try {
      await onUploadImage(generatedFile);
      toast.success('Obraz AI został dodany');
    } catch (error) {
      console.error('Błąd uploadu obrazu AI w weryfikacji:', error);
      toast.error('Nie udało się dodać obrazu AI');
    }
  }, [
    canManageMedia,
    disabled,
    onUploadImage,
    existingImages.length,
    exercise.patientDescription,
    exercise.description,
    exercise.name,
    exercise.type,
    generate,
    imageStyle,
  ]);

  const deleteImage = async (imageUrl: string) => {
    if (!canManageMedia || disabled || !onDeleteImage) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteImage(imageUrl);
      toast.success('Zdjęcie usunięte');
    } catch (error) {
      console.error('Błąd usuwania zdjęcia w weryfikacji:', error);
      toast.error('Nie udało się usunąć zdjęcia');
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    fileInputRef,
    existingImages,
    remainingSlots,
    canManageMedia,
    isUploading,
    isGenerating,
    isDeleting,
    imageStyle,
    setImageStyle: setImageStyle as (style: ImageStyle) => void,
    openFilePicker,
    handleUploadFiles,
    generateAiImage,
    deleteImage,
  };
}
