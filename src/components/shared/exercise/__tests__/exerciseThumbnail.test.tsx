import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExerciseThumbnail } from '../ExerciseThumbnail';

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    onError,
  }: {
    src: string;
    alt?: string;
    onError?: () => void;
  }) => (
    <img
      data-testid="next-image"
      src={src}
      alt={alt ?? ''}
      onError={onError}
    />
  ),
}));

describe('ExerciseThumbnail', () => {
  it('renderuje obraz gdy src jest ustawiony', () => {
    render(
      <ExerciseThumbnail
        src="/img.jpg"
        sizeClass="h-10 w-10"
        dataTestId="thumb"
      />
    );

    const img = screen.getByTestId('next-image');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/img.jpg');
    expect(screen.getByTestId('thumb')).toContainElement(img);
  });

  it('pokazuje placeholder gdy src jest null', () => {
    render(
      <ExerciseThumbnail
        src={null}
        sizeClass="h-10 w-10"
        dataTestId="thumb"
      />
    );

    expect(screen.queryByTestId('next-image')).not.toBeInTheDocument();
    expect(screen.getByTestId('thumb').querySelector('.image-placeholder')).not.toBeNull();
  });

  it('po onError przelacza na placeholder', () => {
    render(
      <ExerciseThumbnail
        src="/broken.jpg"
        sizeClass="h-10 w-10"
        dataTestId="thumb"
      />
    );

    const img = screen.getByTestId('next-image');
    fireEvent.error(img);

    expect(screen.queryByTestId('next-image')).not.toBeInTheDocument();
    expect(screen.getByTestId('thumb').querySelector('.image-placeholder')).not.toBeNull();
  });

  it('renderuje overlay nad obrazem', () => {
    render(
      <ExerciseThumbnail
        src="/img.jpg"
        sizeClass="h-10 w-10"
        dataTestId="thumb"
        overlay={<span data-testid="overlay">overlay</span>}
      />
    );

    expect(screen.getByTestId('overlay')).toBeInTheDocument();
  });
});
