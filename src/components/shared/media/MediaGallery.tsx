'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ExternalLink, Film, Maximize2, Play } from 'lucide-react';

import { ImageLightbox } from '@/components/shared/ImageLightbox';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { VideoEmbed } from '@/components/shared/VideoEmbed';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { MediaItem } from './mediaItems';

type MediaGalleryLayout = 'stage' | 'fill';
type MediaGalleryAspectRatio = 'video' | 'square' | 'portrait';

interface MediaGalleryProps {
  items: MediaItem[];
  title: string;
  layout?: MediaGalleryLayout;
  aspectRatio?: MediaGalleryAspectRatio;
  toolbar?: ReactNode | ((selected: MediaItem | null) => ReactNode);
  testIdPrefix: string;
  rootTestId?: string;
  className?: string;
}

const ASPECT_RATIO_CLASS: Record<MediaGalleryAspectRatio, string> = {
  video: 'aspect-video',
  square: 'aspect-square',
  portrait: 'aspect-[4/5]',
};

export function MediaGallery({
  items,
  title,
  layout = 'stage',
  aspectRatio = 'video',
  toolbar,
  testIdPrefix,
  rootTestId,
  className,
}: Readonly<MediaGalleryProps>) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const hasItems = items.length > 0;
  const safeIndex = hasItems ? Math.min(selectedIndex, items.length - 1) : 0;
  const selectedItem = hasItems ? items[safeIndex] : null;

  useEffect(() => {
    if (selectedIndex !== safeIndex) {
      setSelectedIndex(safeIndex);
    }
  }, [safeIndex, selectedIndex]);

  const hasMultiple = items.length > 1;
  const hasPrev = safeIndex > 0;
  const hasNext = safeIndex < items.length - 1;

  const imageItems = useMemo(() => items.filter((item) => item.kind === 'image'), [items]);
  const selectedImageIndex = useMemo(
    () => imageItems.findIndex((imageItem) => imageItem.src === selectedItem?.src),
    [imageItems, selectedItem?.src]
  );
  const canOpenLightbox = selectedItem?.kind === 'image' && selectedImageIndex >= 0;
  const stageBackgroundSrc =
    selectedItem?.kind === 'video' ? selectedItem.poster ?? undefined : selectedItem?.src;

  const handlePrev = useCallback(() => {
    setSelectedIndex((currentIndex) => (currentIndex > 0 ? currentIndex - 1 : currentIndex));
  }, []);

  const handleNext = useCallback(() => {
    setSelectedIndex((currentIndex) => (currentIndex < items.length - 1 ? currentIndex + 1 : currentIndex));
  }, [items.length]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrev();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      }
      if (event.key === 'Escape' && lightboxOpen) {
        event.preventDefault();
        setLightboxOpen(false);
      }
    },
    [handleNext, handlePrev, lightboxOpen]
  );

  const rootDataTestId = rootTestId ?? `${testIdPrefix}-root`;
  const stageWrapperClass =
    layout === 'fill' ? 'relative h-full min-h-0 overflow-hidden' : cn('relative overflow-hidden', ASPECT_RATIO_CLASS[aspectRatio]);

  return (
    <TooltipProvider>
    <div
      className={cn('relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/40 bg-card', className)}
      data-testid={rootDataTestId}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className={stageWrapperClass}>
        <div className="absolute inset-0 bg-muted/30" />
        {stageBackgroundSrc && (
          <div
            className="pointer-events-none absolute inset-0 scale-110 bg-cover bg-center opacity-20 blur-3xl"
            style={{ backgroundImage: `url(${stageBackgroundSrc})` }}
          />
        )}

        <div className="relative flex h-full w-full items-center justify-center">
          {!selectedItem ? (
            <ImagePlaceholder type="exercise" className="h-24 w-24 opacity-35" iconClassName="h-16 w-16" />
          ) : selectedItem.kind === 'image' || selectedItem.kind === 'gif' ? (
            <Image
              src={selectedItem.src}
              alt={selectedItem.title ?? title}
              fill
              className="object-contain"
              sizes={layout === 'fill' ? '(max-width: 1280px) 100vw, 50vw' : '(max-width: 1024px) 100vw, 800px'}
              priority={safeIndex === 0}
            />
          ) : (
            <div className="h-full w-full p-2">
              <VideoEmbed url={selectedItem.src} title={selectedItem.title ?? title} className="h-full w-full" />
            </div>
          )}
        </div>

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              disabled={!hasPrev}
              className={cn(
                'absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border/70 bg-background/85 p-2 text-foreground backdrop-blur-sm transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                hasPrev ? 'hover:bg-background' : 'cursor-not-allowed opacity-30'
              )}
              data-testid={`${testIdPrefix}-prev-btn`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!hasNext}
              className={cn(
                'absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border/70 bg-background/85 p-2 text-foreground backdrop-blur-sm transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                hasNext ? 'hover:bg-background' : 'cursor-not-allowed opacity-30'
              )}
              data-testid={`${testIdPrefix}-next-btn`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
          {typeof toolbar === 'function' ? toolbar(selectedItem) : toolbar}
          {canOpenLightbox && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className={cn(
                    'rounded-lg border border-border/70 bg-background/85 p-2 text-foreground backdrop-blur-sm transition-colors hover:bg-background',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
                  )}
                  data-testid={`${testIdPrefix}-fullscreen-btn`}
                  aria-label="Pełny ekran"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Pełny ekran</TooltipContent>
            </Tooltip>
          )}
        </div>

        {selectedItem?.kind === 'video' && (
          <div className="absolute left-3 top-3 z-20">
            <a
              href={selectedItem.src}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
              )}
              data-testid={`${testIdPrefix}-video-link`}
            >
              <ExternalLink className="h-4 w-4" />
              <span>Otwórz wideo</span>
            </a>
          </div>
        )}

        {hasMultiple && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex flex-col items-center gap-1.5 px-3">
            <div className="pointer-events-auto rounded-full border border-border/70 bg-background/85 px-3 py-1 text-xs text-foreground backdrop-blur-sm dark:bg-black/45 dark:text-white/85">
              {safeIndex + 1} / {items.length}
            </div>
            <div className="pointer-events-auto max-w-full rounded-full border border-border/70 bg-background/85 p-1.5 backdrop-blur-sm dark:bg-black/45">
              <div className="flex max-w-[min(100vw-6rem,30rem)] gap-2 overflow-x-auto px-0.5">
                {items.map((item, index) => (
                  <button
                    type="button"
                    key={`${item.kind}-${item.src}-${index}`}
                    onClick={() => setSelectedIndex(index)}
                    className={cn(
                      'group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 bg-surface',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                      index === safeIndex ? 'border-primary ring-1 ring-primary/50' : 'border-transparent hover:border-border'
                    )}
                    data-testid={`${testIdPrefix}-thumb-${index}`}
                  >
                    {item.kind === 'image' || item.kind === 'gif' ? (
                      <Image src={item.src} alt="" fill className="object-cover" sizes="56px" />
                    ) : item.poster ? (
                      <Image src={item.poster} alt="" fill className="object-cover" sizes="56px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-surface-light/50 text-muted-foreground">
                        <Film className="h-5 w-5" />
                      </div>
                    )}

                    {item.kind === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="h-4 w-4 fill-white text-white" />
                      </div>
                    )}
                    {item.kind === 'gif' && (
                      <span className="absolute bottom-1 right-1 rounded bg-background/85 px-1 text-[10px] font-semibold text-foreground dark:bg-black/50 dark:text-white/90">
                        GIF
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {canOpenLightbox && selectedImageIndex >= 0 && (
        <ImageLightbox
          src={selectedItem.src}
          alt={selectedItem.title ?? title}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          images={imageItems.map((item) => item.src)}
          currentIndex={selectedImageIndex}
          onIndexChange={(nextIndex) => {
            const nextImageSrc = imageItems[nextIndex]?.src;
            if (!nextImageSrc) {
              return;
            }

            const nextGlobalIndex = items.findIndex((item) => item.src === nextImageSrc && item.kind === 'image');
            if (nextGlobalIndex >= 0) {
              setSelectedIndex(nextGlobalIndex);
            }
          }}
        />
      )}
    </div>
    </TooltipProvider>
  );
}
