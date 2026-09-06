'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { SetNameField } from '@/features/exercise-sets/components/SetNameField';
import { SetDescriptionCollapsible } from '@/features/exercise-sets/components/SetDescriptionCollapsible';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  ExerciseSetBuilder,
  type ExerciseInstance,
  type ExerciseParams,
  type BuilderExercise,
  type ExerciseTag,
} from '@/components/shared/ExerciseSetBuilder';
import {
  ExercisePreviewDialog,
  fromBuilderExercise,
  type ExerciseExecutionCardData,
} from '@/components/shared/exercise';
import { cn } from '@/lib/utils';
import { aiService } from '@/services/aiService';

import { GET_AVAILABLE_EXERCISES_LIST_QUERY } from '@/graphql/queries/exercises.queries';
import { exerciseSetListRefetch, therapistAssignmentRefetch } from '@/graphql/cache/invalidation';
import { useOptionalCurrentUser } from '@/contexts/CurrentUserContext';
import {
  CREATE_EXERCISE_SET_MUTATION,
  ADD_EXERCISE_TO_EXERCISE_SET_MUTATION,
  ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION,
} from '@/graphql/mutations/exercises.mutations';
import { GET_ORGANIZATION_EXERCISE_SETS_QUERY } from '@/graphql/queries/exerciseSets.queries';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from '@/graphql/queries/tagCategories.queries';
import { GET_PATIENT_CLINICAL_NOTES_QUERY } from '@/graphql/queries/clinicalNotes.queries';
import { createTagsMap, mapExercisesWithTags } from '@/utils/tagUtils';
import type { ExerciseTagsResponse, TagCategoriesResponse, OrganizationExerciseSetsResponse } from '@/types/apollo';
import { getExerciseDefaultParams } from '@/features/exercise-sets/utils/exerciseDefaults';
import { submitCreateTemplateSet } from '@/features/exercise-sets/utils/createSetSubmit';
import { buildMappingOverridesFromParams } from '@/features/exercise-sets/utils/buildMappingOverridesFromParams';

interface CreateSetWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: (setId: string) => void;
  patientId?: string;
  patientName?: string;
  autoAssign?: boolean;
  initialExerciseIds?: string[];
}

interface PatientContext {
  patientId: string;
  patientName?: string;
  diagnosis?: string[];
  painLocation?: string;
}

