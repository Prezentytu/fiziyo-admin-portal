'use client';

import { use, useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Archive, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { MasterVideoPlayer } from '@/features/verification/MasterVideoPlayer';
import { CollapsibleMediaPanel } from '@/features/verification/CollapsibleMediaPanel';
import { ExerciseEditor } from '@/features/exercises/ExerciseEditor';
import { useExerciseEditorForm } from '@/features/exercises/useExerciseEditorForm';
import { VerdictPanel } from '@/features/verification/VerdictPanel';
import {
  GET_EXERCISE_BY_ID_FOR_ORG_VERIFICATION_QUERY,
  GET_ORGANIZATION_VERIFICATION_QUEUE_NAVIGATOR_QUERY,
} from '@/graphql/queries/adminExercises.queries';
import {
  APPROVE_ORGANIZATION_EXERCISE_MUTATION,
  ARCHIVE_ORGANIZATION_EXERCISE_MUTATION,
  REQUEST_ORGANIZATION_EXERCISE_CHANGES_MUTATION,
} from '@/graphql/mutations/adminExercises.mutations';
import {
  UPDATE_EXERCISE_MUTATION as UPDATE_EXERCISE_DETAILS_MUTATION,
  UPLOAD_EXERCISE_IMAGE_MUTATION,
  DELETE_EXERCISE_IMAGE_MUTATION,
} from '@/graphql/mutations/exercises.mutations';
import {
  buildOrganizationVerificationDetailHref,
  buildOrganizationVerificationListHref,
  parseOrganizationVerificationFilter,
} from '@/features/verification/utils/orgVerificationPagination';
import type {
  AdminExercise,
  VerificationQueueNavigator,
} from '@/graphql/types/adminExercise.types';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import {
  buildEnrichmentUpdateVariables,
  isExerciseSaveAuthError,
} from '@/features/exercises/utils/buildEnrichmentUpdateVariables';
import { ORG_VERIFICATION_REFETCH_QUERIES } from '@/hooks/useOrganizationVerificationRealtime';

interface OrganizationVerificationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function OrganizationVerificationDetailPage({ params }: Readonly<OrganizationVerificationDetailPageProps>) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentOrganization } = useOrganization();
  const { canManageOrganization, isLoading: roleLoading } = useRoleAccess();

  const organizationId = currentOrganization?.organizationId;
  const filter = parseOrganizationVerificationFilter(searchParams.get('filter'));
  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const pageSize = Number(searchParams.get('pageSize') ?? '20') || 20;

  const [reviewNotes, setReviewNotes] = useState('');

  const listHref = useMemo(
    () =>
      buildOrganizationVerificationListHref({
        filter,
        search,
        page,
        pageSize,
        view: 'grid',
      }),
    [filter, search, page, pageSize]
  );

  const { data, loading, refetch } = useQuery<{ exerciseByIdForOrgVerification: AdminExercise | null }>(
    GET_EXERCISE_BY_ID_FOR_ORG_VERIFICATION_QUERY,
    {
      variables: { organizationId: organizationId ?? '', id },
      skip: !organizationId || !canManageOrganization,
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: navigatorData } = useQuery<{ organizationVerificationQueueNavigator: VerificationQueueNavigator }>(
    GET_ORGANIZATION_VERIFICATION_QUEUE_NAVIGATOR_QUERY,
    {
      variables: {
        organizationId: organizationId ?? '',
        currentExerciseId: id,
        filter,
        search: search || null,
      },
      skip: !organizationId || !canManageOrganization,
      fetchPolicy: 'cache-and-network',
    }
  );

  const exercise = data?.exerciseByIdForOrgVerification;

  const orgVerificationRefetch = { refetchQueries: [...ORG_VERIFICATION_REFETCH_QUERIES] };

  const [approveOrganizationExercise, { loading: approving }] = useMutation(
    APPROVE_ORGANIZATION_EXERCISE_MUTATION,
    orgVerificationRefetch
  );
  const [requestChanges, { loading: rejecting }] = useMutation(
    REQUEST_ORGANIZATION_EXERCISE_CHANGES_MUTATION,
    orgVerificationRefetch
  );
  const [archiveOrganizationExercise, { loading: archiving }] = useMutation(
    ARCHIVE_ORGANIZATION_EXERCISE_MUTATION,
    orgVerificationRefetch
  );
  const [updateExerciseDetails] = useMutation(UPDATE_EXERCISE_DETAILS_MUTATION, {
    onError: (error) => toast.error(`Błąd zapisu: ${error.message}`),
  });
  const [uploadExerciseImage] = useMutation(UPLOAD_EXERCISE_IMAGE_MUTATION, {
    onError: (error) => toast.error(`Błąd uploadu zdjęcia: ${error.message}`),
  });
  const [deleteExerciseImage] = useMutation(DELETE_EXERCISE_IMAGE_MUTATION, {
    onError: (error) => toast.error(`Błąd usuwania zdjęcia: ${error.message}`),
  });

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] ?? '');
      };
      reader.onerror = reject;
    });
  }, []);

  const updateCore = useCallback(
    async (variables: Record<string, unknown>) => {
      await updateExerciseDetails({ variables: { exerciseId: id, ...variables } });
    },
    [id, updateExerciseDetails]
  );

  const updateEnrichment = useCallback(
    async (payload: ExerciseEnrichmentData) => {
      await updateExerciseDetails({
        variables: buildEnrichmentUpdateVariables(id, payload),
      });
    },
    [id, updateExerciseDetails]
  );

  const exerciseEditorForm = useExerciseEditorForm({
    source: exercise,
    updateCore,
    updateEnrichment,
    onError: (error) => {
      if (isExerciseSaveAuthError(error)) {
        toast.error('Brak uprawnień do zapisu tych zmian');
        return;
      }
      toast.error('Nie udało się zapisać zmian');
    },
    autosaveDelayMs: 900,
  });
  const { core, flush: flushEditorForm } = exerciseEditorForm;

  const handleUploadImage = useCallback(
    async (file: File) => {
      if (!exercise) return;
      const base64Image = await fileToBase64(file);
      await uploadExerciseImage({
        variables: {
          exerciseId: exercise.id,
          base64Image,
          contentType: file.type,
        },
      });
      await refetch();
    },
    [exercise, fileToBase64, refetch, uploadExerciseImage]
  );

  const handleDeleteImage = useCallback(
    async (imageUrl: string) => {
      if (!exercise) return;
      await deleteExerciseImage({
        variables: {
          exerciseId: exercise.id,
          imageUrl,
        },
      });
      await refetch();
    },
    [deleteExerciseImage, exercise, refetch]
  );

  if (!roleLoading && !canManageOrganization) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Brak dostępu"
        description="Tylko Owner/Admin może zarządzać weryfikacją organizacji."
      />
    );
  }

  if (loading) {
    return (
      <div className="-m-4 flex h-full lg:h-[calc(100%+3rem)] 2xl:h-[calc(100%+4rem)] min-h-0 flex-col overflow-y-auto lg:-m-6 lg:overflow-hidden 2xl:-m-8">
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          <div className="lg:w-[42%] bg-card p-3 border-r border-border/30">
            <Skeleton className="h-8 w-32 mb-3" />
            <Skeleton className="w-full h-[calc(100%-3rem)] rounded-lg" />
          </div>
          <div className="flex-1 p-3 space-y-3 border-r border-border/20">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="lg:w-[320px] lg:min-w-[320px] p-3 space-y-3 border-l border-border/30 bg-card/70">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!loading && !exercise) {
    return (
      <EmptyState
        icon={Archive}
        title="Nie znaleziono ćwiczenia"
        description="Ćwiczenie nie jest dostępne w kolejce tej organizacji."
        actionLabel="Wróć do listy"
        onAction={() => router.push(listHref)}
      />
    );
  }

  const goToNeighbor = (nextId?: string | null) => {
    if (!nextId) {
      router.push(listHref);
      return;
    }
    router.push(
      buildOrganizationVerificationDetailHref(nextId, {
        filter,
        search,
        page,
        pageSize,
        view: 'grid',
      })
    );
  };

  return (
    <div className="-m-4 flex h-full lg:h-[calc(100%+3rem)] 2xl:h-[calc(100%+4rem)] min-h-0 flex-col overflow-y-auto lg:-m-6 lg:overflow-hidden 2xl:-m-8">
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* LEFT: Video + nawigacja (zwijalny) */}
        <CollapsibleMediaPanel onBack={() => router.push(listHref)}>
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/40 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(listHref)}
              className="-ml-2 h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-accent"
              data-testid="org-verification-back-btn"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="text-sm">Wróć do kolejki</span>
            </Button>
            {navigatorData?.organizationVerificationQueueNavigator.remainingCount !== undefined && (
              <span className="ml-auto text-xs text-muted-foreground">
                Pozostało: {navigatorData.organizationVerificationQueueNavigator.remainingCount}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden p-3">
            {exercise && (
              <MasterVideoPlayer
                exercise={exercise}
                onUploadImage={handleUploadImage}
                onDeleteImage={handleDeleteImage}
              />
            )}
          </div>
        </CollapsibleMediaPanel>

        {/* MIDDLE: shared ExerciseEditor (autosave) */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 border-r border-border/20 overflow-y-auto p-3">
          {exercise && (
            <ExerciseEditor
              form={exerciseEditorForm}
              showNameField
              aiFillContext={{
                name: core.name,
                patientDescription: core.patientDescription,
                clinicalDescription: core.clinicalDescription,
                type: exercise.type,
                mainTags: exercise.mainTags,
                additionalTags: exercise.additionalTags,
              }}
              showAdvancedJson
            />
          )}
        </div>

        {/* RIGHT: Verdict */}
        <VerdictPanel
          mode="organization"
          status={exercise?.organizationVerificationStatus ?? 'NOT_SUBMITTED'}
          submittedAt={exercise?.submittedForOrgReviewAt}
          onApprove={async () => {
            try {
              await flushEditorForm();
              await approveOrganizationExercise({ variables: { exerciseId: id, reviewNotes: reviewNotes || null } });
              toast.success('Ćwiczenie zweryfikowane.');
              goToNeighbor(navigatorData?.organizationVerificationQueueNavigator.nextExerciseId);
            } catch (error) {
              console.error(error);
              toast.error('Nie udało się zatwierdzić ćwiczenia.');
            }
          }}
          onRequestChanges={async () => {
            const reviewNotesValue = reviewNotes.trim();
            if (!reviewNotesValue) {
              toast.error('Dodaj notatkę recenzencką przed odesłaniem.');
              return;
            }
            try {
              await flushEditorForm();
              await requestChanges({
                variables: {
                  exerciseId: id,
                  rejectionReason: reviewNotesValue,
                  reviewNotes: reviewNotesValue,
                },
              });
              toast.success('Ćwiczenie odesłane do poprawek.');
              goToNeighbor(navigatorData?.organizationVerificationQueueNavigator.nextExerciseId);
            } catch (error) {
              console.error(error);
              toast.error('Nie udało się odesłać ćwiczenia do poprawek.');
            }
          }}
          onReject={() => {}}
          onArchive={async () => {
            try {
              await flushEditorForm();
              await archiveOrganizationExercise({ variables: { exerciseId: id, reason: reviewNotes || null } });
              toast.success('Ćwiczenie zarchiwizowane.');
              router.push(listHref);
            } catch (error) {
              console.error(error);
              toast.error('Nie udało się zarchiwizować ćwiczenia.');
            } finally {
              await refetch();
            }
          }}
          comment={reviewNotes}
          onCommentChange={setReviewNotes}
          safetyChecklist={{
            videoReadable: true,
            techniqueSafe: true,
            noContraindications: true,
          }}
          onSafetyChecklistChange={() => {}}
          isApproving={approving}
          isRejecting={rejecting}
          isUnpublishing={archiving}
          remainingCount={navigatorData?.organizationVerificationQueueNavigator.remainingCount ?? 0}
          onSkip={() => goToNeighbor(navigatorData?.organizationVerificationQueueNavigator.nextExerciseId)}
          className="lg:w-[320px] lg:min-w-[320px]"
        />
      </div>
    </div>
  );
}
