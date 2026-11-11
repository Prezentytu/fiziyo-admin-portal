import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import goldenV33 from '@/components/shared/exercise/__tests__/fixtures/enrichmentV33.fx-0073.json';
import { VerificationWorkspace } from './VerificationWorkspace';
import type { AdminExercise } from '@/graphql/types/adminExercise.types';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

/** Rekord wzorcowy paczki p001 (fx-0073) w kontrakcie v3.3: odczyt, bramki i zapis w miejscach kontraktu. */

const { mutate, role } = vi.hoisted(() => ({ mutate: vi.fn(), role: { canReviewExercises: true } }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/hooks/useRoleAccess', () => ({ useRoleAccess: () => ({ canManageOrganization: false }) }));
vi.mock('@/hooks/useSystemRole', () => ({ useSystemRole: () => role }));
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

const golden = goldenV33 as ExerciseEnrichmentData;
const NEW_CONTRAINDICATION = 'Świeże zszycie łąkotki bez zgody operatora.';
const STALE_DESCRIPTION =
  'Stary opis z kolumny, który został po mechanicznym podniesieniu rekordu i nie jest już źródłem treści.';

function buildGoldenExercise(overrides: Partial<AdminExercise> = {}): AdminExercise {
  return {
    id: 'fiziyo-kb-fx-0073',
    name: 'Napinanie mięśnia czworogłowego z ręcznikiem pod kolanem',
    type: 'TIME',
    side: 'Both',
    isActive: true,
    status: 'PENDING_REVIEW',
    patientDescription: null,
    clinicalDescription: null,
    defaultSets: 2,
    defaultReps: 10,
    defaultExecutionTime: 7,
    defaultRestBetweenSets: 30,
    defaultRestBetweenReps: 3,
    preparationTime: 10,
    videoUrl: 'https://vimeo.com/1240779405',
    images: ['https://cdn.test/fx-0073-1.jpg', 'https://cdn.test/fx-0073-2.jpg'],
    enrichmentData: golden,
    ...overrides,
  } as AdminExercise;
}

function renderWorkspace(exercise: AdminExercise) {
  return render(
    <VerificationWorkspace
      exercise={exercise}
      queuePosition={1}
      queueTotal={7}
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

function fact(id: string): HTMLElement {
  return screen.getByTestId(`verification-fact-${id}`);
}

async function addContraindicationAndSave(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('verification-stage-safety-btn'));
  await user.click(screen.getByTestId('verification-safety-contraindications-add-btn'));
  await user.type(screen.getByTestId('verification-safety-contraindications-input'), `${NEW_CONTRAINDICATION}{Enter}`);
  await user.click(screen.getByTestId('verification-skip-btn'));
  await waitFor(() =>
    expect(savedVariables().some((variables) => variables.fieldName === 'enrichmentData')).toBe(true)
  );
}

beforeEach(() => {
  mutate.mockReset();
  mutate.mockResolvedValue({ data: {} });
  role.canReviewExercises = true;
});
afterEach(cleanup);

describe('VerificationWorkspace – rekord v3.3', () => {
  it('etap Instrukcja pokazuje podsumowanie, kroki, wskazówki z fazą, błędy, odczucia, łatwiej, trudniej i oddech', async () => {
    renderWorkspace(buildGoldenExercise());
    await userEvent.setup().click(screen.getByTestId('verification-stage-instruction-btn'));

    expect(screen.queryByTestId('verification-instruction-description-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('verification-extra-summary-input')).toHaveValue(golden.patient?.summary);
    expect(screen.getByTestId('verification-step-8-input')).toHaveValue(golden.patient?.steps?.[7]);
    expect(screen.getByTestId('verification-cue-5-input')).toHaveValue('Ręcznik pod kolanem, noga prosta.');
    expect(screen.getByTestId('verification-cue-5-phase-preparation-btn')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('verification-mistake-3-fix-input')).toHaveValue('Połóż dłoń na udzie i napnij mocniej.');
    expect(screen.getByTestId('verification-extra-should-feel-input')).toHaveValue(golden.patient?.should_feel);
    expect(screen.getByTestId('verification-extra-should-not-feel-input')).toHaveValue(golden.patient?.should_not_feel);
    expect(screen.getByTestId('verification-extra-why-input')).toHaveValue(golden.patient?.why);
    expect(screen.getByTestId('verification-extra-when-to-do-input')).toHaveValue(golden.patient?.when_to_do);
    expect(fact('easier')).toHaveTextContent(String(golden.patient?.easier));
    expect(fact('harder')).toHaveTextContent(String(golden.patient?.harder));
    expect(fact('breathing')).toHaveTextContent(String(golden.breathing?.text));
  });

  it('etap Bezpieczeństwo czyta przeciwwskazania z safety.contraindications i pokazuje fakty fizjoterapeuty', async () => {
    renderWorkspace(buildGoldenExercise());
    await userEvent.setup().click(screen.getByTestId('verification-stage-safety-btn'));

    expect(screen.getByTestId('verification-safety-stop-if-input')).toHaveValue(golden.safety?.stop_if);
    expect(
      within(screen.getByTestId('verification-safety-contraindications-list')).getByText(
        String(golden.safety?.contraindications?.[0]?.text)
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('verification-safety-supervision-checkbox')).not.toBeChecked();
    expect(fact('pain-rule')).toHaveTextContent('WS-3');
    expect(fact('safety-flags')).toHaveTextContent('valsalva_risk');
    expect(fact('checkpoints')).toHaveTextContent('pełne rozluźnienie między napięciami');
    expect(fact('therapist-note')).toHaveTextContent('Brak');
    expect(fact('indications')).toHaveTextContent('patellofemoral_syndrome');
    expect(screen.queryByTestId('verification-safety-therapist-description-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('verification-safety-indications-list')).not.toBeInTheDocument();
  });

  it('etapy Materiał i Parametry pokazują stronę, sprzęt i dawkę na stronę', async () => {
    renderWorkspace(buildGoldenExercise());

    expect(fact('side-shown-in-media')).toHaveTextContent('prawa');
    expect(fact('media')).toHaveTextContent('m5 · film · partner · HEP2go · permission_demo');

    await userEvent.setup().click(screen.getByTestId('verification-stage-parameters-btn'));
    expect(screen.getByTestId('verification-param-per-side-note')).toHaveTextContent(
      'Serie i powtórzenia podane na jedną stronę'
    );
    expect(screen.queryByTestId('verification-param-side-mismatch-note')).not.toBeInTheDocument();
    expect(fact('side-mode')).toHaveTextContent('Na każdą stronę');
    expect(fact('side-start')).toHaveTextContent('lewa');
    expect(fact('equipment')).toHaveTextContent('mały zrolowany ręcznik, wymagany');
    expect(fact('prescription-ranges')).toHaveTextContent('serie: 1–3, domyślnie 2');
  });

  it('przechodzi wszystkie bramki i nie zgłasza braków z wycofanych pól', async () => {
    renderWorkspace(buildGoldenExercise());
    const user = userEvent.setup();
    await user.click(screen.getByTestId('verification-stage-decision-btn'));

    // The only open point is the generic „zwykle 2–6 s” note of the parameters stage, confirmed with „OK”.
    expect(screen.getByTestId('verification-decision-material-row')).not.toHaveTextContent('Popraw');
    expect(screen.getByTestId('verification-decision-instruction-row')).not.toHaveTextContent('Popraw');
    expect(screen.getByTestId('verification-decision-safety-row')).not.toHaveTextContent('Popraw');
    expect(screen.getByTestId('verification-decision-parameters-row')).toHaveTextContent(
      'Czas jednego powtórzenia: 7 s, zwykle 2–6 s.'
    );
    await user.click(screen.getByTestId('verification-stage-parameters-btn'));
    await user.click(screen.getByTestId('verification-param-repTime-ack-btn'));
    await user.click(screen.getByTestId('verification-stage-decision-btn'));

    expect(screen.getByTestId('verification-bar-primary-btn')).toBeEnabled();
    const decision = screen.getByTestId('verification-stage-decision');
    expect(decision).not.toHaveTextContent('Opis dla pacjenta');
    expect(decision).not.toHaveTextContent('Opis dla fizjoterapeuty');
    expect(screen.getByTestId('verification-decision-instruction-row')).toHaveTextContent(
      'Podsumowanie, 8 kroków, 6 wskazówek głosowych, 3 typowe błędy'
    );
    expect(screen.getByTestId('verification-decision-safety-row')).toHaveTextContent('1 przeciwwskazanie');
    expect(screen.getByTestId('verification-decision-parameters-row')).toHaveTextContent('na każdą stronę');
    expect(screen.queryByTestId('verification-extra-clinical-notes-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('verification-extra-equipment-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('verification-extra-notes-input')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('verification-extra-keywords-list')).getByText('quad set')).toBeInTheDocument();
  });

  it('etap Decyzja pokazuje klasyfikację każdemu, a pochodzenie i audyt tylko zespołowi FiziYo', async () => {
    const { unmount } = renderWorkspace(buildGoldenExercise());
    const user = userEvent.setup();
    await user.click(screen.getByTestId('verification-stage-decision-btn'));

    expect(fact('key')).toHaveTextContent('fx-0073');
    expect(fact('classification-position')).toHaveTextContent('supine');
    expect(fact('relations')).toHaveTextContent('variant → fx-1001');
    expect(fact('provenance-sources')).toHaveTextContent('h2g-17392');
    expect(fact('lifecycle-status')).toHaveTextContent('ai_audited');
    expect(fact('media-usage-scope')).toHaveTextContent('demo_only');

    unmount();
    role.canReviewExercises = false;
    renderWorkspace(buildGoldenExercise());
    await user.click(screen.getByTestId('verification-stage-decision-btn'));

    expect(fact('classification-position')).toBeInTheDocument();
    expect(screen.queryByTestId('verification-fact-provenance-sources')).not.toBeInTheDocument();
    expect(screen.queryByTestId('verification-fact-lifecycle-status')).not.toBeInTheDocument();
    expect(screen.queryByTestId('verification-fact-media-usage-scope')).not.toBeInTheDocument();
  });

  it('zapisuje przeciwwskazanie w safety.contraindications i nie rusza żadnego innego klucza', async () => {
    renderWorkspace(buildGoldenExercise());
    await addContraindicationAndSave(userEvent.setup());

    const all = savedVariables();
    expect(all).toHaveLength(1);
    const saved = JSON.parse(String(all[0].value)) as ExerciseEnrichmentData;
    expect(saved.safety?.contraindications).toEqual([
      ...(golden.safety?.contraindications ?? []),
      { text: NEW_CONTRAINDICATION },
    ]);
    expect({ ...saved, safety: { ...saved.safety, contraindications: golden.safety?.contraindications } }).toEqual(
      golden
    );
    expect(saved.therapist).not.toHaveProperty('contraindications');
    expect(saved.therapist).not.toHaveProperty('indications');
    expect(saved.schemaVersion).toBe('3.3');
    expect(saved.$schema).toBe('fiziyo-exercise-v3');
  });

  it('rekord podniesiony mechanicznie: stary opis nie jest pokazany ani wysłany', async () => {
    renderWorkspace(
      buildGoldenExercise({ patientDescription: STALE_DESCRIPTION, clinicalDescription: STALE_DESCRIPTION })
    );
    const user = userEvent.setup();

    await user.click(screen.getByTestId('verification-stage-instruction-btn'));
    expect(screen.queryByText(STALE_DESCRIPTION)).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue(STALE_DESCRIPTION)).not.toBeInTheDocument();
    expect(screen.getByTestId('verification-reading-focus')).toHaveTextContent(String(golden.patient?.summary));

    await user.clear(screen.getByTestId('verification-instruction-name-input'));
    await user.type(screen.getByTestId('verification-instruction-name-input'), 'Napinanie uda z ręcznikiem');
    await addContraindicationAndSave(user);

    const all = savedVariables();
    expect(all).toContainEqual({ exerciseId: 'fiziyo-kb-fx-0073', name: 'Napinanie uda z ręcznikiem' });
    for (const variables of all) {
      expect(variables).not.toHaveProperty('description');
      expect(variables).not.toHaveProperty('clinicalDescription');
      expect(JSON.stringify(variables)).not.toContain('Stary opis z kolumny');
    }
  });

  it('tor organizacji zapisuje ten sam dokument przez własną mutację', async () => {
    const saveEnrichment = vi.fn().mockResolvedValue(undefined);
    const exercise = buildGoldenExercise();
    render(
      <VerificationWorkspace
        exercise={exercise}
        queuePosition={1}
        queueTotal={1}
        nextExerciseId={null}
        listUrl="/organization/verification"
        buildDetailUrl={(exerciseId) => `/organization/verification/${exerciseId}`}
        reloadImages={async () => exercise.images ?? []}
        saveEnrichment={saveEnrichment}
      />
    );
    const user = userEvent.setup();
    await user.click(screen.getByTestId('verification-stage-safety-btn'));
    await user.click(screen.getByTestId('verification-safety-supervision-checkbox'));
    await user.click(screen.getByTestId('verification-skip-btn'));

    await waitFor(() => expect(saveEnrichment).toHaveBeenCalledTimes(1));
    expect(saveEnrichment).toHaveBeenCalledWith({
      ...golden,
      safety: { ...golden.safety, requires_supervision: true },
    });
  });
});
