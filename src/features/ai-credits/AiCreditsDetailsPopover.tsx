'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { GET_AI_CREDITS_HISTORY_QUERY, GET_AI_CREDITS_STATUS_QUERY } from '@/graphql/queries/billing.queries';
import type {
  GetAICreditsHistoryResponse,
  GetAICreditsHistoryVariables,
  GetAICreditsStatusResponse,
  GetAICreditsStatusVariables,
} from '@/graphql/types';

import { AiCreditsRequestControl } from './AiCreditsRequestControl';
import { summarizeCreditsUsage } from './utils/creditsUsage';

const HISTORY_DAYS = 30;

const resetDateFormat = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long' });

interface AiCreditsDetailsPopoverProps {
  /** Zawartość przycisku: licznik i pasek z menu czatu. */
  readonly children: ReactNode;
  readonly className?: string;
}

/** Klik w licznik kredytów: stan puli dla wszystkich ról, podział zużycia tylko dla Owner i Admin. */
export function AiCreditsDetailsPopover({ children, className }: AiCreditsDetailsPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={className} data-testid="nav-chat-credits-details-btn">
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80" data-testid="nav-chat-credits-details">
        {open ? <AiCreditsDetails /> : null}
      </PopoverContent>
    </Popover>
  );
}

function AiCreditsDetails() {
  const { currentOrganization } = useOrganization();
  const { canManageOrganization } = useRoleAccess();
  const organizationId = currentOrganization?.organizationId ?? '';

  const { data: statusData } = useQuery<GetAICreditsStatusResponse, GetAICreditsStatusVariables>(
    GET_AI_CREDITS_STATUS_QUERY,
    { variables: { organizationId }, skip: !organizationId, errorPolicy: 'all' }
  );
  const status = statusData?.aiCreditsStatus;

  return (
    <div className="flex flex-col gap-4 text-[13px]">
      <h2 className="text-[15px] font-semibold text-foreground">Kredyty AI gabinetu</h2>

      {status ? (
        <dl className="flex flex-col gap-1.5" data-testid="nav-chat-credits-details-status">
          <DetailRow label="Zostało" value={status.totalRemaining} />
          <DetailRow label="Zużyte w tym miesiącu" value={`${status.monthlyUsed} / ${status.monthlyLimit}`} />
          {status.addonCredits > 0 ? <DetailRow label="Dodatkowe" value={status.addonCredits} /> : null}
          <DetailRow label="Pula miesięczna odnowi się" value={formatResetDate(status.resetDate)} />
        </dl>
      ) : (
        <Skeleton className="h-16 rounded-[10px]" />
      )}

      {canManageOrganization && organizationId ? <UsageBreakdown organizationId={organizationId} /> : null}

      <AiCreditsRequestControl testIdPrefix="nav-chat-credits-details" showOwnerHint className="self-start" />
    </div>
  );
}

function UsageBreakdown({ organizationId }: { readonly organizationId: string }) {
  const { data, loading, error } = useQuery<GetAICreditsHistoryResponse, GetAICreditsHistoryVariables>(
    GET_AI_CREDITS_HISTORY_QUERY,
    { variables: { organizationId, days: HISTORY_DAYS }, fetchPolicy: 'cache-and-network', errorPolicy: 'all' }
  );
  const logs = data?.aiCreditsHistory;

  return (
    <section className="flex flex-col gap-1.5" aria-labelledby="ai-credits-usage-heading">
      <h3 id="ai-credits-usage-heading" className="text-[12px] font-semibold text-label-tertiary">
        Na co poszły kredyty ({HISTORY_DAYS} dni)
      </h3>
      {logs === undefined ? (
        loading ? (
          <Skeleton className="h-12 rounded-[10px]" />
        ) : (
          <p className="text-label-secondary" data-testid="nav-chat-credits-details-usage-error">
            {error ? 'Nie udało się wczytać podziału.' : 'Brak danych o zużyciu.'}
          </p>
        )
      ) : (
        <UsageList logs={logs} />
      )}
    </section>
  );
}

function UsageList({ logs }: { readonly logs: GetAICreditsHistoryResponse['aiCreditsHistory'] }) {
  const summary = summarizeCreditsUsage(logs);

  if (summary.byFeature.length === 0) {
    return (
      <p className="text-label-secondary" data-testid="nav-chat-credits-details-usage-empty">
        Brak zużycia w ostatnich {HISTORY_DAYS} dniach.
      </p>
    );
  }

  return (
    <>
      <dl className="flex flex-col gap-1.5" data-testid="nav-chat-credits-details-usage">
        {summary.byFeature.map((feature) => (
          <DetailRow key={feature.key} label={feature.label} value={feature.credits} />
        ))}
      </dl>
      {summary.refunded > 0 ? (
        <p className="text-[12px] text-label-secondary">Zwrócone za nieudane wywołania: {summary.refunded}</p>
      ) : null}
      {summary.truncated ? (
        <p className="text-[12px] text-label-tertiary">Podział z ostatnich {logs.length} operacji.</p>
      ) : null}
    </>
  );
}

function DetailRow({ label, value }: { readonly label: string; readonly value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-label-secondary">{label}</dt>
      <dd className="font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function formatResetDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : resetDateFormat.format(date);
}
