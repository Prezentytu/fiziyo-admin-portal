import { Kind, print } from 'graphql';
import { describe, expect, it } from 'vitest';

import {
  EXERCISE_RELATION_FRAGMENT,
  REMOVE_EXERCISE_RELATION_MUTATION,
  SET_EXERCISE_RELATION_MUTATION,
} from '../mutations/adminExercises.mutations';

describe('ExerciseRelationFragment vs SDL', () => {
  it('does not reintroduce withdrawn ExerciseRelation fields', () => {
    const document = print(EXERCISE_RELATION_FRAGMENT);

    expect(document).toContain('aiConfidence');
    expect(document).toContain('isVerified');
    expect(document).not.toMatch(/(?:^|\s)confidence(?:\s|$)/);
    expect(document).not.toContain('verifiedAt');
    expect(document).not.toContain('verifiedById');
  });

  it.each([SET_EXERCISE_RELATION_MUTATION, REMOVE_EXERCISE_RELATION_MUTATION])(
    'types relationType as the schema enum, not String',
    (document) => {
      const operation = document.definitions.find((definition) => definition.kind === Kind.OPERATION_DEFINITION);
      if (operation?.kind !== Kind.OPERATION_DEFINITION) throw new Error('Missing operation');
      const relationType = operation.variableDefinitions?.find(
        (variable) => variable.variable.name.value === 'relationType',
      );
      expect(relationType?.type.kind).toBe(Kind.NON_NULL_TYPE);
      if (relationType?.type.kind !== Kind.NON_NULL_TYPE) throw new Error('Expected non-null relationType');
      expect(relationType.type.type.kind).toBe(Kind.NAMED_TYPE);
      if (relationType.type.type.kind !== Kind.NAMED_TYPE) throw new Error('Expected named relationType');
      expect(relationType.type.type.name.value).toBe('ExerciseRelationType');
    },
  );
});
