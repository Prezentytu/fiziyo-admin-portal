'use client';

import { useState } from 'react';
import { Check, Lightbulb, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';

import { FeedbackDialog } from '@/components/shared/FeedbackDialog';
import { Button } from '@/components/ui/button';
import { isFeedbackEnabled } from '@/lib/featureFlags';
import { getBackendToken } from '@/lib/tokenCache';
import type { MissingCapability } from '../utils/viewSpec';

interface FeatureRequestCtaProps {
  readonly capability: MissingCapability;
  readonly testId: string;
}

/**
 * Nienachalny pasek pod odpowiedzią „tego jeszcze nie umiem” (SPEC-072):
 * pozwala 1 kliknięciem oddać bez-PII głos popytu (+1) lub otworzyć FeedbackDialog w trybie Sugestia.
 */
export function FeatureRequestCta({ capability, testId }: FeatureRequestCtaProps) {
  const [voted, setVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const handleVote = async () => {
    if (voted || voting) return;
    setVoting(true);
    try {
      const token = getBackendToken();
      if (token) {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        await fetch(`${baseUrl}/api/chat/feature-demand`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ capabilityCode: capability.code, source: 'chat_refusal' }),
        }).catch(() => undefined);
      }
      setVoted(true);
      toast.success('Zapisano głos — dziękujemy!');
    } finally {
      setVoting(false);
    }
  };

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2.5 rounded-[14px] border-[0.5px] border-separator bg-fill-quaternary px-3.5 py-2.5 text-[13px]"
      data-testid={`${testId}-feature-request-banner`}
    >
      <span className="flex min-w-0 items-center gap-2 text-foreground">
        <Lightbulb className="h-4 w-4 shrink-0 text-tint" aria-hidden="true" />
        <span className="truncate">
          Brakuje tej funkcji w FiziYo? <b className="font-semibold">{capability.label}</b>
        </span>
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={voted ? 'secondary' : 'outline'}
          disabled={voted || voting}
          onClick={() => void handleVote()}
          data-testid={`${testId}-demand-vote-btn`}
        >
          {voted ? <Check className="h-3.5 w-3.5 text-tint" aria-hidden="true" /> : <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />}
          {voted ? 'Zapisano głos — dziękujemy!' : '+1 Potrzebuję tego'}
        </Button>
        {isFeedbackEnabled() && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={reportSent}
            onClick={() => setDialogOpen(true)}
            data-testid={`${testId}-feature-request-btn`}
          >
            {reportSent ? 'Zgłoszono potrzebę' : 'Zgłoś potrzebę ze szczegółami'}
          </Button>
        )}
      </div>
      {dialogOpen && (
        <FeedbackDialog
          isOpen
          onClose={() => setDialogOpen(false)}
          onSent={() => setReportSent(true)}
          initialType="suggestion"
          initialDescription={capability.prefill}
          capabilityCode={capability.code}
          screenName="Czat w portalu (potrzeba funkcji)"
        />
      )}
    </div>
  );
}
