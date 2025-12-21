'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Plus, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PatientExpandableCard, Patient } from '@/components/patients/PatientExpandableCard';
import { PatientDialog } from '@/components/patients/PatientDialog';
import { PatientFilters } from '@/components/patients/PatientFilters';
import { AssignmentWizard } from '@/components/assignment/AssignmentWizard';
import type { Patient as AssignmentPatient } from '@/components/assignment/types';

import { GET_ALL_THERAPIST_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import {
  REMOVE_PATIENT_FROM_THERAPIST_MUTATION,
  UPDATE_PATIENT_STATUS_MUTATION,
} from '@/graphql/mutations/therapists.mutations';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import { matchesSearchQuery } from '@/utils/textUtils';
import type { UserByClerkIdResponse, TherapistPatientsResponse } from '@/types/apollo';

type FilterType = 'all' | 'active' | 'inactive';

export default function PatientsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);
  const [togglingStatusPatient, setTogglingStatusPatient] = useState<Patient | null>(null);

  // Get user data
  const { data: userData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const userByClerkId = (userData as UserByClerkIdResponse)?.userByClerkId;
  const therapistId = userByClerkId?.id;
  const organizationId = userByClerkId?.organizationIds?.[0];

  // Get patients (all, including inactive for filtering)
  const { data, loading, error } = useQuery(GET_ALL_THERAPIST_PATIENTS_QUERY, {
    variables: { therapistId, organizationId },
    skip: !therapistId || !organizationId,
  });

  // Mutations
  const [removePatient, { loading: removing }] = useMutation(REMOVE_PATIENT_FROM_THERAPIST_MUTATION, {
    refetchQueries: [{ query: GET_ALL_THERAPIST_PATIENTS_QUERY, variables: { therapistId, organizationId } }],
  });

  const [updateStatus, { loading: updatingStatus }] = useMutation(UPDATE_PATIENT_STATUS_MUTATION, {
    refetchQueries: [{ query: GET_ALL_THERAPIST_PATIENTS_QUERY, variables: { therapistId, organizationId } }],
  });

  // Transform data - therapistPatients returns assignments with patient data
  const therapistPatients = (data as TherapistPatientsResponse)?.therapistPatients || [];
  const patients: Patient[] = therapistPatients.map(
    (assignment: {
      id: string;
      status?: string;
      assignedAt?: string;
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
      assignedAt: assignment.assignedAt,
    })
  );

  // Filter by status
  const statusFilteredPatients = patients.filter((patient) => {
    if (filter === 'all') return true;
    if (filter === 'active') return patient.assignmentStatus !== 'inactive';
    if (filter === 'inactive') return patient.assignmentStatus === 'inactive';
    return true;
  });

  // Filter by search query
  const filteredPatients = statusFilteredPatients.filter((patient) => {
    const fullName =
      patient.fullname || `${patient.personalData?.firstName || ''} ${patient.personalData?.lastName || ''}`.trim();
    return (
      matchesSearchQuery(fullName, searchQuery) ||
      matchesSearchQuery(patient.email, searchQuery) ||
      matchesSearchQuery(patient.contactData?.phone, searchQuery) ||
      matchesSearchQuery(patient.contactData?.address, searchQuery)
    );
  });

  const handleViewReport = (patient: Patient) => {
    router.push(`/patients/${patient.id}`);
  };

  const handleAssignSet = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsAssignDialogOpen(true);
  };

  const handleToggleStatus = (patient: Patient) => {
    setTogglingStatusPatient(patient);
  };

  const handleConfirmToggleStatus = async () => {
    if (!togglingStatusPatient || !therapistId || !organizationId) return;

    const newStatus = togglingStatusPatient.assignmentStatus === 'inactive' ? 'active' : 'inactive';

    try {
      await updateStatus({
        variables: {
          therapistId,
          patientId: togglingStatusPatient.id,
          organizationId,
          status: newStatus,
        },
      });
      toast.success(`Pacjent został ${newStatus === 'active' ? 'aktywowany' : 'dezaktywowany'}`);
      setTogglingStatusPatient(null);
    } catch (error) {
      console.error('Błąd podczas zmiany statusu:', error);
      toast.error('Nie udało się zmienić statusu pacjenta');
    }
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
      toast.success('Pacjent został usunięty z listy');
      setDeletingPatient(null);
    } catch (error) {
      console.error('Błąd podczas usuwania:', error);
      toast.error('Nie udało się usunąć pacjenta');
    }
  };

  // Convert selected patient to AssignmentWizard format
  const wizardPatient: AssignmentPatient | undefined = selectedPatient
    ? {
        id: selectedPatient.id,
        name: selectedPatient.fullname || 'Nieznany pacjent',
        email: selectedPatient.email,
        image: selectedPatient.image,
        isShadowUser: selectedPatient.isShadowUser,
      }
    : undefined;

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
          <h1 className="text-2xl font-semibold">Pacjenci</h1>
          <p className="text-muted-foreground text-sm mt-1">Zarządzaj pacjentami i przypisuj im programy ćwiczeń</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} disabled={!organizationId}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj pacjenta
        </Button>
      </div>

      {/* Filters */}
      <PatientFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filter={filter}
        onFilterChange={setFilter}
        resultCount={filteredPatients.length}
        totalCount={patients.length}
      />

      {/* Patients List - Expandable Cards */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPatients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16">
            <EmptyState
              icon={Users}
              title={searchQuery || filter !== 'all' ? 'Nie znaleziono pacjentów' : 'Brak pacjentów'}
              description={
                searchQuery || filter !== 'all'
                  ? 'Spróbuj zmienić kryteria wyszukiwania lub filtry'
                  : 'Dodaj pierwszego pacjenta do swojej listy'
              }
              actionLabel={!searchQuery && filter === 'all' ? 'Dodaj pacjenta' : undefined}
              onAction={!searchQuery && filter === 'all' ? () => setIsDialogOpen(true) : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredPatients.map((patient) => (
            <PatientExpandableCard
              key={patient.id}
              patient={patient}
              onAssignSet={handleAssignSet}
              onViewReport={handleViewReport}
              onToggleStatus={handleToggleStatus}
              onRemove={(p) => setDeletingPatient(p)}
              organizationId={organizationId || ''}
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

      {/* Assignment Wizard */}
      {wizardPatient && organizationId && therapistId && (
        <AssignmentWizard
          open={isAssignDialogOpen}
          onOpenChange={(open) => {
            setIsAssignDialogOpen(open);
            if (!open) {
              setSelectedPatient(null);
            }
          }}
          mode="from-patient"
          preselectedPatient={wizardPatient}
          organizationId={organizationId}
          therapistId={therapistId}
          onSuccess={() => {
            setIsAssignDialogOpen(false);
            setSelectedPatient(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingPatient}
        onOpenChange={(open) => !open && setDeletingPatient(null)}
        title="Odepnij pacjenta"
        description={`Czy na pewno chcesz odepnąć pacjenta "${
          deletingPatient?.fullname || 'Nieznany'
        }" ze swojej listy? Pacjent pozostanie w organizacji.`}
        confirmText="Odepnij"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={removing}
      />

      {/* Toggle Status Confirmation */}
      <ConfirmDialog
        open={!!togglingStatusPatient}
        onOpenChange={(open) => !open && setTogglingStatusPatient(null)}
        title={togglingStatusPatient?.assignmentStatus === 'inactive' ? 'Aktywuj pacjenta' : 'Dezaktywuj pacjenta'}
        description={`Czy na pewno chcesz ${
          togglingStatusPatient?.assignmentStatus === 'inactive' ? 'aktywować' : 'dezaktywować'
        } pacjenta "${togglingStatusPatient?.fullname || 'Nieznany'}"?`}
        confirmText={togglingStatusPatient?.assignmentStatus === 'inactive' ? 'Aktywuj' : 'Dezaktywuj'}
        variant="default"
        onConfirm={handleConfirmToggleStatus}
        isLoading={updatingStatus}
      />
    </div>
  );
}
