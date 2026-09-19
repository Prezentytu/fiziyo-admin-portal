import type { ExerciseSet as ApolloExerciseSet } from '@/types/apollo';
import { buildStructuredLoad } from './availableExercisesMapper';
import type { ExerciseSet, Frequency } from '../types';

export function mapRawSetToWizardSet(set: ApolloExerciseSet): ExerciseSet {
  return {
    id: set.id,
    name: set.name,
    description: set.description,
    isActive: set.isActive,
    isTemplate: set.isTemplate,
    kind: set.kind,
    templateSource: set.templateSource,
    reviewStatus: set.reviewStatus,
    sourceExerciseSetId: set.sourceExerciseSetId,
    frequency: set.frequency as Frequency | undefined,
    exerciseMappings: set.exerciseMappings?.map((mapping) => {
      const mappingLoad =
        buildStructuredLoad(mapping.load) ??
        buildStructuredLoad({
          loadWeightKg: mapping.load?.loadWeightKg,
          loadSource: mapping.load?.loadSource,
          type: mapping.loadType,
          value: mapping.loadValue,
          unit: mapping.loadUnit,
          text: mapping.loadText,
        });
      const exerciseLoad =
        buildStructuredLoad(mapping.exercise?.defaultLoad) ??
        buildStructuredLoad({
          loadWeightKg: mapping.exercise?.defaultLoad?.loadWeightKg,
          loadSource: mapping.exercise?.defaultLoad?.loadSource,
          type: mapping.exercise?.loadType,
          value: mapping.exercise?.loadValue,
          unit: mapping.exercise?.loadUnit,
          text: mapping.exercise?.loadText,
        });

      return {
        id: mapping.id,
        exerciseId: mapping.exerciseId,
        exerciseSetId: mapping.exerciseSetId,
        order: mapping.order,
        sets: mapping.sets,
        reps: mapping.reps,
        duration: mapping.duration,
        restSets: mapping.restSets,
        restReps: mapping.restReps,
        preparationTime: mapping.preparationTime,
        executionTime: mapping.executionTime,
        tempo: mapping.tempo,
        load: mappingLoad,
        loadType: mapping.loadType,
        loadValue: mapping.loadValue,
        loadUnit: mapping.loadUnit,
        loadText: mapping.loadText,
        notes: mapping.notes,
        customName: mapping.customName,
        customDescription: mapping.customDescription,
        overridesJson: mapping.overridesJson,
        videoUrl: mapping.videoUrl,
        imageUrl: mapping.imageUrl,
        images: mapping.images,
        exercise: mapping.exercise
          ? {
              id: mapping.exercise.id,
              name: mapping.exercise.name,
              type: mapping.exercise.type,
              description: mapping.exercise.patientDescription || mapping.exercise.description,
              patientDescription: mapping.exercise.patientDescription,
              clinicalDescription: mapping.exercise.clinicalDescription,
              audioCue: mapping.exercise.audioCue,
              rangeOfMotion: mapping.exercise.rangeOfMotion,
              side: mapping.exercise.side,
              exerciseSide: mapping.exercise.side?.toLowerCase() || mapping.exercise.exerciseSide,
              imageUrl: mapping.exercise.thumbnailUrl || mapping.exercise.imageUrl,
              thumbnailUrl: mapping.exercise.thumbnailUrl,
              images: mapping.exercise.images,
              gifUrl: mapping.exercise.gifUrl,
              videoUrl: mapping.exercise.videoUrl,
              notes: mapping.exercise.notes,
              sets: mapping.exercise.defaultSets ?? mapping.exercise.sets,
              reps: mapping.exercise.defaultReps ?? mapping.exercise.reps,
              duration: mapping.exercise.defaultDuration ?? mapping.exercise.duration,
              restSets: mapping.exercise.defaultRestBetweenSets ?? mapping.exercise.restSets,
              restReps: mapping.exercise.defaultRestBetweenReps ?? mapping.exercise.restReps,
              preparationTime: mapping.exercise.preparationTime,
              executionTime: mapping.exercise.defaultExecutionTime ?? mapping.exercise.executionTime,
              tempo: mapping.exercise.tempo,
              defaultLoad: exerciseLoad,
              loadType: mapping.exercise.loadType,
              loadValue: mapping.exercise.loadValue,
              loadUnit: mapping.exercise.loadUnit,
              loadText: mapping.exercise.loadText,
              defaultSets: mapping.exercise.defaultSets,
              defaultReps: mapping.exercise.defaultReps,
              defaultDuration: mapping.exercise.defaultDuration,
              defaultRestBetweenSets: mapping.exercise.defaultRestBetweenSets,
              defaultRestBetweenReps: mapping.exercise.defaultRestBetweenReps,
              defaultExecutionTime: mapping.exercise.defaultExecutionTime,
              mainTags: mapping.exercise.mainTags,
              additionalTags: mapping.exercise.additionalTags,
              difficultyLevel: mapping.exercise.difficultyLevel,
              scope: mapping.exercise.scope,
              status: mapping.exercise.status,
            }
          : undefined,
      };
    }),
  };
}
