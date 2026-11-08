'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { useAiCreditRequests } from './useAiCreditRequests';
import { CREDITS_REQUEST_OPEN_EVENT, creditsRequestControl } from './utils/creditsRequest';

export function openCreditsRequestDialog(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CREDITS_REQUEST_OPEN_EVENT));
}

interface AiCreditsRequestControlProps {
  readonly className?: string;
  /** Roles that cannot request see this hint instead of the button. */
  readonly showOwnerHint?: boolean;
  readonly testIdPrefix: string;
}

/** Owner i Admin: przycisk prośby albo informacja o otwartej prośbie. Pozostałe role: wskazanie właściciela. */
export function AiCreditsRequestControl({
  className,
  showOwnerHint = false,
  testIdPrefix,
}: AiCreditsRequestControlProps) {
  const { canRequest, requests } = useAiCreditRequests();
  const control = creditsRequestControl(canRequest, requests);

  if (control === 'pending') {
    return (
      <p className={cn('text-[12px] text-label-secondary', className)} data-testid={`${testIdPrefix}-pending`}>
        Prośba czeka na odpowiedź zespołu FiziYo
      </p>
    );
  }

  if (control === 'request') {
    return (
      <Button
        type="button"
        variant="tinted"
        size="sm"
        className={className}
        onClick={openCreditsRequestDialog}
        data-testid={`${testIdPrefix}-request-btn`}
      >
        Poproś o więcej kredytów
      </Button>
    );
  }

  if (!showOwnerHint) return null;
  return (
    <p className={cn('text-[12px] text-label-secondary', className)} data-testid={`${testIdPrefix}-owner-hint`}>
      Poproś właściciela gabinetu o więcej kredytów AI.
    </p>
  );
}
