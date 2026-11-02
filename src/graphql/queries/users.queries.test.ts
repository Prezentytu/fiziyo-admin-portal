import { print } from 'graphql';
import { describe, expect, it } from 'vitest';

import { FIND_USER_BY_EMAIL_QUERY, FIND_USER_BY_PHONE_QUERY } from './users.queries';

describe('patient lookup queries', () => {
  it.each([
    ['email', FIND_USER_BY_EMAIL_QUERY],
    ['phone', FIND_USER_BY_PHONE_QUERY],
  ])('lookup by %s does not ask which other clinics the person belongs to', (_label, query) => {
    expect(print(query)).not.toContain('organizationIds');
  });
});
