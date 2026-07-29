'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useMutation } from '@apollo/client/react';
import {
  Loader2,
  Dumbbell,
  Sparkles,
  Upload,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { getMediaUrl } from '@/utils/mediaUrl';

import { UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import { useExerciseImageGeneration } from '@/features/exercises/useExerciseImageGeneration';
import { ImageStylePicker } from '@/features/exercises/ImageStylePicker';
import {
  ENABLE_EXTENDED_PATIENT_OVERRIDE_FIELDS,
  ENABLE_FULL_PATIENT_PERSONALIZATION,
  ExerciseParametersFields,
  buildOverrideDelta,
  replaceOverrideMapEntry,
  type ExerciseFieldKey,
  type ExerciseParameterValues,
  type MappingOnlyFieldKey,
  type ParameterTestIdKind,
} from '@/components/shared/exercise';
import type { PatientAssignment, ExerciseMapping, ExerciseOverride } from './PatientAssignmentCard';

const OVERRIDE_FIELD_TESTID_MAP: Record<
  ExerciseFieldKey | MappingOnlyFieldKey,
  { input: string; info: string }
> = {
  sets: { input: 'patient-exercise-override-sets-input', info: 'patient-exercise-override-sets-info' },
  reps: { input: 'patient-exercise-override-reps-input', info: 'patient-exercise-override-reps-info' },
  executionTime: {
    input: 'patient-exercise-override-execution-time-input',
    info: 'patient-exercise-override-execution-time-info',
  },
  restSets: {
    input: 'patient-exercise-override-rest-sets-input',
    info: 'patient-exercise-override-rest-sets-info',
  },
  restReps: {
    input: 'patient-exercise-override-rest-reps-input',
    info: 'patient-exercise-override-rest-reps-info',
  },
  preparationTime: {
    input: 'patient-exercise-override-prep-time-input',
    info: 'patient-exercise-override-prep-time-info',
  },
  duration: {
    input: 'patient-exercise-override-duration-input',
    info: 'patient-exercise-override-duration-info',
  },
  load: { input: 'patient-exercise-override-load-kg-input', info: 'patient-exercise-override-load-kg-info' },
  tempo: { input: 'patient-exercise-override-tempo-input', info: 'patient-exercise-override-tempo-info' },
  side: { input: 'patient-exercise-override-side-select', info: 'patient-exercise-override-side-info' },
  rangeOfMotion: { input: 'patient-exercise-override-rom-input', info: 'patient-exercise-override-rom-info' },
  difficultyLevel: {
    input: 'patient-exercise-override-difficulty-select',
    info: 'patient-exercise-override-difficulty-info',
  },
  patientDescription: {
    input: 'patient-exercise-override-patient-description-input',
    info: 'patient-exercise-override-patient-description-info',
  },
  clinicalDescription: {
    input: 'patient-exercise-override-clinical-description-input',
    info: 'patient-exercise-override-clinical-description-info',
  },
  audioCue: {
    input: 'patient-exercise-override-audio-cue-input',
    info: 'patient-exercise-override-audio-cue-info',
  },
  notes: { input: 'patient-exercise-override-notes-input', info: 'patient-exercise-override-notes-info' },
  customName: {
    input: 'patient-exercise-override-custom-name-input',
    info: 'patient-exercise-override-custom-name-info',
  },
  customDescription: {
    input: 'patient-exercise-override-custom-description-input',
    info: 'patient-exercise-override-custom-description-info',
  },
};

interface EditExerciseOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: PatientAssignment | null;
  mapping: ExerciseMapping | null;
  currentOverride?: ExerciseOverride;
  patientId: string;
  onSuccess?: () => void;
}

// Helper
const translateSide = (side?: string) => {
  if (!side) return '';
  const normalizedSide = side.toLowerCase();
  const sides: Record<string, string> = {
    left: 'lewa strona',
    right: 'prawa strona',
    both: 'obie strony',
    alternating: 'naprzemiennie',
    none: 'bez strony',
  };
  return sides[normalizedSide] || side;
};

// Wrapper component that handles dialog state
export function EditExerciseOverrideDialog({
  open,
  onOpenChange,
  assignment,
  mapping,
  currentOverride,
  patientId,
  onSuccess,
}: EditExerciseOverrideDialogProps) {
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleCloseAttempt = useCallback(() => {
    if (hasChanges) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [hasChanges, onOpenChange]);

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    setHasChanges(false);
    onOpenChange(false);
  }, [onOpenChange]);

  // Reset when dialog closes
  if (!open && hasChanges) {
    setHasChanges(false);
  }

  return (
    <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
      {open && assignment && mapping && (
        <EditExerciseOverrideDialogContent
          assignment={assignment}
          mapping={mapping}
          currentOverride={currentOverride}
          patientId={patientId}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
          onCloseAttempt={handleCloseAttempt}
          onHasChanges={setHasChanges}
        />
      )}

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
    </Dialog>
  );
}

