import { Kind, print } from 'graphql';
import { describe, expect, it } from 'vitest';
import { CREATE_ORGANIZATION_MUTATION } from '../mutations/organizations.mutations';

describe('organization creation contract', () => {
  it('creates an organization without retired plans or resource limits', () => {
    const operation = CREATE_ORGANIZATION_MUTATION.definitions.find(
      (definition) => definition.kind === Kind.OPERATION_DEFINITION
    );
    if (operation?.kind !== Kind.OPERATION_DEFINITION) throw new Error('Missing operation');
    expect(operation.variableDefinitions?.map((variable) => variable.variable.name.value)).toEqual([
      'name', 'description',
    ]);
    const field = operation.selectionSet.selections[0];
    if (field.kind !== Kind.FIELD) throw new Error('Missing field');
    expect(field.arguments?.map((argument) => argument.name.value)).toEqual(['name', 'description']);
    expect(print(CREATE_ORGANIZATION_MUTATION)).not.toMatch(
      /SubscriptionPlan|subscriptionPlan|subscriptionExpiresAt|maxPatients|maxTherapists|maxClinics/
    );
  });
});