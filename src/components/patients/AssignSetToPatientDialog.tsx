"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  Loader2,
  Search,
  FolderKanban,
  Dumbbell,
  Calendar,
  ArrowRight,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { pl } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
import { FrequencyPicker, FrequencyValue, defaultFrequency } from "@/components/exercise-sets/FrequencyPicker";
import { cn } from "@/lib/utils";

import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from "@/graphql/queries/exerciseSets.queries";
import { ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION } from "@/graphql/mutations/exercises.mutations";
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from "@/graphql/queries/patientAssignments.queries";
import type { OrganizationExerciseSetsResponse } from "@/types/apollo";

interface ExerciseSet {
  id: string;
  name: string;
  description?: string;
  exerciseMappings?: Array<{
    id: string;
    exercise?: {
      id: string;
      name: string;
      imageUrl?: string;
      images?: string[];
    };
  }>;
}

interface AssignSetToPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  organizationId: string;
  existingSetIds: string[];
  onSuccess?: () => void;
}

export function AssignSetToPatientDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  organizationId,
  existingSetIds,
  onSuccess,
}: AssignSetToPatientDialogProps) {
  const [step, setStep] = useState<"select" | "schedule">("select");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSet, setSelectedSet] = useState<ExerciseSet | null>(null);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 30));
  const [frequency, setFrequency] = useState<FrequencyValue>(defaultFrequency);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep("select");
      setSelectedSet(null);
      setSearchQuery("");
      setStartDate(new Date());
      setEndDate(addDays(new Date(), 30));
      setFrequency(defaultFrequency);
    }
  }, [open]);

  // Get exercise sets
  const { data: setsData, loading: loadingSets } = useQuery(
    GET_ORGANIZATION_EXERCISE_SETS_QUERY,
    {
      variables: { organizationId },
      skip: !organizationId || !open,
    }
  );

  // Mutation
  const [assignSet, { loading: assigning }] = useMutation(
    ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION
  );

  const exerciseSets: ExerciseSet[] =
    (setsData as OrganizationExerciseSetsResponse)?.exerciseSets || [];

  // Filter out already assigned sets
  const availableSets = exerciseSets.filter(
    (set) => !existingSetIds.includes(set.id)
  );

  const filteredSets = availableSets.filter(
    (set) =>
      set.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      set.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNext = () => {
    if (!selectedSet) {
      toast.error("Wybierz zestaw ćwiczeń");
      return;
    }
    setStep("schedule");
  };

  const handleBack = () => {
    setStep("select");
  };

  const handleAssign = async () => {
    if (!selectedSet) return;

    try {
      await assignSet({
        variables: {
          exerciseSetId: selectedSet.id,
          patientId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          frequency: {
            timesPerDay: frequency.timesPerDay,
            timesPerWeek: Object.values(frequency).filter((v) => v === true).length,
            breakBetweenSets: frequency.breakBetweenSets,
            monday: frequency.monday,
            tuesday: frequency.tuesday,
            wednesday: frequency.wednesday,
            thursday: frequency.thursday,
            friday: frequency.friday,
            saturday: frequency.saturday,
            sunday: frequency.sunday,
          },
        },
        refetchQueries: [
          {
            query: GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY,
            variables: { userId: patientId },
          },
        ],
      });

      toast.success(`Zestaw "${selectedSet.name}" przypisany do pacjenta`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Błąd przypisywania:", error);
      toast.error("Nie udało się przypisać zestawu");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "select" ? (
              <>
                <FolderKanban className="h-5 w-5 text-primary" />
                Przypisz zestaw
              </>
            ) : (
              <>
                <Calendar className="h-5 w-5 text-primary" />
                Ustaw harmonogram
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === "select"
              ? `Wybierz zestaw ćwiczeń dla pacjenta ${patientName}`
              : `Określ harmonogram wykonywania zestawu "${selectedSet?.name}"`}
          </DialogDescription>
        </DialogHeader>

        {step === "select" ? (
          <div className="flex-1 space-y-4 overflow-hidden">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Szukaj zestawów..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11"
              />
            </div>

            {/* Sets list */}
            <ScrollArea className="h-[320px] rounded-xl border border-border">
              {loadingSets ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredSets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <FolderKanban className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "Nie znaleziono zestawów"
                      : availableSets.length === 0
                      ? "Wszystkie zestawy są już przypisane"
                      : "Brak zestawów"}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredSets.map((set) => {
                    const isSelected = selectedSet?.id === set.id;
                    const exerciseCount = set.exerciseMappings?.length || 0;
                    const firstImages = set.exerciseMappings
                      ?.slice(0, 3)
                      .map((m) => m.exercise?.imageUrl || m.exercise?.images?.[0])
                      .filter(Boolean) as string[];

                    return (
                      <div
                        key={set.id}
                        className={cn(
                          "flex items-center gap-4 rounded-xl p-3 cursor-pointer transition-all",
                          isSelected
                            ? "bg-primary/10 border-2 border-primary/40"
                            : "hover:bg-surface-light border-2 border-transparent"
                        )}
                        onClick={() => setSelectedSet(set)}
                      >
                        {/* Preview images */}
                        <div className="relative h-14 w-14 shrink-0">
                          {firstImages.length > 0 ? (
                            <div className="h-full w-full rounded-lg overflow-hidden">
                              <img
                                src={firstImages[0]}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-full w-full rounded-lg bg-surface-light flex items-center justify-center">
                              <FolderKanban className="h-6 w-6 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{set.name}</p>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {exerciseCount} ćw.
                            </Badge>
                          </div>
                          {set.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                              {set.description}
                            </p>
                          )}
                        </div>

                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Selected preview */}
            {selectedSet && (
              <div className="rounded-xl bg-surface-light/50 border border-border/40 p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Wybrany zestaw
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Dumbbell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{selectedSet.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedSet.exerciseMappings?.length || 0} ćwiczeń
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 space-y-5 overflow-auto">
            {/* Date range */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Data rozpoczęcia</Label>
                <Input
                  type="date"
                  value={format(startDate, "yyyy-MM-dd")}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Data zakończenia</Label>
                <Input
                  type="date"
                  value={format(endDate, "yyyy-MM-dd")}
                  onChange={(e) => setEndDate(new Date(e.target.value))}
                  min={format(startDate, "yyyy-MM-dd")}
                  className="h-11"
                />
              </div>
            </div>

            <Separator />

            {/* Frequency picker */}
            <FrequencyPicker value={frequency} onChange={setFrequency} />

            {/* Summary */}
            <div className="rounded-xl bg-surface-light p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Podsumowanie:</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Zestaw:</span>
                  <span className="font-medium">{selectedSet?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Okres:</span>
                  <span className="font-medium">
                    {format(startDate, "d MMM", { locale: pl })} — {format(endDate, "d MMM yyyy", { locale: pl })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Częstotliwość:</span>
                  <span className="font-medium">{frequency.timesPerDay}x dziennie</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "select" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Anuluj
              </Button>
              <Button
                onClick={handleNext}
                disabled={!selectedSet}
                className="shadow-lg shadow-primary/20"
              >
                Dalej
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleBack}>
                Wstecz
              </Button>
              <Button
                onClick={handleAssign}
                disabled={assigning}
                className="shadow-lg shadow-primary/20"
              >
                {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Przypisz zestaw
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


