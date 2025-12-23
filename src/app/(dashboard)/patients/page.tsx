'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Plus, Users, UserPlus, UserCheck, UserX, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PatientExpandableCard, Patient } from '@/components/patients/PatientExpandableCard';
import { PatientDialog } from '@/components/patients/PatientDialog';
import { AssignmentWizard } from '@/components/assignment/AssignmentWizard';
import type { Patient as AssignmentPatient } from '@/components/assignment/types';
import { cn } from '@/lib/utils';

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

  // Transform data
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

  // Calculate stats
  const totalCount = patients.length;
  const activeCount = patients.filter((p) => p.assignmentStatus !== 'inactive').length;
  const inactiveCount = patients.filter((p) => p.assignmentStatus === 'inactive').length;

  // Filter by status
  const statusFilteredPatients = patients.filter((patient) => {
    if (filter === 'all') return true;
    if (filter === 'active') return patient.assignmentStatus !== 'inactive';
    if (filter === 'inactive') return patient.assignmentStatus === 'inactive';
    return true;
  });

  // Filter by search query
  const searchFilteredPatients = statusFilteredPatients.filter((patient) => {
    const fullName =
      patient.fullname || `${patient.personalData?.firstName || ''} ${patient.personalData?.lastName || ''}`.trim();
    return (
      matchesSearchQuery(fullName, searchQuery) ||
      matchesSearchQuery(patient.email, searchQuery) ||
      matchesSearchQuery(patient.contactData?.phone, searchQuery) ||
      matchesSearchQuery(patient.contactData?.address, searchQuery)
    );
  });

  // Sort: active patients first, inactive at the bottom
  const filteredPatients = [...searchFilteredPatients].sort((a, b) => {
    const aInactive = a.assignmentStatus === 'inactive';
    const bInactive = b.assignmentStatus === 'inactive';
    if (aInactive && !bInactive) return 1;
    if (!aInactive && bInactive) return -1;
    return 0;
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
    } catch (err) {
      console.error('Błąd podczas zmiany statusu:', err);
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
    } catch (err) {
      console.error('Błąd podczas usuwania:', err);
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
      {/* Compact Header with Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Pacjenci</h1>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj pacjentów..."
            className="pl-9 bg-surface border-border/60"
          />
        </div>
      </div>

      {/* Hero Action + Quick Stats */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12">
        {/* Hero Action - Dodaj pacjenta */}
        <button
          onClick={() => setIsDialogOpen(true)}
          disabled={!organizationId}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 sm:col-span-1 lg:col-span-5"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />
          
          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-white">
                Dodaj pacjenta
              </h3>
              <p className="text-sm text-white/70">
                Nowy pacjent w systemie
              </p>
            </div>
            <Plus className="h-5 w-5 text-white/60 group-hover:text-white transition-colors shrink-0" />
          </div>
        </button>

        {/* Quick Stats - Clickable filters */}
        <div className="grid grid-cols-3 gap-3 sm:col-span-1 lg:col-span-7">
          {/* All patients */}
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'rounded-2xl border p-4 flex flex-col items-center justify-center text-center transition-all duration-200',
              filter === 'all'
                ? 'border-primary/40 bg-primary/10 ring-1 ring-primary/20'
                : 'border-border/40 bg-surface/50 hover:bg-surface-light hover:border-border'
            )}
          >
            <div className="flex items-center gap-2">
              <Users className={cn('h-4 w-4', filter === 'all' ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('text-2xl font-bold', filter === 'all' ? 'text-primary' : 'text-foreground')}>
                {totalCount}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Wszyscy</p>
          </button>

          {/* Active patients */}
          <button
            onClick={() => setFilter('active')}
            className={cn(
              'rounded-2xl border p-4 flex flex-col items-center justify-center text-center transition-all duration-200',
              filter === 'active'
                ? 'border-secondary/40 bg-secondary/10 ring-1 ring-secondary/20'
                : 'border-border/40 bg-surface/50 hover:bg-surface-light hover:border-border'
            )}
          >
            <div className="flex items-center gap-2">
              <UserCheck className={cn('h-4 w-4', filter === 'active' ? 'text-secondary' : 'text-muted-foreground')} />
              <span className={cn('text-2xl font-bold', filter === 'active' ? 'text-secondary' : 'text-foreground')}>
                {activeCount}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Aktywni</p>
          </button>

          {/* Inactive patients */}
          <button
            onClick={() => setFilter('inactive')}
            className={cn(
              'rounded-2xl border p-4 flex flex-col items-center justify-center text-center transition-all duration-200',
              filter === 'inactive'
                ? 'border-muted-foreground/40 bg-muted/30 ring-1 ring-muted-foreground/20'
                : 'border-border/40 bg-surface/50 hover:bg-surface-light hover:border-border'
            )}
          >
            <div className="flex items-center gap-2">
              <UserX className={cn('h-4 w-4', filter === 'inactive' ? 'text-muted-foreground' : 'text-muted-foreground')} />
              <span className={cn('text-2xl font-bold', filter === 'inactive' ? 'text-muted-foreground' : 'text-foreground')}>
                {inactiveCount}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Nieaktywni</p>
          </button>
        </div>
      </div>

      {/* Results info */}
      {(searchQuery || filter !== 'all') && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Wyniki:</span>
          <Badge variant="secondary" className="text-xs">
            {filteredPatients.length} z {totalCount}
          </Badge>
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setSearchQuery('')}
            >
              Wyczyść wyszukiwanie
            </Button>
          )}
          {filter !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setFilter('all')}
            >
              Pokaż wszystkich
            </Button>
          )}
        </div>
      )}

      {/* Patients List */}
      {loading ? (
        <div className="space-y-2 animate-stagger">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="border-border/40">
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
        <Card className="border-dashed border-border/60">
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
        <div className="space-y-2 animate-stagger">
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
