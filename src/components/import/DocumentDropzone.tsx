'use client';

import { useCallback, useState } from 'react';
import { FileUp, FileText, X, FileSpreadsheet, File } from 'lucide-react';
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
 * Komponent do uploadu dokumentów z drag & drop
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
      return `Plik za duży. Max: ${documentImportService.getMaxFileSizeMB()}MB`;
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

  // Wybrany plik
  if (file) {
    const FileIcon = getFileIcon(file);

    return (
      <div
        className={cn(
          'rounded-2xl border-2 border-primary/30 bg-primary/5 p-6',
          className
        )}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20">
            <FileIcon className="h-7 w-7 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(file.size)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            disabled={disabled}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  // Dropzone
  return (
    <div className={cn('space-y-3', className)}>
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all duration-200',
          isDragging
            ? 'border-primary bg-primary/10 scale-[1.02]'
            : 'border-border/60 bg-surface hover:border-primary/50 hover:bg-surface-light',
          disabled && 'cursor-not-allowed opacity-50',
          error && 'border-destructive/50'
        )}
      >
        <input
          type="file"
          accept={documentImportService.getSupportedFormats().join(',')}
          onChange={handleInputChange}
          disabled={disabled}
          className="absolute inset-0 cursor-pointer opacity-0"
        />

        <div
          className={cn(
            'mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors',
            isDragging ? 'bg-primary/20' : 'bg-surface-light'
          )}
        >
          <FileUp
            className={cn(
              'h-8 w-8 transition-colors',
              isDragging ? 'text-primary' : 'text-muted-foreground'
            )}
          />
        </div>

        <p className="mb-1 text-center font-medium text-foreground">
          {isDragging ? 'Upuść plik tutaj' : 'Przeciągnij plik lub kliknij'}
        </p>
        <p className="text-center text-sm text-muted-foreground">
          PDF, Excel, CSV lub TXT (max {documentImportService.getMaxFileSizeMB()}MB)
        </p>
      </label>

      {error && (
        <p className="text-center text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
