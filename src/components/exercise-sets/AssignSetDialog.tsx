"use client";

import * as React from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { Loader2, Search, Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION,
  REMOVE_EXERCISE_SET_ASSIGNMENT_MUTATION,
} from "@/graphql/mutations/exercises.mutations";
import { GET_THERAPIST_PATIENTS_QUERY } from "@/graphql/queries/therapists.queries";
import { GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY } from "@/graphql/queries/exerciseSets.queries";
import type { TherapistPatientsResponse } from "@/types/apollo";

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
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedPatients, setSelectedPatients] = React.useState<Set<string>>(
    new Set(assignedPatientIds)
  );

  React.useEffect(() => {
    setSelectedPatients(new Set(assignedPatientIds));
  }, [assignedPatientIds, open]);

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
  const therapistPatients = (patientsData as TherapistPatientsResponse)?.therapistPatients || [];
  const patients: Patient[] = therapistPatients.map((assignment) => ({
    id: assignment.patient?.id || assignment.patientId,
    name: assignment.patient?.fullname || "Nieznany",
    email: assignment.patient?.email,
    image: assignment.patient?.image,
  }));

  const filteredPatients = patients.filter(
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

  const handleSave = async () => {
    try {
      const toAssign = Array.from(selectedPatients).filter(
        (id) => !assignedPatientIds.includes(id)
      );
      const toRemove = assignedPatientIds.filter(
        (id) => !selectedPatients.has(id)
      );

      // Assign new patients
      for (const patientId of toAssign) {
        await assignSet({
          variables: {
            exerciseSetId,
            patientId,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
            frequency: {
              timesPerDay: 1,
              timesPerWeek: 7,
              monday: true,
              tuesday: true,
              wednesday: true,
              thursday: true,
              friday: true,
              saturday: true,
              sunday: true,
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

      // Remove unselected patients
      for (const patientId of toRemove) {
        await removeAssignment({
          variables: {
            exerciseSetId,
            patientId,
          },
          refetchQueries: [
            {
              query: GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY,
              variables: { exerciseSetId },
            },
          ],
        });
      }

      toast.success("Przypisania zostały zaktualizowane");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Błąd podczas zapisywania:", error);
      toast.error("Nie udało się zaktualizować przypisań");
    }
  };

  const isLoading = assigning || removing;
  const hasChanges =
    Array.from(selectedPatients).sort().join(",") !==
    assignedPatientIds.sort().join(",");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Przypisz pacjentów</DialogTitle>
          <DialogDescription>
            Wybierz pacjentów, którym chcesz przypisać ten zestaw ćwiczeń
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Szukaj pacjentów..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[300px] rounded-md border border-border">
            {loadingPatients ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                {searchQuery ? "Nie znaleziono pacjentów" : "Brak pacjentów"}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredPatients.map((patient) => {
                  const isSelected = selectedPatients.has(patient.id);
                  const wasAssigned = assignedPatientIds.includes(patient.id);

                  return (
                    <div
                      key={patient.id}
                      className="flex items-center gap-3 rounded-lg p-2 cursor-pointer hover:bg-surface-light"
                      onClick={() => togglePatient(patient.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => togglePatient(patient.id)}
                      />
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                        {patient.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {patient.name}
                        </p>
                        {patient.email && (
                          <p className="text-xs text-muted-foreground truncate">
                            {patient.email}
                          </p>
                        )}
                      </div>
                      {wasAssigned && isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <p className="text-sm text-muted-foreground">
            Wybrano: {selectedPatients.size} pacjentów
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !hasChanges}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

