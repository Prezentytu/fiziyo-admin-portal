"use client";

import * as React from "react";
import { Upload, X, Image, Film, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
  value?: File[];
  onChange?: (files: File[]) => void;
  onRemove?: (index: number) => void;
  className?: string;
  disabled?: boolean;
  preview?: boolean;
}

export function FileUpload({
  accept = "image/*,video/*",
  multiple = false,
  maxFiles = 5,
  maxSizeMB = 10,
  value = [],
  onChange,
  onRemove,
  className,
  disabled = false,
  preview = true,
}: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    
    for (const file of fileArray) {
      // Check max files
      if (value.length + validFiles.length >= maxFiles) {
        setError(`Maksymalna liczba plików: ${maxFiles}`);
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
      onChange?.(multiple ? [...value, ...validFiles] : [validFiles[0]]);
      setError(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (!disabled) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input value so same file can be selected again
    e.target.value = "";
  };

  const handleRemove = (index: number) => {
    onRemove?.(index);
    onChange?.(value.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return Image;
    if (file.type.startsWith("video/")) return Film;
    return FileIcon;
  };

  const getFilePreview = (file: File) => {
    if (file.type.startsWith("image/")) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 transition-colors",
          dragActive && "border-primary bg-primary/5",
          disabled && "cursor-not-allowed opacity-50",
          !disabled && "cursor-pointer hover:border-primary/50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />
        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="mb-1 text-sm font-medium">
          Przeciągnij pliki lub kliknij, aby wybrać
        </p>
        <p className="text-xs text-muted-foreground">
          Maksymalnie {maxFiles} plików, do {maxSizeMB}MB każdy
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {preview && value.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {value.map((file, index) => {
            const Icon = getFileIcon(file);
            const previewUrl = getFilePreview(file);

            return (
              <div
                key={`${file.name}-${index}`}
                className="relative flex items-center gap-2 rounded-lg border border-border bg-surface p-2"
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-surface-light">
                    <Icon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}







