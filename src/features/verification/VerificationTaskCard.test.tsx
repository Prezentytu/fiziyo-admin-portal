import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { VerificationTaskCard } from './VerificationTaskCard';
import type { AdminExercise } from '@/graphql/types/adminExercise.types';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt?: string }) => <img alt={alt ?? ''} />,
}));

const baseExercise: AdminExercise = {
  id: 'exercise-1',
  name: 'Przysiad przy ścianie',
  type: 'REPS',
  isActive: true,
  status: 'PENDING_REVIEW',
  hasOpenReport: true,
  openReportCount: 3,
  latestReport: {
    reasonCategory: 'CLINICAL_RISK',
    description: 'Opis wymaga doprecyzowania toru ruchu.',
    createdAt: '2026-03-08T10:00:00.000Z',
    routingTarget: 'PENDING_REVIEW',
  },
};

describe('VerificationTaskCard', () => {
  it('pokazuje badge zgłoszeń i kontekst reportu', () => {
    render(<VerificationTaskCard exercise={baseExercise} />);

    expect(screen.getByTestId('verification-card-exercise-1-reported-badge')).toHaveTextContent('Zgłoszenia (3)');
    expect(screen.getByTestId('verification-card-exercise-1-report-context')).toBeInTheDocument();
  });

  it('obsługuje zaznaczenie bez otwierania detalu ćwiczenia', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();

    render(
      <VerificationTaskCard
        exercise={baseExercise}
        selectable
        onSelectionChange={onSelectionChange}
        detailHref="/verification/exercise-1"
      />
    );

    await user.click(screen.getByTestId('verification-card-exercise-1-select-checkbox'));

    expect(onSelectionChange).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('verification-card-exercise-1-select-checkbox')).toBeInTheDocument();
  });
  it('nie oznacza ćwiczenia z filmem YouTube jako „Brak wideo” i nie wstawia linku YouTube do <video>', () => {
    const { container } = render(
      <VerificationTaskCard
        exercise={{ ...baseExercise, videoUrl: 'https://www.youtube.com/watch?v=7rnlAVhAK-8&t=6s', imageUrl: 'https://cdn.example/x.jpg' }}
      />
    );

    expect(screen.queryByText('Brak wideo')).not.toBeInTheDocument();
    expect(screen.getByText('Wideo')).toBeInTheDocument();
    expect(container.querySelector('video')).toBeNull();
  });

  it('pokazuje podgląd <video> dla bezpośredniego pliku wideo', () => {
    const { container } = render(
      <VerificationTaskCard exercise={{ ...baseExercise, videoUrl: 'https://cdn.example/clip.mp4' }} />
    );

    expect(screen.queryByText('Brak wideo')).not.toBeInTheDocument();
    expect(container.querySelector('video')).not.toBeNull();
  });

  it('label wideo jest klikalny, zostaje po najechaniu i podmienia obraz na wideo bez otwierania detalu', async () => {
    const user = userEvent.setup();
    render(
      <VerificationTaskCard
        exercise={{ ...baseExercise, videoUrl: 'https://cdn.example/clip.mp4', imageUrl: 'https://cdn.example/x.jpg' }}
      />
    );

    await user.hover(screen.getByTestId('verification-card-exercise-1'));
    const toggle = screen.getByTestId('verification-card-exercise-1-video-toggle');
    expect(toggle).toHaveTextContent('Wideo');
    expect(screen.queryByTestId('verification-card-exercise-1-video')).not.toBeInTheDocument();

    await user.click(toggle);

    const player = screen.getByTestId('verification-card-exercise-1-video');
    expect(player.querySelector('video')).toHaveAttribute('src', 'https://cdn.example/clip.mp4');
    expect(toggle).toHaveTextContent('Obraz');
  });

  it('dla filmu YouTube label wideo pokazuje osadzony odtwarzacz', async () => {
    const user = userEvent.setup();
    render(
      <VerificationTaskCard
        exercise={{ ...baseExercise, videoUrl: 'https://www.youtube.com/watch?v=7rnlAVhAK-8', imageUrl: 'https://cdn.example/x.jpg' }}
      />
    );

    await user.click(screen.getByTestId('verification-card-exercise-1-video-toggle'));

    expect(screen.getByTestId('verification-card-exercise-1-video').querySelector('iframe')).not.toBeNull();
  });

  it('nadal ostrzega „Brak wideo” i „Brak obrazu”, gdy ćwiczenie nie ma mediów', () => {
    render(<VerificationTaskCard exercise={baseExercise} />);

    expect(screen.getByText('Brak wideo')).toBeInTheDocument();
    expect(screen.getByText('Brak obrazu')).toBeInTheDocument();
  });
});
