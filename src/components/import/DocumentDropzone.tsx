'use client';

import { useCallback, useState } from 'react';
import { FileUp, FileText, X, FileSpreadsheet, File, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { documentImportService } from '@/services/documentImportService';

interface DocumentDropzoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Dropzone do uploadu dokumentów - prosty, czytelny
 * Duża strefa, wyraźna ikona, jasne instrukcje
 */
export function DocumentDropzone({
  file,
  onFileSelect,
  disabled = false,
  className,
}: DocumentDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback((f: File): string | null => {
    if (!documentImportService.isFormatSupported(f)) {
      return `Nieobsługiwany format. Obsługiwane: ${documentImportService
        .getSupportedFormats()
        .join(', ')}`;
    }
    if (!documentImportService.isFileSizeValid(f)) {
      return `Plik za duży. Maksymalny rozmiar: ${documentImportService.getMaxFileSizeMB()}MB`;
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (f: File) => {
      const validationError = validateFile(f);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      onFileSelect(f);
    },
    [validateFile, onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
      // Reset input
      e.target.value = '';
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    onFileSelect(null);
    setError(null);
  }, [onFileSelect]);

  const getFileIcon = (f: File) => {
    const ext = f.name.toLowerCase().split('.').pop();
    if (ext === 'pdf') return FileText;
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) return FileSpreadsheet;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Wybrany plik - pokazujemy czytelnie
  if (file) {
    const FileIcon = getFileIcon(file);

    return (
      <div
        className={cn(
          'rounded-2xl border-2 border-primary/40 bg-primary/5 p-6',
          className
        )}
      >
        <div className="flex items-center gap-4">
          {/* Duża ikona pliku */}
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/20">
            <FileIcon className="h-8 w-8 text-primary" />
          </div>

          {/* Informacje o pliku */}
          <div className="min-w-0 flex-1">
            <p className="text-lg font-medium text-foreground truncate">
              {file.name}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {formatFileSize(file.size)}
            </p>
          </div>

          {/* Przyciski */}
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={disabled}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Zmień plik
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemove}
              disabled={disabled}
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Dropzone - duża, czytelna
  return (
    <div className={cn('space-y-3', className)}>
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 transition-all duration-200',
          'min-h-[200px] p-8',
          isDragging
            ? 'border-primary border-solid bg-primary/10'
            : 'border-border border-dashed hover:border-primary/50 hover:bg-surface-light',
          disabled && 'cursor-not-allowed opacity-50',
          error && 'border-destructive/50'
        )}
        data-testid="import-dropzone"
      >
        <input
          type="file"
          accept={documentImportService.getSupportedFormats().join(',')}
          onChange={handleInputChange}
          disabled={disabled}
          className="absolute inset-0 cursor-pointer opacity-0"
        />

        {/* Duża ikona */}
        <div
          className={cn(
            'mb-5 flex h-20 w-20 items-center justify-center rounded-2xl transition-colors duration-200',
            isDragging ? 'bg-primary/20' : 'bg-surface-light'
          )}
        >
          <FileUp
            className={cn(
              'h-10 w-10 transition-colors duration-200',
              isDragging ? 'text-primary' : 'text-muted-foreground'
            )}
          />
        </div>

        {/* Tekst - jasny, czytelny */}
        <p className="mb-2 text-center text-lg font-medium text-foreground">
          {isDragging ? 'Upuść plik tutaj' : 'Przeciągnij plik tutaj'}
        </p>
        <p className="text-center text-base text-muted-foreground mb-4">
          lub kliknij aby wybrać z komputera
        </p>

        {/* Obsługiwane formaty */}
        <p className="text-center text-sm text-muted-foreground">
          PDF, Excel, CSV lub TXT (max {documentImportService.getMaxFileSizeMB()}MB)
        </p>
      </label>

      {/* Błąd - czytelny */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
          <X className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
