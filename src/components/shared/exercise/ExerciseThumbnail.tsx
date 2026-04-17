'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { cn } from '@/lib/utils';

export interface ExerciseThumbnailProps {
  /** Pełny URL obrazu (już po `getMediaUrl`). `null` gdy brak. */
  src: string | null;
  /** Tekst alternatywny (zwykle zostawiamy pusty, bo obraz jest dekoracyjny obok nazwy). */
  alt?: string;
  /**
   * Klasy Tailwind dla wymiarów kafelka (np. `'h-10 w-10'`).
   * Nie wpływają na wariant pobrania - to robi `sizes`.
   */
  sizeClass: string;
  /**
   * Atrybut `sizes` dla `next/image`. WAŻNE: trzymamy WSPÓLNĄ wartość
   * (`'48px'`) między pickerem a kartą, żeby Next/Image generował ten sam
   * wariant URL i druga miniatura trafiała w cache HTTP przeglądarki.
   */
  sizes?: string;
  /**
   * Domyślnie `'eager'` - kafelek 36-48px to znikomy koszt, a unikamy
   * opóźnienia IntersectionObservera dla świeżo zamontowanej karty.
   */
  loading?: 'eager' | 'lazy';
  className?: string;
  /** Treść renderowana absolutnie nad obrazem (np. hover Eye overlay). */
  overlay?: ReactNode;
  dataTestId?: string;
}

/**
 * Spójna miniatura ćwiczenia dla pickera, kart edycji i kart podglądu.
 *
 * Założenia:
 * - Domyślne `sizes="48px"` daje cache hit między pickerem a kartą
 *   (po dodaniu ćwiczenia obraz pojawia się natychmiast, bez nowego requestu).
 * - `onError` przełącza widok na `ImagePlaceholder` - obraz, którego nie da
 *   się pobrać, nie zostawia pustego kafelka.
 * - Brak skeletonu/spinnera - jeśli wariant jest w cache, `<Image>` rysuje
 *   się synchronicznie, a placeholder zostaje wyłącznie dla braku/błędu.
 */
export function ExerciseThumbnail({
  src,
  alt = '',
  sizeClass,
  sizes = '48px',
  loading = 'eager',
  className,
  overlay,
  dataTestId,
}: Readonly<ExerciseThumbnailProps>) {
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
  }, [src]);

  const showImage = src !== null && !errored;

  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden rounded-lg bg-surface-light border border-border/60 relative',
        sizeClass,
        className
      )}
      data-testid={dataTestId}
    >
      {showImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          loading={loading}
          className="object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <ImagePlaceholder type="exercise" iconClassName="h-4 w-4" />
      )}
      {overlay}
    </div>
  );
}
