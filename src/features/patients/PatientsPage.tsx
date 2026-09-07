'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ListSkeleton } from '@/components/shared/ListSkeleton';
import { SearchInput } from '@/components/shared/SearchInput';
import { PageHeader } from '@/components/shared/page/PageHeader';
import { PageHero } from '@/components/shared/page/PageHero';
import { PageShell } from '@/components/shared/page/PageShell';
import { StatTiles } from '@/components/shared/page/StatTiles';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PatientExpandableCard, Patient } from '@/features/patients/PatientExpandableCard';
import { PatientDialog } from '@/features/patients/PatientDialog';
import { PatientQRCodeDialog } from '@/features/patients/PatientQRCodeDialog.dynamic';
import { TakeOverDialog } from '@/features/patients/TakeOverDialog';
import { AssignmentWizard } from '@/features/assignment/AssignmentWizard';

// Extended filter type for Therapy Management View
type TherapyFilterType = 'my' | 'all' | 'needs_attention' | 'subscription';

// Helper: Check if patient needs attention (inactive > 7 days)
const needsAttention = (patient: Patient): boolean => {
  if (!patient.lastActivity) return true; // Never active = needs attention
  const lastActivityDate = new Date(patient.lastActivity);
  const daysSinceActivity = Math.floor((Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
  return daysSinceActivity >= 7;
};

// Helper: Check if patient has subscription issues (expired or expiring soon)
const hasSubscriptionIssue = (patient: Patient): boolean => {
  if (!patient.premiumValidUntil) return true; // No premium = issue
  const expiryDate = new Date(patient.premiumValidUntil);
  const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry <= 7; // Expiring within 7 days or already expired
};
import type { Patient as AssignmentPatient } from '@/features/assignment/types';

import { GET_ORGANIZATION_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import {
  REMOVE_PATIENT_FROM_THERAPIST_MUTATION,
  REMOVE_PATIENT_FROM_ORGANIZATION_MUTATION,
} from '@/graphql/mutations/therapists.mutations';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { matchesSearchQuery } from '@/utils/textUtils';
import { useOrganization } from '@/contexts/OrganizationContext';
import { DashboardRouteLoading } from '@/components/layout/DashboardRouteLoading';
import type { OrganizationPatientsResponse, OrganizationPatientDto } from '@/types/apollo';
import { useRealtimePatients } from '@/hooks/useRealtimePatients';

export function PatientsPage() {
  const { currentOrganization, isLoading: orgContextLoading } = useOrganization();
  const [searchQuery, setSearchQuery] = useState('');
  const [patientFilter, setPatientFilter] = useState<TherapyFilterType>('my');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [unassigningPatient, setUnassigningPatient] = useState<Patient | null>(null);
  const [removingFromOrgPatient, setRemovingFromOrgPatient] = useState<Patient | null>(null);
  const [takeOverPatient, setTakeOverPatient] = useState<Patient | null>(null);
  const [qrPatient, setQrPatient] = useState<Patient | null>(null);

  // Get organization ID from context (changes when user switches organization)
  const organizationId = currentOrganization?.organizationId;

  const { user: currentUser } = useCurrentUser();
  const therapistId = currentUser?.id;

  useRealtimePatients({
    organizationId: organizationId ?? null,
    enabled: !!organizationId,
  });

  // Get ALL organization patients (always fetch all, filter client-side)
  const { data, loading, error, refetch } = useQuery(GET_ORGANIZATION_PATIENTS_QUERY, {
    variables: { organizationId, filter: 'all' },
    skip: !organizationId,
  });

  // Mutations
  const [unassignPatient, { loading: unassigning }] = useMutation(REMOVE_PATIENT_FROM_THERAPIST_MUTATION, {
    refetchQueries: [{ query: GET_ORGANIZATION_PATIENTS_QUERY, variables: { organizationId, filter: 'all' } }],
  });

  const [removeFromOrganization, { loading: removingFromOrg }] = useMutation(
    REMOVE_PATIENT_FROM_ORGANIZATION_MUTATION,
    {
      refetchQueries: [{ query: GET_ORGANIZATION_PATIENTS_QUERY, variables: { organizationId, filter: 'all' } }],
    }
  );

  // Transform data from OrganizationPatients query
  const organizationPatients = (data as OrganizationPatientsResponse)?.organizationPatients || [];
  const allPatients: Patient[] = organizationPatients.map((item: OrganizationPatientDto) => ({
    id: item.patient.id,
    assignmentId: item.assignmentId,
    fullname: item.patient.fullname,
    email: item.patient.email,
    image: item.patient.image,
    isShadowUser: item.patient.isShadowUser,
    personalData: item.patient.personalData,
    contactData: item.patient.contactData,
    assignmentStatus: item.assignmentStatus,
    contextLabel: item.contextLabel,
    contextColor: item.contextColor,
    assignedAt: item.assignedAt,
    // Collaborative Care fields
    therapist: item.therapist,
    // Premium Access (Pay-as-you-go Billing)
    premiumValidUntil: item.premiumValidUntil,
    premiumActivatedAt: item.premiumActivatedAt,
    premiumStatus: item.premiumStatus,
    // Activity Tracking
    lastActivity: item.lastActivity,
  }));

  // Calculate stats for filter counts (from all patients)
  const myPatients = allPatients.filter((p) => p.therapist?.id === therapistId);
  const myCount = myPatients.length;
  const totalCount = allPatients.length;
  // Needs attention: my patients who are inactive > 7 days
  const needsAttentionCount = myPatients.filter(needsAttention).length;
  // Subscription issues: my patients with expired/expiring premium
  const subscriptionIssueCount = myPatients.filter(hasSubscriptionIssue).length;

  // Filter by selected filter (client-side)
  const filterByType = (patients: Patient[]) => {
    switch (patientFilter) {
      case 'my':
        return patients.filter((p) => p.therapist?.id === therapistId);
      case 'needs_attention':
        return patients.filter((p) => p.therapist?.id === therapistId && needsAttention(p));
      case 'subscription':
        return patients.filter((p) => p.therapist?.id === therapistId && hasSubscriptionIssue(p));
      default:
        return patients;
    }
  };

  const filteredByType = filterByType(allPatients);

  // Filter by search query
  const searchFilteredPatients = filteredByType.filter((patient) => {
    const fullName =
      patient.fullname || `${patient.personalData?.firstName || ''} ${patient.personalData?.lastName || ''}`.trim();
    return (
      matchesSearchQuery(fullName, searchQuery) ||
      matchesSearchQuery(patient.email, searchQuery) ||
      matchesSearchQuery(patient.contactData?.phone, searchQuery) ||
      matchesSearchQuery(patient.contactData?.address, searchQuery)
    );
  });

  // Sort: my patients first, then by recent activity/assignment date, then by name
  const filteredPatients = [...searchFilteredPatients].sort((a, b) => {
    const aIsMine = a.therapist?.id === therapistId;
    const bIsMine = b.therapist?.id === therapistId;

    // 1. My patients first
    if (aIsMine && !bIsMine) return -1;
    if (!aIsMine && bIsMine) return 1;

    // 2. Sort by most recent activity (lastActivity or assignedAt)
    // Use the more recent of lastActivity and assignedAt for each patient
    const getRecentDate = (patient: Patient): number => {
      const activity = patient.lastActivity ? new Date(patient.lastActivity).getTime() : 0;
      const assigned = patient.assignedAt ? new Date(patient.assignedAt).getTime() : 0;
      return Math.max(activity, assigned);
    };

    const aRecent = getRecentDate(a);
    const bRecent = getRecentDate(b);

    // Newest first (descending)
    if (aRecent !== bRecent) return bRecent - aRecent;

    // 3. Fallback: alphabetically by name
    const aName = a.fullname || '';
    const bName = b.fullname || '';
    return aName.localeCompare(bName);
  });

  const handleAssignSet = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsAssignDialogOpen(true);
  };

  const handleTakeOver = (patient: Patient) => {
    setTakeOverPatient(patient);
  };

  const handleShowQR = (patient: Patient) => {
    setQrPatient(patient);
  };

  const handleUnassign = async () => {
    if (!unassigningPatient || !organizationId) return;

    // Use the patient's assigned therapist ID for unassigning
    const therapistToUnassign = unassigningPatient.therapist?.id;
    if (!therapistToUnassign) {
      toast.error('Pacjent nie jest przypisany do żadnego fizjoterapeuty');
      setUnassigningPatient(null);
      return;
    }

    try {
      await unassignPatient({
        variables: {
          therapistId: therapistToUnassign,
          patientId: unassigningPatient.id,
          organizationId,
        },
      });
      toast.success('Pacjent został odpięty od fizjoterapeuty');
      setUnassigningPatient(null);
    } catch (err) {
      console.error('Błąd podczas odpinania:', err);
      toast.error('Nie udało się odpiąć pacjenta');
    }
  };

  const handleRemoveFromOrganization = async () => {
    if (!removingFromOrgPatient || !organizationId) return;

    try {
      await removeFromOrganization({
        variables: {
          patientId: removingFromOrgPatient.id,
          organizationId,
        },
      });
      toast.success('Pacjent został usunięty z organizacji');
      setRemovingFromOrgPatient(null);
    } catch (err) {
      console.error('Błąd podczas usuwania z organizacji:', err);
      toast.error('Nie udało się usunąć pacjenta z organizacji');
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

  // Helper functions for empty state messages
  const getEmptyStateTitle = (filter: TherapyFilterType) => {
    switch (filter) {
      case 'my':
        return 'Brak Twoich pacjentów';
      case 'needs_attention':
        return 'Wszyscy pacjenci są aktywni!';
      case 'subscription':
        return 'Brak problemów z subskrypcją';
      default:
        return 'Brak pacjentów w organizacji';
    }
  };

  const getEmptyStateDescription = (filter: TherapyFilterType) => {
    switch (filter) {
      case 'my':
        return 'Dodaj pierwszego pacjenta lub przejmij opiekę nad istniejącym';
      case 'needs_attention':
        return 'Wszyscy Twoi pacjenci regularnie wykonują ćwiczenia';
      case 'subscription':
        return 'Wszyscy Twoi pacjenci mają aktywny dostęp Premium';
      default:
        return 'Dodaj pierwszego pacjenta do organizacji';
    }
  };

  if (orgContextLoading && !organizationId) {
    return <DashboardRouteLoading />;
  }

  if (error) {
    return <ErrorState description={error.message} onRetry={() => void refetch()} />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Pacjenci"
        titleTestId="patient-page-title"
        actions={
          <PageHero
            variant="toolbar"
            title="Dodaj pacjenta"
            icon={<UserPlus />}
            onClick={() => setIsDialogOpen(true)}
            disabled={!organizationId}
            testId="patient-create-btn"
          />
        }
      />

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Szukaj pacjentów..."
          aria-label="Szukaj pacjentów"
          testId="patient-search-input"
          className="w-full sm:w-72"
        />
        <StatTiles
          variant="filters"
          tiles={[
            {
              id: 'my',
              label: 'Moi pacjenci',
              value: myCount,
              active: patientFilter === 'my',
              onClick: () => setPatientFilter('my'),
              testId: 'patient-filter-my-btn',
            },
            {
              id: 'all',
              label: 'Wszyscy',
              value: totalCount,
              active: patientFilter === 'all',
              onClick: () => setPatientFilter('all'),
              testId: 'patient-filter-all-btn',
            },
            {
              id: 'needs_attention',
              label: 'Brak aktywności',
              value: needsAttentionCount,
              active: patientFilter === 'needs_attention',
              onClick: () => setPatientFilter('needs_attention'),
              testId: 'patient-filter-attention-btn',
            },
            {
              id: 'subscription',
              label: 'Subskrypcja',
              value: subscriptionIssueCount,
              active: patientFilter === 'subscription',
              onClick: () => setPatientFilter('subscription'),
              testId: 'patient-filter-subscription-btn',
            },
          ]}
        />
      </div>

      {/* Results info */}
      {searchQuery && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Wyniki:</span>
          <Badge variant="secondary" className="text-xs">
            {filteredPatients.length} z {filteredByType.length}
          </Badge>
          <Button
            data-testid="page-button-418"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setSearchQuery('')}
          >
            Wyczyść wyszukiwanie
          </Button>
        </div>
      )}

      {/* Patients List */}
      {loading ? (
        <ListSkeleton variant="rows" count={5} />
      ) : filteredPatients.length === 0 ? (
        <div className="py-6">
          <EmptyState
            icon={Users}
            title={searchQuery ? 'Nie znaleziono pacjentów' : getEmptyStateTitle(patientFilter)}
            description={
              searchQuery ? 'Spróbuj zmienić kryteria wyszukiwania' : getEmptyStateDescription(patientFilter)
            }
            actionLabel={!searchQuery && patientFilter === 'my' ? 'Dodaj pacjenta' : undefined}
            onAction={!searchQuery && patientFilter === 'my' ? () => setIsDialogOpen(true) : undefined}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPatients.map((patient) => (
            <PatientExpandableCard
              key={patient.id}
              patient={patient}
              onAssignSet={handleAssignSet}
              onShowQR={handleShowQR}
              onUnassign={(p) => setUnassigningPatient(p)}
              onRemoveFromOrganization={(p) => setRemovingFromOrgPatient(p)}
              onTakeOver={handleTakeOver}
              organizationId={organizationId || ''}
              therapistId={therapistId || ''}
              showTherapistBadge={patientFilter !== 'my'}
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

      {/* Unassign from Therapist Confirmation */}
      <ConfirmDialog
        open={!!unassigningPatient}
        onOpenChange={(open) => !open && setUnassigningPatient(null)}
        title="Odepnij od fizjoterapeuty"
        description={`Czy na pewno chcesz odpiąć pacjenta "${
          unassigningPatient?.fullname || 'Nieznany'
        }" od fizjoterapeuty ${unassigningPatient?.therapist?.fullname || ''}? Pacjent pozostanie w organizacji jako nieprzypisany.`}
        confirmText="Odepnij"
        variant="default"
        onConfirm={handleUnassign}
        isLoading={unassigning}
      />

      {/* Remove from Organization Confirmation */}
      <ConfirmDialog
        open={!!removingFromOrgPatient}
        onOpenChange={(open) => !open && setRemovingFromOrgPatient(null)}
        title="Usuń z organizacji"
        description={`Czy na pewno chcesz TRWALE usunąć pacjenta "${
          removingFromOrgPatient?.fullname || 'Nieznany'
        }" z organizacji? Ta operacja jest nieodwracalna!`}
        confirmText="Usuń z organizacji"
        variant="destructive"
        onConfirm={handleRemoveFromOrganization}
        isLoading={removingFromOrg}
      />

      {/* Take Over Dialog (Collaborative Care) */}
      <TakeOverDialog
        open={!!takeOverPatient}
        onOpenChange={(open) => !open && setTakeOverPatient(null)}
        patient={takeOverPatient}
        previousTherapist={takeOverPatient?.therapist}
        organizationId={organizationId || ''}
        onSuccess={() => setTakeOverPatient(null)}
      />

      {/* QR Code */}
      {therapistId && organizationId && (
        <PatientQRCodeDialog
          open={!!qrPatient}
          onOpenChange={(open) => !open && setQrPatient(null)}
          patient={
            qrPatient
              ? {
                  id: qrPatient.id,
                  name: qrPatient.fullname || 'Nieznany pacjent',
                  email: qrPatient.email,
                }
              : null
          }
          therapistId={therapistId}
          organizationId={organizationId}
        />
      )}
    </PageShell>
  );
}
