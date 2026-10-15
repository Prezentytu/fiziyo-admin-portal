'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowRight, ChevronRight, FolderPlus, Send, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PageSheet,
  PageHeader,
  SectionHeader,
  SECTION_LINK_CLASS,
  ActivityStatusLabel,
  InitialsAvatar,
} from '@/components/shared/page';
import { EmptyState } from '@/components/shared/EmptyState';
import { SetThumbnail } from '@/features/exercise-sets/SetThumbnail';
import { CreateSetWizard } from '@/features/exercise-sets/CreateSetWizard';
import { AssignmentWizard } from '@/features/assignment/AssignmentWizard';
import { normalizeFrequencySeed } from '@/features/assignment/utils/scheduleFrequencyUtils';
import { PatientDialog } from '@/features/patients/PatientDialog';
import { ActivatePremiumDialog } from '@/features/patients/ActivatePremiumDialog';
import { DashboardSkeleton } from '@/components/shared/DashboardSkeleton';
import { GettingStartedCard } from '@/components/onboarding/GettingStartedCard';
import { BillingStatusBar } from '@/components/billing';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { usePatientPremium } from '@/hooks/usePatientPremium';
import { useRealtimePatients } from '@/hooks/useRealtimePatients';
import { useRealtimeExerciseSets } from '@/hooks/useRealtimeExerciseSets';

