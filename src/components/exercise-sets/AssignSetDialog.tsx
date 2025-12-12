"use client";

import * as React from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { Loader2, Search, Check, Calendar, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { pl } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION,
  REMOVE_EXERCISE_SET_ASSIGNMENT_MUTATION,
} from "@/graphql/mutations/exercises.mutations";
import { GET_THERAPIST_PATIENTS_QUERY } from "@/graphql/queries/therapists.queries";
import { GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY } from "@/graphql/queries/exerciseSets.queries";
import { FrequencyPicker, FrequencyValue, defaultFrequency } from "./FrequencyPicker";
import type { TherapistPatientsResponse } from "@/types/apollo";
import { cn } from "@/lib/utils";

interface Patient {
  id: string;
  name: string;
  email?: string;
  image?: string;
}

interface AssignSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseSetId: string;
  assignedPatientIds: string[];
  therapistId?: string;
  organizationId?: string;
  onSuccess?: () => void;
}

export function AssignSetDialog({
  open,
  onOpenChange,
  exerciseSetId,
  assignedPatientIds,
  therapistId,
  organizationId,
  onSuccess,
}: AssignSetDialogProps) {
  const [step, setStep] = React.useState<"patients" | "schedule">("patients");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedPatients, setSelectedPatients] = React.useState<Set<string>>(
    new Set()
  );
  const [startDate, setStartDate] = React.useState<Date>(new Date());
  const [endDate, setEndDate] = React.useState<Date>(addDays(new Date(), 30));
  const [frequency, setFrequency] = React.useState<FrequencyValue>(defaultFrequency);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setStep("patients");
      setSelectedPatients(new Set());
      setSearchQuery("");
      setStartDate(new Date());
      setEndDate(addDays(new Date(), 30));
      setFrequency(defaultFrequency);
    }
  }, [open]);

  // Get patients
  const { data: patientsData, loading: loadingPatients } = useQuery(
    GET_THERAPIST_PATIENTS_QUERY,
    {
      variables: { therapistId, organizationId },
      skip: !therapistId || !organizationId || !open,
    }
  );

  // Mutations
  const [assignSet, { loading: assigning }] = useMutation(
    ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION
  );

  const [removeAssignment, { loading: removing }] = useMutation(
    REMOVE_EXERCISE_SET_ASSIGNMENT_MUTATION
  );

  // Transform therapist patients data to Patient format
  const therapistPatients =
    (patientsData as TherapistPatientsResponse)?.therapistPatients || [];
  const patients: Patient[] = therapistPatients.map((assignment) => ({
    id: assignment.patient?.id || assignment.patientId,
    name: assignment.patient?.fullname || "Nieznany",
    email: assignment.patient?.email,
    image: assignment.patient?.image,
  }));

  // Filter out already assigned patients for new assignments
  const availablePatients = patients.filter(
    (p) => !assignedPatientIds.includes(p.id)
  );

  const filteredPatients = availablePatients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const togglePatient = (patientId: string) => {
    const newSelected = new Set(selectedPatients);
    if (newSelected.has(patientId)) {
      newSelected.delete(patientId);
    } else {
      newSelected.add(patientId);
    }
    setSelectedPatients(newSelected);
  };

  const handleNext = () => {
    if (selectedPatients.size === 0) {
      toast.error("Wybierz przynajmniej jednego pacjenta");
      return;
    }
    setStep("schedule");
  };

  const handleBack = () => {
    setStep("patients");
  };

  const handleSave = async () => {
    if (selectedPatients.size === 0) return;

    try {
      // Assign selected patients with schedule
      for (const patientId of Array.from(selectedPatients)) {
        await assignSet({
          variables: {
            exerciseSetId,
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
              query: GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY,
              variables: { exerciseSetId },
            },
          ],
        });
      }

      toast.success(
        `Zestaw przypisany do ${selectedPatients.size} ${
          selectedPatients.size === 1 ? "pacjenta" : "pacjentów"
        }`
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Błąd podczas zapisywania:", error);
      toast.error("Nie udało się przypisać zestawu");
    }
  };

  const isLoading = assigning || removing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "patients" ? (
              <>
                <Users className="h-5 w-5 text-primary" />
                Wybierz pacjentów
              </>
            ) : (
              <>
                <Calendar className="h-5 w-5 text-primary" />
                Ustaw harmonogram
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === "patients"
              ? "Wybierz pacjentów, którym chcesz przypisać ten zestaw ćwiczeń"
              : "Określ, jak często pacjenci powinni wykonywać ćwiczenia"}
          </DialogDescription>
        </DialogHeader>

        {step === "patients" ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Szukaj pacjentów..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11"
              />
            </div>

            <ScrollArea className="h-[280px] rounded-xl border border-border">
              {loadingPatients ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "Nie znaleziono pacjentów"
                      : availablePatients.length === 0
                      ? "Wszyscy pacjenci mają już przypisany ten zestaw"
                      : "Brak pacjentów"}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredPatients.map((patient) => {
                    const isSelected = selectedPatients.has(patient.id);

                    return (
                      <div
                        key={patient.id}
                        className={cn(
                          "flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all",
                          isSelected
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-surface-light border border-transparent"
                        )}
                        onClick={() => togglePatient(patient.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => togglePatient(patient.id)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-sm font-semibold text-primary-foreground">
                          {patient.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{patient.name}</p>
                          {patient.email && (
                            <p className="text-xs text-muted-foreground truncate">
                              {patient.email}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="h-5 w-5 text-primary shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            <p className="text-sm text-muted-foreground">
              Wybrano:{" "}
              <span className="font-semibold text-foreground">
                {selectedPatients.size}
              </span>{" "}
              {selectedPatients.size === 1 ? "pacjenta" : "pacjentów"}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
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
              <p className="text-sm font-medium text-foreground">Podsumowanie:</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  • Pacjenci:{" "}
                  <span className="text-foreground font-medium">
                    {selectedPatients.size}
                  </span>
                </p>
                <p>
                  • Okres:{" "}
                  <span className="text-foreground font-medium">
                    {format(startDate, "d MMM", { locale: pl })} -{" "}
                    {format(endDate, "d MMM yyyy", { locale: pl })}
                  </span>
                </p>
                <p>
                  • Częstotliwość:{" "}
                  <span className="text-foreground font-medium">
                    {frequency.timesPerDay}x dziennie
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "patients" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Anuluj
              </Button>
              <Button
                onClick={handleNext}
                disabled={selectedPatients.size === 0}
                className="shadow-lg shadow-primary/20"
              >
                Dalej
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleBack}>
                Wstecz
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="shadow-lg shadow-primary/20"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Przypisz zestaw
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
