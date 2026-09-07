import { describe, expect, it } from 'vitest';
import { typePolicies } from '@/graphql/cache/typePolicies';

describe('typePolicies', () => {
  it('scopes organization lists by organizationId', () => {
    const fields = typePolicies.Query?.fields;
    expect(fields).toBeDefined();
    expect(fields?.organizationPatients).toEqual({ keyArgs: ['organizationId', 'filter'] });
    expect(fields?.availableExercises).toEqual({ keyArgs: ['organizationId'] });
    expect(fields?.organizationExerciseSets).toEqual({ keyArgs: ['organizationId'] });
  });
});