import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { GET_ORGANIZATION_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import { GET_ALL_PATIENT_ASSIGNMENTS_QUERY } from '@/graphql/queries/patientAssignments.queries';
import type {
  UserByClerkIdResponse,
  OrganizationExerciseSetsResponse,
  OrganizationPatientDto,
  OrganizationPatientsResponse,
} from '@/types/apollo';
import { isTemplateSet } from '@/features/exercise-sets/utils/setKind';
import {
  comparePatientsByAttention,
  getPatientActivityStatus,
  needsAttention,
  type PatientActivityStatus,
} from '@/features/patients/utils/patientActivityStatus';
import { getPremiumQueue } from '@/features/patients/utils/premiumQueue';
import { formatExerciseCount } from '@/utils/polishPlural';

interface ExerciseSetItem {
  id: string;
  name: string;
  description?: string;
  creationTime?: string;
  kind?: 'TEMPLATE' | 'PATIENT_PLAN';
  isTemplate?: boolean;
  frequency?: {
    timesPerDay?: number | string;
    timesPerWeek?: number | string;
    breakBetweenSets?: number | string;
    isFlexible?: boolean;
    monday?: boolean;
    tuesday?: boolean;
    wednesday?: boolean;
    thursday?: boolean;
    friday?: boolean;
    saturday?: boolean;
    sunday?: boolean;
  };
  exerciseMappings?: Array<{
    id: string;
    exerciseId: string;
    exercise?: {
      id: string;
      name: string;
      imageUrl?: string;
      images?: string[];
    };
  }>;
}

interface PatientAssignmentData {
  id: string;
  assignmentId?: string;
  assignmentStatus?: string;
  assignedAt?: string;
  contextLabel?: string;
  patient?: {
    id: string;
    fullname?: string;
    email?: string;
    image?: string;
    isShadowUser?: boolean;
  };
  lastActivity?: string;
  premiumStatus?: 'FREE' | 'ACTIVE' | 'EXPIRED';
  premiumValidUntil?: string;
}

interface ExerciseAssignment {
  id: string;
  userId: string;
  exerciseSetId?: string;
  assignedById?: string;
  lastCompletedAt?: string;
  completionCount?: number;
  status?: string;
  exerciseSet?: {
    name?: string;
  };
}

interface PatientWithActivity extends PatientAssignmentData {
  activity: PatientActivityStatus;
}

const SHORT_MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

function formatPolishDate(date: Date): string {
  const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  return `${days[date.getDay()]}, ${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
}

function getGreeting(currentHour: number): string {
  if (currentHour < 12) return 'Dzień dobry';
  if (currentHour < 18) return 'Cześć';
  return 'Dobry wieczór';
}

function getDashboardSubtitle(patientsCount: number, patientsNeedingAttentionCount: number): string {
  if (patientsCount === 0) return 'Nie masz jeszcze przypisanych pacjentów';
  if (patientsNeedingAttentionCount > 0) return `Sprawdź, co u ${patientsNeedingAttentionCount} pacjentów`;
  return 'Wszyscy Twoi pacjenci ćwiczą';
}

const QUICK_ACTION_CLASS =
  'group flex min-h-16 flex-[1_1_200px] items-center gap-3.5 rounded-[13px] px-[18px] text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40';

const ROW_CLASS =
  '-mx-3 flex min-h-[60px] items-center gap-3.5 border-t-[0.5px] border-separator px-3 transition-colors hover:bg-fill-quaternary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';

export default function DashboardPage() {
  const { user } = useUser();
  const { currentOrganization } = useOrganization();
  const { canViewBilling } = useRoleAccess();
  const [isAssignWizardOpen, setIsAssignWizardOpen] = useState(false);
  const [isCreateSetWizardOpen, setIsCreateSetWizardOpen] = useState(false);
  const [isPatientDialogOpen, setIsPatientDialogOpen] = useState(false);
  const [quickAssignSet, setQuickAssignSet] = useState<ExerciseSetItem | null>(null);
  const { initiateActivation, confirmActivation, cancelActivation, isActivating, showConfirmDialog, activationTarget } =
    usePatientPremium({ organizationId: currentOrganization?.organizationId ?? '' });

  // Get organization ID from context (changes when user switches organization)
  const organizationId = currentOrganization?.organizationId;

  // Get user data for therapistId and user name
  const { data: userData, loading: userLoading } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const userByClerkId = (userData as UserByClerkIdResponse)?.userByClerkId;
  const therapistId = userByClerkId?.id;
  const userName = userByClerkId?.fullname || userByClerkId?.personalData?.firstName || user?.firstName || 'Użytkownik';

  // Get exercise sets
  const { data: setsData, loading: setsLoading } = useQuery(GET_ORGANIZATION_EXERCISE_SETS_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Get patients assigned to the current therapist within the active organization
  const { data: patientsData, loading: patientsLoading } = useQuery(GET_ORGANIZATION_PATIENTS_QUERY, {
    variables: { organizationId, filter: 'my' },
    skip: !organizationId,
  });

  // Get all assignments for activity data
  const { data: assignmentsData } = useQuery(GET_ALL_PATIENT_ASSIGNMENTS_QUERY, {
    skip: !therapistId,
    fetchPolicy: 'cache-and-network',
  });

  // Real-time updates - automatycznie odświeżają Apollo Cache
  useRealtimePatients({
    organizationId: organizationId ?? null,
    enabled: !!organizationId,
  });

  useRealtimeExerciseSets({
    organizationId: organizationId ?? null,
    enabled: !!organizationId,
  });

  const exerciseSets = useMemo(
    () => ((setsData as OrganizationExerciseSetsResponse | undefined)?.exerciseSets ?? []) as ExerciseSetItem[],
    [setsData]
  );
  const setsCount = exerciseSets.length;

  const quickSelectionSets = useMemo(
    () =>
      exerciseSets
        .filter((set: ExerciseSetItem) => isTemplateSet(set))
        .sort((a: ExerciseSetItem, b: ExerciseSetItem) => {
          const dateA = new Date(a.creationTime || 0).getTime();
          const dateB = new Date(b.creationTime || 0).getTime();
          return dateB - dateA;
        }),
    [exerciseSets]
  );

  const patients = useMemo<PatientAssignmentData[]>(
    () => {
      const organizationPatients = (patientsData as OrganizationPatientsResponse | undefined)?.organizationPatients ?? [];

      return organizationPatients.map((item: OrganizationPatientDto) => ({
        id: item.assignmentId ?? item.patient.id,
        assignmentId: item.assignmentId,
        assignmentStatus: item.assignmentStatus,
        assignedAt: item.assignedAt,
        contextLabel: item.contextLabel,
        patient: {
          id: item.patient.id,
          fullname: item.patient.fullname,
          email: item.patient.email,
          image: item.patient.image,
          isShadowUser: item.patient.isShadowUser,
        },
        lastActivity: item.lastActivity,
        premiumStatus: item.premiumStatus,
        premiumValidUntil: item.premiumValidUntil,
      }));
    },
    [patientsData]
  );
  const patientsCount = patients.length;

  // Get assignments with activity data
  const allAssignments = (assignmentsData as { patientAssignments?: ExerciseAssignment[] })?.patientAssignments || [];
  const therapistAssignmentsCount = allAssignments.filter(
    (a) => a.exerciseSetId && a.assignedById === therapistId
  ).length;

  const patientsWithActivity: PatientWithActivity[] = useMemo(
    () =>
      patients
        .map((assignment) => ({ ...assignment, activity: getPatientActivityStatus(assignment.lastActivity) }))
        .sort(comparePatientsByAttention),
    [patients]
  );

  const premiumQueue = useMemo(() => getPremiumQueue(patients), [patients]);

  const greeting = getGreeting(new Date().getHours());
  const todayDate = formatPolishDate(new Date());

  const patientsNeedingAttention = patientsWithActivity.filter((patient) => needsAttention(patient.activity));
  const displayedPatients = patientsWithActivity.slice(0, 5);
  const dashboardSubtitle = getDashboardSubtitle(patientsCount, patientsNeedingAttention.length);

  const isInitialLoading = !user || userLoading || (!organizationId && !userData);

  if (isInitialLoading) {
    return <DashboardSkeleton />;
  }

  const handleQuickAssign = (set: ExerciseSetItem) => {
    setQuickAssignSet(set);
    setIsAssignWizardOpen(true);
  };

  return (
    <PageSheet>
      <PageHeader
        title={`${greeting}, ${userName}`}
        titleTestId="dashboard-greeting"
        subtitle={dashboardSubtitle}
        actions={<span className="hidden text-[15px] text-label-secondary sm:inline">{todayDate}</span>}
      />

      <GettingStartedCard
        patientsCount={patientsCount}
        exerciseSetsCount={setsCount}
        assignmentsCount={therapistAssignmentsCount}
      />

      <div role="group" aria-label="Szybkie akcje" className="flex flex-wrap gap-1.5 rounded-[18px] bg-grouped-tertiary p-1.5">
        <button
          type="button"
          onClick={() => setIsAssignWizardOpen(true)}
          disabled={!organizationId || !therapistId}
          aria-label="Przypisz zestaw pacjentowi"
          data-testid="dashboard-hero-assign-set-btn"
          className={`${QUICK_ACTION_CLASS} flex-[1_1_240px] bg-tint-fill text-on-tint hover:bg-tint-fill-hover`}
        >
          <Send className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="flex flex-1 flex-col">
            <span className="text-[15px] font-semibold">Przypisz zestaw</span>
            <span className="text-[13px] opacity-85">Dopasuj ćwiczenia do pacjenta</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setIsPatientDialogOpen(true)}
          disabled={!organizationId || !therapistId}
          aria-label="Dodaj nowego pacjenta do bazy"
          data-testid="dashboard-add-patient-btn"
          className={`${QUICK_ACTION_CLASS} text-foreground hover:bg-fill-quaternary`}
        >
          <UserPlus className="h-5 w-5 shrink-0 text-tint" aria-hidden="true" />
          <span className="flex flex-1 flex-col">
            <span className="text-[15px] font-semibold">Dodaj pacjenta</span>
            <span className="text-[13px] text-label-secondary">Nowa osoba pod Twoją opieką</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setIsCreateSetWizardOpen(true)}
          disabled={!organizationId}
          aria-label="Utwórz nowy zestaw ćwiczeń"
          data-testid="dashboard-create-set-btn"
          className={`${QUICK_ACTION_CLASS} text-foreground hover:bg-fill-quaternary`}
        >
          <FolderPlus className="h-5 w-5 shrink-0 text-tint" aria-hidden="true" />
          <span className="flex flex-1 flex-col">
            <span className="text-[15px] font-semibold">Utwórz zestaw</span>
            <span className="text-[13px] text-label-secondary">Szablon do wielokrotnego użycia</span>
          </span>
        </button>
      </div>

      <div className="flex flex-wrap items-stretch">
        <section
          aria-labelledby="dashboard-patients-heading"
          data-testid="dashboard-activity-section"
          className="flex min-w-0 flex-[2_1_520px] flex-col lg:pr-9"
        >
          <SectionHeader
            id="dashboard-patients-heading"
            title="Pacjenci do sprawdzenia"
            action={
              <Link href="/patients" data-testid="dashboard-patients-view-all" className={SECTION_LINK_CLASS}>
                Wszyscy pacjenci
              </Link>
            }
          />
          {patientsLoading ? (
            <div aria-busy="true">
              {[1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="flex min-h-[60px] items-center gap-3.5 border-t-[0.5px] border-separator">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <Skeleton className="ml-auto h-4 w-32 rounded-md" />
                </div>
              ))}
            </div>
          ) : patients.length > 0 ? (
            displayedPatients.map((assignment) => {
              const isShadow = Boolean(assignment.patient?.isShadowUser);
              return (
                <Link
                  key={assignment.id}
                  href={`/patients/${assignment.patient?.id}`}
                  data-testid={`dashboard-patient-item-${assignment.patient?.id}`}
                  className={`${ROW_CLASS} flex-wrap py-2.5 sm:flex-nowrap sm:py-0`}
                >
                  <InitialsAvatar name={assignment.patient?.fullname} imageUrl={assignment.patient?.image} muted={isShadow} />
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate text-[15px] font-semibold text-foreground">
                      {assignment.patient?.fullname || 'Nieznany'}
                    </span>
                    {isShadow && (
                      <span className="inline-flex h-[22px] shrink-0 items-center rounded-full bg-fill-tertiary px-2 text-[12px] font-semibold text-label-secondary">
                        Bez konta
                      </span>
                    )}
                  </span>
                  <ActivityStatusLabel
                    tone={assignment.activity.tone}
                    label={assignment.activity.label}
                    className="order-3 basis-full pl-[50px] sm:order-none sm:basis-auto sm:pl-0"
                  />
                  <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-label-tertiary sm:block" aria-hidden="true" />
                </Link>
              );
            })
          ) : (
            <EmptyState
              icon={UserPlus}
              title="Nie masz jeszcze pacjentów"
              description="Dodaj pierwszą osobę albo przejmij opiekę na liście pacjentów."
              actionLabel="Dodaj pacjenta"
              onAction={() => setIsPatientDialogOpen(true)}
            />
          )}

          {premiumQueue.length > 0 && (
            <>
              <SectionHeader
                title="Bez aktywnego Premium"
                className="mt-5"
                action={
                  <Link href="/patients" data-testid="dashboard-premium-view-all" className={SECTION_LINK_CLASS}>
                    Wszyscy bez dostępu
                  </Link>
                }
              />
              {premiumQueue.slice(0, 3).map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex min-h-[60px] items-center gap-3.5 border-t-[0.5px] border-separator"
                  data-testid={`dashboard-premium-item-${assignment.patient?.id}`}
                >
                  <InitialsAvatar name={assignment.patient?.fullname} imageUrl={assignment.patient?.image} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold text-foreground">
                      {assignment.patient?.fullname || 'Nieznany'}
                    </span>
                    <span className="text-[13px] text-label-secondary">
                      {assignment.premiumValidUntil
                        ? `Premium wygasło ${formatShortDate(assignment.premiumValidUntil)}`
                        : 'Bez Premium'}
                    </span>
                  </span>
                  <Button
                    variant="tinted"
                    size="sm"
                    onClick={() =>
                      assignment.patient &&
                      initiateActivation(
                        assignment.patient.id,
                        assignment.patient.fullname || 'Pacjent',
                        assignment.premiumValidUntil
                      )
                    }
                    data-testid={`dashboard-premium-activate-${assignment.patient?.id}`}
                  >
                    Aktywuj Premium
                  </Button>
                </div>
              ))}
            </>
          )}

          {canViewBilling && organizationId && (
            <div className="mt-5">
              <BillingStatusBar organizationId={organizationId} />
            </div>
          )}
        </section>

        <section
          aria-labelledby="dashboard-sets-heading"
          data-testid="dashboard-sets-section"
          className="mt-6 flex min-w-0 flex-[1_1_300px] flex-col border-t-[0.5px] border-separator pt-6 lg:mt-0 lg:border-l-[0.5px] lg:border-t-0 lg:pl-9 lg:pt-0"
        >
          <SectionHeader
            id="dashboard-sets-heading"
            title="Szybkie przypisanie"
            action={
              <Link href="/exercise-sets" data-testid="dashboard-sets-view-all" className={SECTION_LINK_CLASS}>
                Wszystkie zestawy
              </Link>
            }
          />
          {setsLoading ? (
            <div aria-busy="true">
              {[1, 2, 3, 4].map((index) => (
                <div key={index} className="flex min-h-[60px] items-center gap-3 border-t-[0.5px] border-separator">
                  <Skeleton className="h-10 w-10 rounded-control" />
                  <Skeleton className="h-4 w-32 rounded-md" />
                </div>
              ))}
            </div>
          ) : quickSelectionSets.length > 0 ? (
            quickSelectionSets.slice(0, 5).map((set) => (
              <div key={set.id} className="flex min-h-[60px] items-center gap-3 border-t-[0.5px] border-separator">
                <Link
                  href={`/exercise-sets/${set.id}`}
                  data-testid={`dashboard-set-item-${set.id}`}
                  className="-ml-2 flex min-w-0 flex-1 items-center gap-3 rounded-control py-2 pl-2 transition-colors hover:bg-fill-quaternary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <SetThumbnail exerciseMappings={set.exerciseMappings} size="sm" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold text-foreground">{set.name}</span>
                    <span className="text-[13px] text-label-secondary">{formatExerciseCount(set.exerciseMappings?.length || 0)}</span>
                  </span>
                </Link>
                <Button
                  variant="tinted"
                  size="sm"
                  onClick={() => handleQuickAssign(set)}
                  disabled={!organizationId || !therapistId}
                  aria-label={`Przypisz pacjentowi: ${set.name}`}
                  data-testid={`dashboard-quick-assign-${set.id}`}
                >
                  Przypisz
                </Button>
              </div>
            ))
          ) : (
            <EmptyState
              icon={FolderPlus}
              title="Nie masz jeszcze szablonów"
              description="Szablon to zestaw, który przypiszesz wielu pacjentom."
              actionLabel="Utwórz zestaw"
              onAction={() => setIsCreateSetWizardOpen(true)}
            />
          )}
        </section>
      </div>

      {/* Assignment Wizard */}
      {organizationId && therapistId && (
        <AssignmentWizard
          open={isAssignWizardOpen}
          onOpenChange={(open) => {
            setIsAssignWizardOpen(open);
            if (!open) setQuickAssignSet(null);
          }}
          mode={quickAssignSet ? 'from-set' : 'from-patient'}
          organizationId={organizationId}
          therapistId={therapistId}
          preselectedSet={
            quickAssignSet
              ? {
                  id: quickAssignSet.id,
                  name: quickAssignSet.name,
                  description: quickAssignSet.description,
                  frequency: quickAssignSet.frequency ? normalizeFrequencySeed(quickAssignSet.frequency) : undefined,
                  exerciseMappings: quickAssignSet.exerciseMappings?.map((m) => ({
                    id: m.id,
                    exerciseId: m.exerciseId,
                    exercise: m.exercise
                      ? {
                          id: m.exercise.id,
                          name: m.exercise.name,
                          imageUrl: m.exercise.imageUrl,
                          images: m.exercise.images,
                        }
                      : undefined,
                  })),
                }
              : undefined
          }
          onSuccess={() => {
            setIsAssignWizardOpen(false);
            setQuickAssignSet(null);
          }}
        />
      )}

      {/* Create Set Wizard */}
      {organizationId && (
        <CreateSetWizard
          open={isCreateSetWizardOpen}
          onOpenChange={setIsCreateSetWizardOpen}
          organizationId={organizationId}
          onSuccess={() => setIsCreateSetWizardOpen(false)}
        />
      )}

      <ActivatePremiumDialog
        open={showConfirmDialog}
        onOpenChange={(open) => !open && cancelActivation()}
        patientName={activationTarget?.patientName}
        currentPremiumValidUntil={activationTarget?.premiumValidUntil}
        onConfirm={confirmActivation}
        onCancel={cancelActivation}
        isLoading={isActivating}
      />

      {/* Patient Dialog */}
      {organizationId && therapistId && (
        <PatientDialog
          open={isPatientDialogOpen}
          onOpenChange={setIsPatientDialogOpen}
          organizationId={organizationId}
          therapistId={therapistId}
        />
      )}
    </PageSheet>
  );
}
