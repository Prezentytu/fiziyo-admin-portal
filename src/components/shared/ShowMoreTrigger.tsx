'use client';

import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';

interface ShowMoreTriggerProps {
  readonly remaining: number;
  readonly onShowMore: () => void;
  readonly dataTestId?: string;
}

/**
 * Stopka listy z `useIncrementalList`: doładowuje kolejną partię, gdy dojedzie do widoku,
 * a przycisk zostaje dla klawiatury i środowisk bez IntersectionObservera.
 */
export function ShowMoreTrigger({ remaining, onShowMore, dataTestId }: ShowMoreTriggerProps) {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = triggerRef.current;
    if (!node || remaining <= 0 || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onShowMore();
      },
      { rootMargin: '400px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [remaining, onShowMore]);

  if (remaining <= 0) return null;

  return (
    <div ref={triggerRef} className="flex justify-center py-2">
      <Button type="button" variant="ghost" size="sm" onClick={onShowMore} data-testid={dataTestId}>
        Pokaż więcej ({remaining})
      </Button>
    </div>
  );
}
