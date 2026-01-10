"use client";

import { useState } from "react";
import { Play, Clock, Dumbbell, Info, ArrowLeftRight, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
import { getMediaUrl } from "@/utils/mediaUrl";
import type { ExerciseMapping, ExerciseOverride } from "./PatientAssignmentCard";

interface ExercisePreviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapping: ExerciseMapping | null;
  override?: ExerciseOverride;
  onEdit?: () => void;
}

// Helper functions
const translateType = (type?: string) => {
  const types: Record<string, string> = {
    time: "Czasowe",
    reps: "Powtórzenia",
  };
  return type ? types[type] || type : "Nieznane";
};

const translateSide = (side?: string) => {
  const sides: Record<string, string> = {
    left: "Lewa strona",
    right: "Prawa strona",
    both: "Obie strony",
    alternating: "Naprzemiennie",
    none: "Bez strony",
  };
  return side ? sides[side] || side : null;
};

export function ExercisePreviewDrawer({
  open,
  onOpenChange,
  mapping,
  override,
  onEdit,
}: ExercisePreviewDrawerProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!mapping) return null;

  const exercise = mapping.exercise;
  const videoUrl = getMediaUrl(exercise?.videoUrl);

  // Build array of all images (original + custom)
  const allImages: { url: string; isCustom: boolean }[] = [];

  // Add original image(s)
  const originalImageUrl = getMediaUrl(exercise?.imageUrl);
  if (originalImageUrl) {
    allImages.push({ url: originalImageUrl, isCustom: false });
  }
  if (exercise?.images) {
    for (const img of exercise.images) {
      const url = getMediaUrl(img);
      if (url && url !== originalImageUrl) {
        allImages.push({ url, isCustom: false });
      }
    }
  }

  // Add custom images from override
  if (override?.customImages) {
    for (const img of override.customImages) {
      allImages.push({ url: img, isCustom: true });
    }
  }

  const hasMultipleImages = allImages.length > 1;
  const currentImage = allImages[currentImageIndex];

  const goToPrevious = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  // Get effective params (with overrides)
  const effectiveSets = override?.sets ?? mapping.sets ?? exercise?.sets;
  const effectiveReps = override?.reps ?? mapping.reps ?? exercise?.reps;
  const effectiveDuration = override?.duration ?? mapping.duration ?? exercise?.duration;
  const effectiveName = override?.customName ?? mapping.customName ?? exercise?.name;
  const effectiveDescription = override?.customDescription ?? mapping.customDescription ?? exercise?.description;
  const effectiveSide = override?.exerciseSide ?? exercise?.exerciseSide;

  const hasOverride = override && (
    override.sets !== undefined ||
    override.reps !== undefined ||
    override.duration !== undefined ||
    override.customName ||
    override.customImages?.length
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl p-0 flex flex-col"
        data-testid="exercise-preview-dialog"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-lg">
              {effectiveName || "Nieznane ćwiczenie"}
            </DialogTitle>
            {exercise?.type && (
              <Badge variant="secondary" className="text-xs">
                {translateType(exercise.type)}
              </Badge>
            )}
            {hasOverride && (
              <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                Zmodyfikowane
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="max-h-[calc(90vh-180px)] overflow-y-auto">
          <div className="px-6 py-6 space-y-6">
            {/* Media - Image Gallery or Video */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-surface-light">
              {videoUrl ? (
                <video
                  src={videoUrl}
                  controls
                  className="w-full h-full object-contain"
                  poster={currentImage?.url || undefined}
                >
                  <track kind="captions" />
                </video>
              ) : currentImage ? (
                <>
                  <img
                    src={currentImage.url}
                    alt={effectiveName || "Ćwiczenie"}
                    className="w-full h-full object-contain"
                  />
                  {currentImage.isCustom && (
                    <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      Dla pacjenta
                    </span>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImagePlaceholder type="exercise" iconClassName="h-16 w-16" />
                </div>
              )}

              {/* Navigation arrows */}
              {hasMultipleImages && !videoUrl && (
                <>
                  <button
                    type="button"
                    onClick={goToPrevious}
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={goToNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Dots indicator */}
              {hasMultipleImages && !videoUrl && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {allImages.map((img, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setCurrentImageIndex(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === currentImageIndex
                          ? 'w-6 bg-primary'
                          : `w-2 ${img.isCustom ? 'bg-primary/40' : 'bg-white/60'} hover:bg-white/80`
                      }`}
                    />
                  ))}
                </div>
              )}

              {videoUrl && !open && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="h-8 w-8 text-foreground ml-1" />
                  </div>
                </div>
              )}
            </div>

            {/* Parameters */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Parametry
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {effectiveSets && (
                  <div className="rounded-xl border border-border/40 bg-surface/30 p-4 text-center">
                    <Dumbbell className="h-5 w-5 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold">{effectiveSets}</p>
                    <p className="text-xs text-muted-foreground">serii</p>
                  </div>
                )}
                {effectiveReps && (
                  <div className="rounded-xl border border-border/40 bg-surface/30 p-4 text-center">
                    <span className="text-primary text-lg font-bold block mb-1">×</span>
                    <p className="text-2xl font-bold">{effectiveReps}</p>
                    <p className="text-xs text-muted-foreground">powtórzeń</p>
                  </div>
                )}
                {effectiveDuration && (
                  <div className="rounded-xl border border-border/40 bg-surface/30 p-4 text-center">
                    <Clock className="h-5 w-5 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold">{effectiveDuration}</p>
                    <p className="text-xs text-muted-foreground">sekund</p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional info */}
            {(translateSide(effectiveSide)) && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-light/50 border border-border/40">
                <ArrowLeftRight className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Strona wykonania</p>
                  <p className="text-sm font-medium">{translateSide(effectiveSide)}</p>
                </div>
              </div>
            )}

            {/* Description */}
            {effectiveDescription && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Opis
                  </h3>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {effectiveDescription}
                  </p>
                </div>
              </>
            )}

            {/* Notes */}
            {(override?.notes || mapping.notes) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Notatki dla pacjenta
                  </h3>
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {override?.notes || mapping.notes}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Override info */}
            {hasOverride && (
              <>
                <Separator />
                <div className="rounded-xl bg-info/5 border border-info/20 p-4">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-info">Uwaga:</strong> To ćwiczenie ma zmodyfikowane parametry
                    specjalnie dla tego pacjenta. Oryginalne wartości z zestawu mogą być inne.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zamknij
          </Button>
          {onEdit && (
            <Button onClick={onEdit} className="shadow-lg shadow-primary/20">
              Edytuj parametry
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
