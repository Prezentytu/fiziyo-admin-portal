'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import { Plus, Search, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageSheet, PageHeader } from '@/components/shared/page';
import { PatientExpandableCard, PATIENT_ROW_GRID, type Patient } from '@/features/patients/PatientExpandableCard';
import { PatientDialog } from '@/features/patients/PatientDialog';
import { PatientQRCodeDialog } from '@/features/patients/PatientQRCodeDialog';
import { TakeOverDialog } from '@/features/patients/TakeOverDialog';
import { AssignmentWizard } from '@/features/assignment/AssignmentWizard';
import { getPatientActivityStatus, needsAttention } from '@/features/patients/utils/patientActivityStatus';
import { sortPatients, type PatientSort } from '@/features/patients/utils/patientList';
import type { Patient as AssignmentPatient } from '@/features/assignment/types';
import { cn } from '@/lib/utils';

import { GET_ORGANIZATION_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import {
  REMOVE_PATIENT_FROM_THERAPIST_MUTATION,
  REMOVE_PATIENT_FROM_ORGANIZATION_MUTATION,
} from '@/graphql/mutations/therapists.mutations';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import { matchesSearchQuery } from '@/utils/textUtils';
import { useOrganization } from '@/contexts/OrganizationContext';
import { DashboardRouteLoading } from '@/components/layout/DashboardRouteLoading';
import type { UserByClerkIdResponse, OrganizationPatientsResponse, OrganizationPatientDto } from '@/types/apollo';
import { useRealtimePatients } from '@/hooks/useRealtimePatients';

type TherapyFilterType = 'my' | 'all' | 'needs_attention' | 'subscription';

const patientNeedsAttention = (patient: Patient): boolean => needsAttention(getPatientActivityStatus(patient.lastActivity));

// Expired, missing or ending within 7 days
const hasSubscriptionIssue = (patient: Patient): boolean => {
  if (!patient.premiumValidUntil) return true;
  const daysUntilExpiry = Math.floor((new Date(patient.premiumValidUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry <= 7;
};

const FILTER_TABS: ReadonlyArray<{ id: TherapyFilterType; label: string; testId: string; countClass: string }> = [
  { id: 'my', label: 'Moi pacjenci', testId: 'patient-filter-my-btn', countClass: 'text-label-secondary' },
  { id: 'all', label: 'Wszyscy', testId: 'patient-filter-all-btn', countClass: 'text-label-secondary' },
  { id: 'needs_attention', label: 'Brak aktywności', testId: 'patient-filter-attention-btn', countClass: 'text-status-warning' },
  { id: 'subscription', label: 'Subskrypcja', testId: 'patient-filter-subscription-btn', countClass: 'text-status-danger' },
];

export default function PatientsPage() {
  const { user } = useUser();
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
  const [sort, setSort] = useState<PatientSort>('urgency');
  const [isCompact, setIsCompact] = useState(false);

  // Get organization ID from context (changes when user switches organization)
  const organizationId = currentOrganization?.organizationId;

  // Get user data for therapistId
  const { data: userData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const userByClerkId = (userData as UserByClerkIdResponse)?.userByClerkId;
  const therapistId = userByClerkId?.id;

  useRealtimePatients({
    organizationId: organizationId ?? null,
    enabled: !!organizationId,
  });

  // Get ALL organization patients (always fetch all, filter client-side)
  const { data, loading, error } = useQuery(GET_ORGANIZATION_PATIENTS_QUERY, {
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
  const needsAttentionCount = myPatients.filter(patientNeedsAttention).length;
  // Subscription issues: my patients with expired/expiring premium
  const subscriptionIssueCount = myPatients.filter(hasSubscriptionIssue).length;

  // Filter by selected filter (client-side)
  const filterByType = (patients: Patient[]) => {
    switch (patientFilter) {
      case 'my':
        return patients.filter((p) => p.therapist?.id === therapistId);
      case 'needs_attention':
        return patients.filter((p) => p.therapist?.id === therapistId && patientNeedsAttention(p));
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

  const filteredPatients = sortPatients(searchFilteredPatients, sort, therapistId);

  const tabCounts: Record<TherapyFilterType, number> = {
    my: myCount,
    all: totalCount,
    needs_attention: needsAttentionCount,
    subscription: subscriptionIssueCount,
  };

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
        return 'Nie masz jeszcze pacjentów';
      case 'needs_attention':
        return 'Wszyscy Twoi pacjenci ćwiczą';
      case 'subscription':
        return 'Wszyscy mają aktywne Premium';
      default:
        return 'Brak pacjentów w organizacji';
    }
  };

  const getEmptyStateDescription = (filter: TherapyFilterType) => {
    switch (filter) {
      case 'my':
        return 'Dodaj pierwszą osobę albo przejmij opiekę w zakładce „Wszyscy”.';
      case 'needs_attention':
        return 'Nikt nie ma przerwy dłuższej niż 1 dzień.';
      case 'subscription':
        return 'Nikomu z Twoich pacjentów nie kończy się dostęp w tym tygodniu.';
      default:
        return 'Dodaj pierwszego pacjenta do organizacji';
    }
  };

  if (orgContextLoading && !organizationId) {
    return <DashboardRouteLoading />;
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-status-danger">Nie udało się pobrać pacjentów. Odśwież stronę.</p>
      </div>
    );
  }

  return (
    <PageSheet contentClassName="gap-6">
      <PageHeader
        title="Pacjenci"
        titleTestId="patient-page-title"
        subtitle={`${myCount} pod Twoją opieką · ${totalCount} w organizacji`}
        actions={
          <>
            <label className="relative w-full sm:w-[300px]">
              <span className="sr-only">Szukaj pacjentów</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-label-secondary" aria-hidden="true" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj pacjentów"
                className="pl-10"
                data-testid="patient-search-input"
              />
            </label>
            <Button
              onClick={() => setIsDialogOpen(true)}
              disabled={!organizationId}
              aria-label="Dodaj pacjenta. Nowy pacjent w systemie"
              data-testid="patient-create-btn"
            >
              <Plus aria-hidden="true" />
              Dodaj pacjenta
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-x-4 gap-y-2 shadow-[inset_0_-0.5px_0_var(--separator)]">
        <Tabs
          value={patientFilter}
          onValueChange={(value) => setPatientFilter(value as TherapyFilterType)}
          className="min-w-0 flex-auto"
        >
          <TabsList variant="underline" aria-label="Filtr pacjentów" className="max-w-full">
            {FILTER_TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} activeVariant="underline" data-testid={tab.testId}>
                {tab.label}
                <span className={cn('ml-1.5 tabular-nums', tab.countClass)}>{tabCounts[tab.id]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-1 pb-1.5">
          <label className="inline-flex h-8 items-center gap-1.5 px-2.5 text-[13px] font-semibold text-label-secondary">
            Sortuj
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as PatientSort)}
              className="h-8 cursor-pointer rounded-full border-0 bg-fill-tertiary px-2.5 text-[13px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="patient-sort-select"
            >
              <option value="urgency">Najdłużej bez treningu</option>
              <option value="name">Nazwisko A–Z</option>
            </select>
          </label>
          <Button
            variant={isCompact ? 'outline' : 'secondary'}
            size="sm"
            aria-pressed={isCompact}
            onClick={() => setIsCompact((value) => !value)}
            className={cn('hidden sm:inline-flex', isCompact && 'border-tint text-tint')}
            data-testid="patient-compact-toggle-btn"
          >
            Widok zwarty
          </Button>
        </div>
      </div>

      {searchQuery && (
        <div className="flex items-center gap-2 text-[13px] text-label-secondary">
          <span aria-live="polite">
            {filteredPatients.length} z {filteredByType.length} pacjentów pasuje do „{searchQuery}”
          </span>
          <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} data-testid="patient-search-clear-btn">
            Wyczyść wyszukiwanie
          </Button>
        </div>
      )}

      <section aria-label="Lista pacjentów">
        <div
          aria-hidden="true"
          className={cn(
            'hidden px-3 pb-2.5 text-[13px] font-semibold text-label-secondary min-[1180px]:grid',
            PATIENT_ROW_GRID
          )}
        >
          <span>Pacjent</span>
          <span>Ostatni trening</span>
          <span>Dostęp</span>
          <span className="text-right">Akcje</span>
        </div>
        {loading ? (
          <div aria-busy="true">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex min-h-[68px] items-center gap-3 border-t-[0.5px] border-separator px-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="border-t-[0.5px] border-separator">
            <EmptyState
              icon={Users}
              title={searchQuery ? `Brak wyników dla „${searchQuery}”` : getEmptyStateTitle(patientFilter)}
              description={
                searchQuery ? 'Sprawdź pisownię albo szukaj po e-mailu lub telefonie.' : getEmptyStateDescription(patientFilter)
              }
              actionLabel={!searchQuery && patientFilter === 'my' ? 'Dodaj pacjenta' : undefined}
              onAction={!searchQuery && patientFilter === 'my' ? () => setIsDialogOpen(true) : undefined}
            />
          </div>
        ) : (
          <div>
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
                compact={isCompact}
              />
            ))}
          </div>
        )}
      </section>

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
        description={`Pacjent „${
          removingFromOrgPatient?.fullname || 'Nieznany'
        }” zniknie z organizacji razem z planami. Tej operacji nie można cofnąć.`}
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
    </PageSheet>
  );
}
