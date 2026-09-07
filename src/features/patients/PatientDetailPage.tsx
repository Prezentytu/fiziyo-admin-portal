'use client';

import { use, useCallback, useMemo, useState } from 'react';
import { useQuery, useApolloClient } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  Phone,
  FolderKanban,
  Activity,
  Settings,
  MoreHorizontal,
  UserX,
  Wrench,
  Send,
  QrCode,
  Mic,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageHero } from '@/components/shared/page/PageHero';
import { PageShell } from '@/components/shared/page/PageShell';
import { StatTiles } from '@/components/shared/page/StatTiles';
import { ActivityReport } from '@/features/patients/ActivityReport';
import { PatientAssignmentCard } from '@/features/patients/PatientAssignmentCard';
import { PatientDetailSkeleton } from '@/features/patients/PatientDetailSkeleton';
import { PremiumStatusBadge } from '@/features/patients/PremiumStatusBadge';
import { ActivatePremiumDialog } from '@/features/patients/ActivatePremiumDialog';
import { ClinicalNotesList } from '@/components/clinical/ClinicalNotesList';
import { PatientJournalNotes } from '@/features/patients/PatientJournalNotes';
import type { PatientAssignment, ExerciseMapping, ExerciseOverride } from '@/features/patients/PatientAssignmentCard';

