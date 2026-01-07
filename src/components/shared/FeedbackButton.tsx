'use client';

/**
 * FeedbackButton - Przycisk do otwierania dialogu feedbacku
 * Używany w Sidebarze i opcjonalnie w Headerze
 *
 * 2025 Best Practices:
 * - Plain function (no React.FC)
 * - Design tokens from CSS variables
 * - Memoized dla performance
 */

import { memo, useState, useCallback } from 'react';
import { Bug, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { isFeedbackEnabled } from '@/lib/featureFlags';
import { FeedbackDialog } from './FeedbackDialog';

// ============================================================================
// TYPES
// ============================================================================

interface FeedbackButtonProps {
  /**
   * Wariant wyświetlania przycisku
   * - icon: tylko ikona (dla zwinietego sidebara lub headera)
   * - full: ikona + tekst (dla rozwiniętego sidebara)
   */
  variant?: 'icon' | 'full';

  /**
   * Nazwa ekranu z którego otwarto feedback (dla metadanych)
   */
  screenName?: string;

  /**
   * Czy sidebar jest zwinięty (dla wariantu full)
   */
  isCollapsed?: boolean;

  /**
   * Dodatkowe klasy CSS
   */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

function FeedbackButtonComponent({
  variant = 'full',
  screenName,
  isCollapsed = false,
  className,
}: FeedbackButtonProps) {
  // === STATE ===
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // === HANDLERS ===
  const handleOpen = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  // === RENDER ===

  // Nie renderuj jeśli feedback wyłączony
  if (!isFeedbackEnabled()) {
    return null;
  }

  // Wariant: ikona z tekstem (dla headera)
  if (variant === 'icon') {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpen}
          className={cn('gap-2 text-muted-foreground hover:text-info', className)}
          data-testid="common-feedback-btn"
        >
          <Bug className="h-4 w-4" />
          <span className="hidden sm:inline">Zgłoś uwagę</span>
        </Button>

        <FeedbackDialog
          isOpen={isDialogOpen}
          onClose={handleClose}
          screenName={screenName}
        />
      </>
    );
  }

  // Wariant: pełny przycisk (dla Sidebara)
  // Gdy sidebar jest zwinięty, pokaż tylko ikonę z tooltipem
  if (isCollapsed) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleOpen}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors',
                'hover:bg-info/10 hover:text-info',
                className
              )}
              data-testid="common-feedback-btn-collapsed"
            >
              <Bug className="h-5 w-5" />
              <span className="sr-only">Zgłoś uwagę</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Zgłoś uwagę</p>
          </TooltipContent>
        </Tooltip>

        <FeedbackDialog
          isOpen={isDialogOpen}
          onClose={handleClose}
          screenName={screenName}
        />
      </>
    );
  }

  // Wariant: pełny przycisk rozwinięty
  return (
    <>
      <button
        onClick={handleOpen}
        className={cn(
          'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
          'text-muted-foreground hover:bg-info/10 hover:text-info',
          className
        )}
        data-testid="common-feedback-btn-full"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info/10 group-hover:bg-info/20 transition-colors">
          <Bug className="h-4 w-4 text-info" />
        </div>
        <div className="flex flex-1 flex-col items-start overflow-hidden">
          <span className="font-medium text-foreground group-hover:text-info transition-colors">
            Zgłoś uwagę
          </span>
        <span className="text-xs text-muted-foreground truncate">
          Błąd, sugestia lub pytanie
        </span>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      <FeedbackDialog
        isOpen={isDialogOpen}
        onClose={handleClose}
        screenName={screenName}
      />
    </>
  );
}

// Memoizacja dla performance
export const FeedbackButton = memo(FeedbackButtonComponent);
