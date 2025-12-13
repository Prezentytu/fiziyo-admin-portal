"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useMutation } from "@apollo/client/react";
import { Loader2, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FrequencyPicker,
  FrequencyValue,
  defaultFrequency,
} from "@/components/exercise-sets/FrequencyPicker";

import { UPDATE_EXERCISE_SET_ASSIGNMENT_MUTATION } from "@/graphql/mutations/exercises.mutations";
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from "@/graphql/queries/patientAssignments.queries";
import type { PatientAssignment, Frequency } from "./PatientAssignmentCard";

interface EditAssignmentScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: PatientAssignment | null;
  patientId: string;
  onSuccess?: () => void;
}

// Convert backend frequency to FrequencyValue
const frequencyToValue = (freq?: Frequency): FrequencyValue => {
  if (!freq) return defaultFrequency;
  return {
    timesPerDay: freq.timesPerDay || 1,
    breakBetweenSets: freq.breakBetweenSets || 4,
    monday: freq.monday ?? true,
    tuesday: freq.tuesday ?? true,
    wednesday: freq.wednesday ?? true,
    thursday: freq.thursday ?? true,
    friday: freq.friday ?? true,
    saturday: freq.saturday ?? true,
    sunday: freq.sunday ?? true,
  };
};

export function EditAssignmentScheduleDialog({
  open,
  onOpenChange,
  assignment,
  patientId,
  onSuccess,
}: EditAssignmentScheduleDialogProps) {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [frequency, setFrequency] = useState<FrequencyValue>(defaultFrequency);

  // Initialize state when assignment changes
  useEffect(() => {
    if (assignment && open) {
      setStartDate(assignment.startDate ? new Date(assignment.startDate) : new Date());
      setEndDate(assignment.endDate ? new Date(assignment.endDate) : new Date());
      setFrequency(frequencyToValue(assignment.frequency));
    }
  }, [assignment, open]);

  // Mutation
  const [updateAssignment, { loading }] = useMutation(
    UPDATE_EXERCISE_SET_ASSIGNMENT_MUTATION
  );

  const handleSave = async () => {
    if (!assignment) return;

    try {
      await updateAssignment({
        variables: {
          assignmentId: assignment.id,
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

      toast.success("Harmonogram został zaktualizowany");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Błąd aktualizacji harmonogramu:", error);
      toast.error("Nie udało się zaktualizować harmonogramu");
    }
  };

  const setName = assignment?.exerciseSet?.name || "Nieznany zestaw";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Edytuj harmonogram
          </DialogTitle>
          <DialogDescription>
            Zmień harmonogram zestawu &quot;{setName}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
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
          <div className="rounded-xl bg-surface-light p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">Podsumowanie zmian:</p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                • Okres:{" "}
                <span className="text-foreground font-medium">
                  {format(startDate, "d MMM", { locale: pl })} — {format(endDate, "d MMM yyyy", { locale: pl })}
                </span>
              </p>
              <p>
                • Częstotliwość:{" "}
                <span className="text-foreground font-medium">
                  {frequency.timesPerDay}x dziennie
                </span>
              </p>
              {frequency.breakBetweenSets > 0 && (
                <p>
                  • Przerwa:{" "}
                  <span className="text-foreground font-medium">
                    {frequency.breakBetweenSets}h między wykonaniami
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="shadow-lg shadow-primary/20"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Zapisz zmiany
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}




