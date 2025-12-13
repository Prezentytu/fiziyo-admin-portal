'use client';

import { use, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FolderKanban,
  Activity,
  User,
  Plus,
  Settings,
  MoreHorizontal,
  Trash2,
  UserX,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ActivityReport } from '@/components/patients/ActivityReport';
import { PatientAssignmentCard } from '@/components/patients/PatientAssignmentCard';
import type { PatientAssignment, ExerciseMapping, ExerciseOverride } from '@/components/patients/PatientAssignmentCard';

import { GET_USER_BY_ID_QUERY, GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { UserByIdResponse } from '@/types/apollo';

// Lazy imports for dialogs (will be created)
import { AssignSetToPatientDialog } from '@/components/patients/AssignSetToPatientDialog';
import { EditAssignmentScheduleDialog } from '@/components/patients/EditAssignmentScheduleDialog';
import { EditExerciseOverrideDialog } from '@/components/patients/EditExerciseOverrideDialog';

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
  const [activeTab, setActiveTab] = useState('exercises');

  // Dialog states
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingScheduleAssignment, setEditingScheduleAssignment] = useState<PatientAssignment | null>(null);
  const [editingExerciseData, setEditingExerciseData] = useState<{
    assignment: PatientAssignment;
    mapping: ExerciseMapping;
    override?: ExerciseOverride;
  } | null>(null);

  // Get current user data for organizationId
  const { data: currentUserData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const organizationId = (currentUserData as { userByClerkId?: { organizationIds?: string[] } })?.userByClerkId
    ?.organizationIds?.[0];

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
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="h-16 w-16 rounded-full bg-surface-light flex items-center justify-center">
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

  const handleEditSchedule = (assignment: PatientAssignment) => {
    setEditingScheduleAssignment(assignment);
  };

  const handleEditExercise = (assignment: PatientAssignment, mapping: ExerciseMapping, override?: ExerciseOverride) => {
    setEditingExerciseData({ assignment, mapping, override });
  };

  const handleAddExerciseToAssignment = (assignment: PatientAssignment) => {
    // TODO: Implement add exercise to specific assignment
    console.log('Add exercise to assignment', assignment.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Button variant="ghost" onClick={() => router.push('/patients')} className="w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót do pacjentów
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="mr-2 h-4 w-4" />
              Opcje
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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

      {/* Patient info */}
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={patient.image} alt={displayName} />
          <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold">{displayName}</h1>
            {patient.isShadowUser && (
              <Badge variant="secondary" className="text-xs">
                Konto tymczasowe
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-muted-foreground text-sm flex-wrap">
            {patient.email && (
              <a
                href={`mailto:${patient.email}`}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                {patient.email}
              </a>
            )}
            {patient.contactData?.phone && (
              <a
                href={`tel:${patient.contactData.phone}`}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                {patient.contactData.phone}
              </a>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="gap-1">
            <FolderKanban className="h-3 w-3" />
            {activeAssignments.length} aktywnych
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="exercises" className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4" />
              Zestawy ({setAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Aktywność
            </TabsTrigger>
          </TabsList>

          {activeTab === 'exercises' && (
            <Button onClick={() => setIsAssignDialogOpen(true)} className="shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" />
              Przypisz zestaw
            </Button>
          )}
        </div>

        {/* Exercises Tab - Main feature */}
        <TabsContent value="exercises" className="mt-6">
          {assignmentsLoading ? (
            <LoadingState type="row" count={3} />
          ) : setAssignments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16">
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
            <div className="space-y-3">
              {setAssignments.map((assignment) => (
                <PatientAssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  patientId={id}
                  onEditSchedule={handleEditSchedule}
                  onEditExercise={handleEditExercise}
                  onAddExercise={handleAddExerciseToAssignment}
                  onRefresh={() => refetchAssignments()}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Contact info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dane kontaktowe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {patient.email && (
                  <a
                    href={`mailto:${patient.email}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-light transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-light">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{patient.email}</p>
                    </div>
                  </a>
                )}
                {patient.contactData?.phone && (
                  <a
                    href={`tel:${patient.contactData.phone}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-light transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-light">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Telefon</p>
                      <p className="font-medium">{patient.contactData.phone}</p>
                    </div>
                  </a>
                )}
                {patient.contactData?.address && (
                  <div className="flex items-center gap-3 p-3 rounded-xl">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-light">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Adres</p>
                      <p className="font-medium">{patient.contactData.address}</p>
                    </div>
                  </div>
                )}
                {patient.creationTime && (
                  <div className="flex items-center gap-3 p-3 rounded-xl">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-light">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Dodano</p>
                      <p className="font-medium">
                        {format(new Date(patient.creationTime), 'd MMMM yyyy', {
                          locale: pl,
                        })}
                      </p>
                    </div>
                  </div>
                )}
                {!patient.email && !patient.contactData?.phone && !patient.contactData?.address && (
                  <p className="text-sm text-muted-foreground text-center py-4">Brak danych kontaktowych</p>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Statystyki</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{activeAssignments.length}</p>
                    <p className="text-sm text-muted-foreground">Aktywne zestawy</p>
                  </div>
                  <div className="rounded-xl border border-border p-4 text-center">
                    <p className="text-3xl font-bold">{setAssignments.length}</p>
                    <p className="text-sm text-muted-foreground">Wszystkie zestawy</p>
                  </div>
                  <div className="rounded-xl border border-border p-4 text-center col-span-2">
                    <p className="text-3xl font-bold text-secondary">
                      {setAssignments.reduce((sum, a) => sum + (a.completionCount || 0), 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Łącznie wykonań</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-6">
          <ActivityReport patientId={id} patientName={displayName} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {organizationId && (
        <AssignSetToPatientDialog
          open={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          patientId={id}
          patientName={displayName}
          organizationId={organizationId}
          existingSetIds={setAssignments.map((a) => a.exerciseSetId).filter(Boolean) as string[]}
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
    </div>
  );
}
