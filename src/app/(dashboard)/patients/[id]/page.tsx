'use client';

import { use, useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ChevronLeft,
  Mail,
  Phone,
  FolderKanban,
  Settings,
  MoreHorizontal,
  UserX,
  Send,
  QrCode,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageSheet, SectionHeader, InitialsAvatar } from '@/components/shared/page';
import { ActivityReport } from '@/features/patients/ActivityReport';
import { PatientAssignmentCard } from '@/features/patients/PatientAssignmentCard';
import { PatientDetailSkeleton } from '@/features/patients/PatientDetailSkeleton';
import { getPatientAccess } from '@/features/patients/utils/patientList';
import { ActivatePremiumDialog } from '@/features/patients/ActivatePremiumDialog';
import { ClinicalNotesList } from '@/components/clinical/ClinicalNotesList';
import { PatientJournalNotes } from '@/features/patients/PatientJournalNotes';
import type { PatientAssignment, ExerciseMapping, ExerciseOverride } from '@/features/patients/PatientAssignmentCard';

import { GET_USER_BY_ID_QUERY, GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import { useOrganization } from '@/contexts/OrganizationContext';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import { GET_ORGANIZATION_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { REMOVE_PATIENT_FROM_THERAPIST_MUTATION } from '@/graphql/mutations/therapists.mutations';
import { usePatientPremium } from '@/hooks/usePatientPremium';
import { resolveAssignmentDisplayStatus } from '@/features/patients/utils/assignmentDisplayStatus';
import { usePatientTherapyActions } from '@/features/patients/hooks/usePatientTherapyActions';
import type { OrganizationPatientsResponse, UserByIdResponse } from '@/types/apollo';

// Dialogs
import { AssignmentWizard } from '@/features/assignment/AssignmentWizard';
import type { AssignmentEditInput, Patient as AssignmentPatient } from '@/features/assignment/types';
import { EditExerciseOverrideDialog } from '@/features/patients/EditExerciseOverrideDialog';
import { AddExerciseToPatientDialog } from '@/features/patients/AddExerciseToPatientDialog';
import { ExercisePreviewDrawer } from '@/features/patients/ExercisePreviewDrawer';
import { ExtendSetDialog } from '@/features/patients/ExtendSetDialog';
import { GeneratePDFDialog } from '@/features/exercise-sets/GeneratePDFDialog';
import { PatientQRCodeDialog } from '@/features/patients/PatientQRCodeDialog';
import { EditPatientDialog } from '@/features/patients/EditPatientDialog';
interface PatientDetailPageProps {
  readonly params: Promise<{ id: string }>;
}

interface PatientAssignmentsData {
  patientAssignments?: PatientAssignment[];
}

export default function PatientDetailPage({ params }: PatientDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const { currentOrganization } = useOrganization();

  // Dialog states
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isQRCodeDialogOpen, setIsQRCodeDialogOpen] = useState(false);
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [editingPlanAssignment, setEditingPlanAssignment] = useState<PatientAssignment | null>(null);
  const [editingExerciseData, setEditingExerciseData] = useState<{
    assignment: PatientAssignment;
    mapping: ExerciseMapping;
    override?: ExerciseOverride;
  } | null>(null);
  const [pdfAssignment, setPdfAssignment] = useState<PatientAssignment | null>(null);
  const [addExerciseAssignment, setAddExerciseAssignment] = useState<PatientAssignment | null>(null);
  const [previewExercise, setPreviewExercise] = useState<{
    mapping: ExerciseMapping;
    override?: ExerciseOverride;
  } | null>(null);
  const [extendingAssignment, setExtendingAssignment] = useState<PatientAssignment | null>(null);
  const [isRemoveFromListOpen, setIsRemoveFromListOpen] = useState(false);
  const [removeFromMyList, { loading: removingFromList }] = useMutation(REMOVE_PATIENT_FROM_THERAPIST_MUTATION);

  // Get organization ID from context (changes when user switches organization)
  const organizationId = currentOrganization?.organizationId;

  // Get current user data for therapistId
  const { data: currentUserData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const currentUser = (currentUserData as { userByClerkId?: { id?: string } })?.userByClerkId;
  const therapistId = currentUser?.id;

  // Get patient data
  const {
    data: userData,
    loading: userLoading,
    error: userError,
  } = useQuery(GET_USER_BY_ID_QUERY, {
    variables: { id },
  });

  // Get patient assignments
  const {
    data: assignmentsData,
    loading: assignmentsLoading,
    refetch: refetchAssignments,
  } = useQuery(GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY, {
    variables: { userId: id },
  });
  const { data: orgPatientsData, refetch: refetchOrganizationPatients } = useQuery<OrganizationPatientsResponse>(GET_ORGANIZATION_PATIENTS_QUERY, {
    variables: { organizationId: organizationId ?? '', filter: 'all' },
    skip: !organizationId,
    fetchPolicy: 'cache-and-network',
  });

  const patient = (userData as UserByIdResponse)?.userById;
  const assignments = (assignmentsData as PatientAssignmentsData)?.patientAssignments || [];
  const organizationPatient = orgPatientsData?.organizationPatients.find((item) => item.patient.id === id);
  const patientPremiumValidUntil = organizationPatient?.premiumValidUntil ?? null;

  const {
    initiateActivation,
    confirmActivation,
    cancelActivation,
    isActivating,
    showConfirmDialog,
    activationTarget,
  } = usePatientPremium({
    organizationId: organizationId ?? '',
    onSuccess: () => {
      void refetchAssignments();
      void refetchOrganizationPatients();
    },
  });

  // Filter only exercise set assignments (not individual exercises)
  const setAssignments = assignments.filter((a) => a.exerciseSetId);

  const handleEditPlan = useCallback((assignment: PatientAssignment) => {
    setEditingPlanAssignment(assignment);
  }, []);

  const therapyActions = usePatientTherapyActions({
    patientPhone: patient?.contactData?.phone,
    assignments: setAssignments,
    premiumValidUntil: patientPremiumValidUntil,
    onEditPlan: handleEditPlan,
    onOpenAssign: () => setIsAssignDialogOpen(true),
  });

  const editingAssignmentInput = useMemo<AssignmentEditInput | null>(() => {
    if (!editingPlanAssignment?.exerciseSet?.id || !editingPlanAssignment.exerciseSetId) {
      return null;
    }

    const nowIso = new Date().toISOString();

    return {
      id: editingPlanAssignment.id,
      exerciseSetId: editingPlanAssignment.exerciseSetId,
      startDate: editingPlanAssignment.startDate || nowIso,
      endDate: editingPlanAssignment.endDate || nowIso,
      frequency: {
        timesPerDay: editingPlanAssignment.frequency?.timesPerDay || 1,
        timesPerWeek: editingPlanAssignment.frequency?.timesPerWeek,
        isFlexible: editingPlanAssignment.frequency?.isFlexible,
        breakBetweenSets: editingPlanAssignment.frequency?.breakBetweenSets || 60,
        monday: editingPlanAssignment.frequency?.monday ?? false,
        tuesday: editingPlanAssignment.frequency?.tuesday ?? false,
        wednesday: editingPlanAssignment.frequency?.wednesday ?? false,
        thursday: editingPlanAssignment.frequency?.thursday ?? false,
        friday: editingPlanAssignment.frequency?.friday ?? false,
        saturday: editingPlanAssignment.frequency?.saturday ?? false,
        sunday: editingPlanAssignment.frequency?.sunday ?? false,
      },
      exerciseSet: {
        id: editingPlanAssignment.exerciseSet.id,
        name: editingPlanAssignment.exerciseSet.name,
        description: editingPlanAssignment.exerciseSet.description,
        exerciseMappings: (editingPlanAssignment.exerciseSet.exerciseMappings || []).map((mapping) => {
          const { load: _discardLoad, ...mappingWithoutLooseLoad } = mapping;
          return {
            ...mappingWithoutLooseLoad,
            order: mapping.order ?? undefined,
            sets: mapping.sets ?? undefined,
            reps: mapping.reps ?? undefined,
            duration: mapping.duration ?? undefined,
            restSets: mapping.restSets ?? undefined,
            restReps: mapping.restReps ?? undefined,
            preparationTime: mapping.preparationTime ?? undefined,
            executionTime: mapping.executionTime ?? undefined,
            tempo: mapping.tempo ?? undefined,
            notes: mapping.notes ?? undefined,
            customName: mapping.customName ?? undefined,
            customDescription: mapping.customDescription ?? undefined,
            loadType: mapping.loadType ?? undefined,
            loadValue: mapping.loadValue ?? undefined,
            loadUnit: mapping.loadUnit ?? undefined,
            loadText: mapping.loadText ?? undefined,
            load:
              mapping.load?.text != null
                ? {
                    loadWeightKg: mapping.load.loadWeightKg,
                    loadSource: mapping.load.loadSource,
                    type:
                      mapping.load.type === 'band' ||
                      mapping.load.type === 'bodyweight' ||
                      mapping.load.type === 'other'
                        ? mapping.load.type
                        : 'weight',
                    value: mapping.load.value,
                    unit:
                      mapping.load.unit === 'kg' ||
                      mapping.load.unit === 'lbs' ||
                      mapping.load.unit === 'level'
                        ? mapping.load.unit
                        : undefined,
                    text: mapping.load.text,
                  }
                : undefined,
          };
        }),
      },
    };
  }, [editingPlanAssignment]);

  if (userLoading) {
    return <PatientDetailSkeleton />;
  }

  if (userError || !patient) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 py-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-fill-tertiary">
          <User className="h-6 w-6 text-label-secondary" />
        </div>
        <p className="text-[15px] text-foreground">
          {userError ? 'Nie udało się pobrać pacjenta. Odśwież stronę.' : 'Nie znaleziono pacjenta'}
        </p>
        <Button variant="secondary" onClick={() => router.push('/patients')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Wróć do listy
        </Button>
      </div>
    );
  }

  const displayName =
    patient.fullname ||
    `${patient.personalData?.firstName || ''} ${patient.personalData?.lastName || ''}`.trim() ||
    'Nieznany pacjent';

  const access = getPatientAccess({
    isShadowUser: patient.isShadowUser,
    premiumValidUntil: patientPremiumValidUntil,
    premiumStatus: organizationPatient?.premiumStatus,
  });
  const isMyPatient = !!therapistId && organizationPatient?.therapist?.id === therapistId;
  const therapyGoal =
    organizationPatient?.contextLabel && organizationPatient.contextLabel !== 'Leczenie podstawowe'
      ? organizationPatient.contextLabel
      : null;

  const handleRemoveFromMyList = async () => {
    if (!therapistId || !organizationId) return;
    try {
      await removeFromMyList({ variables: { therapistId, patientId: patient.id, organizationId } });
      toast.success('Pacjent nie jest już na Twojej liście');
      setIsRemoveFromListOpen(false);
      router.push('/patients');
    } catch {
      toast.error('Nie udało się odpiąć pacjenta');
    }
  };

  const activeAssignments = setAssignments.filter((assignment) => {
    return (
      resolveAssignmentDisplayStatus({
        status: assignment.status,
        endDate: assignment.endDate,
        premiumValidUntil: patientPremiumValidUntil,
      }).primary.kind === 'active'
    );
  });
  const totalCompletions = setAssignments.reduce((sum, a) => sum + (a.completionCount || 0), 0);
  const assignmentWizardPatient = {
    id: patient.id,
    name: displayName,
    email: patient.email,
    image: patient.image,
    isShadowUser: patient.isShadowUser,
  } as AssignmentPatient;

  const handleEditExercise = (assignment: PatientAssignment, mapping: ExerciseMapping, override?: ExerciseOverride) => {
    setEditingExerciseData({ assignment, mapping, override });
  };

  const handleAddExerciseToAssignment = (assignment: PatientAssignment) => {
    setAddExerciseAssignment(assignment);
  };

  const handlePreviewExercise = (mapping: ExerciseMapping, override?: ExerciseOverride) => {
    setPreviewExercise({ mapping, override });
  };

  const handleGeneratePDF = (assignment: PatientAssignment) => {
    setPdfAssignment(assignment);
  };

  const handleExtend = (assignment: PatientAssignment) => {
    setExtendingAssignment(assignment);
  };

  const assignmentsSectionContent = (() => {
    if (assignmentsLoading) {
      return (
        <div className="space-y-3 animate-stagger">
          <LoadingState type="row" count={3} />
        </div>
      );
    }

    if (setAssignments.length === 0) {
      return (
        <div className="rounded-card bg-grouped-tertiary">
          <EmptyState
            icon={FolderKanban}
            title="Pacjent nie ma jeszcze planu"
            description="Przypisz zestaw, żeby pacjent zobaczył ćwiczenia w aplikacji."
            actionLabel="Przypisz zestaw"
            onAction={() => setIsAssignDialogOpen(true)}
          />
        </div>
      );
    }

    return (
      <div className="space-y-3 animate-stagger">
        {setAssignments.map((assignment) => (
          <PatientAssignmentCard
            key={assignment.id}
            assignment={assignment}
            patientId={id}
            patientPremiumValidUntil={patientPremiumValidUntil}
            onEditPlan={handleEditPlan}
            onEditExercise={handleEditExercise}
            onPreviewExercise={handlePreviewExercise}
            onAddExercise={handleAddExerciseToAssignment}
            onExtend={handleExtend}
            onGeneratePDF={handleGeneratePDF}
            onActivatePremium={() => initiateActivation(patient.id, displayName, patientPremiumValidUntil)}
            onRefresh={() => refetchAssignments()}
          />
        ))}
      </div>
    );
  })();

  return (
    <PageSheet contentClassName="gap-7">
      <Link
        href="/patients"
        data-testid="patient-detail-back-btn"
        className="-mb-2 inline-flex h-8 items-center gap-1 self-start rounded-md text-[15px] font-semibold text-tint hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Pacjenci
      </Link>

      <header className="flex flex-wrap items-center gap-x-5 gap-y-4">
        <InitialsAvatar
          name={displayName}
          imageUrl={patient.image}
          muted={patient.isShadowUser}
          className="h-16 w-16 [&>span]:text-[24px]"
        />
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-[28px] font-bold leading-[34px] tracking-tight text-foreground" data-testid="patient-detail-name">
              {displayName}
            </h1>
            {access.kind === 'premium' && (
              <span className="inline-flex h-6 items-center rounded-full bg-status-success-muted px-2.5 text-[12px] font-semibold text-status-success">
                {access.label}
              </span>
            )}
            {access.kind === 'locked' && organizationId && (
              <Button
                variant="tinted"
                size="sm"
                onClick={() => initiateActivation(patient.id, displayName, patientPremiumValidUntil)}
                disabled={isActivating && activationTarget?.patientId === patient.id}
                data-testid="patient-detail-premium-btn"
              >
                Aktywuj Premium
              </Button>
            )}
            {access.kind === 'shadow' && (
              <span className="inline-flex h-6 items-center rounded-full bg-fill-tertiary px-2.5 text-[12px] font-semibold text-label-secondary">
                Bez konta
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-[18px] gap-y-1 text-[15px]">
            {patient.email && (
              <a href={`mailto:${patient.email}`} className="inline-flex items-center gap-1.5 text-tint hover:text-foreground">
                <Mail className="h-[15px] w-[15px] shrink-0" aria-hidden="true" />
                {patient.email}
              </a>
            )}
            {patient.contactData?.phone && (
              <a href={`tel:${patient.contactData.phone}`} className="inline-flex items-center gap-1.5 text-tint hover:text-foreground">
                <Phone className="h-[15px] w-[15px] shrink-0" aria-hidden="true" />
                {patient.contactData.phone}
              </a>
            )}
            {therapyGoal && <span className="text-label-secondary">{therapyGoal}</span>}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-11 w-11"
              aria-label="Więcej: kod QR, ustawienia pacjenta, odepnij ode mnie"
              data-testid="patient-detail-menu-trigger"
            >
              <MoreHorizontal className="h-[18px] w-[18px]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsQRCodeDialogOpen(true)} data-testid="patient-detail-qr-btn">
              <QrCode className="mr-2 h-4 w-4" />
              Kod QR do aplikacji
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsEditPatientOpen(true)} data-testid="patient-detail-settings-btn">
              <Settings className="mr-2 h-4 w-4" />
              Ustawienia pacjenta
            </DropdownMenuItem>
            {isMyPatient && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsRemoveFromListOpen(true)}
                  className="text-status-danger focus:text-status-danger"
                  data-testid="patient-detail-remove-from-list-btn"
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Odepnij ode mnie
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex flex-wrap items-stretch gap-1.5 rounded-[18px] bg-grouped-tertiary p-1.5">
        <button
          type="button"
          onClick={() => setIsAssignDialogOpen(true)}
          disabled={!organizationId || !therapistId}
          aria-label="Personalizuj i przypisz zestaw ćwiczeń"
          className="group flex min-h-16 flex-[1_1_240px] items-center gap-3.5 rounded-[13px] bg-tint-fill px-[18px] text-left text-on-tint transition-colors hover:bg-tint-fill-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
          data-testid="patient-detail-assign-btn"
        >
          <Send className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="flex flex-1 flex-col">
            <span className="text-[15px] font-semibold">Przypisz zestaw</span>
            <span className="text-[13px] opacity-85">Dopasuj ćwiczenia do pacjenta</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setIsQRCodeDialogOpen(true)}
          disabled={!organizationId || !therapistId}
          className="flex min-h-16 flex-[1_1_200px] items-center gap-3.5 rounded-[13px] px-[18px] text-left text-foreground transition-colors hover:bg-fill-quaternary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
          data-testid="patient-detail-qr-btn-hero"
        >
          <QrCode className="h-5 w-5 shrink-0 text-tint" aria-hidden="true" />
          <span className="flex flex-1 flex-col">
            <span className="text-[15px] font-semibold">Kod QR</span>
            <span className="text-[13px] text-label-secondary">Połącz pacjenta z aplikacją</span>
          </span>
        </button>
        <div className="flex flex-[1_1_280px] items-center px-3">
          <span className="flex flex-1 flex-col px-3">
            <span className="text-[28px] font-bold leading-[34px] tabular-nums text-foreground">{activeAssignments.length}</span>
            <span className="text-[13px] text-label-secondary">Aktywne plany</span>
          </span>
          <span className="flex flex-1 flex-col border-l-[0.5px] border-separator px-3">
            <span className="text-[28px] font-bold leading-[34px] tabular-nums text-foreground">{totalCompletions}</span>
            <span className="text-[13px] text-label-secondary">Wykonane treningi</span>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-stretch">
        <section
          aria-labelledby="patient-plans-heading"
          className={
            therapistId && organizationId
              ? 'flex min-w-0 flex-[2_1_520px] flex-col gap-4 lg:pr-9'
              : 'flex min-w-0 flex-[1_1_100%] flex-col gap-4'
          }
        >
          <SectionHeader
            id="patient-plans-heading"
            title={
              <>
                Plany ćwiczeń <span className="ml-1 text-label-secondary">{setAssignments.length}</span>
              </>
            }
            className="[&>h2]:text-[20px] [&>h2]:leading-[25px]"
          />
          {assignmentsSectionContent}
        </section>

        {therapistId && organizationId && (
          <aside className="mt-7 flex min-w-0 flex-[1_1_300px] flex-col gap-7 border-t-[0.5px] border-separator pt-7 lg:mt-0 lg:border-l-[0.5px] lg:border-t-0 lg:pl-9 lg:pt-0">
            <ClinicalNotesList patientId={id} therapistId={therapistId} organizationId={organizationId} />
            <PatientJournalNotes patientId={id} organizationId={organizationId} />
          </aside>
        )}
      </div>

      <section aria-labelledby="patient-activity-heading" className="flex flex-col gap-2 border-t-[0.5px] border-separator pt-7">
        <SectionHeader
          id="patient-activity-heading"
          title="Raport aktywności"
          className="[&>h2]:text-[20px] [&>h2]:leading-[25px]"
        />
        <ActivityReport
          patientId={id}
          heatmapDays={21}
          journalDays={3}
          onCall={therapyActions.handleCall}
          onEditPlan={therapyActions.handleEditPlan}
          onSendMessage={therapyActions.handleSendMessage}
          onSendPraise={therapyActions.handleSendPraise}
        />
      </section>

      <ConfirmDialog
        open={isRemoveFromListOpen}
        onOpenChange={setIsRemoveFromListOpen}
        title="Odepnąć pacjenta od Ciebie?"
        description={`${displayName} zostanie w organizacji bez przypisanego fizjoterapeuty. Plany i historia zostają.`}
        confirmText="Odepnij"
        variant="destructive"
        onConfirm={handleRemoveFromMyList}
        isLoading={removingFromList}
      />

      {/* Assignment Wizard */}
      {organizationId && therapistId && patient && (
        <AssignmentWizard
          open={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          mode="from-patient"
          preselectedPatient={assignmentWizardPatient}
          organizationId={organizationId}
          therapistId={therapistId}
          onSuccess={() => refetchAssignments()}
        />
      )}

      {organizationId && therapistId && editingAssignmentInput && (
        <AssignmentWizard
          open={!!editingPlanAssignment}
          onOpenChange={(open) => !open && setEditingPlanAssignment(null)}
          mode="from-patient"
          preselectedPatient={assignmentWizardPatient}
          organizationId={organizationId}
          therapistId={therapistId}
          editMode
          initialAssignment={editingAssignmentInput}
          onSuccess={() => {
            refetchAssignments();
            setEditingPlanAssignment(null);
          }}
        />
      )}

      <EditExerciseOverrideDialog
        open={!!editingExerciseData}
        onOpenChange={(open) => !open && setEditingExerciseData(null)}
        assignment={editingExerciseData?.assignment ?? null}
        mapping={editingExerciseData?.mapping ?? null}
        currentOverride={editingExerciseData?.override}
        patientId={id}
        onSuccess={() => {
          refetchAssignments();
          setEditingExerciseData(null);
        }}
      />

      {/* Generate PDF Dialog */}
      {organizationId && pdfAssignment?.exerciseSet && (
        <GeneratePDFDialog
          open={!!pdfAssignment}
          onOpenChange={(open) => !open && setPdfAssignment(null)}
          exerciseSet={{
            id: pdfAssignment.exerciseSet.id,
            name: pdfAssignment.exerciseSet.name,
            description: pdfAssignment.exerciseSet.description,
            exerciseMappings: pdfAssignment.exerciseSet.exerciseMappings,
            frequency: pdfAssignment.frequency,
          }}
          patient={{ id: patient.id, name: displayName, email: patient.email }}
          organizationId={organizationId}
          therapistId={therapistId}
        />
      )}

      {/* QR Code Dialog */}
      {organizationId && therapistId && (
        <PatientQRCodeDialog
          open={isQRCodeDialogOpen}
          onOpenChange={setIsQRCodeDialogOpen}
          patient={{
            id: patient.id,
            name: displayName,
            email: patient.email,
          }}
          therapistId={therapistId}
          organizationId={organizationId}
        />
      )}

      {/* Add Exercise to Patient Dialog */}
      {organizationId && (
        <AddExerciseToPatientDialog
          open={!!addExerciseAssignment}
          onOpenChange={(open) => !open && setAddExerciseAssignment(null)}
          assignment={addExerciseAssignment}
          patientId={id}
          organizationId={organizationId}
          onSuccess={() => {
            refetchAssignments();
            setAddExerciseAssignment(null);
          }}
        />
      )}

      {/* Exercise Preview Drawer */}
      <ExercisePreviewDrawer
        open={!!previewExercise}
        onOpenChange={(open) => !open && setPreviewExercise(null)}
        mapping={previewExercise?.mapping ?? null}
        override={previewExercise?.override}
      />

      {/* Extend Set Dialog */}
      {extendingAssignment?.exerciseSet && organizationId && (
        <ExtendSetDialog
          open={!!extendingAssignment}
          onOpenChange={(open) => !open && setExtendingAssignment(null)}
          assignment={{
            id: extendingAssignment.id,
            exerciseSetId: extendingAssignment.exerciseSetId || '',
            exerciseSetName: extendingAssignment.exerciseSet.name,
            startDate: extendingAssignment.startDate || new Date().toISOString(),
            endDate: extendingAssignment.endDate || new Date().toISOString(),
            frequency: extendingAssignment.frequency,
          }}
          patient={{
            id: patient.id,
            name: displayName,
          }}
          organizationId={organizationId}
          onSuccess={() => refetchAssignments()}
        />
      )}

      {/* Edit Patient Dialog */}
      <EditPatientDialog open={isEditPatientOpen} onOpenChange={setIsEditPatientOpen} patient={patient} />

      {/* Activate Premium Dialog */}
      {organizationId && (
        <ActivatePremiumDialog
          open={showConfirmDialog}
          onOpenChange={(open) => !open && cancelActivation()}
          patientName={activationTarget?.patientName}
          currentPremiumValidUntil={activationTarget?.premiumValidUntil}
          onConfirm={confirmActivation}
          onCancel={cancelActivation}
          isLoading={isActivating}
        />
      )}
    </PageSheet>
  );
}
