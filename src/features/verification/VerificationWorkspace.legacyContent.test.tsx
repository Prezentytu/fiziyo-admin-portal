import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VerificationWorkspace } from './VerificationWorkspace';
import type { AdminExercise } from '@/graphql/types/adminExercise.types';

/**
 * Zachowanie centrum weryfikacji dla rekordu starego (v3 bez `schemaVersion`), przypięte przed
 * dodaniem obsługi v3.3: co widać w etapach, bramki i zmienne zapisu.
 */

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/hooks/useRoleAccess', () => ({ useRoleAccess: () => ({ canManageOrganization: false }) }));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));
vi.mock('@/components/shared/VideoEmbed', () => ({
  VideoEmbed: ({ url }: { url: string }) => <div data-video-url={url} />,
}));
vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: { id: 'reviewer-1', fullName: 'Ola Weryfikator' } }),
}));
vi.mock('@apollo/client/react', () => ({
  useMutation: () => [mutate, { loading: false }],
  useQuery: () => ({ data: undefined, loading: false, error: undefined, refetch: vi.fn() }),
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));

const DESCRIPTION = 'Połóż się na plecach, unieś biodra do linii z udami i powoli opuść je na matę.';
const THERAPIST_DESCRIPTION = 'Aktywacja mięśni pośladkowych i prostowników biodra.';

function buildLegacyExercise(overrides: Partial<AdminExercise> = {}): AdminExercise {
  return {
    id: 'legacy-1',
    name: 'Mostek biodrowy',
    type: 'REPS',
    isActive: true,
    status: 'PENDING_REVIEW',
    patientDescription: DESCRIPTION,
    clinicalDescription: THERAPIST_DESCRIPTION,
    defaultSets: 3,
    defaultReps: 10,
    defaultRestBetweenSets: 60,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    images: ['https://cdn.test/photo-1.jpg'],
    enrichmentData: {
      $schema: 'fiziyo-exercise-v3',
      patient: {
        summary: 'Unoszenie bioder w leżeniu.',
        steps: ['Połóż się na plecach.', 'Unieś biodra.'],
        cues: ['Napnij pośladki.'],
        mistakes: [{ mistake: 'Wyginasz lędźwie.', fix: 'Napnij brzuch.' }],
      },
      safety: { stop_if: 'Ból w odcinku lędźwiowym' },
      therapist: {
        clinical_notes: 'Notatka dla fizjoterapeuty.',
        indications: ['Ból kolana'],
        contraindications: ['Świeży uraz'],
      },
      equipment: ['mata'],
    },
    ...overrides,
  } as AdminExercise;
}

function renderWorkspace(exercise: AdminExercise) {
  return render(
    <VerificationWorkspace
      exercise={exercise}
      queuePosition={1}
      queueTotal={1}
      nextExerciseId={null}
      openReports={[]}
      listUrl="/verification"
      buildDetailUrl={(exerciseId) => `/verification/${exerciseId}`}
      reloadImages={async () => exercise.images ?? []}
    />
  );
}

function savedVariables(): Array<Record<string, unknown>> {
  return mutate.mock.calls.map(([options]) => (options as { variables: Record<string, unknown> }).variables);
}

beforeEach(() => {
  mutate.mockReset();
  mutate.mockResolvedValue({ data: {} });
});
afterEach(cleanup);

describe('VerificationWorkspace – rekord stary', () => {
  it('pokazuje opis, kroki, wskazówki i błędy w etapie Instrukcja', async () => {
    renderWorkspace(buildLegacyExercise());
    await userEvent.setup().click(screen.getByTestId('verification-stage-instruction-btn'));

    expect(screen.getByTestId('verification-instruction-description-input')).toHaveValue(DESCRIPTION);
    expect(screen.getByTestId('verification-step-1-input')).toHaveValue('Połóż się na plecach.');
    expect(screen.getByTestId('verification-step-2-input')).toHaveValue('Unieś biodra.');
    expect(screen.getByTestId('verification-cue-1-input')).toHaveValue('Napnij pośladki.');
    expect(screen.getByTestId('verification-mistake-1-input')).toHaveValue('Wyginasz lędźwie.');
    expect(screen.getByTestId('verification-mistake-1-fix-input')).toHaveValue('Napnij brzuch.');
  });

  it('pokazuje objawy, przeciwwskazania, opis dla fizjoterapeuty i wskazania w etapie Bezpieczeństwo', async () => {
    renderWorkspace(buildLegacyExercise());
    await userEvent.setup().click(screen.getByTestId('verification-stage-safety-btn'));

    expect(screen.getByTestId('verification-safety-stop-if-input')).toHaveValue('Ból w odcinku lędźwiowym');
    expect(
      within(screen.getByTestId('verification-safety-contraindications-list')).getByText('Świeży uraz')
    ).toBeInTheDocument();
    expect(screen.getByTestId('verification-safety-therapist-description-input')).toHaveValue(THERAPIST_DESCRIPTION);
    expect(within(screen.getByTestId('verification-safety-indications-list')).getByText('Ból kolana')).toBeInTheDocument();
  });

  it('pokazuje pozostałe treści karty w etapie Decyzja i przepuszcza kompletny rekord', async () => {
    renderWorkspace(buildLegacyExercise());
    await userEvent.setup().click(screen.getByTestId('verification-stage-decision-btn'));

    expect(screen.getByTestId('verification-extra-summary-input')).toHaveValue('Unoszenie bioder w leżeniu.');
    expect(screen.getByTestId('verification-extra-clinical-notes-input')).toHaveValue('Notatka dla fizjoterapeuty.');
    expect(within(screen.getByTestId('verification-extra-equipment-list')).getByText('mata')).toBeInTheDocument();
    expect(screen.getByTestId('verification-bar-primary-btn')).toBeEnabled();
  });

  it('blokuje publikację bez opisu dla pacjenta i opisu dla fizjoterapeuty', async () => {
    renderWorkspace(buildLegacyExercise({ patientDescription: 'Krótko', clinicalDescription: '' }));
    await userEvent.setup().click(screen.getByTestId('verification-stage-decision-btn'));

    expect(screen.getByTestId('verification-bar-primary-btn')).toBeDisabled();
    expect(screen.getByTestId('verification-decision-instruction-row')).toHaveTextContent(
      'Opis dla pacjenta: co najmniej 50 znaków.'
    );
    expect(screen.getByTestId('verification-decision-safety-row')).toHaveTextContent(
      'Opis dla fizjoterapeuty: co najmniej 20 znaków.'
    );
  });

  it('zapisuje przeciwwskazanie w therapist.contraindications, a opis w kolumnie opisu', async () => {
    renderWorkspace(buildLegacyExercise());
    const user = userEvent.setup();

    await user.click(screen.getByTestId('verification-stage-instruction-btn'));
    fireEvent.change(screen.getByTestId('verification-instruction-description-input'), {
      target: { value: `${DESCRIPTION} Oddychaj spokojnie.` },
    });
    await user.click(screen.getByTestId('verification-stage-safety-btn'));
    await user.click(screen.getByTestId('verification-safety-contraindications-add-btn'));
    await user.type(screen.getByTestId('verification-safety-contraindications-input'), 'Ostry stan zapalny{Enter}');
    await user.click(screen.getByTestId('verification-skip-btn'));

    await waitFor(() => expect(savedVariables().some((variables) => variables.fieldName === 'enrichmentData')).toBe(true));
    const all = savedVariables();
    expect(all).toContainEqual({ exerciseId: 'legacy-1', description: `${DESCRIPTION} Oddychaj spokojnie.` });
    const enrichmentSave = all.find((variables) => variables.fieldName === 'enrichmentData');
    expect(enrichmentSave?.exerciseId).toBe('legacy-1');
    expect(JSON.parse(String(enrichmentSave?.value))).toEqual({
      $schema: 'fiziyo-exercise-v3',
      patient: {
        summary: 'Unoszenie bioder w leżeniu.',
        steps: ['Połóż się na plecach.', 'Unieś biodra.'],
        cues: ['Napnij pośladki.'],
        mistakes: [{ mistake: 'Wyginasz lędźwie.', fix: 'Napnij brzuch.' }],
      },
      safety: { stop_if: 'Ból w odcinku lędźwiowym' },
      therapist: {
        clinical_notes: 'Notatka dla fizjoterapeuty.',
        indications: ['Ból kolana'],
        contraindications: ['Świeży uraz', 'Ostry stan zapalny'],
      },
      equipment: ['mata'],
    });
  });
});
