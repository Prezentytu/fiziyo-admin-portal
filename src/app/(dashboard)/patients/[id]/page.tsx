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
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Send,
  QrCode,
  Target,
  User,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ActivityReport } from '@/components/patients/ActivityReport';
import { PatientAssignmentCard } from '@/components/patients/PatientAssignmentCard';
import { ClinicalNotesList } from '@/components/clinical/ClinicalNotesList';
import type { PatientAssignment, ExerciseMapping, ExerciseOverride } from '@/components/patients/PatientAssignmentCard';

import { GET_USER_BY_ID_QUERY, GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import { useOrganization } from '@/contexts/OrganizationContext';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import type { UserByIdResponse } from '@/types/apollo';

// Dialogs
import { AssignmentWizard } from '@/components/assignment/AssignmentWizard';
import type { Patient as AssignmentPatient } from '@/components/assignment/types';
import { EditAssignmentScheduleDialog } from '@/components/patients/EditAssignmentScheduleDialog';
import { EditExerciseOverrideDialog } from '@/components/patients/EditExerciseOverrideDialog';
import { AddExerciseToPatientDialog } from '@/components/patients/AddExerciseToPatientDialog';
import { ExercisePreviewDrawer } from '@/components/patients/ExercisePreviewDrawer';
import { GeneratePDFDialog } from '@/components/exercise-sets/GeneratePDFDialog';
import { PatientQRCodeDialog } from '@/components/patients/PatientQRCodeDialog';
import { BodyMap } from '@/components/patients/bodymap/index';
import { FEATURE_FLAGS } from '@/lib/featureFlags';

interface PatientDetailPageProps {
  params: Promise<{ id: string }>;
}

interface PatientAssignmentsData {
  patientAssignments?: PatientAssignment[];
}

export default function PatientDetailPage({ params }: PatientDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const { currentOrganization } = useOrganization();

  // Collapsible sections state
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  // Dialog states
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isQRCodeDialogOpen, setIsQRCodeDialogOpen] = useState(false);
  const [editingScheduleAssignment, setEditingScheduleAssignment] = useState<PatientAssignment | null>(null);
  const [editingExerciseData, setEditingExerciseData] = useState<{
    assignment: PatientAssignment;
    mapping: ExerciseMapping;
    override?: ExerciseOverride;
  } | null>(null);
  const [pdfAssignment, setPdfAssignment] = useState<PatientAssignment | null>(null);
  const [addExerciseAssignment, setAddExerciseAssignment] = useState<PatientAssignment | null>(null);
  const [previewExercise, setPreviewExercise] = useState<ExerciseMapping | null>(null);

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
    return (
      <div className="space-y-6">
        <LoadingState type="text" count={3} />
      </div>
    );
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

  const handlePreviewExercise = (mapping: ExerciseMapping) => {
    setPreviewExercise(mapping);
  };

  const handleGeneratePDF = (assignment: PatientAssignment) => {
    setPdfAssignment(assignment);
  };

  return (
    <div className="space-y-6">
      {/* Compact Header - Back + Options */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/patients')}
          className="gap-2 text-muted-foreground hover:text-foreground"
          data-testid="patient-detail-back-btn"
        >
          <ArrowLeft className="h-4 w-4" />
          Powrót
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="patient-detail-menu-trigger">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsQRCodeDialogOpen(true)} data-testid="patient-detail-qr-btn">
              <QrCode className="mr-2 h-4 w-4" />
              Pokaż QR kod
            </DropdownMenuItem>
            <DropdownMenuItem>
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

      {/* Patient Info - Compact */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <Avatar
            className={cn(
              'h-14 w-14 ring-2 transition-all',
              patient.isShadowUser ? 'ring-muted-foreground/20' : 'ring-primary/20'
            )}
          >
            <AvatarImage src={patient.image} alt={displayName} />
            <AvatarFallback
              className={cn(
                'text-lg font-semibold',
                patient.isShadowUser ? 'bg-muted-foreground/60 text-white' : 'bg-gradient-to-br from-primary to-primary-dark text-white'
              )}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          {patient.isShadowUser && (
            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-muted-foreground/80 flex items-center justify-center ring-2 ring-background">
              <Wrench className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground truncate" data-testid="patient-detail-name">{displayName}</h1>
            {patient.isShadowUser && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                Tymczasowe
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
            {patient.email && (
              <a
                href={`mailto:${patient.email}`}
                className="flex items-center gap-1 hover:text-foreground transition-colors truncate max-w-[200px]"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{patient.email}</span>
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
      </div>

      {/* Hero Actions + Quick Stats */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-12">
        {/* Hero Action - Przypisz zestaw */}
        <button
          onClick={() => setIsAssignDialogOpen(true)}
          disabled={!organizationId || !therapistId}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 sm:col-span-4"
          data-testid="patient-detail-assign-btn"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Send className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-white">
                Przypisz zestaw
              </h3>
              <p className="text-sm text-white/70">
                Program ćwiczeń
              </p>
            </div>
            <Plus className="h-5 w-5 text-white/60 group-hover:text-white transition-colors shrink-0" />
          </div>
        </button>

        {/* Hero Action - QR Code */}
        <button
          onClick={() => setIsQRCodeDialogOpen(true)}
          disabled={!organizationId || !therapistId}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-info via-info to-cyan-600 p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-info/20 hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 sm:col-span-4"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shrink-0 group-hover:scale-110 transition-transform duration-300">
              <QrCode className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-white">
                QR kod
              </h3>
              <p className="text-sm text-white/70">
                Połącz z aplikacją
              </p>
            </div>
          </div>
        </button>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 sm:col-span-4">
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

      {/* Main Content - Exercise Sets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            Przypisane zestawy
            <Badge variant="secondary" className="ml-1 text-xs">
              {setAssignments.length}
            </Badge>
          </h2>
        </div>

        {assignmentsLoading ? (
          <div className="space-y-3 animate-stagger">
            <LoadingState type="row" count={3} />
          </div>
        ) : setAssignments.length === 0 ? (
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
        ) : (
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
                onGeneratePDF={handleGeneratePDF}
                onRefresh={() => refetchAssignments()}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pain Body Map Section - Hidden behind feature flag */}
      {FEATURE_FLAGS.BODY_PAIN_MAP && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-warning" />
              Mapa bólu
              <Badge variant="outline" className="ml-1 text-xs border-warning/40 text-warning">
                Profesjonalna
              </Badge>
            </h2>
          </div>
          <Card className="border-border/40 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-warning via-orange-500 to-red-500" />
            <CardContent className="p-4 sm:p-6">
              <BodyMap
                patientId={id}
                onSave={(session) => {
                  console.log('Zapisano sesję mapy bólu:', session);
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Clinical Documentation Section */}
      {therapistId && organizationId && (
        <ClinicalNotesList
          patientId={id}
          therapistId={therapistId}
          organizationId={organizationId}
          patientName={patient?.fullname}
        />
      )}

      {/* Collapsible Activity Section */}
      <div className="space-y-3 pt-4 border-t border-border/40">
        <Collapsible open={isActivityOpen} onOpenChange={setIsActivityOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 rounded-xl bg-surface/50 border border-border/40 hover:bg-surface-light transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/10">
                  <Activity className="h-4 w-4 text-secondary" />
                </div>
                <span className="font-medium text-sm">Aktywność i postępy</span>
              </div>
              {isActivityOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <ActivityReport patientId={id} patientName={displayName} />
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Assignment Wizard */}
      {organizationId && therapistId && patient && (
        <AssignmentWizard
          open={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          mode="from-patient"
          preselectedPatient={{
            id: patient.id,
            name: displayName,
            email: patient.email,
            image: patient.image,
            isShadowUser: patient.isShadowUser,
          } as AssignmentPatient}
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
        mapping={previewExercise}
      />
    </div>
  );
}
