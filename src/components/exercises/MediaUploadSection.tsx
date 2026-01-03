'use client';

import { useState, useCallback } from 'react';
import {
  Upload,
  X,
  Image as ImageIcon,
  Video,
  Film,
  Link as LinkIcon,
  ExternalLink,
  Play,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface MediaUploadSectionProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  videoUrl: string;
  onVideoUrlChange: (url: string) => void;
  gifUrl: string;
  onGifUrlChange: (url: string) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

// Validate Vimeo/YouTube URL
function isValidVideoUrl(url: string): boolean {
  if (!url) return true;
  const vimeoRegex = /^(https?:\/\/)?(www\.)?(vimeo\.com\/\d+)/;
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/;
  return vimeoRegex.test(url) || youtubeRegex.test(url);
}

// Get video thumbnail
function getVideoThumbnail(url: string): string | null {
  if (!url) return null;

  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (youtubeMatch) {
    return `https://img.youtube.com/vi/${youtubeMatch[1]}/mqdefault.jpg`;
  }

  return null;
}

export function MediaUploadSection({
  files,
  onFilesChange,
  videoUrl,
  onVideoUrlChange,
  gifUrl,
  onGifUrlChange,
  maxFiles = 5,
  maxSizeMB = 10,
}: MediaUploadSectionProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) return;

      const fileArray = Array.from(newFiles);
      const validFiles: File[] = [];

      for (const file of fileArray) {
        // Check if it's an image
        if (!file.type.startsWith('image/')) {
          setError('Można dodawać tylko obrazy (JPG, PNG, GIF, WebP)');
          continue;
        }

        // Check max files
        if (files.length + validFiles.length >= maxFiles) {
          setError(`Maksymalna liczba zdjęć: ${maxFiles}`);
          break;
        }

        // Check file size
        if (file.size > maxSizeMB * 1024 * 1024) {
          setError(`Plik ${file.name} przekracza maksymalny rozmiar ${maxSizeMB}MB`);
          continue;
        }

        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        onFilesChange([...files, ...validFiles]);
        setError(null);
      }
    },
    [files, onFilesChange, maxFiles, maxSizeMB]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleRemoveFile = useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index));
    },
    [files, onFilesChange]
  );

  const videoThumbnail = getVideoThumbnail(videoUrl);
  const isVideoUrlValid = isValidVideoUrl(videoUrl);

  return (
    <div className="space-y-6">
      {/* Images Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Zdjęcia instruktażowe
          </Label>
          <span className="text-xs text-muted-foreground">
            {files.length}/{maxFiles}
          </span>
        </div>

        {/* Upload area */}
        <div
          className={cn(
            'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all cursor-pointer',
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-surface-light/50',
            files.length >= maxFiles && 'opacity-50 cursor-not-allowed'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => {
            if (files.length < maxFiles) {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.multiple = true;
              input.onchange = (e) => handleFiles((e.target as HTMLInputElement).files);
              input.click();
            }
          }}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Przeciągnij zdjęcia lub kliknij</p>
              <p className="text-sm text-muted-foreground">
                JPG, PNG, GIF lub WebP do {maxSizeMB}MB
              </p>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Preview grid */}
        {files.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="group relative aspect-video rounded-lg overflow-hidden bg-surface-light border border-border"
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(index);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {index === 0 && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded">
                    Główne
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Pierwsze zdjęcie będzie wyświetlane jako miniatura ćwiczenia
          </p>
        )}
      </div>

      {/* Video URL */}
      <div className="space-y-3 pt-4 border-t border-border">
        <Label className="text-base font-medium flex items-center gap-2">
          <Video className="h-4 w-4" />
          Film instruktażowy
        </Label>

        <div className="space-y-2">
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={videoUrl}
              onChange={(e) => onVideoUrlChange(e.target.value)}
              placeholder="https://vimeo.com/... lub https://youtube.com/..."
              className="pl-9"
            />
          </div>
          {videoUrl && !isVideoUrlValid && (
            <p className="text-sm text-destructive">Podaj prawidłowy link do Vimeo lub YouTube</p>
          )}
          {videoUrl && isVideoUrlValid && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-light border border-border">
              {videoThumbnail ? (
                <img
                  src={videoThumbnail}
                  alt="Video thumbnail"
                  className="w-24 h-16 object-cover rounded"
                />
              ) : (
                <div className="w-24 h-16 bg-surface rounded flex items-center justify-center">
                  <Play className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Film instruktażowy</p>
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Otwórz w nowym oknie
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onVideoUrlChange('')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* GIF URL */}
      <div className="space-y-3 pt-4 border-t border-border">
        <Label className="text-base font-medium flex items-center gap-2">
          <Film className="h-4 w-4" />
          Animacja GIF
          <span className="text-xs font-normal text-muted-foreground">(opcjonalnie)</span>
        </Label>

        <div className="space-y-2">
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={gifUrl}
              onChange={(e) => onGifUrlChange(e.target.value)}
              placeholder="https://example.com/animation.gif"
              className="pl-9"
            />
          </div>
          {gifUrl && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-light border border-border">
              <img
                src={gifUrl}
                alt="GIF preview"
                className="w-24 h-16 object-cover rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '';
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Animacja GIF</p>
                <p className="text-xs text-muted-foreground truncate">{gifUrl}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onGifUrlChange('')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


