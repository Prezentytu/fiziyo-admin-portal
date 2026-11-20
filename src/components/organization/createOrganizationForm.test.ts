import { describe, expect, it } from 'vitest';

import {
  createOrganizationFormSchema,
  ORGANIZATION_DESCRIPTION_MAX_LENGTH,
  ORGANIZATION_NAME_MAX_LENGTH,
  toCreateOrganizationVariables,
} from './createOrganizationForm';

describe('createOrganizationForm', () => {
  it('trims the name and sends an empty description as null', () => {
    expect(toCreateOrganizationVariables({ name: '  Fizjo Kraków  ', description: '   ' })).toEqual({
      name: 'Fizjo Kraków',
      description: null,
    });
  });

  it('keeps a trimmed description', () => {
    expect(toCreateOrganizationVariables({ name: 'Fizjo', description: ' Sport ' })).toEqual({
      name: 'Fizjo',
      description: 'Sport',
    });
  });

  it('rejects a name made only of spaces or shorter than two characters', () => {
    expect(createOrganizationFormSchema.safeParse({ name: '    ', description: '' }).success).toBe(false);
    expect(createOrganizationFormSchema.safeParse({ name: ' A ', description: '' }).success).toBe(false);
  });

  it('accepts the backend column limits and rejects one character more', () => {
    const name = 'N'.repeat(ORGANIZATION_NAME_MAX_LENGTH);
    const description = 'D'.repeat(ORGANIZATION_DESCRIPTION_MAX_LENGTH);
    expect(createOrganizationFormSchema.safeParse({ name, description }).success).toBe(true);
    expect(createOrganizationFormSchema.safeParse({ name: `${name}N`, description }).success).toBe(false);
    expect(createOrganizationFormSchema.safeParse({ name, description: `${description}D` }).success).toBe(false);
  });
});
