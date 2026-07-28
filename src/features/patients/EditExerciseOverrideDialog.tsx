'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useMutation } from '@apollo/client/react';
import {
  Loader2,
  Dumbbell,
  Plus,
  Minus,
  Clock,
  Sparkles,
  Upload,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  RefreshCw,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { getMediaUrl } from '@/utils/mediaUrl';
import { useNumericDraft } from '@/hooks/useNumericDraft';

import { UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { GET_PATIENT_ASSIGNMENTS_BY_USER_QUERY } from '@/graphql/queries/patientAssignments.queries';
import { useExerciseImageGeneration } from '@/features/exercises/useExerciseImageGeneration';
import { ImageStylePicker } from '@/features/exercises/ImageStylePicker';
import {
  ENABLE_EXTENDED_PATIENT_OVERRIDE_FIELDS,
  EXERCISE_FIELD_METADATA,
  SIDE_OPTIONS,
} from '@/components/shared/exercise';
import type { PatientAssignment, ExerciseMapping, ExerciseOverride } from './PatientAssignmentCard';

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

const SIDE_ICONS: Record<string, typeof X> = {
  none: X,
  left: ArrowLeft,
  right: ArrowRight,
  both: Maximize2,
  alternating: RefreshCw,
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
  const inheritedRom = '';
  const exerciseSideValue = exercise?.side?.toLowerCase() || exercise?.exerciseSide;
  const inheritedExerciseSide = exerciseSideValue ?? 'none';

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
  const [customImages, setCustomImages] = useState<string[]>(initialCustomImages);
  const {
    generate: generateExerciseImage,
    isGenerating: isGeneratingImage,
    imageStyle,
    setImageStyle,
  } = useExerciseImageGeneration({
    showSuccessToast: false,
  });

  const setsField = useNumericDraft({
    value: sets,
    onCommit: setSets,
    min: 0,
    parseMode: 'int',
  });

  const repsField = useNumericDraft({
    value: reps,
    onCommit: setReps,
    min: 0,
    parseMode: 'int',
  });

  const executionTimeField = useNumericDraft({
    value: executionTime,
    onCommit: setExecutionTime,
    min: 0,
    step: 5,
    parseMode: 'int',
  });

  const durationField = useNumericDraft({
    value: duration,
    onCommit: setDuration,
    min: 0,
    step: 5,
    parseMode: 'int',
  });

  const restSetsField = useNumericDraft({
    value: restSets,
    onCommit: setRestSets,
    min: 0,
    parseMode: 'int',
  });

  const restRepsField = useNumericDraft({
    value: restReps,
    onCommit: setRestReps,
    min: 0,
    parseMode: 'int',
  });

  const preparationTimeField = useNumericDraft({
    value: preparationTime,
    onCommit: setPreparationTime,
    min: 0,
    parseMode: 'int',
  });

  const loadKgField = useNumericDraft({
    value: loadKg ?? 0,
    onCommit: (value) => setLoadKg(value > 0 ? value : null),
    min: 0,
    parseMode: 'float',
  });

  // File input ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      // Parse existing overrides
      let existingOverrides: Record<string, ExerciseOverride> = {};
      if (assignment.exerciseOverrides) {
        try {
          existingOverrides = JSON.parse(assignment.exerciseOverrides);
        } catch {
          existingOverrides = {};
        }
      }

      // Build new override - only include non-default values
      const newOverride: ExerciseOverride = {};

      // Only save if different from mapping/exercise defaults
      const exerciseDefaults = mapping.exercise;
      const mappingDefaults = mapping;

      if (sets !== (mappingDefaults.sets ?? exerciseDefaults?.sets ?? 0)) {
        newOverride.sets = sets;
      }
      if (reps !== (mappingDefaults.reps ?? exerciseDefaults?.reps ?? 0)) {
        newOverride.reps = reps;
      }
      if (duration !== (mappingDefaults.duration ?? exerciseDefaults?.duration ?? 0)) {
        newOverride.duration = duration;
      }
      if (executionTime !== (mappingDefaults.executionTime ?? exerciseDefaults?.defaultExecutionTime ?? 0)) {
        newOverride.executionTime = executionTime;
      }
      if (restSets !== (mappingDefaults.restSets ?? 0)) {
        newOverride.restSets = restSets;
      }
      if (restReps !== (mappingDefaults.restReps ?? 0)) {
        newOverride.restReps = restReps;
      }
      if (ENABLE_EXTENDED_PATIENT_OVERRIDE_FIELDS) {
        if (preparationTime !== inheritedPreparationTime) {
          newOverride.preparationTime = preparationTime;
        }
        if (tempo !== inheritedTempo) {
          newOverride.tempo = tempo || undefined;
        }
        if (loadKg !== inheritedLoadKg) {
          newOverride.loadWeightKg = loadKg ?? undefined;
        }
        if (rangeOfMotion !== inheritedRom) {
          newOverride.rangeOfMotion = rangeOfMotion || undefined;
        }
      }
      if (customName && customName !== mappingDefaults.customName) {
        newOverride.customName = customName;
      }
      if (
        customDescription &&
        customDescription !== (mappingDefaults.customDescription ?? exerciseDefaults?.description ?? '')
      ) {
        newOverride.customDescription = customDescription;
      }
      if (notes) {
        newOverride.notes = notes;
      }
      const defaultExerciseSide = exerciseDefaults?.side?.toLowerCase() || exerciseDefaults?.exerciseSide || 'none';
      if (exerciseSide && exerciseSide !== defaultExerciseSide) {
        newOverride.exerciseSide = exerciseSide;
      }
      if (customImages.length > 0) {
        newOverride.customImages = customImages;
      }

      // Preserve hidden status if it exists
      if (existingOverrides[mapping.id]?.hidden) {
        newOverride.hidden = true;
      }

      // Update overrides - remove if empty, otherwise set
      const updatedOverrides = { ...existingOverrides };
      if (Object.keys(newOverride).length > 0) {
        updatedOverrides[mapping.id] = newOverride;
      } else {
        delete updatedOverrides[mapping.id];
      }

      await updateOverrides({
        variables: {
          assignmentId: assignment.id,
          exerciseOverrides: JSON.stringify(updatedOverrides),
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
    setCustomDescription(mapping.customDescription ?? exercise?.patientDescription ?? exercise?.description ?? '');
    setNotes(mapping.notes ?? '');
    setExerciseSide(inheritedExerciseSide);
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

          {/* Main parameters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Parametry ćwiczenia</p>
              <Button type="button" variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs">
                Przywróć domyślne
              </Button>
            </div>

            {/* Sets & Reps */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Serie</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={setsField.decrement}
                    disabled={!setsField.canDecrement}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={setsField.draftValue}
                    onChange={(e) => setsField.setDraftValue(e.target.value)}
                    onFocus={setsField.handleFocus}
                    onBlur={setsField.handleBlur}
                    onKeyDown={setsField.handleKeyDown}
                    className="h-11 text-center text-lg font-semibold"
                    data-testid="patient-exercise-override-sets-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={setsField.increment}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Powtórzenia</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={repsField.decrement}
                    disabled={!repsField.canDecrement}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={repsField.draftValue}
                    onChange={(e) => repsField.setDraftValue(e.target.value)}
                    onFocus={repsField.handleFocus}
                    onBlur={repsField.handleBlur}
                    onKeyDown={repsField.handleKeyDown}
                    className="h-11 text-center text-lg font-semibold"
                    data-testid="patient-exercise-override-reps-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={repsField.increment}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Execution time */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Czas powtórzenia (sekundy)
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={executionTimeField.decrement}
                    disabled={!executionTimeField.canDecrement}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={executionTimeField.draftValue}
                    onChange={(e) => executionTimeField.setDraftValue(e.target.value)}
                    onFocus={executionTimeField.handleFocus}
                    onBlur={executionTimeField.handleBlur}
                    onKeyDown={executionTimeField.handleKeyDown}
                    className="h-11 text-center text-lg font-semibold"
                    step={5}
                    data-testid="patient-exercise-override-execution-time-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={executionTimeField.increment}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Główny timer pojedynczego powtórzenia</p>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Czas serii (sekundy)
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={durationField.decrement}
                    disabled={!durationField.canDecrement}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={durationField.draftValue}
                    onChange={(e) => durationField.setDraftValue(e.target.value)}
                    onFocus={durationField.handleFocus}
                    onBlur={durationField.handleBlur}
                    onKeyDown={durationField.handleKeyDown}
                    className="h-11 text-center text-lg font-semibold"
                    step={5}
                    data-testid="patient-exercise-override-duration-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={durationField.increment}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Użyj dla ćwiczeń time-based (override czasu serii)</p>
              </div>
            </div>

            {/* Rest parameters */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  {EXERCISE_FIELD_METADATA.restSets.label} (s)
                  {restSets === inheritedRestSets && (
                    <Badge variant="outline" className="ml-2 text-[10px] font-normal">
                      odziedziczone
                    </Badge>
                  )}
                </Label>
                <Input
                  type="number"
                  value={restSetsField.draftValue}
                  onChange={(e) => restSetsField.setDraftValue(e.target.value)}
                  onFocus={restSetsField.handleFocus}
                  onBlur={restSetsField.handleBlur}
                  onKeyDown={restSetsField.handleKeyDown}
                  className="h-11"
                  data-testid="patient-exercise-override-rest-sets-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  {EXERCISE_FIELD_METADATA.restReps.label} (s)
                </Label>
                <Input
                  type="number"
                  value={restRepsField.draftValue}
                  onChange={(e) => restRepsField.setDraftValue(e.target.value)}
                  onFocus={restRepsField.handleFocus}
                  onBlur={restRepsField.handleBlur}
                  onKeyDown={restRepsField.handleKeyDown}
                  className="h-11"
                  data-testid="patient-exercise-override-rest-reps-input"
                />
              </div>
            </div>

            {ENABLE_EXTENDED_PATIENT_OVERRIDE_FIELDS && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    {EXERCISE_FIELD_METADATA.preparationTime.label} (s)
                    {preparationTime === inheritedPreparationTime && (
                      <Badge variant="outline" className="ml-2 text-[10px] font-normal">
                        odziedziczone
                      </Badge>
                    )}
                  </Label>
                  <Input
                    type="number"
                    value={preparationTimeField.draftValue}
                    onChange={(e) => preparationTimeField.setDraftValue(e.target.value)}
                    onFocus={preparationTimeField.handleFocus}
                    onBlur={preparationTimeField.handleBlur}
                    onKeyDown={preparationTimeField.handleKeyDown}
                    className="h-11"
                    data-testid="patient-exercise-override-prep-time-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    {EXERCISE_FIELD_METADATA.load.label} (kg)
                    {loadKg === inheritedLoadKg && (
                      <Badge variant="outline" className="ml-2 text-[10px] font-normal">
                        odziedziczone
                      </Badge>
                    )}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={loadKg == null ? '' : loadKgField.draftValue}
                    onChange={(e) => {
                      if (e.target.value === '') {
                        setLoadKg(null);
                        return;
                      }
                      loadKgField.setDraftValue(e.target.value);
                    }}
                    onFocus={loadKgField.handleFocus}
                    onBlur={loadKgField.handleBlur}
                    onKeyDown={loadKgField.handleKeyDown}
                    placeholder={inheritedLoadKg != null ? String(inheritedLoadKg) : '—'}
                    className="h-11"
                    data-testid="patient-exercise-override-load-kg-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{EXERCISE_FIELD_METADATA.tempo.label}</Label>
                  <Input
                    value={tempo}
                    onChange={(e) => setTempo(e.target.value)}
                    placeholder={inheritedTempo || 'np. 3-0-1-0'}
                    className="h-11"
                    data-testid="patient-exercise-override-tempo-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    {EXERCISE_FIELD_METADATA.rangeOfMotion.label}
                  </Label>
                  <Input
                    value={rangeOfMotion}
                    onChange={(e) => setRangeOfMotion(e.target.value)}
                    placeholder="np. 0–90°"
                    className="h-11"
                    data-testid="patient-exercise-override-rom-input"
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Exercise side selection */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {EXERCISE_FIELD_METADATA.side.label}
              {exerciseSide === inheritedExerciseSide && (
                <Badge variant="outline" className="ml-2 text-[10px] font-normal normal-case">
                  odziedziczone
                </Badge>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {SIDE_OPTIONS.map((side) => {
                const Icon = SIDE_ICONS[side.value] ?? X;
                const isSelected = exerciseSide === side.value;
                return (
                  <Button
                    key={side.value}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExerciseSide(side.value)}
                    className={`gap-2 ${isSelected ? 'shadow-md' : ''}`}
                    data-testid={`patient-exercise-override-side-${side.value}`}
                  >
                    <Icon className="h-4 w-4" />
                    {side.label}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{EXERCISE_FIELD_METADATA.side.tooltip}</p>
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

              {/* Add image buttons */}
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

          <Separator />

          {/* Customization */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Personalizacja dla pacjenta
            </p>

            <div className="space-y-2">
              <Label className="text-sm">Własna nazwa</Label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={exercise?.name || 'Zostaw puste dla domyślnej nazwy'}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">Pacjent zobaczy tę nazwę zamiast oryginalnej</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Opis ćwiczenia dla pacjenta</Label>
              <Textarea
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="Wpisz opis ćwiczenia..."
                className="min-h-[100px] resize-none"
              />
              {customDescription !== (exercise?.description ?? '') && (
                <p className="text-xs text-muted-foreground">Opis został zmodyfikowany dla tego pacjenta</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Notatki / instrukcje</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Szczególne wskazówki dla pacjenta..."
                className="min-h-[80px] resize-none"
              />
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
