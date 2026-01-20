"use client";

import { useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  ZoomIn,
  Smartphone,
  Maximize2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
import { ImageLightbox } from "@/components/shared/ImageLightbox";
import { cn } from "@/lib/utils";
import { getMediaUrl, getMediaUrls } from "@/utils/mediaUrl";
import type { AdminExercise } from "@/graphql/types/adminExercise.types";

interface MasterVideoPlayerProps {
  exercise: AdminExercise;
  className?: string;
}

/**
 * MasterVideoPlayer - Pełnoekranowy player wideo/obrazu
 * 
 * Filozofia "Zero Scroll":
 * - Maksymalizacja przestrzeni na media źródłowe (Master View)
 * - Toggle "Preview Mobile" nakłada maskę telefonu (opcjonalnie)
 * - Ekspert widzi detale anatomiczne bez przeszkód
 * 
 * Features:
 * - Responsywny player (100% wysokości kontenera)
 * - Lightbox do pełnoekranowego podglądu
 * - Kompaktowe miniatury na dole
 * - Kontrolki video inline
 */
export function MasterVideoPlayer({ exercise, className }: MasterVideoPlayerProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // Collect all media
  const allImages = getMediaUrls([
    exercise.thumbnailUrl,
    exercise.imageUrl,
    ...(exercise.images || []),
  ]);
  const currentImage = allImages[selectedImageIndex] || null;
  const hasVideo = !!exercise.videoUrl;
  const hasGif = !!exercise.gifUrl;
  const gifUrl = getMediaUrl(exercise.gifUrl);

  // Navigation
  const hasPrev = selectedImageIndex > 0;
  const hasNext = selectedImageIndex < allImages.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) setSelectedImageIndex((i) => i - 1);
  }, [hasPrev]);

  const handleNext = useCallback(() => {
    if (hasNext) setSelectedImageIndex((i) => i + 1);
  }, [hasNext]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape" && lightboxOpen) setLightboxOpen(false);
    },
    [handlePrev, handleNext, lightboxOpen]
  );

  return (
    <TooltipProvider>
      <div
        className={cn(
          "relative flex flex-col h-full bg-zinc-950",
          className
        )}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        data-testid="master-video-player"
      >
        {/* Main Media Area */}
        <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden">
          {/* Mobile Preview Overlay */}
          {showMobilePreview && (
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
              {/* Phone frame SVG mask */}
              <div className="relative w-[280px] h-[560px]">
                <div className="absolute inset-0 bg-zinc-900 rounded-[2.5rem] shadow-2xl border-4 border-zinc-800">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-zinc-900 rounded-b-2xl" />
                  {/* Screen area */}
                  <div className="absolute inset-3 rounded-[2rem] overflow-hidden bg-black/80">
                    <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-center">
                      <span className="text-[10px] text-white/50">FiziYo App Preview</span>
                    </div>
                  </div>
                  {/* Home indicator */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full" />
                </div>
              </div>
              {/* Darken outside frame */}
              <div className="absolute inset-0 bg-black/60" style={{ 
                clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, calc(50% - 140px) calc(50% - 280px), calc(50% - 140px) calc(50% + 280px), calc(50% + 140px) calc(50% + 280px), calc(50% + 140px) calc(50% - 280px), calc(50% - 140px) calc(50% - 280px))' 
              }} />
            </div>
          )}

          {/* Blurred background for aesthetics */}
          {currentImage && (
            <div
              className="absolute inset-0 bg-cover bg-center blur-3xl opacity-20 scale-110"
              style={{ backgroundImage: `url(${currentImage})` }}
            />
          )}

          {/* Main Image/Video */}
          {currentImage ? (
            <img
              src={currentImage}
              alt={exercise.name}
              className={cn(
                "relative max-h-full max-w-full object-contain transition-all duration-300",
                showMobilePreview && "scale-[0.6]"
              )}
              loading="eager"
            />
          ) : hasGif && gifUrl ? (
            <img
              src={gifUrl}
              alt={exercise.name}
              className="relative max-h-full max-w-full object-contain"
            />
          ) : (
            <ImagePlaceholder
              type="exercise"
              className="h-64 w-64"
              iconClassName="h-20 w-20"
            />
          )}

          {/* Navigation arrows (if multiple images) */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                disabled={!hasPrev}
                className={cn(
                  "absolute left-2 top-1/2 -translate-y-1/2 z-20",
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  "bg-black/50 text-white/80 backdrop-blur-sm",
                  "transition-all hover:bg-black/70 hover:scale-110",
                  !hasPrev && "opacity-30 cursor-not-allowed"
                )}
                data-testid="master-player-prev-btn"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={handleNext}
                disabled={!hasNext}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 z-20",
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  "bg-black/50 text-white/80 backdrop-blur-sm",
                  "transition-all hover:bg-black/70 hover:scale-110",
                  !hasNext && "opacity-30 cursor-not-allowed"
                )}
                data-testid="master-player-next-btn"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Controls overlay - top right */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
            {/* Mobile Preview Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowMobilePreview(!showMobilePreview)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    "transition-all",
                    showMobilePreview
                      ? "bg-primary text-primary-foreground"
                      : "bg-black/50 text-white/80 backdrop-blur-sm hover:bg-black/70"
                  )}
                  data-testid="master-player-mobile-preview-btn"
                >
                  <Smartphone className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {showMobilePreview ? "Wyłącz podgląd mobilny" : "Podgląd mobilny"}
              </TooltipContent>
            </Tooltip>

            {/* Fullscreen/Lightbox */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setLightboxOpen(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/50 text-white/80 backdrop-blur-sm hover:bg-black/70 transition-all"
                  data-testid="master-player-fullscreen-btn"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Pełny ekran</TooltipContent>
            </Tooltip>
          </div>

          {/* Video controls - top left (if video available) */}
          {hasVideo && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
              <a
                href={exercise.videoUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 items-center gap-2 px-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all"
                data-testid="master-player-video-link"
              >
                <Play className="h-4 w-4" />
                <span>Otwórz wideo</span>
              </a>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/50 text-white/80 backdrop-blur-sm hover:bg-black/70 transition-all"
                data-testid="master-player-mute-btn"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>
          )}

          {/* GIF indicator */}
          {hasGif && !hasVideo && (
            <div className="absolute top-3 left-3 z-20 px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/30">
              GIF Animowany
            </div>
          )}

          {/* Image counter */}
          {allImages.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-black/50 text-white/80 text-xs backdrop-blur-sm">
              {selectedImageIndex + 1} / {allImages.length}
            </div>
          )}
        </div>

        {/* Thumbnails strip (compact) */}
        {allImages.length > 1 && (
          <div className="flex-shrink-0 px-3 py-2 bg-zinc-900/50 border-t border-zinc-800">
            <div className="flex gap-1.5 overflow-x-auto">
              {allImages.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={cn(
                    "shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all",
                    selectedImageIndex === idx
                      ? "border-primary ring-1 ring-primary/50"
                      : "border-transparent opacity-60 hover:opacity-100 hover:border-zinc-600"
                  )}
                  data-testid={`master-player-thumb-${idx}`}
                >
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lightbox */}
        {currentImage && (
          <ImageLightbox
            src={currentImage}
            alt={exercise.name}
            open={lightboxOpen}
            onOpenChange={setLightboxOpen}
            images={allImages.length > 1 ? allImages : undefined}
            currentIndex={selectedImageIndex}
            onIndexChange={setSelectedImageIndex}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
