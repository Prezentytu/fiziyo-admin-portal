'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'fiziyo:verification-media-panel-collapsed';

interface CollapsibleMediaPanelProps {
  /** Zawartość widoczna po rozwinięciu (nagłówek + odtwarzacz mediów). */
  children: React.ReactNode;
  /** Wywoływane po kliknięciu ikony powrotu w zwiniętym stanie (nawigacja do listy kolejki). */
  onBack?: () => void;
  className?: string;
  /** Klasa szerokości w stanie rozwiniętym (domyślnie 42% na desktopie, jak dotychczasowy layout). */
  expandedWidthClassName?: string;
}

/**
 * Zwijalny lewy panel mediów w widokach weryfikacji. Stan (rozwinięty/zwinięty) jest
 * zapamiętywany w localStorage, dzięki czemu recenzent nie musi go ustawiać przy każdym
 * ćwiczeniu — przydatne przy pracy głównie z tekstem, gdy wideo nie jest w danej chwili potrzebne.
 */
export function CollapsibleMediaPanel({
  children,
  onBack,
  className,
  expandedWidthClassName = 'lg:w-[42%]',
}: Readonly<CollapsibleMediaPanelProps>) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsCollapsed(window.localStorage.getItem(STORAGE_KEY) === '1');
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(STORAGE_KEY, isCollapsed ? '1' : '0');
  }, [isCollapsed, isHydrated]);

  return (
    <div
      className={cn(
        'relative flex flex-col min-h-0 bg-card border-b lg:border-b-0 lg:border-r border-border/30 transition-[width] duration-200',
        isCollapsed ? 'h-11 lg:h-auto lg:w-11 lg:min-w-11' : cn('h-[30vh] lg:h-auto', expandedWidthClassName),
        className
      )}
      data-testid="verification-media-panel"
      data-collapsed={isCollapsed}
    >
      {isCollapsed ? (
        <div className="flex flex-1 flex-row items-center justify-center gap-3 lg:flex-col lg:py-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Wróć do kolejki"
              data-testid="verification-media-panel-collapsed-back-btn"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Rozwiń panel mediów"
            data-testid="verification-media-panel-toggle"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
          <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 lg:[writing-mode:vertical-rl] lg:block">
            Media
          </span>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="absolute top-1/2 -right-3 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background shadow-sm transition-colors hover:bg-accent hover:text-foreground lg:flex"
            aria-label="Zwiń panel mediów"
            data-testid="verification-media-panel-toggle"
          >
            <PanelLeftClose className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {children}
        </>
      )}
    </div>
  );
}
