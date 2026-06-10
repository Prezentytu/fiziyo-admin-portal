import type { ExerciseInstance, ExerciseParams } from '@/components/shared/ExerciseSetBuilder';
import type { Exercise, ExerciseSet } from '../types';

interface BuildExerciseSetFromBuilderInput {
  setId: string;
  setName: string;
  description?: string;
  builderInstances: ExerciseInstance[];
  builderParams: Map<string, ExerciseParams>;
  availableExercises: Exercise[];
}

export function buildExerciseSetFromBuilder({
  setId,
  setName,
  description,
  builderInstances,
  builderParams,
  availableExercises,
}: BuildExerciseSetFromBuilderInput): ExerciseSet {
  return {
    id: setId,
    name: setName,
    description,
    exerciseMappings: builderInstances.map((instance, index) => {
      const exercise = availableExercises.find((candidate) => candidate.id === instance.exerciseId);
      const params = builderParams.get(instance.instanceId);

      return {
        id: instance.instanceId,
        exerciseId: instance.exerciseId,
        order: index + 1,
        sets: params?.sets,
        reps: params?.reps,
        duration: params?.duration,
        restSets: params?.restSets,
        restReps: params?.restReps,
        executionTime: params?.executionTime,
        preparationTime: params?.preparationTime,
        tempo: params?.tempo,
        load: params?.load,
        notes: params?.notes,
        customName: params?.customName,
        customDescription: params?.customDescription,
        exercise,
      };
    }),
  };
}
