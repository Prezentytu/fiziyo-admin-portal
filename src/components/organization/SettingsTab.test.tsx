import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET_USER_ORGANIZATIONS_QUERY } from '@/graphql/queries/users.queries';
import { SettingsTab } from './SettingsTab';

type MutationDocument = { definitions: Array<{ name?: { value?: string } }> };
type MutationOptions = { refetchQueries?: Array<{ query: unknown }> };

const mutationOptions = new Map<string, MutationOptions>();

vi.mock('@apollo/client/react', () => ({
  useMutation: (document: MutationDocument, options: MutationOptions) => {
    mutationOptions.set(document.definitions[0]?.name?.value ?? '', options);
    return [vi.fn(), { loading: false }] as const;
  },
}));

vi.mock('./ExerciseVisibilitySettings', () => ({ ExerciseVisibilitySettings: () => null }));
vi.mock('./PatientVisibilitySettings', () => ({ PatientVisibilitySettings: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('SettingsTab', () => {
  beforeEach(() => mutationOptions.clear());

  // Nagłówek i przełącznik gabinetu czytają nazwę i logo z `userOrganizations`,
  // więc bez tego odświeżenia pokazują starą nazwę aż do przeładowania strony.
  it.each(['UpdateOrganizationName', 'UpdateOrganizationLogo', 'RemoveOrganizationLogo'])(
    '%s refreshes the organization list used by the header and switcher',
    (mutationName) => {
      render(<SettingsTab organization={{ id: 'org-1', name: 'Gabinet' }} currentUserRole="owner" />);

      const queries = mutationOptions.get(mutationName)?.refetchQueries?.map((entry) => entry.query);
      expect(queries).toContain(GET_USER_ORGANIZATIONS_QUERY);
    }
  );
});
