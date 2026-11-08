'use client';

import { AlertTriangle } from 'lucide-react';

import { AiCreditsRequestControl } from './AiCreditsRequestControl';
import { creditsLevel, type CreditsUsage } from './utils/creditsRequest';

/** Ostrzeżenie pod licznikiem kredytów: przy 20% puli lub mniej oraz przy wyczerpaniu. */
export function AiCreditsNotice({ usage }: { readonly usage: CreditsUsage }) {
  const level = creditsLevel(usage);
  if (level === 'ok') return null;

  return (
    <div className="flex flex-col items-start gap-1.5" data-testid="nav-chat-credits-warning">
      <p className="flex items-start gap-1.5 text-[12px] text-status-warning">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {level === 'exhausted' ? 'Kredyty AI gabinetu się skończyły.' : 'Zostało niewiele kredytów AI gabinetu.'}
      </p>
      <AiCreditsRequestControl testIdPrefix="nav-chat-credits" showOwnerHint />
    </div>
  );
}
