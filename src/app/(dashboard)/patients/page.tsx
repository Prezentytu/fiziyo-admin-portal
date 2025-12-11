"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Plus, Users, LayoutGrid, List, Filter } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/shared/SearchInput";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PatientCard, Patient } from "@/components/patients/PatientCard";
import { PatientDialog } from "@/components/patients/PatientDialog";

import { GET_THERAPIST_PATIENTS_QUERY } from "@/graphql/queries/therapists.queries";
import { REMOVE_PATIENT_FROM_THERAPIST_MUTATION } from "@/graphql/mutations/therapists.mutations";
import { GET_USER_BY_CLERK_ID_QUERY } from "@/graphql/queries/users.queries";
import { matchesSearchQuery } from "@/utils/textUtils";
import type { UserByClerkIdResponse, TherapistPatientsResponse } from "@/types/apollo";

export default function PatientsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);

  // Get user data
  const { data: userData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const userByClerkId = (userData as UserByClerkIdResponse)?.userByClerkId;
  const therapistId = userByClerkId?.id;
  const organizationId = userByClerkId?.organizationIds?.[0];

  // Get patients
  const { data, loading, error } = useQuery(GET_THERAPIST_PATIENTS_QUERY, {
    variables: { therapistId, organizationId },
    skip: !therapistId || !organizationId,
  });

  // Delete mutation
  const [removePatient, { loading: removing }] = useMutation(
    REMOVE_PATIENT_FROM_THERAPIST_MUTATION,
    {
      refetchQueries: [
        { query: GET_THERAPIST_PATIENTS_QUERY, variables: { therapistId, organizationId } },
      ],
    }
  );

  // Transform data - therapistPatients returns assignments with patient data
  const therapistPatients = (data as TherapistPatientsResponse)?.therapistPatients || [];
  const patients: Patient[] = therapistPatients.map((assignment: {
    id: string;
    status?: string;
    contextLabel?: string;
    contextColor?: string;
    patient?: {
      id: string;
      fullname?: string;
      email?: string;
      image?: string;
      isShadowUser?: boolean;
      personalData?: { firstName?: string; lastName?: string };
      contactData?: { phone?: string; address?: string };
    };
  }) => ({
    id: assignment.patient?.id || assignment.id,
    fullname: assignment.patient?.fullname,
    email: assignment.patient?.email,
    image: assignment.patient?.image,
    isShadowUser: assignment.patient?.isShadowUser,
    personalData: assignment.patient?.personalData,
    contactData: assignment.patient?.contactData,
    assignmentStatus: assignment.status,
    contextLabel: assignment.contextLabel,
    contextColor: assignment.contextColor,
  }));

  // Filter
  const filteredPatients = patients.filter((patient) => {
    const fullName =
      patient.fullname ||
      `${patient.personalData?.firstName || ""} ${patient.personalData?.lastName || ""}`.trim();
    return (
      matchesSearchQuery(fullName, searchQuery) ||
      matchesSearchQuery(patient.email, searchQuery) ||
      matchesSearchQuery(patient.contactData?.phone, searchQuery)
    );
  });

  const handleView = (patient: Patient) => {
    router.push(`/patients/${patient.id}`);
  };

  const handleDelete = async () => {
    if (!deletingPatient || !therapistId || !organizationId) return;

    try {
      await removePatient({
        variables: {
          therapistId,
          patientId: deletingPatient.id,
          organizationId,
        },
      });
      toast.success("Pacjent został usunięty z listy");
      setDeletingPatient(null);
    } catch (error) {
      console.error("Błąd podczas usuwania:", error);
      toast.error("Nie udało się usunąć pacjenta");
    }
  };

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">Błąd ładowania pacjentów: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pacjenci</h1>
          <p className="text-muted-foreground mt-1">
            Zarządzaj listą swoich pacjentów
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} disabled={!organizationId} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Dodaj pacjenta
        </Button>
      </div>

      {/* Filters bar - sticky */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Szukaj pacjentów..."
              className="max-w-md"
            />
            <Badge variant="secondary" className="hidden sm:flex">
              {filteredPatients.length} z {patients.length}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Filter className="mr-2 h-4 w-4" />
              Filtry
            </Button>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "list")}>
              <TabsList className="bg-surface-light">
                <TabsTrigger value="list" className="data-[state=active]:bg-surface">
                  <List className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="grid" className="data-[state=active]:bg-surface">
                  <LayoutGrid className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState type={viewMode === "grid" ? "card" : "row"} count={6} />
      ) : filteredPatients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16">
            <EmptyState
              icon={Users}
              title={searchQuery ? "Nie znaleziono pacjentów" : "Brak pacjentów"}
              description={
                searchQuery
                  ? "Spróbuj zmienić kryteria wyszukiwania"
                  : "Dodaj pierwszego pacjenta do swojej listy"
              }
              actionLabel={!searchQuery ? "Dodaj pacjenta" : undefined}
              onAction={!searchQuery ? () => setIsDialogOpen(true) : undefined}
            />
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-stagger">
          {filteredPatients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onView={handleView}
              onDelete={(p) => setDeletingPatient(p)}
              onAssignSet={() => {}}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2 animate-stagger">
          {filteredPatients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              compact
              onView={handleView}
              onDelete={(p) => setDeletingPatient(p)}
              onAssignSet={() => {}}
            />
          ))}
        </div>
      )}

      {/* Patient Dialog */}
      {organizationId && therapistId && (
        <PatientDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          organizationId={organizationId}
          therapistId={therapistId}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingPatient}
        onOpenChange={(open) => !open && setDeletingPatient(null)}
        title="Usuń pacjenta"
        description={`Czy na pewno chcesz usunąć pacjenta "${deletingPatient?.fullname || "Nieznany"}" ze swojej listy?`}
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={removing}
      />
    </div>
  );
}
