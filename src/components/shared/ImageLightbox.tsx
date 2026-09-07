'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images?: string[];
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
}

export function ImageLightbox({
  src,
  alt = '',
  open,
  onOpenChange,
  images,
  currentIndex = 0,
  onIndexChange,
}: ImageLightboxProps) {
  const [internalIndex, setInternalIndex] = useState(currentIndex);

  // Use external or internal index
  const activeIndex = onIndexChange ? currentIndex : internalIndex;
  const setActiveIndex = onIndexChange || setInternalIndex;

  // Get current image from gallery or single src
  const allImages = images && images.length > 0 ? images : [src];
  const currentImage = allImages[activeIndex] || src;
  const hasMultiple = allImages.length > 1;

  // Reset index when opening
  useEffect(() => {
    if (open) {
      setInternalIndex(currentIndex);
    }
  }, [open, currentIndex]);

  // Navigate to previous image
  const goToPrevious = useCallback(() => {
    const newIndex = activeIndex > 0 ? activeIndex - 1 : allImages.length - 1;
    setActiveIndex(newIndex);
  }, [activeIndex, allImages.length, setActiveIndex]);

  // Navigate to next image
  const goToNext = useCallback(() => {
    const newIndex = activeIndex < allImages.length - 1 ? activeIndex + 1 : 0;
    setActiveIndex(newIndex);
  }, [activeIndex, allImages.length, setActiveIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasMultiple) {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'ArrowRight' && hasMultiple) {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, hasMultiple, goToPrevious, goToNext]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-background/95 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />

        {/* Content */}
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
          onClick={() => onOpenChange(false)}
        >
          {/* Close button */}
          <DialogPrimitive.Close
            className={cn(
              'absolute top-4 right-4 z-10',
              'flex h-10 w-10 items-center justify-center rounded-full',
              'bg-foreground/50 text-background/80 backdrop-blur-sm',
              'transition-all hover:bg-foreground/70 hover:text-background hover:scale-110',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
            )}
            aria-label="Zamknij podgląd"
            data-testid="common-lightbox-close-btn"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Zamknij</span>
          </DialogPrimitive.Close>

          {/* Previous button */}
          {hasMultiple && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className={cn(
                'absolute left-4 z-10',
                'flex h-12 w-12 items-center justify-center rounded-full',
                'bg-foreground/50 text-background/80 backdrop-blur-sm',
                'transition-all hover:bg-foreground/70 hover:text-background hover:scale-110',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
              )}
              data-testid="common-lightbox-prev-btn"
              aria-label="Poprzednie zdjęcie"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Image container */}
          <div
            className="relative w-[90vw] h-[90vh] max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image src={currentImage} alt={alt} fill className="object-contain rounded-lg shadow-2xl" sizes="90vw" />
          </div>

          {/* Next button */}
          {hasMultiple && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className={cn(
                'absolute right-4 z-10',
                'flex h-12 w-12 items-center justify-center rounded-full',
                'bg-foreground/50 text-background/80 backdrop-blur-sm',
                'transition-all hover:bg-foreground/70 hover:text-background hover:scale-110',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
              )}
              data-testid="common-lightbox-next-btn"
              aria-label="Następne zdjęcie"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Dots indicator */}
          {hasMultiple && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {allImages.map((_, index) => (
                <button
                  data-testid="imagelightbox-button-175"
                  key={index}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIndex(index);
                  }}
                  className={cn(
                    'h-2 w-2 rounded-full transition-all',
                    index === activeIndex
                      ? 'bg-primary-foreground w-4'
                      : 'bg-primary-foreground/40 hover:bg-primary-foreground/60'
                  )}
                  aria-label={`Przejdź do zdjęcia ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Image counter */}
          {hasMultiple && (
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-foreground/50 backdrop-blur-sm text-background/80 text-sm">
              {activeIndex + 1} / {allImages.length}
            </div>
          )}

          {/* Hidden title for accessibility */}
          <DialogPrimitive.Title className="sr-only">Podgląd zdjęcia{alt ? `: ${alt}` : ''}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {hasMultiple
              ? `Zdjęcie ${activeIndex + 1} z ${allImages.length}. Użyj strzałek do nawigacji.`
              : 'Kliknij poza zdjęciem lub naciśnij ESC aby zamknąć.'}
          </DialogPrimitive.Description>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