import { GET_USER_BY_ID_QUERY } from '@/graphql/queries/users.queries';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import { GET_ORGANIZATION_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { usePatientPremium } from '@/hooks/usePatientPremium';
import { resolveAssignmentDisplayStatus } from '@/features/patients/utils/assignmentDisplayStatus';
import { usePatientTherapyActions } from '@/features/patients/hooks/usePatientTherapyActions';
import type { OrganizationPatientsResponse, UserByIdResponse } from '@/types/apollo';

// Dialogs
import { VisitPanel } from '@/features/visits/VisitPanel';
import type { AssignmentWizardProps } from '@/features/assignment/types';
import { AssignmentWizard } from '@/features/assignment/AssignmentWizard';
import type { AssignmentEditInput, Patient as AssignmentPatient } from '@/features/assignment/types';
import { EditExerciseOverrideDialog } from '@/features/patients/EditExerciseOverrideDialog';
import { AddExerciseToPatientDialog } from '@/features/patients/AddExerciseToPatientDialog';
import { ExercisePreviewDrawer } from '@/features/patients/ExercisePreviewDrawer';
import { ExtendSetDialog } from '@/features/patients/ExtendSetDialog';
import { GeneratePDFDialog } from '@/features/exercise-sets/GeneratePDFDialog.dynamic';
import { PatientQRCodeDialog } from '@/features/patients/PatientQRCodeDialog.dynamic';
import { EditPatientDialog } from '@/features/patients/EditPatientDialog';
interface PatientDetailPageProps {
  readonly params: Promise<{ id: string }>;
}

interface PatientAssignmentsData {
  patientAssignments?: PatientAssignment[];
}

export function PatientDetailPage({ params }: PatientDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { currentOrganization } = useOrganization();

  // Dialog states
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isQRCodeDialogOpen, setIsQRCodeDialogOpen] = useState(false);
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isVisitListening, setIsVisitListening] = useState(false);
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
  const apollo = useApolloClient();
  const [visitExercises, setVisitExercises] = useState<AssignmentWizardProps['visitExercises']>();
  const [extendingAssignment, setExtendingAssignment] = useState<PatientAssignment | null>(null);

  // Get organization ID from context (changes when user switches organization)
  const organizationId = currentOrganization?.organizationId;

  const { user: currentUser } = useCurrentUser();
  const therapistId = currentUser?.id;

  // Get patient data
  const {
    data: userData,
    loading: userLoading,
    error: userError,
    refetch: refetchPatient,
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
  const { data: orgPatientsData, refetch: refetchOrganizationPatients } = useQuery<OrganizationPatientsResponse>(
    GET_ORGANIZATION_PATIENTS_QUERY,
    {
      variables: { organizationId: organizationId ?? '', filter: 'all' },
      skip: !organizationId,
      fetchPolicy: 'cache-and-network',
    }
  );

  const patient = (userData as UserByIdResponse)?.userById;
  const assignments = (assignmentsData as PatientAssignmentsData)?.patientAssignments || [];
  const organizationPatient = orgPatientsData?.organizationPatients.find((item) => item.patient.id === id);
  const patientPremiumValidUntil = organizationPatient?.premiumValidUntil ?? null;

  const { initiateActivation, confirmActivation, cancelActivation, isActivating, showConfirmDialog, activationTarget } =
    usePatientPremium({
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
                      mapping.load.unit === 'kg' || mapping.load.unit === 'lbs' || mapping.load.unit === 'level'
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
      <PageShell>
        <ErrorState
          title={userError ? 'Nie udało się wczytać pacjenta' : 'Nie znaleziono pacjenta'}
          description={userError?.message}
          onRetry={userError ? () => void refetchPatient() : () => router.push('/patients')}
        />
      </PageShell>
    );
  }

  const displayName =
    patient.fullname ||
    `${patient.personalData?.firstName || ''} ${patient.personalData?.lastName || ''}`.trim() ||
    'Nieznany pacjent';

  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
        <div className="space-y-3">
          <LoadingState type="row" count={3} />
        </div>
      );
    }

    if (setAssignments.length === 0) {
      return (
        <EmptyState
          icon={FolderKanban}
          title="Brak planów ćwiczeń"
          description="Pacjent nie ma jeszcze przypisanego planu."
          actionLabel="Przypisz plan"
          onAction={() => setIsAssignDialogOpen(true)}
        />
      );
    }

    return (
      <div className="space-y-3">
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
    <PageShell>
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] xl:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
        <Button
          aria-label="Wróć do pacjentów"
          title="Wróć do pacjentów"
          variant="ghost"
          size="icon"
          onClick={() => router.push('/patients')}
          className="h-11 w-11 shrink-0 text-muted-foreground hover:text-foreground"
          data-testid="patient-detail-back-btn"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="col-span-2 row-start-2 flex min-w-0 items-start gap-3 sm:col-span-1 sm:col-start-2 sm:row-start-1">
          <div className="relative shrink-0">
            <Avatar
              className={cn('h-11 w-11 ring-2', patient.isShadowUser ? 'ring-muted-foreground/20' : 'ring-primary/20')}
            >
              <AvatarImage src={patient.image} alt={displayName} />
              <AvatarFallback
                className={cn(
                  'text-sm font-semibold',
                  patient.isShadowUser ? 'bg-muted text-muted-foreground' : 'bg-primary-muted text-primary'
                )}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            {patient.isShadowUser && (
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-muted flex items-center justify-center ring-2 ring-background">
                <Wrench className="h-2.5 w-2.5 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1
                className="min-w-0 text-xl font-semibold leading-snug text-foreground wrap-anywhere"
                data-testid="patient-detail-name"
              >
                {displayName}
              </h1>
              {patient.isShadowUser && (
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  Tymczasowe
                </Badge>
              )}
              {organizationId && (
                <PremiumStatusBadge
                  premiumActiveUntil={patientPremiumValidUntil}
                  patientId={patient.id}
                  onActivate={() => initiateActivation(patient.id, displayName, patientPremiumValidUntil)}
                  onGenerateQR={() => setIsQRCodeDialogOpen(true)}
                  isShadowUser={patient.isShadowUser}
                  isActivating={isActivating && activationTarget?.patientId === patient.id}
                  showActivateButton={true}
                  size="sm"
                  className="max-w-full flex-wrap"
                />
              )}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {patient.email && (
                <a
                  data-testid="patient-patient-detail-page-btn-415"
                  href={`mailto:${patient.email}`}
                  className="flex min-h-10 min-w-0 max-w-full items-center gap-2 rounded-sm hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 wrap-anywhere">{patient.email}</span>
                </a>
              )}
              {patient.contactData?.phone && (
                <a
                  data-testid="patient-patient-detail-page-btn-424"
                  href={`tel:${patient.contactData.phone}`}
                  className="flex min-h-10 min-w-0 max-w-full items-center gap-2 rounded-sm hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 wrap-anywhere">{patient.contactData.phone}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Opcje pacjenta"
              title="Opcje pacjenta"
              variant="ghost"
              size="icon"
              className="col-start-2 row-start-1 h-11 w-11 shrink-0 sm:col-start-3 xl:col-start-4"
              data-testid="patient-detail-menu-trigger"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsQRCodeDialogOpen(true)} data-testid="patient-detail-qr-btn">
              <QrCode className="mr-2 h-4 w-4" />
              Pokaż QR kod
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsEditPatientOpen(true)} data-testid="patient-detail-settings-btn">
              <Settings className="mr-2 h-4 w-4" />
              Ustawienia pacjenta
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              data-testid="patient-detail-remove-menu-item"
              className="text-destructive focus:text-destructive"
            >
              <UserX className="mr-2 h-4 w-4" />
              Usuń z mojej listy
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-2 sm:col-span-3 xl:col-span-1 xl:col-start-3 xl:row-start-1">
          <PageHero
            testId="patient-detail-assign-btn"
            variant="toolbar"
            title="Przypisz plan"
            icon={<Send />}
            onClick={() => {
              setVisitExercises(undefined);
              setIsAssignDialogOpen(true);
            }}
            disabled={!organizationId || !therapistId}
          />
          <Button
            data-testid="patient-detail-qr-btn-hero"
            variant="outline"
            onClick={() => setIsQRCodeDialogOpen(true)}
            disabled={!organizationId || !therapistId}
            className="min-h-11"
          >
            <QrCode className="h-4 w-4" />
            QR kod
          </Button>
          {isVisitListening && organizationId && therapistId && (
            <div role="status" className="sm:ml-auto">
              <Button
                data-testid="patient-detail-listening-btn"
                variant="outline"
                className="min-h-11 border-destructive text-destructive"
                onClick={() => setActiveTab('visit')}
              >
                <Mic className="h-4 w-4" />
                Trwa słuchanie
              </Button>
            </div>
          )}
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0">
        <TabsList variant="underline" aria-label="Widok pacjenta">
          <TabsTrigger data-testid="patient-detail-overview-tab" value="overview" activeVariant="underline">
            Przegląd
          </TabsTrigger>
          {organizationId && therapistId && (
            <TabsTrigger data-testid="patient-detail-visit-tab" value="visit" activeVariant="underline">
              Wizyta
            </TabsTrigger>
          )}
          <TabsTrigger data-testid="patient-detail-activity-tab" value="activity" activeVariant="underline">
            Aktywność
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" forceMount className="mt-6 min-w-0 space-y-6 data-[state=inactive]:hidden">
          <StatTiles
            variant="summary"
            tiles={[
              { id: 'active-sets', label: 'Aktywne plany', value: activeAssignments.length },
              { id: 'completions', label: 'Wykonań łącznie', value: totalCompletions },
            ]}
          />

          <div
            className={cn(
              'grid min-w-0 gap-6',
              therapistId && organizationId && 'lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]'
            )}
          >
            <section aria-labelledby="patient-detail-assignments-heading" className="min-w-0 space-y-4">
              <h2
                id="patient-detail-assignments-heading"
                className="flex min-h-11 flex-wrap items-center gap-2 text-base font-semibold text-foreground"
              >
                <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                Plany ćwiczeń
                <Badge variant="secondary" className="text-xs">
                  {setAssignments.length}
                </Badge>
              </h2>
              {assignmentsSectionContent}
            </section>

            {therapistId && organizationId && (
              <div className="min-w-0 space-y-6">
                <ClinicalNotesList
                  patientId={id}
                  therapistId={therapistId}
                  organizationId={organizationId}
                  patientName={patient?.fullname}
                />
                <PatientJournalNotes patientId={id} organizationId={organizationId} />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" forceMount className="mt-6 min-w-0 data-[state=inactive]:hidden">
          <section aria-labelledby="patient-detail-activity-heading" className="min-w-0 space-y-4 lg:col-span-12">
            <h2
              id="patient-detail-activity-heading"
              className="flex items-center gap-2 text-base font-semibold text-foreground"
            >
              <Activity className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              Aktywność i postępy
            </h2>
            <ActivityReport
              patientId={id}
              patientName={displayName}
              heatmapDays={21}
              journalDays={3}
              onCall={therapyActions.handleCall}
              onEditPlan={therapyActions.handleEditPlan}
              onSendMessage={therapyActions.handleSendMessage}
              onSendPraise={therapyActions.handleSendPraise}
            />
          </section>
        </TabsContent>

        <TabsContent value="visit" forceMount className="mt-6 min-w-0 data-[state=inactive]:hidden">
          {organizationId && therapistId && (
            <VisitPanel
              key={`${organizationId}:${id}`}
              patientId={id}
              organizationId={organizationId}
              onListeningChange={setIsVisitListening}
              onSaved={() => {
                void apollo.refetchQueries({ include: ['GetPatientClinicalNotes'] }).catch(() => undefined);
              }}
              onPlan={(exercises) => {
                setVisitExercises(
                  exercises.flatMap((exercise) =>
                    exercise.exerciseId && exercise.sets
                      ? [
                          {
                            exerciseId: exercise.exerciseId,
                            sets: exercise.sets,
                            reps: exercise.reps ?? undefined,
                            duration: exercise.duration ?? undefined,
                          },
                        ]
                      : []
                  )
                );
                setIsAssignDialogOpen(true);
              }}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Assignment Wizard */}
      {organizationId && therapistId && patient && (
        <AssignmentWizard
          visitExercises={visitExercises}
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
          patient={{ name: displayName, email: patient.email }}
          organizationId={organizationId}
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
    </PageShell>
  );
}
