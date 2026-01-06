'use client';

import { useCallback, useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
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
            'fixed inset-0 z-50 bg-black/95 backdrop-blur-sm',
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
              'bg-black/50 text-white/80 backdrop-blur-sm',
              'transition-all hover:bg-black/70 hover:text-white hover:scale-110',
              'focus:outline-none focus:ring-2 focus:ring-white/20'
            )}
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
                'bg-black/50 text-white/80 backdrop-blur-sm',
                'transition-all hover:bg-black/70 hover:text-white hover:scale-110',
                'focus:outline-none focus:ring-2 focus:ring-white/20'
              )}
              aria-label="Poprzednie zdjęcie"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Image container */}
          <div
            className="relative max-h-[90vh] max-w-[90vw] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentImage}
              alt={alt}
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            />
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
                'bg-black/50 text-white/80 backdrop-blur-sm',
                'transition-all hover:bg-black/70 hover:text-white hover:scale-110',
                'focus:outline-none focus:ring-2 focus:ring-white/20'
              )}
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
                  key={index}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIndex(index);
                  }}
                  className={cn(
                    'h-2 w-2 rounded-full transition-all',
                    index === activeIndex
                      ? 'bg-white w-4'
                      : 'bg-white/40 hover:bg-white/60'
                  )}
                  aria-label={`Przejdź do zdjęcia ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Image counter */}
          {hasMultiple && (
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white/80 text-sm">
              {activeIndex + 1} / {allImages.length}
            </div>
          )}

          {/* Hidden title for accessibility */}
          <DialogPrimitive.Title className="sr-only">
            Podgląd zdjęcia{alt ? `: ${alt}` : ''}
          </DialogPrimitive.Title>
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

// Helper component for clickable image with zoom icon
interface ClickableImageProps {
  src: string;
  alt?: string;
  className?: string;
  containerClassName?: string;
  images?: string[];
  currentIndex?: number;
  showZoomIcon?: boolean;
  onClick?: () => void;
}

export function ClickableImage({
  src,
  alt = '',
  className,
  containerClassName,
  images,
  currentIndex = 0,
  showZoomIcon = true,
  onClick,
}: ClickableImageProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(currentIndex);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else {
      setActiveIndex(currentIndex);
      setLightboxOpen(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'group relative overflow-hidden cursor-zoom-in',
          containerClassName
        )}
      >
        <img
          src={src}
          alt={alt}
          className={cn('transition-transform duration-300', className)}
        />
        {showZoomIcon && (
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              'bg-black/0 group-hover:bg-black/30 transition-colors duration-200'
            )}
          >
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                'bg-black/60 text-white opacity-0 group-hover:opacity-100',
                'transform scale-90 group-hover:scale-100',
                'transition-all duration-200'
              )}
            >
              <ZoomIn className="h-5 w-5" />
            </div>
          </div>
        )}
      </button>

      {!onClick && (
        <ImageLightbox
          src={src}
          alt={alt}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          images={images}
          currentIndex={activeIndex}
          onIndexChange={setActiveIndex}
        />
      )}
    </>
  );
}
