"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useMutation } from "@apollo/client/react";
import { Loader2, Dumbbell, Plus, Minus, Clock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";

import { UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION } from "@/graphql/mutations/exercises.mutations";
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from "@/graphql/queries/patientAssignments.queries";
import type { PatientAssignment, ExerciseMapping, ExerciseOverride } from "./PatientAssignmentCard";

interface EditExerciseOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: PatientAssignment | null;
  mapping: ExerciseMapping | null;
  currentOverride?: ExerciseOverride;
  patientId: string;
  onSuccess?: () => void;
}

// Helper
const translateType = (type?: string) => {
  const types: Record<string, string> = {
    time: "czasowe",
    reps: "powtórzenia",
  };
  return type ? types[type] || type : "";
};

const translateSide = (side?: string) => {
  const sides: Record<string, string> = {
    left: "lewa strona",
    right: "prawa strona",
    both: "obie strony",
    alternating: "naprzemiennie",
    none: "bez strony",
  };
  return side ? sides[side] || side : "";
};

export function EditExerciseOverrideDialog({
  open,
  onOpenChange,
  assignment,
  mapping,
  currentOverride,
  patientId,
  onSuccess,
}: EditExerciseOverrideDialogProps) {
  // Form state
  const [sets, setSets] = useState<number>(0);
  const [reps, setReps] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [notes, setNotes] = useState("");

  // Initialize state when dialog opens
  useEffect(() => {
    if (open && mapping) {
      // Priority: current override -> mapping override -> exercise default
      const exercise = mapping.exercise;
      setSets(
        currentOverride?.sets ??
        mapping.sets ??
        exercise?.sets ??
        0
      );
      setReps(
        currentOverride?.reps ??
        mapping.reps ??
        exercise?.reps ??
        0
      );
      setDuration(
        currentOverride?.duration ??
        mapping.duration ??
        exercise?.duration ??
        0
      );
      setCustomName(currentOverride?.customName ?? mapping.customName ?? "");
      setCustomDescription(currentOverride?.customDescription ?? mapping.customDescription ?? "");
      setNotes(currentOverride?.notes ?? mapping.notes ?? "");
    }
  }, [open, mapping, currentOverride]);

  // Mutation
  const [updateOverrides, { loading }] = useMutation(
    UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION
  );

  const handleSave = async () => {
    if (!assignment || !mapping) return;

    try {
      // Parse existing overrides
      let existingOverrides: Record<string, ExerciseOverride> = {};
      if (assignment.exerciseOverrides) {
        try {
          existingOverrides = JSON.parse(assignment.exerciseOverrides);
        } catch {
          existingOverrides = {};
        }
      }

      // Build new override - only include non-default values
      const newOverride: ExerciseOverride = {};
      
      // Only save if different from mapping/exercise defaults
      const exerciseDefaults = mapping.exercise;
      const mappingDefaults = mapping;
      
      if (sets !== (mappingDefaults.sets ?? exerciseDefaults?.sets ?? 0)) {
        newOverride.sets = sets;
      }
      if (reps !== (mappingDefaults.reps ?? exerciseDefaults?.reps ?? 0)) {
        newOverride.reps = reps;
      }
      if (duration !== (mappingDefaults.duration ?? exerciseDefaults?.duration ?? 0)) {
        newOverride.duration = duration;
      }
      if (customName && customName !== mappingDefaults.customName) {
        newOverride.customName = customName;
      }
      if (customDescription && customDescription !== mappingDefaults.customDescription) {
        newOverride.customDescription = customDescription;
      }
      if (notes) {
        newOverride.notes = notes;
      }

      // Preserve hidden status if it exists
      if (existingOverrides[mapping.id]?.hidden) {
        newOverride.hidden = true;
      }

      // Update overrides - remove if empty, otherwise set
      const updatedOverrides = { ...existingOverrides };
      if (Object.keys(newOverride).length > 0) {
        updatedOverrides[mapping.id] = newOverride;
      } else {
        delete updatedOverrides[mapping.id];
      }

      await updateOverrides({
        variables: {
          assignmentId: assignment.id,
          exerciseOverrides: JSON.stringify(updatedOverrides),
        },
        refetchQueries: [
          {
            query: GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY,
            variables: { userId: patientId },
          },
        ],
      });

      toast.success("Parametry ćwiczenia zostały zaktualizowane");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Błąd aktualizacji parametrów:", error);
      toast.error("Nie udało się zaktualizować parametrów");
    }
  };

  const handleReset = () => {
    if (!mapping) return;
    const exercise = mapping.exercise;
    setSets(mapping.sets ?? exercise?.sets ?? 0);
    setReps(mapping.reps ?? exercise?.reps ?? 0);
    setDuration(mapping.duration ?? exercise?.duration ?? 0);
    setCustomName(mapping.customName ?? "");
    setCustomDescription(mapping.customDescription ?? "");
    setNotes(mapping.notes ?? "");
  };

  const exercise = mapping?.exercise;
  const imageUrl = exercise?.imageUrl || exercise?.images?.[0];
  const setName = assignment?.exerciseSet?.name || "Nieznany zestaw";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Dostosuj parametry
          </DialogTitle>
          <DialogDescription>
            Personalizuj ćwiczenie dla tego pacjenta w zestawie &quot;{setName}&quot;
          </DialogDescription>
        </DialogHeader>

        {mapping && (
          <>
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-5 pb-4">
                {/* Exercise preview */}
                <div className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-lg overflow-hidden shrink-0">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={exercise?.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImagePlaceholder type="exercise" iconClassName="h-6 w-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-lg">
                        {exercise?.name || "Nieznane ćwiczenie"}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {exercise?.type && (
                          <Badge variant="secondary" className="text-xs">
                            {translateType(exercise.type)}
                          </Badge>
                        )}
                        {exercise?.exerciseSide && exercise.exerciseSide !== "none" && (
                          <Badge variant="outline" className="text-xs">
                            {translateSide(exercise.exerciseSide)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main parameters */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Parametry ćwiczenia
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="h-7 text-xs"
                    >
                      Przywróć domyślne
                    </Button>
                  </div>

                  {/* Sets & Reps */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Serie</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 shrink-0"
                          onClick={() => setSets(Math.max(0, sets - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={sets}
                          onChange={(e) => setSets(Math.max(0, parseInt(e.target.value) || 0))}
                          className="h-11 text-center text-lg font-semibold"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 shrink-0"
                          onClick={() => setSets(sets + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Powtórzenia</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 shrink-0"
                          onClick={() => setReps(Math.max(0, reps - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={reps}
                          onChange={(e) => setReps(Math.max(0, parseInt(e.target.value) || 0))}
                          className="h-11 text-center text-lg font-semibold"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 shrink-0"
                          onClick={() => setReps(reps + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Czas trwania (sekundy)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        onClick={() => setDuration(Math.max(0, duration - 5))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(Math.max(0, parseInt(e.target.value) || 0))}
                        className="h-11 text-center text-lg font-semibold"
                        step={5}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        onClick={() => setDuration(duration + 5)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Użyj dla ćwiczeń czasowych (np. utrzymanie pozycji)
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Customization */}
                <div className="space-y-4">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Personalizacja dla pacjenta
                  </p>

                  <div className="space-y-2">
                    <Label className="text-sm">Własna nazwa (opcjonalnie)</Label>
                    <Input
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder={exercise?.name || "Zostaw puste dla domyślnej nazwy"}
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Pacjent zobaczy tę nazwę zamiast oryginalnej
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Własny opis (opcjonalnie)</Label>
                    <Textarea
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="Dodatkowy opis dla tego pacjenta..."
                      className="min-h-[80px] resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Notatki / instrukcje</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Szczególne wskazówki dla pacjenta..."
                      className="min-h-[80px] resize-none"
                    />
                  </div>
                </div>

                {/* Summary of changes */}
                {(currentOverride?.sets !== undefined || currentOverride?.reps !== undefined || currentOverride?.duration !== undefined || currentOverride?.customName) && (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                    <p className="text-xs font-medium text-primary mb-1">
                      To ćwiczenie ma personalizację
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Parametry tego ćwiczenia są dostosowane dla tego pacjenta i różnią się od domyślnych.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Actions - fixed at bottom */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-background">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl"
              >
                Anuluj
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="rounded-xl shadow-lg shadow-primary/20"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Zapisz zmiany
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}




