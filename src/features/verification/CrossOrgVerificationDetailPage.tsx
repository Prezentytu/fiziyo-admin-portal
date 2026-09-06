'use client';

import { use, useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Archive, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { useSystemRole } from '@/hooks/useSystemRole';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { MasterVideoPlayer } from '@/features/verification/MasterVideoPlayer';
import { CollapsibleMediaPanel } from '@/features/verification/CollapsibleMediaPanel';
import { ExerciseEditor } from '@/features/exercises/ExerciseEditor';
import { useExerciseEditorForm } from '@/features/exercises/useExerciseEditorForm';
import { VerdictPanel } from '@/features/verification/VerdictPanel';
import {
  GET_CROSS_ORG_VERIFICATION_QUEUE_NAVIGATOR_QUERY,
  GET_EXERCISE_BY_ID_FOR_CROSS_ORG_VERIFICATION_QUERY,
} from '@/graphql/queries/crossOrgVerification.queries';
import {
  APPROVE_ORGANIZATION_EXERCISE_AS_ADMIN_MUTATION,
  ARCHIVE_ORGANIZATION_EXERCISE_AS_ADMIN_MUTATION,
  REQUEST_ORGANIZATION_EXERCISE_CHANGES_AS_ADMIN_MUTATION,
} from '@/graphql/mutations/crossOrgVerification.mutations';
import { UPDATE_EXERCISE_FIELD_MUTATION } from '@/graphql/mutations/adminExercises.mutations';
import {
  UPDATE_EXERCISE_MUTATION as UPDATE_EXERCISE_DETAILS_MUTATION,
  UPLOAD_EXERCISE_IMAGE_MUTATION,
  DELETE_EXERCISE_IMAGE_MUTATION,
} from '@/graphql/mutations/exercises.mutations';
import type {
  AdminExercise,
  GetCrossOrgVerificationQueueNavigatorResponse,
  VerificationQueueNavigator,
} from '@/graphql/types/adminExercise.types';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

interface CrossOrgVerificationDetailPageProps {
  params: Promise<{ id: string }>;
}

type CrossOrgFilter = 'pending' | 'changes' | 'verified' | 'archived';

function parseFilter(value: string | null): CrossOrgFilter {
  if (value === 'changes' || value === 'verified' || value === 'archived') {
    return value;
  }
  return 'pending';
}

export function CrossOrgVerificationDetailPage({ params }: Readonly<CrossOrgVerificationDetailPageProps>) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSiteSuperAdmin, isLoading: roleLoading } = useSystemRole();

  const filter = parseFilter(searchParams.get('filter'));
  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const pageSize = Number(searchParams.get('pageSize') ?? '20') || 20;
  const [reviewNotes, setReviewNotes] = useState('');

  const listHref = useMemo(() => {
    const urlParams = new URLSearchParams();
    urlParams.set('filter', filter);
    if (search.trim()) {
      urlParams.set('search', search.trim());
    }
    urlParams.set('page', String(page));
    urlParams.set('pageSize', String(pageSize));
    return `/verification/organizations?${urlParams.toString()}`;
  }, [filter, search, page, pageSize]);

  const { data, loading, refetch } = useQuery<{ exerciseByIdForCrossOrgVerification: AdminExercise | null }>(
    GET_EXERCISE_BY_ID_FOR_CROSS_ORG_VERIFICATION_QUERY,
    {
      variables: { exerciseId: id },
      skip: !isSiteSuperAdmin,
      fetchPolicy: 'cache-and-network',
    }
  );

  const { data: navigatorData } = useQuery<GetCrossOrgVerificationQueueNavigatorResponse>(
    GET_CROSS_ORG_VERIFICATION_QUEUE_NAVIGATOR_QUERY,
    {
      variables: {
        currentExerciseId: id,
        filter,
        search: search || null,
      },
      skip: !isSiteSuperAdmin,
      fetchPolicy: 'cache-and-network',
    }
  );

  const exercise = data?.exerciseByIdForCrossOrgVerification;

  const [approveOrganizationExercise, { loading: approving }] = useMutation(
    APPROVE_ORGANIZATION_EXERCISE_AS_ADMIN_MUTATION
  );
  const [requestChanges, { loading: rejecting }] = useMutation(REQUEST_ORGANIZATION_EXERCISE_CHANGES_AS_ADMIN_MUTATION);
  const [archiveOrganizationExercise, { loading: archiving }] = useMutation(
    ARCHIVE_ORGANIZATION_EXERCISE_AS_ADMIN_MUTATION
  );
  const [updateExerciseField] = useMutation(UPDATE_EXERCISE_FIELD_MUTATION, {
    onError: (error) => toast.error(`Błąd zapisu: ${error.message}`),
  });
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
      await updateExerciseField({
        variables: { exerciseId: id, fieldName: 'enrichmentData', value: JSON.stringify(payload ?? {}) },
      });
    },
    [id, updateExerciseField]
  );

  const exerciseEditorForm = useExerciseEditorForm({
    source: exercise,
    updateCore,
    updateEnrichment,
    onError: () => toast.error('Nie udało się zapisać zmian'),
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

  if (!roleLoading && !isSiteSuperAdmin) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Brak dostępu"
        description="Tylko SiteSuperAdmin może moderować cross-organizacyjną weryfikację."
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
        description="Ćwiczenie nie jest dostępne w tej kolejce."
        actionLabel="Wróć do listy"
        onAction={() => router.push(listHref)}
      />
    );
  }

  const navigator = navigatorData?.crossOrgVerificationQueueNavigator as VerificationQueueNavigator | undefined;

  const goToNeighbor = (nextId?: string | null) => {
    if (!nextId) {
      router.push(listHref);
      return;
    }
    const urlParams = new URLSearchParams();
    urlParams.set('filter', filter);
    if (search.trim()) {
      urlParams.set('search', search.trim());
    }
    urlParams.set('page', String(page));
    urlParams.set('pageSize', String(pageSize));
    router.push(`/verification/organizations/${nextId}?${urlParams.toString()}`);
  };

  return (
    <div
      className="-m-4 flex h-full lg:h-[calc(100%+3rem)] 2xl:h-[calc(100%+4rem)] min-h-0 flex-col overflow-y-auto lg:-m-6 lg:overflow-hidden 2xl:-m-8"
      data-testid="cross-org-verification-detail-page"
    >
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* LEFT: Video + nawigacja (zwijalny) */}
        <CollapsibleMediaPanel onBack={() => router.push(listHref)}>
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/40 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(listHref)}
              className="-ml-2 h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-accent"
              data-testid="cross-org-verification-back-btn"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="text-sm">Wróć do kolejki</span>
            </Button>
            {exercise?.organizationId && (
              <span className="ml-auto rounded bg-accent px-2 py-0.5 text-xs text-muted-foreground">
                Org: {exercise.organizationId}
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
              goToNeighbor(navigator?.nextExerciseId);
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
              goToNeighbor(navigator?.nextExerciseId);
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
          remainingCount={navigator?.remainingCount ?? 0}
          onSkip={() => goToNeighbor(navigator?.nextExerciseId)}
          className="lg:w-[320px] lg:min-w-[320px]"
        />
      </div>
    </div>
  );
}
