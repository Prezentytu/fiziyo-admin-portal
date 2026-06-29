'use client';

import { useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Sparkles, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { ExerciseImageFrame } from '@/components/shared/exercise';
import { Button } from '@/components/ui/button';
import { aiService } from '@/services/aiService';
import { getMediaUrls } from '@/utils/mediaUrl';
import type { AdminExercise } from '@/graphql/types/adminExercise.types';

interface VerificationImageManagerProps {
  exercise: AdminExercise;
  disabled?: boolean;
  onUploadImage: (file: File) => Promise<void>;
  onDeleteImage: (imageUrl: string) => Promise<void>;
}

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function VerificationImageManager({
  exercise,
  disabled = false,
  onUploadImage,
  onDeleteImage,
}: Readonly<VerificationImageManagerProps>) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const existingImages = useMemo(
    () => getMediaUrls([exercise.thumbnailUrl, exercise.imageUrl, ...(exercise.images ?? [])]),
    [exercise.thumbnailUrl, exercise.imageUrl, exercise.images]
  );

  const remainingSlots = Math.max(0, MAX_IMAGES - existingImages.length);

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || disabled) {
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

  const handleGenerateAiImage = async () => {
    if (disabled) {
      return;
    }
    if (existingImages.length >= MAX_IMAGES) {
      toast.error(`Maksymalna liczba zdjęć to ${MAX_IMAGES}`);
      return;
    }

    setIsGenerating(true);
    try {
      const description = [exercise.patientDescription, exercise.description].filter(Boolean).join(' ');
      const generated = await aiService.generateExerciseImage(
        exercise.name,
        description,
        exercise.type?.toLowerCase() === 'time' ? 'time' : 'reps',
        'illustration'
      );

      if (!generated?.file) {
        toast.error('Nie udało się wygenerować obrazu');
        return;
      }

      await onUploadImage(generated.file);
      toast.success('Obraz AI został dodany');
    } catch (error) {
      console.error('Błąd generowania obrazu AI w weryfikacji:', error);
      toast.error('Nie udało się wygenerować obrazu');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (imageUrl: string) => {
    if (disabled) {
      return;
    }
    try {
      await onDeleteImage(imageUrl);
      toast.success('Zdjęcie usunięte');
    } catch (error) {
      console.error('Błąd usuwania zdjęcia w weryfikacji:', error);
      toast.error('Nie udało się usunąć zdjęcia');
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-card/50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Zdjęcia ćwiczenia</p>
        <span className="text-xs text-muted-foreground">
          {existingImages.length}/{MAX_IMAGES}
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => void handleUploadFiles(event.target.files)}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || isUploading || remainingSlots === 0}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-1 h-3.5 w-3.5" />
          Dodaj zdjęcia
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || isGenerating || remainingSlots === 0}
          onClick={() => void handleGenerateAiImage()}
        >
          <Sparkles className="mr-1 h-3.5 w-3.5" />
          Generuj AI
        </Button>
      </div>

      {existingImages.length === 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
          Brak zdjęć. Dodaj ręcznie lub wygeneruj AI.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {existingImages.map((imageUrl, index) => (
            <div key={`${imageUrl}-${index}`} className="group relative">
              <ExerciseImageFrame src={imageUrl} alt={`${exercise.name} ${index + 1}`} className="h-24 border border-border/50" />
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute right-1 top-1 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                disabled={disabled}
                onClick={() => void handleDelete(imageUrl)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
