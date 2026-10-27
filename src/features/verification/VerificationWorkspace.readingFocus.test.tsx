import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { VerificationWorkspace } from './VerificationWorkspace';
import type { AdminExercise } from '@/graphql/types/adminExercise.types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, 'data-testid': testId }: { src: string; alt?: string; 'data-testid'?: string }) => (
    <img src={src} alt={alt ?? ''} data-testid={testId} />
  ),
}));

vi.mock('@/components/shared/VideoEmbed', () => ({
  VideoEmbed: ({ url }: { url: string }) => <div data-video-url={url} />,
}));

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: { id: 'reviewer-1', firstName: 'Ola' } }),
}));

vi.mock('@apollo/client/react', () => ({
  useMutation: () => [vi.fn().mockResolvedValue({ data: {} }), { loading: false }],
  useQuery: () => ({ data: undefined, loading: false, error: undefined, refetch: vi.fn() }),
}));

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));

const PHOTO_1 = 'https://cdn.test/photo-1.jpg';
const PHOTO_2 = 'https://cdn.test/photo-2.jpg';
const VIDEO = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

const STEP_1 = 'Połóż się na plecach i ugnij kolana.';
const STEP_2 = 'Unieś biodra, aż tułów utworzy linię z udami.';
const STEP_3 = 'Powoli opuść biodra na podłogę.';
const DESCRIPTION = 'Mostek wzmacnia pośladki i mięśnie tylnej taśmy. Wykonuj ruch spokojnie.';

function buildExercise(overrides: Partial<AdminExercise> = {}): AdminExercise {
  return {
    id: 'exercise-bridge',
    name: 'Mostek biodrowy',
    type: 'REPS',
    isActive: true,
    status: 'PENDING_REVIEW',
    patientDescription: DESCRIPTION,
    defaultSets: 3,
    defaultReps: 10,
    images: [PHOTO_1, PHOTO_2],
    videoUrl: VIDEO,
    enrichmentData: {
      $schema: 'fiziyo-exercise-v3',
      patient: {
        steps: [STEP_1, STEP_2, STEP_3],
        step_images: [
          { step: 1, url: PHOTO_1 },
          { step: 2, url: PHOTO_2 },
        ],
      },
    },
    ...overrides,
  };
}

