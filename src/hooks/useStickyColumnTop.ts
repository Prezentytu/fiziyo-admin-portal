'use client';

import { useLayoutEffect, useState } from 'react';

/**
 * `top` dla przyklejonej kolumny. Kolumna, która mieści się w oknie przewijania, trzyma się góry (`gap`).
 * Wyższa dostaje ujemny `top`: przewija się razem ze stroną, aż pokaże swój dół, i dopiero wtedy staje,
 * więc nic pod nią nie zostaje ucięte.
 */
export function resolveStickyColumnTop(params: {
  viewportHeight: number;
  columnHeight: number;
  gap: number;
  /** Miejsce zajęte na dole okna, np. przez pasek zapisu. */
  bottomReserve?: number;
}): number {
  const { viewportHeight, columnHeight, gap, bottomReserve = 0 } = params;
  return Math.min(gap, viewportHeight - bottomReserve - gap - columnHeight);
}

function findScrollParent(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const overflowY = getComputedStyle(node).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
  }
  return null;
}

/** Podpina `resolveStickyColumnTop` pod element: mierzy kolumnę i jej okno przewijania przy każdej zmianie. */
export function useStickyColumnTop<T extends HTMLElement>(options: { gap: number; bottomReserve?: number }) {
  const { gap, bottomReserve = 0 } = options;
  // Element w stanie, nie w `useRef`: kolumna pojawia się dopiero po wczytaniu danych, a pomiar ma wtedy ruszyć.
  const [column, setColumn] = useState<T | null>(null);
  const [top, setTop] = useState(gap);

  useLayoutEffect(() => {
    if (!column) return;
    const scroller = findScrollParent(column);

    const measure = () => {
      setTop(
        resolveStickyColumnTop({
          // `top` liczy się od krawędzi treści okna przewijania, czyli poniżej jego górnego odstępu.
          viewportHeight: scroller
            ? scroller.clientHeight - parseFloat(getComputedStyle(scroller).paddingTop)
            : window.innerHeight,
          columnHeight: column.offsetHeight,
          gap,
          bottomReserve,
        })
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(column);
    if (scroller) observer.observe(scroller);
    return () => observer.disconnect();
  }, [column, gap, bottomReserve]);

  return { ref: setColumn, top };
}
