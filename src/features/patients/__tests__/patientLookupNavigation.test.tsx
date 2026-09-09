import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FIND_USER_BY_EMAIL_QUERY } from '@/graphql/queries/users.queries';
import { GET_ALL_THERAPIST_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { SmartPatientLookup } from '../SmartPatientLookup';
import { UnifiedPatientInput } from '../UnifiedPatientInput';

const mockUseQuery = vi.fn();
const mockMutate = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => [mockMutate, { loading: false }],
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe.each(['https://clinic.example', 'http://localhost:4317'])('patient navigation from %s', (origin) => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('location', { origin, href: `${origin}/patients?tab=list` });

    const emailResult = {
      userByEmail: {
        id: 'patient-42',
        fullname: 'Test Patient',
        email: 'patient@example.com',
        organizationIds: ['org-1'],
      },
    };
    const assignments = {
      therapistPatients: [{ id: 'assignment-1', patientId: 'patient-42', status: 'active' }],
    };

    mockUseQuery.mockImplementation((query: unknown, options?: { skip?: boolean }) => ({
      data: query === GET_ALL_THERAPIST_PATIENTS_QUERY
        ? assignments
        : query === FIND_USER_BY_EMAIL_QUERY && !options?.skip
          ? emailResult
          : undefined,
      loading: false,
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(['unified-click', 'unified-enter', 'smart-click'] as const)(
    'keeps full-page same-origin navigation for %s without assigning the patient again',
    async (mode) => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const Component = mode === 'smart-click' ? SmartPatientLookup : UnifiedPatientInput;

      render(
        <Component
          organizationId="org-1"
          therapistId="therapist-1"
          onSuccess={onSuccess}
          onCreateNewPatient={vi.fn().mockResolvedValue(undefined)}
          onCancel={vi.fn()}
        />
      );

      const inputId = mode === 'smart-click' ? 'patient-lookup-email-input' : 'patient-unified-input';
      await user.type(screen.getByTestId(inputId), 'patient@example.com');
      if (mode !== 'smart-click') {
        await user.click(screen.getByTestId('patient-unified-next-btn'));
      }

      const profileButton = await screen.findByTestId(
        mode === 'smart-click' ? 'patient-lookup-go-to-patient-btn' : 'patient-unified-go-to-profile-btn'
      );
      if (mode === 'unified-enter') {
        profileButton.focus();
        await user.keyboard('{Enter}');
      } else {
        await user.click(profileButton);
      }

      expect(globalThis.location.href).toBe(`${origin}/patients/patient-42`);
      expect(mockMutate).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    }
  );
});