function renderWorkspace(exercise: AdminExercise = buildExercise()) {
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

async function openInstruction() {
  const user = userEvent.setup();
  await user.click(screen.getByTestId('verification-stage-instruction-btn'));
  expect(screen.getByTestId('verification-stage-instruction')).toBeInTheDocument();
  return user;
}

function panel() {
  return screen.getByTestId('verification-media-panel');
}

function readingFocus() {
  return screen.getByTestId('verification-reading-focus');
}

describe('VerificationWorkspace – zdjęcie przy czytanym kroku (SPEC-030)', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it('pokazuje podgląd czytanego tekstu tylko w etapie Instrukcja', async () => {
    renderWorkspace();

    expect(screen.queryByTestId('verification-reading-focus')).not.toBeInTheDocument();

    await openInstruction();

    expect(readingFocus()).toBeInTheDocument();
  });

  it('przy opisie pokazuje nagranie i tekst opisu', async () => {
    renderWorkspace();
    await openInstruction();

    fireEvent.focus(screen.getByTestId('verification-instruction-description-input'));

    expect(readingFocus()).toHaveTextContent('Opis porównaj z nagraniem');
    expect(readingFocus()).toHaveTextContent(DESCRIPTION);
    expect(within(panel()).getByTestId('verification-media-stage-video')).toBeInTheDocument();
    expect(screen.queryByTestId('verification-reading-focus-flag-btn')).not.toBeInTheDocument();
  });

  it('bez nagrania opis zostawia zdjęcia do przeglądania', async () => {
    renderWorkspace(buildExercise({ videoUrl: undefined }));
    await openInstruction();

    fireEvent.focus(screen.getByTestId('verification-instruction-description-input'));

    expect(readingFocus()).toHaveTextContent('Opis porównaj ze zdjęciami');
    expect(within(panel()).getByTestId('verification-media-stage-image')).toHaveAttribute('src', PHOTO_1);
    await userEvent.setup().click(within(panel()).getByTestId('verification-media-next-btn'));
    expect(within(panel()).getByTestId('verification-media-stage-image')).toHaveAttribute('src', PHOTO_2);
  });

  it('klik w miniaturę kroku pokazuje po lewej jego zdjęcie razem z tekstem kroku', async () => {
    renderWorkspace();
    const user = await openInstruction();

    await user.click(screen.getByTestId('verification-step-2-preview-btn'));

    expect(within(panel()).getByTestId('verification-media-stage-image')).toHaveAttribute('src', PHOTO_2);
    expect(readingFocus()).toHaveTextContent('Krok 2 · zdjęcie 2');
    expect(readingFocus()).toHaveTextContent(STEP_2);
    expect(screen.getByTestId('verification-step-2-preview-btn')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('verification-step-1-preview-btn')).toHaveAttribute('aria-pressed', 'false');
  });

  it('panel podąża za polem kroku, w którym terapeuta pisze', async () => {
    renderWorkspace();
    const user = await openInstruction();

    await user.click(screen.getByTestId('verification-step-1-input'));
    expect(within(panel()).getByTestId('verification-media-stage-image')).toHaveAttribute('src', PHOTO_1);
    expect(readingFocus()).toHaveTextContent(STEP_1);

    await user.click(screen.getByTestId('verification-step-2-input'));
    await user.type(screen.getByTestId('verification-step-2-input'), ' Zatrzymaj na 2 s.');

    expect(within(panel()).getByTestId('verification-media-stage-image')).toHaveAttribute('src', PHOTO_2);
    expect(readingFocus()).toHaveTextContent(`${STEP_2} Zatrzymaj na 2 s.`);
  });

  it('miniatury kroków pokazują przypięte zdjęcia i oznaczają krok bez zdjęcia', async () => {
    renderWorkspace();
    await openInstruction();

    const firstThumb = screen.getByTestId('verification-step-1-preview-btn');
    const secondThumb = screen.getByTestId('verification-step-2-preview-btn');
    const thirdThumb = screen.getByTestId('verification-step-3-preview-btn');

    expect(firstThumb.querySelector('img')).toHaveAttribute('src', PHOTO_1);
    expect(secondThumb.querySelector('img')).toHaveAttribute('src', PHOTO_2);
    expect(firstThumb).toHaveAccessibleName('Pokaż duże zdjęcie kroku 1');
    expect(thirdThumb.querySelector('img')).toBeNull();
    expect(thirdThumb).toHaveTextContent('Brak zdjęcia');
    expect(thirdThumb).toHaveAccessibleName('Krok 3 nie ma zdjęcia');
    expect(screen.getByTestId('verification-step-3-photo-btn')).toHaveTextContent('Przypnij zdjęcie');
  });

  it('krok bez zdjęcia pokazuje nagranie zamiast zdjęcia innego kroku', async () => {
    renderWorkspace();
    const user = await openInstruction();

    await user.click(screen.getByTestId('verification-step-3-preview-btn'));

    expect(readingFocus()).toHaveTextContent('Krok 3 · bez zdjęcia');
    expect(readingFocus()).toHaveTextContent(STEP_3);
    expect(within(panel()).getByTestId('verification-media-stage-video')).toBeInTheDocument();
    expect(within(panel()).queryByTestId('verification-media-stage-image')).not.toBeInTheDocument();
    expect(screen.queryByTestId('verification-reading-focus-flag-btn')).not.toBeInTheDocument();
  });

  it('krok bez zdjęcia i bez nagrania zostawia panel pusty', async () => {
    renderWorkspace(buildExercise({ videoUrl: undefined }));
    const user = await openInstruction();

    await user.click(screen.getByTestId('verification-step-3-preview-btn'));

    expect(within(panel()).queryByTestId('verification-media-stage-image')).not.toBeInTheDocument();
    expect(within(panel()).getByTestId('verification-media-empty-cta')).toBeInTheDocument();
  });

  it('przypięcie zdjęcia do kroku od razu pokazuje je po lewej', async () => {
    renderWorkspace();
    const user = await openInstruction();

    await user.click(screen.getByTestId('verification-step-3-photo-btn'));

    expect(readingFocus()).toHaveTextContent('Krok 3 · zdjęcie 1');
    expect(within(panel()).getByTestId('verification-media-stage-image')).toHaveAttribute('src', PHOTO_1);
    expect(screen.getByTestId('verification-step-3-preview-btn').querySelector('img')).toHaveAttribute('src', PHOTO_1);
  });

  it('ręczne przewinięcie galerii wyłącza podążanie, a klik w krok je przywraca', async () => {
    renderWorkspace();
    const user = await openInstruction();

    await user.click(screen.getByTestId('verification-step-1-preview-btn'));
    await user.click(within(panel()).getByTestId('verification-media-next-btn'));
    expect(within(panel()).getByTestId('verification-media-stage-image')).toHaveAttribute('src', PHOTO_2);

    await user.click(screen.getByTestId('verification-step-1-preview-btn'));
    expect(within(panel()).getByTestId('verification-media-stage-image')).toHaveAttribute('src', PHOTO_1);
  });

  it('„Zdjęcie nie pasuje do opisu” otwiera podmianę zdjęcia przypiętego do kroku', async () => {
    renderWorkspace();
    const user = await openInstruction();

    await user.click(screen.getByTestId('verification-step-2-preview-btn'));
    await user.click(screen.getByTestId('verification-reading-focus-flag-btn'));

    const dialog = await screen.findByTestId('verification-photo-replace-dialog');
    expect(dialog).toHaveTextContent('zdjęcie 2');
    expect(screen.getByTestId('verification-stage-material')).toBeInTheDocument();

    await user.click(screen.getByTestId('verification-photo-replace-cancel-btn'));
    expect(screen.queryByTestId('verification-photo-replace-dialog')).not.toBeInTheDocument();
  });

  it('usunięcie wcześniejszego kroku zostawia podgląd na tym samym tekście', async () => {
    renderWorkspace();
    const user = await openInstruction();

    await user.click(screen.getByTestId('verification-step-2-preview-btn'));
    await user.click(screen.getByTestId('verification-step-1-remove-btn'));

    expect(readingFocus()).toHaveTextContent('Krok 1 · zdjęcie 2');
    expect(readingFocus()).toHaveTextContent(STEP_2);
    expect(within(panel()).getByTestId('verification-media-stage-image')).toHaveAttribute('src', PHOTO_2);
  });

  it('powrót do Instrukcji po przeglądaniu galerii znowu pokazuje zdjęcie czytanego kroku', async () => {
    renderWorkspace();
    const user = await openInstruction();

    await user.click(screen.getByTestId('verification-step-1-preview-btn'));
    await user.click(within(panel()).getByTestId('verification-media-next-btn'));
    await user.click(screen.getByTestId('verification-stage-material-btn'));
    await user.click(within(panel()).getByTestId('verification-media-next-btn'));
    await user.click(screen.getByTestId('verification-stage-instruction-btn'));

    expect(readingFocus()).toHaveTextContent('Krok 1 · zdjęcie 1');
    expect(within(panel()).getByTestId('verification-media-stage-image')).toHaveAttribute('src', PHOTO_1);
  });
});
