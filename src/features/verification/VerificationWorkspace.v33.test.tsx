import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NEW_PRECAUTION_GROUP,
  V33_EDITABLE_PATHS,
  V33_PATIENT_VISIBLE_PATHS,
} from '@/components/shared/exercise/writeExerciseContent';
import goldenV33 from '@/components/shared/exercise/__tests__/fixtures/enrichmentV33.fx-0073.json';
import {
  GOLDEN_LEAF_PATHS,
  V33_PATHS_EVERY_EDITOR_COVERS,
} from '@/components/shared/exercise/__tests__/fixtures/v33GoldenPaths';
import { VerificationWorkspace, type OrganizationDecision } from './VerificationWorkspace';
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

/** Tor organizacji: o torze decyduje trasa (prop `organizationDecision`), nie parametr adresu ani rola. */
function renderOrganizationWorkspace(exercise: AdminExercise) {
  const decision: OrganizationDecision = {
    status: 'PENDING_ORG_REVIEW',
    isBusy: false,
    onApprove: vi.fn().mockResolvedValue(undefined),
    onRequestChanges: vi.fn().mockResolvedValue(undefined),
    onArchive: vi.fn().mockResolvedValue(undefined),
  };
  return render(
    <VerificationWorkspace
      exercise={exercise}
      queuePosition={1}
      queueTotal={7}
      nextExerciseId={null}
      listUrl="/organization/verification"
      buildDetailUrl={(exerciseId) => `/organization/verification/${exerciseId}`}
      reloadImages={async () => exercise.images ?? []}
      organizationDecision={decision}
      saveEnrichment={vi.fn().mockResolvedValue(undefined)}
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
    expect(screen.getByTestId('verification-extra-easier-input')).toHaveValue(golden.patient?.easier);
    expect(screen.getByTestId('verification-extra-harder-input')).toHaveValue(golden.patient?.harder);
    expect(screen.getByTestId('verification-extra-breathing-input')).toHaveValue(golden.breathing?.text);
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
    expect(screen.getByTestId('verification-safety-checkpoints-item-0')).toHaveValue(
      golden.therapist?.checkpoints?.[0]?.text
    );
    expect(screen.getByTestId('exercise-detail-therapist-note-input')).toHaveValue('');
    expect(screen.getByTestId('verification-safety-precautions-item-0')).toHaveValue('');
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

  it('członek zespołu FiziYo: pola zespołu i AI widzi w torze katalogu, nigdy w weryfikacji organizacji', async () => {
    const TEAM_FACTS = ['provenance-sources', 'media-usage-scope', 'lifecycle-availability', 'lifecycle-status'];
    role.canReviewExercises = true;
    const user = userEvent.setup();

    const { unmount } = renderWorkspace(buildGoldenExercise());
    await user.click(screen.getByTestId('verification-stage-decision-btn'));
    for (const id of TEAM_FACTS) expect(fact(id)).toBeInTheDocument();
    expect(screen.getByTestId('verification-extra-keywords-list')).toBeInTheDocument();
    unmount();

    renderOrganizationWorkspace(buildGoldenExercise());
    await user.click(screen.getByTestId('verification-stage-decision-btn'));
    expect(fact('classification-position')).toBeInTheDocument();
    for (const id of [...TEAM_FACTS, 'lifecycle-findings']) {
      expect(screen.queryByTestId(`verification-fact-${id}`)).not.toBeInTheDocument();
    }
    expect(screen.queryByTestId('verification-extra-keywords-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('verification-extra-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('verification-stage-decision')).not.toHaveTextContent('quad set');
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

  it('rekord 3.3 bez znacznika $schema: zapis dopisuje znacznik i nie gubi żadnego klucza', async () => {
    const { $schema: _marker, ...unmarked } = golden;
    const document = { ...unmarked, klucz_spoza_kontraktu: { lista: [], puste: null } } as ExerciseEnrichmentData;
    renderWorkspace(buildGoldenExercise({ enrichmentData: document }));
    await addContraindicationAndSave(userEvent.setup());

    const saved = JSON.parse(String(savedVariables()[0].value)) as ExerciseEnrichmentData;
    expect(saved.$schema).toBe('fiziyo-exercise-v3');
    expect(saved.schemaVersion).toBe('3.3');
    const { $schema: _saved, ...savedRest } = saved;
    expect({ ...savedRest, safety: { ...saved.safety, contraindications: golden.safety?.contraindications } }).toEqual(
      document
    );
  });

  it('edycja kroku i wskazówki w etapie Instrukcja zapisuje się pod ścieżkami kontraktu, reszta bez zmian', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWorkspace(buildGoldenExercise());
    const user = userEvent.setup();
    await user.click(screen.getByTestId('verification-stage-instruction-btn'));
    await user.type(screen.getByTestId('verification-step-1-input'), ' Dopisane.');
    await user.type(screen.getByTestId('verification-cue-1-input'), ' Dopisane.');
    await user.click(screen.getByTestId('verification-skip-btn'));
    await waitFor(() =>
      expect(savedVariables().some((variables) => variables.fieldName === 'enrichmentData')).toBe(true)
    );

    const saved = JSON.parse(
      String(savedVariables().find((variables) => variables.fieldName === 'enrichmentData')?.value)
    ) as ExerciseEnrichmentData;
    expect(saved.patient?.steps?.[0]).toBe(`${golden.patient?.steps?.[0]} Dopisane.`);
    expect(saved.patient?.cues?.[0]).toBe(`${golden.patient?.cues?.[0]} Dopisane.`);
    expect({ ...saved, patient: { ...saved.patient, steps: golden.patient?.steps, cues: golden.patient?.cues } }).toEqual(
      golden
    );
    // The form hook reports a path the 3.3 save would drop; the verification center must not use one.
    expect(errors.mock.calls.filter(([message]) => String(message).includes('nie jest zapisywana'))).toEqual([]);
    errors.mockRestore();
  });

  it('zapadka: każde pole, które dostaje pacjent, jest widoczne w którymś etapie weryfikacji', async () => {
    const PRECAUTION = 'W ciąży ćwicz w pozycji półleżącej.';
    /** Ścieżka kontraktu → etap i element, w którym weryfikator ją widzi. Nowa ścieżka pacjenta wymaga wpisu. */
    const PLACES: Record<string, { stage: string; testId: string }> = {
      'patient.summary': { stage: 'instruction', testId: 'verification-extra-summary-input' },
      'patient.steps': { stage: 'instruction', testId: 'verification-step-1-input' },
      'patient.step_images': { stage: 'material', testId: 'verification-material-photo-1' },
      'patient.cues': { stage: 'instruction', testId: 'verification-cue-1-input' },
      'patient.cue_phases': { stage: 'instruction', testId: 'verification-cue-1-phase-work-btn' },
      'patient.mistakes': { stage: 'instruction', testId: 'verification-mistake-1-input' },
      'patient.why': { stage: 'instruction', testId: 'verification-extra-why-input' },
      'patient.when_to_do': { stage: 'instruction', testId: 'verification-extra-when-to-do-input' },
      'patient.should_feel': { stage: 'instruction', testId: 'verification-extra-should-feel-input' },
      'patient.should_not_feel': { stage: 'instruction', testId: 'verification-extra-should-not-feel-input' },
      'patient.easier': { stage: 'instruction', testId: 'verification-extra-easier-input' },
      'patient.harder': { stage: 'instruction', testId: 'verification-extra-harder-input' },
      'breathing.text': { stage: 'instruction', testId: 'verification-extra-breathing-input' },
      'side.mode': { stage: 'parameters', testId: 'verification-fact-side-mode' },
      'side.per_side_dose': { stage: 'parameters', testId: 'verification-fact-side-per-side-dose' },
      'side.start': { stage: 'parameters', testId: 'verification-fact-side-start' },
      'side.shown_in_media': { stage: 'material', testId: 'verification-fact-side-shown-in-media' },
      equipment_items: { stage: 'parameters', testId: 'verification-fact-equipment' },
      'safety.stop_if': { stage: 'safety', testId: 'verification-safety-stop-if-input' },
      'safety.precautions': { stage: 'safety', testId: 'verification-safety-precautions-item-0' },
      'safety.requires_supervision': { stage: 'safety', testId: 'verification-safety-supervision-checkbox' },
    };
    expect(Object.keys(PLACES).sort()).toEqual([...V33_PATIENT_VISIBLE_PATHS].sort());
    // Źródłem jest złoty rekord: każdy jego liść z sekcji, z których czyta API pacjenta, ma miejsce w weryfikacji
    // albo jest tu nazwany z powodem. Nowe pole kontraktu w tych sekcjach wywraca test.
    const PATIENT_SECTIONS = ['patient', 'breathing', 'side', 'safety', 'equipment_items'];
    const NOT_FOR_PATIENT: Record<string, string> = {
      'breathing.pattern': 'wzorzec oddechu to dane dla timera, pacjent dostaje zdanie breathing.text',
      'safety.contraindications': 'przeciwwskazania widzi fizjoterapeuta, nie pacjent (kontrakt §3)',
      'safety.flags': 'flagi bezpieczeństwa są dla fizjoterapeuty i reguł doboru',
      'safety.pain_rule': 'reguła bólu steruje aplikacją, nie jest tekstem dla pacjenta',
    };
    const covers = (rule: string, leaf: string) => leaf === rule || leaf.startsWith(`${rule}.`);
    const patientLeaves = GOLDEN_LEAF_PATHS.filter((leaf) => PATIENT_SECTIONS.some((name) => covers(name, leaf)));
    expect(patientLeaves.length).toBeGreaterThan(20);
    expect(
      patientLeaves.filter(
        (leaf) => ![...Object.keys(PLACES), ...Object.keys(NOT_FOR_PATIENT)].some((rule) => covers(rule, leaf))
      )
    ).toEqual([]);
    expect(Object.keys(NOT_FOR_PATIENT).filter((rule) => !patientLeaves.some((leaf) => covers(rule, leaf)))).toEqual([]);

    const document = {
      ...golden,
      patient: { ...golden.patient, step_images: [{ step: 1, url: 'https://cdn.test/fx-0073-1.jpg' }] },
      safety: { ...golden.safety, precautions: [{ group: 'pregnancy_postpartum', text: PRECAUTION }] },
    } as ExerciseEnrichmentData;
    renderWorkspace(buildGoldenExercise({ enrichmentData: document }));
    const user = userEvent.setup();
    for (const stage of ['material', 'parameters', 'instruction', 'safety']) {
      await user.click(screen.getByTestId(`verification-stage-${stage}-btn`));
      for (const [path, place] of Object.entries(PLACES)) {
        if (place.stage !== stage) continue;
        expect(screen.queryByTestId(place.testId), `${path} w etapie ${stage}`).toBeInTheDocument();
      }
    }
    expect(screen.getByTestId('verification-safety-precautions-item-0')).toHaveValue(PRECAUTION);
    expect(screen.getByTestId('verification-safety-precautions-section')).toHaveTextContent('Pacjent zobaczy');
    await user.click(screen.getByTestId('verification-stage-material-btn'));
    expect(screen.getByTestId('verification-material-photo-1')).toHaveTextContent('Krok 1');
  });

  it('zapadka: każde pole edytowane w weryfikacji jest na liście zapisu i trafia do dokumentu', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    type User = ReturnType<typeof userEvent.setup>;
    const typeInto = (testId: string) => (user: User) => user.type(screen.getByTestId(testId), ' X');
    const addChip = (prefix: string) => async (user: User) => {
      await user.click(screen.getByTestId(`${prefix}-add-btn`));
      await user.type(screen.getByTestId(`${prefix}-input`), 'nowy wpis{Enter}');
    };
    /** Ścieżka kontraktu → etap i czynność weryfikatora, która ją zmienia. */
    const EDITS: Record<string, { stage: string; act: (user: User) => Promise<void> }> = {
      'patient.summary': { stage: 'instruction', act: typeInto('verification-extra-summary-input') },
      'patient.steps': { stage: 'instruction', act: typeInto('verification-step-1-input') },
      'patient.cues': { stage: 'instruction', act: typeInto('verification-cue-1-input') },
      'patient.cue_phases': {
        stage: 'instruction',
        act: (user) => user.click(screen.getByTestId('verification-cue-1-phase-rest-btn')),
      },
      'patient.mistakes': { stage: 'instruction', act: typeInto('verification-mistake-1-fix-input') },
      'patient.why': { stage: 'instruction', act: typeInto('verification-extra-why-input') },
      'patient.when_to_do': { stage: 'instruction', act: typeInto('verification-extra-when-to-do-input') },
      'patient.should_feel': { stage: 'instruction', act: typeInto('verification-extra-should-feel-input') },
      'patient.should_not_feel': { stage: 'instruction', act: typeInto('verification-extra-should-not-feel-input') },
      'patient.easier': { stage: 'instruction', act: typeInto('verification-extra-easier-input') },
      'patient.harder': { stage: 'instruction', act: typeInto('verification-extra-harder-input') },
      'breathing.text': { stage: 'instruction', act: typeInto('verification-extra-breathing-input') },
      'safety.stop_if': { stage: 'safety', act: typeInto('verification-safety-stop-if-input') },
      'safety.contraindications': { stage: 'safety', act: addChip('verification-safety-contraindications') },
      'safety.precautions': { stage: 'safety', act: typeInto('verification-safety-precautions-item-0') },
      'safety.requires_supervision': {
        stage: 'safety',
        act: (user) => user.click(screen.getByTestId('verification-safety-supervision-checkbox')),
      },
      'therapist.checkpoints': { stage: 'safety', act: typeInto('verification-safety-checkpoints-item-0') },
      'therapist.note': { stage: 'safety', act: typeInto('exercise-detail-therapist-note-input') },
      'ai.keywords': { stage: 'decision', act: addChip('verification-extra-keywords') },
    };
    /** Zapisywalne, ale nie z tego ekranu: sprzęt edytuje formularz ćwiczenia, a zdjęcia kroków operacje na zdjęciach. */
    const NOT_EDITED_HERE: Record<string, string> = {
      equipment_items: 'sprzęt edytuje formularz ćwiczenia',
      'patient.step_images': 'zdjęcia kroków zmieniają operacje na zdjęciach, nie pole tekstowe',
    };
    // Źródłem listy jest złoty rekord 3.3 (plus ścieżki edytowalne, których w nim nie ma), nie lista pisana tutaj.
    expect([...V33_PATHS_EVERY_EDITOR_COVERS].sort()).toEqual([...V33_EDITABLE_PATHS].sort());
    expect([...Object.keys(EDITS), ...Object.keys(NOT_EDITED_HERE)].sort()).toEqual(
      [...V33_PATHS_EVERY_EDITOR_COVERS].sort()
    );

    renderWorkspace(buildGoldenExercise());
    const user = userEvent.setup();
    for (const stage of ['instruction', 'safety', 'decision']) {
      await user.click(screen.getByTestId(`verification-stage-${stage}-btn`));
      for (const edit of Object.values(EDITS)) if (edit.stage === stage) await edit.act(user);
    }
    await user.click(screen.getByTestId('verification-skip-btn'));
    await waitFor(() =>
      expect(savedVariables().some((variables) => variables.fieldName === 'enrichmentData')).toBe(true)
    );

    const saved = JSON.parse(
      String(savedVariables().find((variables) => variables.fieldName === 'enrichmentData')?.value)
    ) as Record<string, Record<string, unknown>>;
    const original = golden as unknown as Record<string, Record<string, unknown>>;
    const restored = structuredClone(saved);
    for (const path of Object.keys(EDITS)) {
      const [section, key] = path.split('.');
      expect(saved[section][key], `${path} zapisane`).not.toEqual(original[section]?.[key]);
      if (original[section] && key in original[section]) restored[section][key] = original[section][key];
      else delete restored[section][key];
    }
    expect(restored).toEqual(golden);
    expect(saved.safety.precautions).toEqual([{ group: NEW_PRECAUTION_GROUP, text: 'X' }]);
    expect((saved.therapist.checkpoints as unknown[])[0]).toEqual({
      ...golden.therapist?.checkpoints?.[0],
      text: `${golden.therapist?.checkpoints?.[0]?.text} X`,
    });
    expect(errors.mock.calls.filter(([message]) => String(message).includes('nie jest zapisywana'))).toEqual([]);
    errors.mockRestore();
  }, 30_000);

  it('podpowiedzi przy polach tylko do odczytu nie odsyłają do formularza po pola, których formularz nie zmienia', async () => {
    renderWorkspace(buildGoldenExercise());
    const user = userEvent.setup();
    await user.click(screen.getByTestId('verification-stage-safety-btn'));
    for (const testId of ['verification-safety-facts', 'verification-safety-therapist-facts']) {
      expect(screen.getByTestId(testId)).toHaveTextContent('z importu paczki treści');
      expect(screen.getByTestId(testId)).not.toHaveTextContent('zmienisz w formularzu');
    }
    await user.click(screen.getByTestId('verification-stage-decision-btn'));
    expect(screen.getByTestId('verification-contract-facts')).toHaveTextContent('z importu paczki treści');
    expect(screen.getByTestId('verification-contract-facts')).not.toHaveTextContent('zmienisz w formularzu');
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
