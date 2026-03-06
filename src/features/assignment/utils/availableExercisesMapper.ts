import type { Exercise, ExerciseLoad } from '../types';

interface RawLoadShape {
  type?: string | null;
  value?: number | null;
  unit?: string | null;
  text?: string | null;
}

interface RawAvailableExercise {
  id: string;
  name: string;
  type?: string;
  isActive?: boolean;
  description?: string;
  patientDescription?: string;
  clinicalDescription?: string;
  audioCue?: string;
  rangeOfMotion?: string;
  side?: string;
  exerciseSide?: string;
  preparationTime?: number;
  tempo?: string;
  defaultExecutionTime?: number;
  executionTime?: number;
  defaultRestBetweenSets?: number;
  defaultRestBetweenReps?: number;
  difficultyLevel?: string;
  mainTags?: string[];
  additionalTags?: string[];
  notes?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultDuration?: number;
  thumbnailUrl?: string;
  gifUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  images?: string[];
  defaultLoad?: RawLoadShape | null;
  loadType?: string;
  loadValue?: number;
  loadUnit?: string;
  loadText?: string;
  scope?: string;
  status?: string;
}

function normalizeLoadType(type?: string): ExerciseLoad['type'] {
  if (type === 'band' || type === 'bodyweight' || type === 'other') {
    return type;
  }
  return 'weight';
}

function normalizeLoadUnit(unit?: string): ExerciseLoad['unit'] | undefined {
  if (unit === 'kg' || unit === 'lbs' || unit === 'level') {
    return unit;
  }
  return undefined;
}

export function buildStructuredLoad(load?: RawLoadShape | null): ExerciseLoad | undefined {
  if (!load) return undefined;

  const value = load.value ?? undefined;
  const unit = normalizeLoadUnit(load.unit ?? undefined);
  const textFromValue = value == null ? '' : `${value}${unit ? ` ${unit}` : ''}`.trim();
  const text = load.text?.trim() || textFromValue;

  if (!text && value == null) {
    return undefined;
  }

  return {
    type: normalizeLoadType(load.type ?? undefined),
    value,
    unit,
    text: text || 'Obciążenie',
  };
}

export function mapAvailableExercises(rawExercises: RawAvailableExercise[] | undefined): Exercise[] {
  return (rawExercises || [])
    .filter((exercise) => exercise.isActive !== false)
    .map((exercise) => {
      const defaultLoad =
        buildStructuredLoad(exercise.defaultLoad) ??
        buildStructuredLoad({
          type: exercise.loadType,
          value: exercise.loadValue,
          unit: exercise.loadUnit,
          text: exercise.loadText,
        });

      return {
        id: exercise.id,
        name: exercise.name,
        type: exercise.type,
        description: exercise.patientDescription ?? exercise.description,
        patientDescription: exercise.patientDescription,
        clinicalDescription: exercise.clinicalDescription,
        audioCue: exercise.audioCue,
        rangeOfMotion: exercise.rangeOfMotion,
        side: exercise.side,
        exerciseSide: exercise.side?.toLowerCase() ?? exercise.exerciseSide,
        preparationTime: exercise.preparationTime,
        tempo: exercise.tempo,
        defaultExecutionTime: exercise.defaultExecutionTime,
        defaultRestBetweenSets: exercise.defaultRestBetweenSets,
        defaultRestBetweenReps: exercise.defaultRestBetweenReps,
        difficultyLevel: exercise.difficultyLevel,
        mainTags: exercise.mainTags,
        additionalTags: exercise.additionalTags,
        notes: exercise.notes,
        defaultSets: exercise.defaultSets,
        defaultReps: exercise.defaultReps,
        defaultDuration: exercise.defaultDuration,
        executionTime: exercise.defaultExecutionTime ?? exercise.executionTime,
        thumbnailUrl: exercise.thumbnailUrl,
        gifUrl: exercise.gifUrl,
        videoUrl: exercise.videoUrl,
        imageUrl: exercise.imageUrl,
        images: exercise.images,
        defaultLoad,
        loadType: exercise.loadType,
        loadValue: exercise.loadValue,
        loadUnit: exercise.loadUnit,
        loadText: exercise.loadText,
        scope: exercise.scope,
        status: exercise.status,
      };
    });
}
