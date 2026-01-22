'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import { Plus, Users, UserPlus, UserCheck, AlertTriangle, Sparkles, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PatientExpandableCard, Patient } from '@/components/patients/PatientExpandableCard';
import { PatientDialog } from '@/components/patients/PatientDialog';
import { PatientQRCodeDialog } from '@/components/patients/PatientQRCodeDialog';
import { TakeOverDialog } from '@/components/patients/TakeOverDialog';
import { AssignmentWizard } from '@/components/assignment/AssignmentWizard';

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
import type { Patient as AssignmentPatient } from '@/components/assignment/types';
import { cn } from '@/lib/utils';

import { GET_ORGANIZATION_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { GET_CURRENT_ORGANIZATION_PLAN } from '@/graphql/queries/organizations.queries';
import {
  REMOVE_PATIENT_FROM_THERAPIST_MUTATION,
  REMOVE_PATIENT_FROM_ORGANIZATION_MUTATION,
} from '@/graphql/mutations/therapists.mutations';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import { matchesSearchQuery } from '@/utils/textUtils';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { UserByClerkIdResponse, OrganizationPatientsResponse, OrganizationPatientDto } from '@/types/apollo';

export default function PatientsPage() {
  const { user } = useUser();
  const { currentOrganization } = useOrganization();
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

  // Get user data for therapistId
  const { data: userData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const userByClerkId = (userData as UserByClerkIdResponse)?.userByClerkId;
  const therapistId = userByClerkId?.id;

  // Get ALL organization patients (always fetch all, filter client-side)
  const { data, loading, error } = useQuery(GET_ORGANIZATION_PATIENTS_QUERY, {
    variables: { organizationId, filter: 'all' },
    skip: !organizationId,
  });

  // Mutations
  const [unassignPatient, { loading: unassigning }] = useMutation(REMOVE_PATIENT_FROM_THERAPIST_MUTATION, {
    refetchQueries: [
      { query: GET_ORGANIZATION_PATIENTS_QUERY, variables: { organizationId, filter: 'all' } },
    ],
  });

  const [removeFromOrganization, { loading: removingFromOrg }] = useMutation(REMOVE_PATIENT_FROM_ORGANIZATION_MUTATION, {
    refetchQueries: [
      { query: GET_ORGANIZATION_PATIENTS_QUERY, variables: { organizationId, filter: 'all' } },
      { query: GET_CURRENT_ORGANIZATION_PLAN, variables: { organizationId } },
    ],
  });

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
        <h1 className="text-2xl font-bold text-foreground" data-testid="patient-page-title">Pacjenci</h1>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj pacjentów..."
            className="pl-9 bg-surface border-border/60"
            data-testid="patient-search-input"
          />
        </div>
      </div>

      {/* Hero Action - Add Patient */}
      <button
        onClick={() => setIsDialogOpen(true)}
        disabled={!organizationId}
        className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 w-full sm:w-auto sm:max-w-md"
        data-testid="patient-create-btn"
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

      {/* Therapy Management Tabs */}
      <Tabs
        value={patientFilter}
        onValueChange={(value) => setPatientFilter(value as TherapyFilterType)}
        className="w-full"
      >
        <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex h-auto p-1 bg-surface-light/50 rounded-xl">
          <TabsTrigger
            value="my"
            className="gap-2 data-[state=active]:bg-surface data-[state=active]:shadow-sm px-4 py-2.5"
            data-testid="patient-filter-my-btn"
          >
            <UserCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Moi pacjenci</span>
            <span className="sm:hidden">Moi</span>
            <Badge variant="secondary" className="ml-1 text-xs bg-primary/20 text-primary">
              {myCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="all"
            className="gap-2 data-[state=active]:bg-surface data-[state=active]:shadow-sm px-4 py-2.5"
            data-testid="patient-filter-all-btn"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Wszyscy</span>
            <span className="sm:hidden">Wszyscy</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {totalCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="needs_attention"
            className={cn(
              "gap-2 data-[state=active]:bg-surface data-[state=active]:shadow-sm px-4 py-2.5",
              needsAttentionCount > 0 && "data-[state=inactive]:text-warning"
            )}
            data-testid="patient-filter-attention-btn"
          >
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Wymagają uwagi</span>
            <span className="sm:hidden">Uwaga</span>
            {needsAttentionCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs bg-warning/20 text-warning">
                {needsAttentionCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="subscription"
            className={cn(
              "gap-2 data-[state=active]:bg-surface data-[state=active]:shadow-sm px-4 py-2.5",
              subscriptionIssueCount > 0 && "data-[state=inactive]:text-destructive"
            )}
            data-testid="patient-filter-subscription-btn"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Subskrypcja</span>
            <span className="sm:hidden">Sub.</span>
            {subscriptionIssueCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs bg-destructive/20 text-destructive">
                {subscriptionIssueCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Results info */}
      {searchQuery && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Wyniki:</span>
          <Badge variant="secondary" className="text-xs">
            {filteredPatients.length} z {filteredByType.length}
          </Badge>
          <Button
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
              title={searchQuery ? 'Nie znaleziono pacjentów' : getEmptyStateTitle(patientFilter)}
              description={searchQuery ? 'Spróbuj zmienić kryteria wyszukiwania' : getEmptyStateDescription(patientFilter)}
              actionLabel={!searchQuery && patientFilter === 'my' ? 'Dodaj pacjenta' : undefined}
              onAction={!searchQuery && patientFilter === 'my' ? () => setIsDialogOpen(true) : undefined}
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

      {/* QR Code / Recepta Dialog */}
      {therapistId && organizationId && (
        <PatientQRCodeDialog
          open={!!qrPatient}
          onOpenChange={(open) => !open && setQrPatient(null)}
          patient={qrPatient ? {
            id: qrPatient.id,
            name: qrPatient.fullname || 'Nieznany pacjent',
            email: qrPatient.email,
          } : null}
          therapistId={therapistId}
          organizationId={organizationId}
        />
      )}
    </div>
  );
}
