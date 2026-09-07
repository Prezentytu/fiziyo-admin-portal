import { StrictMode, useEffect, useState } from 'react';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomizeSetStep } from '@/features/assignment/CustomizeSetStep';
import { AssignmentWizard } from '@/features/assignment/AssignmentWizard';
import { GET_AVAILABLE_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import type { ExerciseInstance, ExerciseParams } from '@/components/shared/ExerciseSetBuilder';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DesignVariantProvider, useDesignVariant } from '../DesignVariantProvider';
import { DesignSwitcher } from '../DesignSwitcher';
import type { DesignVariant } from '../preferences';

const calls = vi.hoisted(() => ({
  query: vi.fn(),
  mount: vi.fn(),
  unmount: vi.fn(),
  mutation: vi.fn(),
  refetch: vi.fn(),
}));
const exerciseData = {
  availableExercises: [{ id: 'exercise-1', name: 'Przysiad testowy', defaultSets: 3, defaultReps: 10 }],
};
vi.mock('@apollo/client/react', () => ({
  useQuery: (query: unknown, options: unknown) => {
    calls.query(query, options);
    return {
      data: query === GET_AVAILABLE_EXERCISES_QUERY ? exerciseData : undefined,
      loading: false,
      refetch: calls.refetch,
    };
  },
  useMutation: () => [calls.mutation, { loading: false }],
  useApolloClient: () => ({ refetchQueries: calls.refetch }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/features/exercises/ExerciseDialog', () => ({ ExerciseDialog: () => null }));
vi.mock('@/features/patients/PatientDialog', () => ({ PatientDialog: () => null }));
vi.mock('next/image', () => ({
  default: ({ alt }: { alt?: string }) => <span aria-label={alt ?? 'exercise-image'} />,
}));

let changeVariant: ((variant: DesignVariant) => void) | undefined;

function PreviewController() {
  const context = useDesignVariant();
  useEffect(() => {
    changeVariant = context?.setVariant;
    return () => {
      changeVariant = undefined;
    };
  }, [context]);
  return <DesignSwitcher location="parity" />;
}

function RealBuilderDialog() {
  const [open, setOpen] = useState(true);
  const [name, setName] = useState('Plan testowy');
  const [instances, setInstances] = useState<ExerciseInstance[]>([
    { instanceId: 'mapping-1', exerciseId: 'exercise-1' },
  ]);
  const [params, setParams] = useState(
    new Map<string, ExerciseParams>([
      ['mapping-1', { sets: 3, reps: 10, restSets: 60, restReps: 0, preparationTime: 5, executionTime: 6 }],
    ])
  );
  useEffect(() => {
    calls.mount();
    return calls.unmount;
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent data-testid="test-real-builder-dialog">
        <DialogHeader>
          <DialogTitle>Plan testowy</DialogTitle>
          <DialogDescription>Personalizacja</DialogDescription>
          <PreviewController />
        </DialogHeader>
        <CustomizeSetStep
          planName={name}
          onPlanNameChange={setName}
          isCreatingNew={false}
          selectedInstances={instances}
          onSelectedInstancesChange={setInstances}
          exerciseParams={params}
          onExerciseParamsChange={setParams}
          availableExercises={[{ id: 'exercise-1', name: 'Przysiad testowy', defaultSets: 3, defaultReps: 10 }]}
          organizationId="test-organization"
          showAI={false}
        />
        <output data-testid="test-builder-params">{JSON.stringify([...params])}</output>
      </DialogContent>
    </Dialog>
  );
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.clearAllMocks();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  localStorage.clear();
  changeVariant = undefined;
  document.documentElement.removeAttribute('data-fiziyo-design');
});

describe('real builder preview parity', () => {
  it('preserves actual wizard validation, patient, step, schedule and existing close rules without transport calls', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <DesignVariantProvider>
        <PreviewController />
        <AssignmentWizard
          open
          onOpenChange={onOpenChange}
          mode="from-patient"
          preselectedPatient={{ id: 'patient-1', name: 'Pacjent Testowy' }}
          visitExercises={[{ exerciseId: 'exercise-1', sets: 3, reps: 10 }]}
          organizationId="test-organization"
          therapistId="test-therapist"
        />
      </DesignVariantProvider>
    );
    const name = await screen.findByTestId('wizard-plan-name-input');
    const wizard = screen.getByTestId('assign-wizard');
    await user.clear(name);
    const next = within(wizard).getByRole('button', { name: /^Dalej/ });
    expect(next).toBeDisabled();
    act(() => changeVariant?.('redesign'));
    expect(next).toBeDisabled();
    expect(screen.getByTestId('wizard-plan-name-input')).toBe(name);
    expect(name).toHaveFocus();
    await user.type(name, 'Niezapisany plan pacjenta');
    expect(next).toBeEnabled();
    await user.click(next);
    const step = screen.getByTestId('assign-wizard-step-indicator').textContent;
    const schedule = screen.getByTestId('assign-wizard-patient-context').parentElement?.textContent;
    const queries = calls.query.mock.calls.length;
    const inputs = [...wizard.querySelectorAll('input')].map((input) => ({ input, value: input.value }));
    for (const variant of ['current', 'redesign', 'current'] as const) {
      act(() => changeVariant?.(variant));
      expect(screen.getByTestId('assign-wizard')).toBe(wizard);
      expect(name).toHaveValue('Niezapisany plan pacjenta');
      expect(screen.getByTestId('assign-wizard-step-indicator')).toHaveTextContent(step ?? '');
      expect(screen.getByTestId('assign-wizard-patient-context').parentElement).toHaveTextContent(schedule ?? '');
      for (const { input, value } of inputs) {
        expect(wizard.contains(input)).toBe(true);
        expect(input.value).toBe(value);
      }
      expect(calls.query).toHaveBeenCalledTimes(queries);
    }
    await user.click(within(wizard).getByRole('button', { name: 'Zamknij' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    expect(calls.mutation).not.toHaveBeenCalled();
    expect(calls.refetch).not.toHaveBeenCalled();
  });

  it('preserves the open modal, edited name, search, expanded card, parameters and confirmation', async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <DesignVariantProvider>
          <RealBuilderDialog />
        </DesignVariantProvider>
      </StrictMode>
    );
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Nowy' })).toBeEnabled());
    const dialog = screen.getByTestId('test-real-builder-dialog');
    const name = screen.getByTestId('customize-set-name-input');
    await user.clear(name);
    await user.type(name, 'Niezapisany plan');
    const search = screen.getByTestId('customize-set-search-input');
    await user.type(search, 'Przysiad');
    const card = screen.getByTestId('customize-set-exercise-exercise-1');
    const dragHandle = within(card).getByTestId('set-builder-drag-handle');
    const parameter = within(card).getAllByTestId('customize-set-exercise-1-sets-input')[0];
    await user.clear(parameter);
    await user.type(parameter, '5');
    const expand = within(card).getAllByTestId('customize-set-exercise-1-expand-btn')[0];
    await user.click(expand);
    const savedParams = screen.getByTestId('test-builder-params').textContent;
    const queries = calls.query.mock.calls.length;
    const mounts = calls.mount.mock.calls.length;
    const unmounts = calls.unmount.mock.calls.length;
    for (const label of ['Nowy', 'Obecny']) {
      await user.click(screen.getByRole('radio', { name: label }));
      expect(screen.getByTestId('test-real-builder-dialog')).toBe(dialog);
      expect(screen.getByTestId('customize-set-name-input')).toBe(name);
      expect(name).toHaveValue('Niezapisany plan');
      expect(search).toHaveValue('Przysiad');
      expect(parameter).toHaveValue('5');
      expect(expand).toHaveAttribute('data-state', 'open');
      expect(within(card).getByTestId('set-builder-drag-handle')).toBe(dragHandle);
      expect(screen.getByTestId('test-builder-params')).toHaveTextContent(savedParams ?? '');
      expect(calls.query).toHaveBeenCalledTimes(queries);
      expect(calls.mount).toHaveBeenCalledTimes(mounts);
      expect(calls.unmount).toHaveBeenCalledTimes(unmounts);
    }
    await user.click(screen.getByTestId('customize-set-clear-btn'));
    const confirmation = screen.getByRole('alertdialog');
    const focused = document.activeElement;
    expect(changeVariant).toBeDefined();
    act(() => changeVariant?.('redesign'));
    act(() => changeVariant?.('current'));
    expect(screen.getByRole('alertdialog')).toBe(confirmation);
    expect(document.activeElement).toBe(focused);
    expect(screen.getByTestId('test-builder-params')).toHaveTextContent(savedParams ?? '');
    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem('fiziyo-design-preview')).toBe('current');
  });
});
