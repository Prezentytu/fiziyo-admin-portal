import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MediaGallery } from '../MediaGallery';
import type { MediaItem } from '../mediaItems';

vi.mock('next/image', () => ({
  // eslint-disable-next-line jsx-a11y/alt-text
  default: ({ fill: _fill, priority: _priority, ...props }: Record<string, unknown>) => <img {...props} />,
}));

vi.mock('@/components/shared/VideoEmbed', () => ({
  VideoEmbed: ({ title }: { title: string }) => <div data-testid="video-embed">{title}</div>,
}));

const ITEMS: MediaItem[] = [
  { kind: 'image', src: 'https://cdn.example.com/a.jpg' },
  { kind: 'image', src: 'https://cdn.example.com/b.jpg' },
  {
    kind: 'video',
    src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    poster: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  },
];

function renderGallery() {
  return render(<MediaGallery items={ITEMS} title="Plank" testIdPrefix="gallery" />);
}

describe('MediaGallery accessible names', () => {
  afterEach(cleanup);

  it('names thumbnails and arrows so tests can find them by role', () => {
    renderGallery();

    expect(screen.getByRole('button', { name: 'Zdjęcie 1 z 2' })).toHaveAttribute('data-testid', 'gallery-thumb-0');
    expect(screen.getByRole('button', { name: 'Zdjęcie 2 z 2' })).toHaveAttribute('data-testid', 'gallery-thumb-1');
    expect(screen.getByRole('button', { name: 'Film' })).toHaveAttribute('data-testid', 'gallery-thumb-2');
    expect(screen.getByRole('button', { name: 'Poprzednie' })).toHaveAttribute('data-testid', 'gallery-prev-btn');
    expect(screen.getByRole('button', { name: 'Następne' })).toHaveAttribute('data-testid', 'gallery-next-btn');
  });

  it('marks only the selected thumbnail as pressed and follows selection', () => {
    renderGallery();

    expect(screen.getByRole('button', { name: 'Zdjęcie 1 z 2', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Film', pressed: false })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Film' }));

    expect(screen.getByRole('button', { name: 'Film', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zdjęcie 1 z 2', pressed: false })).toBeInTheDocument();
    expect(screen.getByTestId('gallery-stage-video')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Poprzednie' }));

    expect(screen.getByRole('button', { name: 'Zdjęcie 2 z 2', pressed: true })).toBeInTheDocument();
  });
});