export function CreateSetWizard({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
  patientId,
  patientName,
  autoAssign = false,
  initialExerciseIds,
}: CreateSetWizardProps) {
  const currentUser = useOptionalCurrentUser()?.user ?? null;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [selectedInstances, setSelectedInstances] = useState<ExerciseInstance[]>([]);
  const [exerciseParams, setExerciseParams] = useState<Map<string, ExerciseParams>>(new Map());
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [previewExercise, setPreviewExercise] = useState<ExerciseExecutionCardData | null>(null);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [showNameError, setShowNameError] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const initializedFromInitialRef = useRef(false);

  const hasChanges = name.trim().length > 0 || description.trim().length > 0 || selectedInstances.length > 0;

  const handleCloseAttempt = useCallback(() => {
    if (hasChanges) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [hasChanges, onOpenChange]);

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      setName(patientName ? `Zestaw dla ${patientName}` : '');
      setDescription('');
      setShowDescription(false);
      setSelectedInstances([]);
      setExerciseParams(new Map());
      setShowCloseConfirm(false);
      setPreviewExercise(null);
      setIsGeneratingName(false);
      setShowNameError(false);
      initializedFromInitialRef.current = false;
    }
  }, [open, patientName]);

  const { data: exercisesData, loading: loadingExercises } = useQuery(GET_AVAILABLE_EXERCISES_LIST_QUERY, {
    variables: { organizationId },
    skip: !organizationId || !open,
  });

  const { data: tagsData } = useQuery(GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY, {
    variables: { organizationId },
    skip: !organizationId || !open,
  });

  const { data: categoriesData } = useQuery(GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY, {
    variables: { organizationId },
    skip: !organizationId || !open,
  });

  const { data: exerciseSetsData, refetch: refetchExerciseSets } = useQuery(GET_ORGANIZATION_EXERCISE_SETS_QUERY, {
    variables: { organizationId },
    skip: !organizationId || !open,
  });

  const { data: clinicalNotesData } = useQuery(GET_PATIENT_CLINICAL_NOTES_QUERY, {
    variables: { patientId: patientId || '', organizationId },
    skip: !patientId || !organizationId || !open,
  });

  const patientContext: PatientContext | undefined = useMemo(() => {
    if (!patientId) return undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notes = (clinicalNotesData as any)?.patientClinicalNotes || [];
    const latestNote = notes[0];

    let diagnosis: string[] = [];
    let painLocation: string | undefined;

    if (latestNote?.sections?.diagnosis?.icd10Codes) {
      diagnosis = latestNote.sections.diagnosis.icd10Codes.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (code: any) => `${code.code}: ${code.description}`
      );
    }

    if (latestNote?.sections?.interview?.painLocation) {
      painLocation = latestNote.sections.interview.painLocation;
    }

    return {
      patientId,
      patientName,
      diagnosis: diagnosis.length > 0 ? diagnosis : undefined,
      painLocation,
    };
  }, [patientId, patientName, clinicalNotesData]);

  const [createSet, { loading: creatingSet }] = useMutation(CREATE_EXERCISE_SET_MUTATION, {
    refetchQueries: exerciseSetListRefetch(organizationId),
  });
  const [addExercise, { loading: addingExercises }] = useMutation(ADD_EXERCISE_TO_EXERCISE_SET_MUTATION);
  const [assignSetToPatient, { loading: assigning }] = useMutation(ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION, {
    refetchQueries: currentUser?.id ? therapistAssignmentRefetch(currentUser.id) : [],
  });

  const tags = useMemo(() => (tagsData as ExerciseTagsResponse)?.exerciseTags || [], [tagsData]);
  const categories = useMemo(
    () => (categoriesData as TagCategoriesResponse)?.tagsByOrganizationId || [],
    [categoriesData]
  );
  const tagsMap = useMemo(() => createTagsMap(tags, categories), [tags, categories]);
  const exerciseSets = useMemo(
    () => (exerciseSetsData as OrganizationExerciseSetsResponse)?.exerciseSets || [],
    [exerciseSetsData]
  );

  const exercises: BuilderExercise[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawExercises = (exercisesData as { availableExercises?: any[] })?.availableExercises || [];
    return mapExercisesWithTags(rawExercises, tagsMap) as BuilderExercise[];
  }, [exercisesData, tagsMap]);

  const builderTags: ExerciseTag[] = useMemo(
    () => tags.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })),
    [tags]
  );

  const exercisePopularity = useMemo(() => {
    const popularity: Record<string, number> = {};
    for (const set of exerciseSets) {
      for (const mapping of set.exerciseMappings || []) {
        if (mapping.exerciseId) {
          popularity[mapping.exerciseId] = (popularity[mapping.exerciseId] || 0) + 1;
        }
      }
    }
    return popularity;
  }, [exerciseSets]);

  const getDefaultParams = useCallback(
    (exercise: BuilderExercise): ExerciseParams => getExerciseDefaultParams(exercise),
    []
  );

  useEffect(() => {
    if (!open || initializedFromInitialRef.current) {
      return;
    }
    if (!initialExerciseIds || initialExerciseIds.length === 0) {
      return;
    }
    if (exercises.length === 0) {
      return;
    }

    const newInstances: ExerciseInstance[] = [];
    const newParams = new Map<string, ExerciseParams>();

    for (const exerciseId of initialExerciseIds) {
      const matchedExercise = exercises.find((exercise) => exercise.id === exerciseId);
      if (!matchedExercise) {
        continue;
      }

      const instanceId = `${matchedExercise.id}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      newInstances.push({ instanceId, exerciseId: matchedExercise.id });
      newParams.set(instanceId, getDefaultParams(matchedExercise));
    }

    if (newInstances.length > 0) {
      setSelectedInstances((prev) => [...prev, ...newInstances]);
      setExerciseParams((prev) => {
        const next = new Map(prev);
        for (const [key, value] of newParams) {
          next.set(key, value);
        }
        return next;
      });
    }

    initializedFromInitialRef.current = true;
  }, [open, initialExerciseIds, exercises, getDefaultParams]);

  const handlePreviewExercise = useCallback(
    (exercise: BuilderExercise, params?: ExerciseParams) => {
      setPreviewExercise(fromBuilderExercise(exercise, params ?? getDefaultParams(exercise)));
    },
    [getDefaultParams]
  );

  const handleGenerateAIName = useCallback(async () => {
    if (selectedInstances.length === 0) {
      toast.error('Dodaj przynajmniej jedno ćwiczenie, aby AI mogło zasugerować nazwę');
      return;
    }

    try {
      setIsGeneratingName(true);

      const exerciseNames = selectedInstances
        .map((instance) => exercises.find((exercise) => exercise.id === instance.exerciseId)?.name)
        .filter((exerciseName): exerciseName is string => Boolean(exerciseName));

      const response = await aiService.suggestSetName(name, exerciseNames);
      if (response?.suggestedName) {
        setName(response.suggestedName);
        if (response.suggestedName.trim().length >= 2) {
          setShowNameError(false);
        }
        toast.success('Nazwa została wygenerowana');
        return;
      }

      toast.error('AI nie zwróciło poprawnej nazwy');
    } catch (error) {
      console.error('Błąd generowania nazwy zestawu:', error);
      toast.error('Nie udało się wygenerować nazwy');
    } finally {
      setIsGeneratingName(false);
    }
  }, [exercises, name, selectedInstances]);

  const canCreate = name.trim().length >= 2;
  const isLoading = creatingSet || addingExercises || assigning;

  const focusNameInput = useCallback(() => {
    if (!nameInputRef.current) return;

    nameInputRef.current.focus();
    nameInputRef.current.scrollIntoView?.({ block: 'center', inline: 'nearest' });
  }, []);

  const handleCreateSet = async () => {
    if (!canCreate) {
      setShowNameError(true);
      focusNameInput();
      return;
    }

    try {
      const sanitizedName = name.trim();
      const mappings = selectedInstances
        .map(({ instanceId, exerciseId }) => {
          const exercise = exercises.find((item) => item.id === exerciseId);
          if (!exercise) return null;
          const params = exerciseParams.get(instanceId) || getDefaultParams(exercise);
          const overridesJson = buildMappingOverridesFromParams(exercise, params);
          return {
            exerciseId,
            sets: params.sets,
            reps: params.reps,
            duration: params.duration,
            restSets: params.restSets,
            restReps: params.restReps,
            preparationTime: params.preparationTime,
            executionTime: params.executionTime,
            notes: params.notes,
            customName: params.customName,
            customDescription: params.customDescription,
            tempo: params.tempo,
            loadWeightKg: params.loadWeightKg,
            loadValue: params.loadValue,
            overridesJson: overridesJson ?? '',
          };
        })
        .filter((mapping): mapping is NonNullable<typeof mapping> => mapping !== null);

      const newSetId = await submitCreateTemplateSet(
        {
          createSet: (options) => createSet(options),
          addExercise: (options) => addExercise(options),
        },
        {
          organizationId,
          name: sanitizedName,
          description,
        },
        mappings
      );

      await refetchExerciseSets();

      if (autoAssign && patientId) {
        await assignSetToPatient({
          variables: {
            exerciseSetId: newSetId,
            patientId,
          },
        });
        toast.success(`Zestaw "${sanitizedName}" utworzony i przypisany do pacjenta`);
      } else {
        toast.success(`Zestaw "${sanitizedName}" utworzony`);
      }
      onOpenChange(false);
      onSuccess?.(newSetId);
    } catch (error) {
      console.error('Błąd tworzenia zestawu:', error);
      toast.error('Nie udało się utworzyć zestawu');
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      <DialogContent
        className="max-w-7xl w-[98vw] max-h-[95vh] h-[90vh] md:h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-surface border-border"
        hideCloseButton
        data-testid="set-composer"
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          if (!event.metaKey && !event.ctrlKey) return;
          event.preventDefault();
          if (isLoading) return;
          void handleCreateSet();
        }}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCloseAttempt();
        }}
      >
        <VisuallyHidden.Root>
          <DialogTitle>Nowy zestaw ćwiczeń</DialogTitle>
        </VisuallyHidden.Root>
        <div className="shrink-0 bg-surface/95 backdrop-blur-sm border-b border-border">
          <div className="px-6">
            <div className="h-7 flex items-end pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 leading-none">
                Nazwa zestawu
              </span>
            </div>
            <div className="min-h-11 py-1 flex items-start gap-0 -mx-1">
              <div className="w-full lg:w-[40%] min-w-0 pr-3 flex flex-col">
                <SetNameField
                  value={name}
                  onChange={setName}
                  onGenerateAiName={() => {
                    void handleGenerateAIName();
                  }}
                  isGeneratingName={isGeneratingName}
                  showError={showNameError}
                  onClearError={() => setShowNameError(false)}
                  inputRef={nameInputRef}
                  autoFocus
                  testIdPrefix="set-composer"
                />
              </div>
              <div className="flex-1 flex items-center justify-end gap-3 min-w-0 pl-3">
                {patientContext && (
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0">
                    <span>Dla:</span>
                    <span className="font-medium text-foreground">{patientContext.patientName}</span>
                    {autoAssign && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] bg-surface-light border-border text-muted-foreground"
                      >
                        Auto-przypisanie
                      </Badge>
                    )}
                  </div>
                )}
                <Button
                  data-testid="createsetwizard-button-434"
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseAttempt}
                  className="h-9 w-9 min-w-9 shrink-0 text-muted-foreground hover:text-foreground rounded-md"
                  aria-label="Zamknij"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="w-full lg:w-[40%]">
              <SetDescriptionCollapsible
                open={showDescription}
                onOpenChange={setShowDescription}
                value={description}
                onChange={setDescription}
                testIdPrefix="set-composer-description"
                className="pb-4"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <ExerciseSetBuilder
            name={name}
            onNameChange={setName}
            selectedInstances={selectedInstances}
            onSelectedInstancesChange={setSelectedInstances}
            exerciseParams={exerciseParams}
            onExerciseParamsChange={setExerciseParams}
            availableExercises={exercises}
            loadingExercises={loadingExercises}
            tags={builderTags}
            exercisePopularity={exercisePopularity}
            hideNameSection
            onPreviewExercise={handlePreviewExercise}
            testIdPrefix="set-create-wizard"
          />
        </div>

        <div className="px-6 py-4 border-t border-border bg-surface shrink-0 flex items-center justify-between gap-3">
          <Button
            data-testid="set-create-set-wizard-btn-478"
            type="button"
            variant="ghost"
            onClick={handleCloseAttempt}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground"
          >
            Anuluj
          </Button>

          <Button
            type="button"
            onClick={handleCreateSet}
            disabled={isLoading}
            className={cn(
              'px-8 bg-primary hover:bg-primary-dark text-primary-foreground font-semibold',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            data-testid="set-composer-create-btn"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            Utwórz zestaw
          </Button>
        </div>
      </DialogContent>

      <ConfirmDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        title="Porzucić zmiany?"
        description="Masz niezapisane zmiany. Czy na pewno chcesz zamknąć bez zapisywania?"
        confirmText="Tak, zamknij"
        cancelText="Kontynuuj edycję"
        variant="destructive"
        onConfirm={handleConfirmClose}
      />

      <ExercisePreviewDialog
        open={previewExercise !== null}
        exercise={previewExercise}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPreviewExercise(null);
        }}
        testIdPrefix="set-create-wizard-preview"
      />
    </Dialog>
  );
}
