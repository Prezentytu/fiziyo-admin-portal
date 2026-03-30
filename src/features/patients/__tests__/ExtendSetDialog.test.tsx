import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ExtendSetDialog } from '../ExtendSetDialog';

const updateAssignmentMock = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: () => [updateAssignmentMock, { loading: false }],
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ExtendSetDialog', () => {
  beforeEach(() => {
    updateAssignmentMock.mockReset();
    updateAssignmentMock.mockResolvedValue({ data: {} });
  });

  it('używa updateExerciseSetAssignment z assignmentId', async () => {
    const user = userEvent.setup();

    render(
      <ExtendSetDialog
        open
        onOpenChange={() => {}}
        organizationId="org-1"
        patient={{ id: 'patient-1', name: 'Jan Kowalski' }}
        assignment={{
          id: 'assignment-1',
          exerciseSetId: 'set-1',
          exerciseSetName: 'Plan A',
          startDate: '2026-03-01T00:00:00.000Z',
          endDate: '2026-03-30T00:00:00.000Z',
          frequency: {
            timesPerDay: '1',
            timesPerWeek: '3',
            monday: true,
            wednesday: true,
            friday: true,
          },
        }}
      />
    );

    await user.click(screen.getByTestId('extend-set-confirm-btn'));

    expect(updateAssignmentMock).toHaveBeenCalledTimes(1);
    const mutationArg = updateAssignmentMock.mock.calls[0]?.[0];
    expect(mutationArg).toBeTruthy();
    expect(mutationArg.variables).toMatchObject({
      assignmentId: 'assignment-1',
    });
    expect(mutationArg.variables).not.toHaveProperty('exerciseSetId');
    expect(mutationArg.variables).not.toHaveProperty('patientId');
  });
});

