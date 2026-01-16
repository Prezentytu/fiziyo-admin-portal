"use client";

import { useState } from "react";
import { Play, Volume2, VolumeX, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
import { ImageLightbox } from "@/components/shared/ImageLightbox";
import { cn } from "@/lib/utils";
import { getMediaUrl, getMediaUrls } from "@/utils/mediaUrl";
import type { AdminExercise } from "@/graphql/types/adminExercise.types";

interface MobileSimulatorProps {
  exercise: AdminExercise;
  className?: string;
}

export function MobileSimulator({ exercise, className }: MobileSimulatorProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const allImages = getMediaUrls([
    exercise.thumbnailUrl,
    exercise.imageUrl,
    ...(exercise.images || []),
  ]);
  const currentImage = allImages[selectedImageIndex] || null;
  const hasVideo = !!exercise.videoUrl;
  const hasGif = !!exercise.gifUrl;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* Phone Frame */}
      <div className="relative w-full max-w-[320px]">
        {/* Phone bezel */}
        <div className="relative bg-zinc-900 rounded-[2.5rem] p-3 shadow-2xl">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-zinc-900 rounded-b-2xl z-10" />

          {/* Screen */}
          <div className="relative bg-zinc-950 rounded-[2rem] overflow-hidden aspect-[9/19.5]">
            {/* Status bar */}
            <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/50 to-transparent z-10 flex items-center justify-center">
              <span className="text-[10px] text-white/60 font-medium">FiziYo App Preview</span>
            </div>

            {/* Main content */}
            <div className="h-full flex flex-col">
              {/* Media section - 60% */}
              <div className="relative h-[55%] bg-zinc-900 overflow-hidden group">
                {currentImage ? (
                  <>
                    {/* Blurred background */}
                    <div
                      className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-110"
                      style={{ backgroundImage: `url(${currentImage})` }}
                    />
                    {/* Main image */}
                    <img
                      src={currentImage}
                      alt={exercise.name}
                      className="relative h-full w-full object-contain"
                    />
                    {/* Zoom button */}
                    <button
                      onClick={() => setLightboxOpen(true)}
                      className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </>
                ) : hasGif ? (
                  <img
                    src={getMediaUrl(exercise.gifUrl) || ""}
                    alt={exercise.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <ImagePlaceholder type="exercise" className="h-full" iconClassName="h-16 w-16" />
                )}

                {/* Video indicator */}
                {hasVideo && (
                  <div className="absolute top-12 right-3 flex items-center gap-2">
                    <a
                      href={exercise.videoUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:scale-110 transition-transform"
                    >
                      <Play className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Content section - 45% */}
              <div className="flex-1 bg-zinc-950 p-4 overflow-y-auto">
                {/* Exercise name */}
                <h3 className="text-white font-bold text-lg leading-tight mb-2">
                  {exercise.name}
                </h3>

                {/* Patient description */}
                {exercise.patientDescription ? (
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {exercise.patientDescription}
                  </p>
                ) : exercise.description ? (
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {exercise.description}
                  </p>
                ) : (
                  <p className="text-zinc-500 text-sm italic">
                    Brak opisu dla pacjenta
                  </p>
                )}

                {/* Parameters */}
                {(exercise.defaultSets || exercise.defaultReps || exercise.defaultDuration) && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {exercise.defaultSets && (
                      <div className="px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-300 text-xs font-medium">
                        {exercise.defaultSets} serii
                      </div>
                    )}
                    {exercise.defaultReps && (
                      <div className="px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-300 text-xs font-medium">
                        {exercise.defaultReps} powt.
                      </div>
                    )}
                    {exercise.defaultDuration && (
                      <div className="px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-300 text-xs font-medium">
                        {exercise.defaultDuration}s
                      </div>
                    )}
                  </div>
                )}

                {/* Audio cue */}
                {exercise.audioCue && (
                  <div className="mt-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
                    <p className="text-primary text-xs font-medium mb-1">Podpowiedź głosowa:</p>
                    <p className="text-zinc-300 text-sm">&quot;{exercise.audioCue}&quot;</p>
                  </div>
                )}
              </div>
            </div>

            {/* Home indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full" />
          </div>
        </div>
      </div>

      {/* Image thumbnails */}
      {allImages.length > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto max-w-[320px] pb-2">
          {allImages.map((img, idx) => (
            <button
              key={img}
              onClick={() => setSelectedImageIndex(idx)}
              className={cn(
                "shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all",
                selectedImageIndex === idx
                  ? "border-primary scale-105"
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Caption */}
      <p className="text-xs text-muted-foreground mt-4 text-center">
        Tak to zobaczy pacjent w aplikacji mobilnej
      </p>

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
  );
}
