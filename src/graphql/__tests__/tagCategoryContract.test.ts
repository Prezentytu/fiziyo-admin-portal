import { Kind } from 'graphql';
import { describe, expect, it } from 'vitest';
import { UPDATE_TAG_CATEGORY_MUTATION } from '../mutations/exercises.mutations';

describe('organization category contract', () => {
  it('uses the scoped category operation while preserving the response key', () => {
    const operation = UPDATE_TAG_CATEGORY_MUTATION.definitions.find(
      (definition) => definition.kind === Kind.OPERATION_DEFINITION
    );
    expect(operation?.kind).toBe(Kind.OPERATION_DEFINITION);
    if (operation?.kind !== Kind.OPERATION_DEFINITION) throw new Error('Missing operation');
    const field = operation.selectionSet.selections[0];
    if (field.kind !== Kind.FIELD) throw new Error('Missing field');
    expect(field.name.value).toBe('updateOrganizationTagCategory');
    expect(field.alias?.value).toBe('updateTagCategory');
    expect(field.arguments?.map((argument) => argument.name.value)).toEqual([
      'categoryId', 'name', 'color', 'description', 'icon',
    ]);
  });
});