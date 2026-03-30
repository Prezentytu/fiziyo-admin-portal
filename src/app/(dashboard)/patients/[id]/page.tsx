'use client';

import { use, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  ArrowLeft,
  Mail,
  Phone,
  FolderKanban,
  Activity,
  Plus,
  Settings,
  MoreHorizontal,
  UserX,
  Wrench,
  CheckCircle2,
  Send,
  QrCode,
  User,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { ActivityReport } from '@/features/patients/ActivityReport';
import { PatientAssignmentCard } from '@/features/patients/PatientAssignmentCard';
import { PatientDetailSkeleton } from '@/features/patients/PatientDetailSkeleton';
import { ClinicalNotesList } from '@/components/clinical/ClinicalNotesList';
import type { PatientAssignment, ExerciseMapping, ExerciseOverride } from '@/features/patients/PatientAssignmentCard';

import { GET_USER_BY_ID_QUERY, GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import { useOrganization } from '@/contexts/OrganizationContext';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import type { UserByIdResponse } from '@/types/apollo';

// Dialogs
import { AssignmentWizard } from '@/features/assignment/AssignmentWizard';
import type { Patient as AssignmentPatient } from '@/features/assignment/types';
import { EditAssignmentScheduleDialog } from '@/features/patients/EditAssignmentScheduleDialog';
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
  const [editingScheduleAssignment, setEditingScheduleAssignment] = useState<PatientAssignment | null>(null);
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

  const patient = (userData as UserByIdResponse)?.userById;
  const assignments = (assignmentsData as PatientAssignmentsData)?.patientAssignments || [];

  // Filter only exercise set assignments (not individual exercises)
  const setAssignments = assignments.filter((a) => a.exerciseSetId);

  if (userLoading) {
    return <PatientDetailSkeleton />;
  }

  if (userError || !patient) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 py-16">
        <div className="h-16 w-16 rounded-2xl bg-surface-light flex items-center justify-center">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-destructive">{userError ? `Błąd: ${userError.message}` : 'Nie znaleziono pacjenta'}</p>
        <Button variant="outline" onClick={() => router.push('/patients')}>
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

  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const activeAssignments = setAssignments.filter((a) => a.status === 'active');
  const totalCompletions = setAssignments.reduce((sum, a) => sum + (a.completionCount || 0), 0);

  const handleEditSchedule = (assignment: PatientAssignment) => {
    setEditingScheduleAssignment(assignment);
  };

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
        <Card className="border-dashed border-border/60">
          <CardContent className="py-12">
            <EmptyState
              icon={FolderKanban}
              title="Brak przypisanych zestawów"
              description="Przypisz pacjentowi zestaw ćwiczeń, aby mógł rozpocząć rehabilitację"
              actionLabel="Przypisz zestaw"
              onAction={() => setIsAssignDialogOpen(true)}
            />
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3 animate-stagger">
        {setAssignments.map((assignment) => (
          <PatientAssignmentCard
            key={assignment.id}
            assignment={assignment}
            patientId={id}
            onEditSchedule={handleEditSchedule}
            onEditExercise={handleEditExercise}
            onPreviewExercise={handlePreviewExercise}
            onAddExercise={handleAddExerciseToAssignment}
            onExtend={handleExtend}
            onGeneratePDF={handleGeneratePDF}
            onRefresh={() => refetchAssignments()}
          />
        ))}
      </div>
    );
  })();

  return (
    <div className="space-y-6">
      {/* Patient Header — back, info & menu in one row */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/patients')}
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
          data-testid="patient-detail-back-btn"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="relative shrink-0">
          <Avatar
            className={cn(
              'h-11 w-11 ring-2 transition-all',
              patient.isShadowUser ? 'ring-muted-foreground/20' : 'ring-primary/20'
            )}
          >
            <AvatarImage src={patient.image} alt={displayName} />
            <AvatarFallback
              className={cn(
                'text-sm font-semibold',
                patient.isShadowUser
                  ? 'bg-muted-foreground/60 text-white'
                  : 'bg-linear-to-br from-primary to-primary-dark text-primary-foreground'
              )}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          {patient.isShadowUser && (
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-muted-foreground/80 flex items-center justify-center ring-2 ring-background">
              <Wrench className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground truncate" data-testid="patient-detail-name">
              {displayName}
            </h1>
            {patient.isShadowUser && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                Tymczasowe
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {patient.email && (
              <a
                href={`mailto:${patient.email}`}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                {patient.email}
              </a>
            )}
            {patient.contactData?.phone && (
              <a
                href={`tel:${patient.contactData.phone}`}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Phone className="h-3.5 w-3.5 shrink-0" />
                {patient.contactData.phone}
              </a>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" data-testid="patient-detail-menu-trigger">
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
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <UserX className="mr-2 h-4 w-4" />
              Usuń z mojej listy
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hero Actions + Quick Stats */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12">
        <button
          onClick={() => setIsAssignDialogOpen(true)}
          disabled={!organizationId || !therapistId}
          className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-primary via-primary to-primary-dark p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 sm:col-span-1 lg:col-span-4"
          data-testid="patient-detail-assign-btn"
        >
          <div className="absolute inset-0 bg-linear-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Send className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-white">Przypisz zestaw</h3>
              <p className="text-sm text-white/70">Program ćwiczeń</p>
            </div>
            <Plus className="h-5 w-5 text-white/60 group-hover:text-white transition-colors shrink-0" />
          </div>
        </button>

        <button
          onClick={() => setIsQRCodeDialogOpen(true)}
          disabled={!organizationId || !therapistId}
          className="group relative overflow-hidden rounded-2xl border border-border/20 bg-surface-elevated p-5 text-left transition-all duration-150 hover:border-info/30 hover:bg-surface hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed sm:col-span-1 lg:col-span-4"
          data-testid="patient-detail-qr-btn-hero"
        >
          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-info/10 shrink-0 group-hover:bg-info/20 group-hover:scale-110 transition-all duration-150">
              <QrCode className="h-5 w-5 text-info" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-foreground group-hover:text-info transition-colors duration-150">QR kod</h3>
              <p className="text-sm text-muted-foreground">Połącz z aplikacją</p>
            </div>
          </div>
        </button>

        <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-4">
          <div className="rounded-2xl border border-border/40 bg-surface/50 p-4 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold text-foreground">{activeAssignments.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Aktywnych zestawów</p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-surface/50 p-4 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-secondary" />
              <span className="text-2xl font-bold text-foreground">{totalCompletions}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Wykonań łącznie</p>
          </div>
        </div>
      </div>

      {/* Main Content - Bento grid */}
      <div className="grid gap-4 md:gap-5 lg:grid-cols-12">
        {/* Row 1: Assignments + Documentation */}
        <Card className={cn(
          'bg-surface border-border shadow-md overflow-hidden rounded-xl md:rounded-2xl',
          therapistId && organizationId ? 'lg:col-span-8' : 'lg:col-span-12'
        )}>
          <CardHeader className="p-4 md:px-6 md:pt-6 md:pb-4">
            <CardTitle className="flex items-center gap-2 md:gap-3 text-sm md:text-base font-semibold">
              <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg md:rounded-xl bg-primary/10">
                <FolderKanban className="h-4 w-4 text-primary" />
              </div>
              Przypisane zestawy
              <Badge variant="secondary" className="ml-1 text-xs">
                {setAssignments.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {assignmentsSectionContent}
          </CardContent>
        </Card>

        {therapistId && organizationId && (
          <div className="lg:col-span-4">
            <ClinicalNotesList
              patientId={id}
              therapistId={therapistId}
              organizationId={organizationId}
              patientName={patient?.fullname}
            />
          </div>
        )}

        {/* Row 2: Activity - full width */}
        <Card className="bg-surface border-border shadow-md overflow-hidden rounded-xl md:rounded-2xl lg:col-span-12">
          <CardHeader className="p-4 md:px-6 md:pt-6 md:pb-4">
            <CardTitle className="flex items-center gap-2 md:gap-3 text-sm md:text-base font-semibold">
              <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg md:rounded-xl bg-info/10">
                <Activity className="h-4 w-4 text-info" />
              </div>
              Aktywność i postępy
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ActivityReport patientId={id} patientName={displayName} heatmapDays={21} journalDays={3} />
          </CardContent>
        </Card>
      </div>

      {/* Assignment Wizard */}
      {organizationId && therapistId && patient && (
        <AssignmentWizard
          open={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          mode="from-patient"
          preselectedPatient={
            {
              id: patient.id,
              name: displayName,
              email: patient.email,
              image: patient.image,
              isShadowUser: patient.isShadowUser,
            } as AssignmentPatient
          }
          organizationId={organizationId}
          therapistId={therapistId}
          onSuccess={() => refetchAssignments()}
        />
      )}

      <EditAssignmentScheduleDialog
        open={!!editingScheduleAssignment}
        onOpenChange={(open) => !open && setEditingScheduleAssignment(null)}
        assignment={editingScheduleAssignment}
        patientId={id}
        onSuccess={() => {
          refetchAssignments();
          setEditingScheduleAssignment(null);
        }}
      />

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
    </div>
  );
}
