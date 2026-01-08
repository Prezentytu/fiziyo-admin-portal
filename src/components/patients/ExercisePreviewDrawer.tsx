"use client";

import { Play, Clock, Dumbbell, Info, ArrowLeftRight } from "lucide-react";

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
  if (!mapping) return null;

  const exercise = mapping.exercise;
  const imageUrl = getMediaUrl(exercise?.imageUrl || exercise?.images?.[0]);
  const videoUrl = getMediaUrl(exercise?.videoUrl);

  // Get effective params (with overrides)
  const effectiveSets = override?.sets ?? mapping.sets ?? exercise?.sets;
  const effectiveReps = override?.reps ?? mapping.reps ?? exercise?.reps;
  const effectiveDuration = override?.duration ?? mapping.duration ?? exercise?.duration;
  const effectiveName = override?.customName ?? mapping.customName ?? exercise?.name;
  const effectiveDescription = override?.customDescription ?? mapping.customDescription ?? exercise?.description;

  const hasOverride = override && (
    override.sets !== undefined ||
    override.reps !== undefined ||
    override.duration !== undefined ||
    override.customName
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden"
        data-testid="exercise-preview-dialog"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
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

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-6 py-6 space-y-6">
            {/* Media - Image or Video */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-surface-light">
              {videoUrl ? (
                <video
                  src={videoUrl}
                  controls
                  className="w-full h-full object-contain"
                  poster={imageUrl || undefined}
                >
                  <track kind="captions" />
                </video>
              ) : imageUrl ? (
                <img
                  src={imageUrl}
                  alt={effectiveName || "Ćwiczenie"}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImagePlaceholder type="exercise" iconClassName="h-16 w-16" />
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
            {(translateSide(exercise?.exerciseSide)) && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-light/50 border border-border/40">
                <ArrowLeftRight className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Strona wykonania</p>
                  <p className="text-sm font-medium">{translateSide(exercise?.exerciseSide)}</p>
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
        <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end gap-3">
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