// Inner component with form state - remounts on each dialog open
interface EditExerciseOverrideDialogContentProps {
  assignment: PatientAssignment;
  mapping: ExerciseMapping;
  currentOverride?: ExerciseOverride;
  patientId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onCloseAttempt: () => void;
  onHasChanges: (hasChanges: boolean) => void;
}

function EditExerciseOverrideDialogContent({
  assignment,
  mapping,
  currentOverride,
  patientId,
  onOpenChange,
  onSuccess,
  onCloseAttempt,
  onHasChanges,
}: EditExerciseOverrideDialogContentProps) {
  const exercise = mapping.exercise;

  // Initial values for change detection
  const inheritedSets = mapping.sets ?? exercise?.sets ?? 0;
  const inheritedReps = mapping.reps ?? exercise?.reps ?? 0;
  const inheritedDuration = mapping.duration ?? exercise?.duration ?? 0;
  const inheritedExecutionTime = mapping.executionTime ?? exercise?.defaultExecutionTime ?? 0;
  const inheritedRestSets = mapping.restSets ?? 0;
  const inheritedRestReps = mapping.restReps ?? 0;
  const inheritedPreparationTime = mapping.preparationTime ?? exercise?.preparationTime ?? 0;
  const inheritedTempo = mapping.tempo ?? '';
  const inheritedLoadKg =
    mapping.loadUnit === 'kg' && mapping.loadValue != null ? mapping.loadValue : null;
  const inheritedRom = exercise?.rangeOfMotion ?? '';
  const exerciseSideValue = exercise?.side?.toLowerCase() || exercise?.exerciseSide;
  const inheritedExerciseSide = exerciseSideValue ?? 'none';
  const inheritedDifficulty = exercise?.difficultyLevel ?? 'UNKNOWN';
  const inheritedPatientDescription =
    exercise?.patientDescription ?? exercise?.description ?? '';
  const inheritedClinicalDescription = exercise?.clinicalDescription ?? '';
  const inheritedAudioCue = exercise?.audioCue ?? '';

  const initialSets = currentOverride?.sets ?? inheritedSets;
  const initialReps = currentOverride?.reps ?? inheritedReps;
  const initialDuration = currentOverride?.duration ?? inheritedDuration;
  const initialExecutionTime = currentOverride?.executionTime ?? inheritedExecutionTime;
  const initialRestSets = currentOverride?.restSets ?? inheritedRestSets;
  const initialRestReps = currentOverride?.restReps ?? inheritedRestReps;
  const initialPreparationTime = currentOverride?.preparationTime ?? inheritedPreparationTime;
  const initialTempo = currentOverride?.tempo ?? inheritedTempo;
  const initialLoadKg = currentOverride?.loadWeightKg ?? inheritedLoadKg;
  const initialRangeOfMotion = currentOverride?.rangeOfMotion ?? inheritedRom;
  const initialCustomName = currentOverride?.customName ?? mapping.customName ?? '';
  const initialCustomDescription =
    currentOverride?.customDescription ??
    mapping.customDescription ??
    exercise?.patientDescription ??
    exercise?.description ??
    '';
  const initialNotes = currentOverride?.notes ?? mapping.notes ?? '';
  const initialExerciseSide = currentOverride?.exerciseSide ?? inheritedExerciseSide;
  const initialDifficultyLevel = currentOverride?.difficultyLevel ?? inheritedDifficulty;
  const initialPatientDescription =
    currentOverride?.patientDescription ?? inheritedPatientDescription;
  const initialClinicalDescription =
    currentOverride?.clinicalDescription ?? inheritedClinicalDescription;
  const initialAudioCue = currentOverride?.audioCue ?? inheritedAudioCue;
  const initialCustomImages = currentOverride?.customImages ?? [];

  const [sets, setSets] = useState<number>(initialSets);
  const [reps, setReps] = useState<number>(initialReps);
  const [duration, setDuration] = useState<number>(initialDuration);
  const [executionTime, setExecutionTime] = useState<number>(initialExecutionTime);
  const [restSets, setRestSets] = useState<number>(initialRestSets);
  const [restReps, setRestReps] = useState<number>(initialRestReps);
  const [preparationTime, setPreparationTime] = useState<number>(initialPreparationTime);
  const [tempo, setTempo] = useState(initialTempo);
  const [loadKg, setLoadKg] = useState<number | null>(initialLoadKg);
  const [rangeOfMotion, setRangeOfMotion] = useState(initialRangeOfMotion);
  const [customName, setCustomName] = useState(initialCustomName);
  const [customDescription, setCustomDescription] = useState(initialCustomDescription);
  const [notes, setNotes] = useState(initialNotes);
  const [exerciseSide, setExerciseSide] = useState(initialExerciseSide);
  const [difficultyLevel, setDifficultyLevel] = useState(initialDifficultyLevel);
  const [patientDescription, setPatientDescription] = useState(initialPatientDescription);
  const [clinicalDescription, setClinicalDescription] = useState(initialClinicalDescription);
  const [audioCue, setAudioCue] = useState(initialAudioCue);
  const [customImages, setCustomImages] = useState<string[]>(initialCustomImages);
  const {
    generate: generateExerciseImage,
    isGenerating: isGeneratingImage,
    imageStyle,
    setImageStyle,
  } = useExerciseImageGeneration({
    showSuccessToast: false,
  });

  // File input ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const parameterValues = React.useMemo<ExerciseParameterValues>(
    () => ({
      sets,
      reps,
      executionTime,
      duration,
      restSets,
      restReps,
      preparationTime,
      loadKg,
      tempo,
      rangeOfMotion,
      side: exerciseSide,
      difficultyLevel,
      patientDescription,
      clinicalDescription,
      audioCue,
      notes,
      customName,
      customDescription,
    }),
    [
      sets,
      reps,
      executionTime,
      duration,
      restSets,
      restReps,
      preparationTime,
      loadKg,
      tempo,
      rangeOfMotion,
      exerciseSide,
      difficultyLevel,
      patientDescription,
      clinicalDescription,
      audioCue,
      notes,
      customName,
      customDescription,
    ]
  );

  const inheritedValues = React.useMemo<Partial<ExerciseParameterValues>>(
    () => ({
      sets: inheritedSets,
      reps: inheritedReps,
      executionTime: inheritedExecutionTime,
      duration: inheritedDuration,
      restSets: inheritedRestSets,
      restReps: inheritedRestReps,
      preparationTime: inheritedPreparationTime,
      loadKg: inheritedLoadKg,
      tempo: inheritedTempo,
      rangeOfMotion: inheritedRom,
      side: inheritedExerciseSide,
      difficultyLevel: inheritedDifficulty,
      patientDescription: inheritedPatientDescription,
      clinicalDescription: inheritedClinicalDescription,
      audioCue: inheritedAudioCue,
    }),
    [
      inheritedSets,
      inheritedReps,
      inheritedExecutionTime,
      inheritedDuration,
      inheritedRestSets,
      inheritedRestReps,
      inheritedPreparationTime,
      inheritedLoadKg,
      inheritedTempo,
      inheritedRom,
      inheritedExerciseSide,
      inheritedDifficulty,
      inheritedPatientDescription,
      inheritedClinicalDescription,
      inheritedAudioCue,
    ]
  );

  const handleParametersChange = useCallback((patch: Partial<ExerciseParameterValues>) => {
    if ('sets' in patch && patch.sets != null) setSets(patch.sets);
    if ('reps' in patch && patch.reps != null) setReps(patch.reps);
    if ('executionTime' in patch) setExecutionTime(patch.executionTime ?? 0);
    if ('duration' in patch) setDuration(patch.duration ?? 0);
    if ('restSets' in patch) setRestSets(patch.restSets ?? 0);
    if ('restReps' in patch) setRestReps(patch.restReps ?? 0);
    if ('preparationTime' in patch) setPreparationTime(patch.preparationTime ?? 0);
    if ('loadKg' in patch) setLoadKg(patch.loadKg ?? null);
    if ('tempo' in patch) setTempo(patch.tempo ?? '');
    if ('rangeOfMotion' in patch) setRangeOfMotion(patch.rangeOfMotion ?? '');
    if ('side' in patch && patch.side != null) setExerciseSide(patch.side);
    if ('difficultyLevel' in patch && patch.difficultyLevel != null) {
      setDifficultyLevel(patch.difficultyLevel);
    }
    if ('patientDescription' in patch) setPatientDescription(patch.patientDescription ?? '');
    if ('clinicalDescription' in patch) setClinicalDescription(patch.clinicalDescription ?? '');
    if ('audioCue' in patch) setAudioCue(patch.audioCue ?? '');
    if ('notes' in patch) setNotes(patch.notes ?? '');
    if ('customName' in patch) setCustomName(patch.customName ?? '');
    if ('customDescription' in patch) setCustomDescription(patch.customDescription ?? '');
  }, []);

  const overrideTestIdFor = useCallback(
    (key: ExerciseFieldKey | MappingOnlyFieldKey, kind: ParameterTestIdKind) => {
      const mapped = OVERRIDE_FIELD_TESTID_MAP[key];
      return kind === 'info' ? mapped.info : mapped.input;
    },
    []
  );

  // Track changes
  const hasChanges =
    sets !== initialSets ||
    reps !== initialReps ||
    duration !== initialDuration ||
    executionTime !== initialExecutionTime ||
    restSets !== initialRestSets ||
    restReps !== initialRestReps ||
    preparationTime !== initialPreparationTime ||
    tempo !== initialTempo ||
    loadKg !== initialLoadKg ||
    rangeOfMotion !== initialRangeOfMotion ||
    customName !== initialCustomName ||
    customDescription !== initialCustomDescription ||
    notes !== initialNotes ||
    exerciseSide !== initialExerciseSide ||
    difficultyLevel !== initialDifficultyLevel ||
    patientDescription !== initialPatientDescription ||
    clinicalDescription !== initialClinicalDescription ||
    audioCue !== initialAudioCue ||
    JSON.stringify(customImages) !== JSON.stringify(initialCustomImages);

  // Notify parent
  React.useEffect(() => {
    onHasChanges(hasChanges);
  }, [hasChanges, onHasChanges]);

  // Mutation
  const [updateOverrides, { loading }] = useMutation(UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION);

  // Image handlers
  const handleGenerateImage = useCallback(async () => {
    const exerciseName = customName || exercise?.name;
    const exerciseDesc = customDescription || exercise?.description;

    if (!exerciseName) {
      toast.error('Brak nazwy ćwiczenia do wygenerowania obrazu');
      return;
    }

    const descParts: string[] = [];
    descParts.push(`Nazwa ćwiczenia: ${exerciseName}`);
    if (exerciseDesc) {
      descParts.push(`Opis: ${exerciseDesc}`);
    }
    if (exerciseSide && exerciseSide !== 'none') {
      descParts.push(`Strona: ${translateSide(exerciseSide)}`);
    }
    const fullDescription = descParts.join('. ');

    const file = await generateExerciseImage({
      exerciseName,
      exerciseDescription: fullDescription,
      exerciseType: exercise?.type as 'reps' | 'time' | undefined,
      style: imageStyle,
    });

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCustomImages((prev) => [...prev, reader.result as string]);
      toast.success('Obraz wygenerowany przez AI!');
    };
    reader.readAsDataURL(file);
  }, [exercise, customName, customDescription, exerciseSide, generateExerciseImage, imageStyle]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Proszę wybrać plik graficzny');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Plik jest zbyt duży. Maksymalny rozmiar to 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCustomImages((prev) => [...prev, reader.result as string]);
      toast.success('Zdjęcie dodane!');
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  }, []);

  const handleSave = async () => {
    try {
      const newOverride = buildOverrideDelta(
        {
          sets: inheritedSets,
          reps: inheritedReps,
          duration: inheritedDuration,
          executionTime: inheritedExecutionTime,
          restSets: inheritedRestSets,
          restReps: inheritedRestReps,
          preparationTime: inheritedPreparationTime,
          tempo: inheritedTempo,
          loadKg: inheritedLoadKg ?? undefined,
          loadWeightKg: inheritedLoadKg ?? undefined,
          rangeOfMotion: inheritedRom,
          customName: mapping.customName ?? '',
          customDescription:
            mapping.customDescription ??
            exercise?.patientDescription ??
            exercise?.description ??
            '',
          notes: mapping.notes ?? '',
          side: inheritedExerciseSide,
          exerciseSide: inheritedExerciseSide,
          difficultyLevel: inheritedDifficulty,
          patientDescription: inheritedPatientDescription,
          clinicalDescription: inheritedClinicalDescription,
          audioCue: inheritedAudioCue,
          customImages: [],
        },
        {
          sets,
          reps,
          duration,
          executionTime,
          restSets,
          restReps,
          ...(ENABLE_EXTENDED_PATIENT_OVERRIDE_FIELDS
            ? {
                preparationTime,
                tempo,
                loadKg,
                loadWeightKg: loadKg,
                rangeOfMotion,
              }
            : {}),
          customName,
          customDescription,
          notes,
          exerciseSide,
          side: exerciseSide,
          ...(ENABLE_FULL_PATIENT_PERSONALIZATION
            ? {
                difficultyLevel,
                patientDescription,
                clinicalDescription,
                audioCue,
              }
            : {}),
          customImages,
        }
      );

      if (currentOverride?.hidden) {
        newOverride.hidden = true;
      }

      // Preserve keys the dialog does not rebuild (enrichment, patient-added metadata).
      if (currentOverride?.enrichment) {
        newOverride.enrichment = currentOverride.enrichment;
      }
      const previousEntry = currentOverride as
        | (typeof currentOverride & { exerciseId?: string; isPatientAdded?: boolean })
        | undefined;
      if (previousEntry?.exerciseId) {
        (newOverride as ExerciseOverride & { exerciseId?: string }).exerciseId =
          previousEntry.exerciseId;
      }
      if (previousEntry?.isPatientAdded) {
        (newOverride as ExerciseOverride & { isPatientAdded?: boolean }).isPatientAdded = true;
      }

      const exerciseOverrides = replaceOverrideMapEntry(
        assignment.exerciseOverrides,
        mapping.id,
        newOverride
      );

      await updateOverrides({
        variables: {
          assignmentId: assignment.id,
          exerciseOverrides,
        },
        refetchQueries: [
          {
            query: GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY,
            variables: { userId: patientId },
          },
        ],
      });

      toast.success('Parametry ćwiczenia zostały zaktualizowane');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Błąd aktualizacji parametrów:', error);
      toast.error('Nie udało się zaktualizować parametrów');
    }
  };

  const handleReset = () => {
    setSets(inheritedSets);
    setReps(inheritedReps);
    setDuration(inheritedDuration);
    setExecutionTime(inheritedExecutionTime);
    setRestSets(inheritedRestSets);
    setRestReps(inheritedRestReps);
    setPreparationTime(inheritedPreparationTime);
    setTempo(inheritedTempo);
    setLoadKg(inheritedLoadKg);
    setRangeOfMotion(inheritedRom);
    setCustomName(mapping.customName ?? '');
    setCustomDescription(
      mapping.customDescription ?? exercise?.patientDescription ?? exercise?.description ?? ''
    );
    setNotes(mapping.notes ?? '');
    setExerciseSide(inheritedExerciseSide);
    setDifficultyLevel(inheritedDifficulty);
    setPatientDescription(inheritedPatientDescription);
    setClinicalDescription(inheritedClinicalDescription);
    setAudioCue(inheritedAudioCue);
    setCustomImages([]);
  };

  const imageUrl = getMediaUrl(exercise?.imageUrl || exercise?.images?.[0]);
  const setName = assignment.exerciseSet?.name || 'Nieznany zestaw';

  return (
    <DialogContent
      className="max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl"
      onInteractOutside={(e) => e.preventDefault()}
      onEscapeKeyDown={(e) => {
        e.preventDefault();
        onCloseAttempt();
      }}
      data-testid="patient-exercise-override-dialog"
    >
      <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
        <DialogTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          Dostosuj parametry
        </DialogTitle>
        <DialogDescription>Personalizuj ćwiczenie dla tego pacjenta w zestawie &quot;{setName}&quot;</DialogDescription>
      </DialogHeader>

      <div className="flex-1 min-h-0 overflow-y-auto px-6">
        <div className="space-y-5 pb-6">
          {/* Exercise preview */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-start gap-4">
              <div className="relative h-16 w-16 rounded-lg overflow-hidden shrink-0">
                {imageUrl ? (
                  <Image src={imageUrl} alt={exercise?.name ?? ''} fill className="object-cover" sizes="64px" />
                ) : (
                  <ImagePlaceholder type="exercise" iconClassName="h-6 w-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-lg">{exercise?.name || 'Nieznane ćwiczenie'}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {(exercise?.side || exercise?.exerciseSide) &&
                    (exercise?.side || exercise?.exerciseSide) !== 'none' &&
                    (exercise?.side || exercise?.exerciseSide)?.toLowerCase() !== 'none' && (
                      <Badge variant="outline" className="text-xs">
                        {translateSide(exercise?.side || exercise?.exerciseSide)}
                      </Badge>
                    )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Parametry ćwiczenia</p>
              <Button type="button" variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs">
                Przywróć domyślne
              </Button>
            </div>
            <ExerciseParametersFields
              surface="patientOverride"
              values={parameterValues}
              onChange={handleParametersChange}
              inheritedValues={inheritedValues}
              showContentSection
              showMappingOnlyFields
              density="comfortable"
              advancedDefaultOpen={false}
              testIdFor={overrideTestIdFor}
              structuralTestIdPrefix="patient-exercise-override"
            />
          </div>

          <Separator />

          {/* Images section */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Zdjęcia dla pacjenta</p>

            {/* Main exercise image - read only preview */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Główne zdjęcie ćwiczenia</Label>
              <div className="flex items-center gap-4 p-3 rounded-xl border border-border bg-surface/50">
                <div className="relative h-20 w-20 rounded-lg overflow-hidden shrink-0 bg-surface-light">
                  {imageUrl ? (
                    <Image src={imageUrl} alt={exercise?.name ?? ''} fill className="object-cover" sizes="80px" />
                  ) : (
                    <ImagePlaceholder type="exercise" iconClassName="h-8 w-8" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{exercise?.name || 'Nieznane ćwiczenie'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Główne zdjęcie jest wspólne dla wszystkich pacjentów
                  </p>
                </div>
              </div>
            </div>

            {/* Custom images for patient */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Dodatkowe zdjęcia dla pacjenta</Label>
                <span className="text-xs text-muted-foreground">{customImages.length} zdjęć</span>
              </div>

              {customImages.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {customImages.map((img, index) => (
                    <div
                      key={index}
                      className="relative group aspect-square rounded-lg overflow-hidden border border-border"
                    >
                      <Image src={img} alt={`Zdjęcie ${index + 1}`} fill className="object-cover" sizes="(max-width: 768px) 33vw, 200px" />
                      <button
                        type="button"
                        onClick={() => setCustomImages((prev) => prev.filter((_, i) => i !== index))}
                        className="absolute top-1 right-1 p-1.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                        title="Usuń zdjęcie"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 gap-2"
                  data-testid="patient-exercise-override-upload-btn"
                >
                  <Upload className="h-4 w-4" />
                  Wgraj z dysku
                </Button>
                <ImageStylePicker
                  value={imageStyle}
                  onChange={setImageStyle}
                  disabled={isGeneratingImage}
                  testIdPrefix="patient-exercise-override-ai-style"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage}
                  aria-busy={isGeneratingImage}
                  className="flex-1 gap-2"
                  data-testid="patient-exercise-override-ai-generate-btn"
                >
                  {isGeneratingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {isGeneratingImage ? 'Generowanie…' : 'Generuj AI'}
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              <p className="text-xs text-muted-foreground">Te zdjęcia będą widoczne tylko dla tego pacjenta</p>
            </div>
          </div>

                    {/* Summary of changes */}
          {(currentOverride?.sets !== undefined ||
            currentOverride?.reps !== undefined ||
            currentOverride?.duration !== undefined ||
            currentOverride?.customName) && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
              <p className="text-xs font-medium text-primary mb-1">To ćwiczenie ma personalizację</p>
              <p className="text-xs text-muted-foreground">
                Parametry tego ćwiczenia są dostosowane dla tego pacjenta i różnią się od domyślnych.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions - fixed at bottom */}
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-background/95 backdrop-blur-sm shrink-0">
        <Button
          variant="outline"
          onClick={onCloseAttempt}
          className="rounded-xl"
          data-testid="patient-exercise-override-cancel-btn"
        >
          Anuluj
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading}
          className="rounded-xl shadow-lg shadow-primary/20"
          data-testid="patient-exercise-override-submit-btn"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Zapisz zmiany
        </Button>
      </div>
    </DialogContent>
  );
}
