'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';

import { PageHeader } from '@/components/shared/page';
import { FeedbackDialog } from '@/components/shared/FeedbackDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { tabLinkVariants } from '@/components/ui/tabs';
import { useOrganization } from '@/contexts/OrganizationContext';
import { SUPPORT_EMAIL } from '@/lib/support';
import { GET_SUPPORT_THREADS_QUERY } from '@/graphql/queries/support.queries';
import type { GetSupportThreadsResponse, GetSupportThreadsVariables, SupportThread } from '@/graphql/types';
import { NewConversationDialog } from './NewConversationDialog';
import { useSupportUnreadCountState } from './useSupport';
import {
  SUPPORT_TABS,
  SUPPORT_TAB_LABELS,
  canStartSupportConversation,
  parseSupportTab,
  supportInboxState,
  supportKindLabel,
  supportStatusLabel,
  supportTabHref,
  supportTabUnread,
  supportThreadHref,
} from './utils/support';

function formatWhen(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function ThreadRow({ thread }: { thread: SupportThread }) {
  const status = supportStatusLabel(thread.status);
  return (
    <li>
      <Link
        href={supportThreadHref(thread.id)}
        className="flex items-center gap-4 px-4 py-4 hover:bg-fill-quaternary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        data-testid={`support-thread-row-${thread.id}`}
      >
        <span
          aria-label={thread.unread ? 'Nieprzeczytane' : undefined}
          className={thread.unread ? 'size-2.5 shrink-0 rounded-full bg-destructive' : 'size-2.5 shrink-0'}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-foreground">{thread.subject}</span>
          {thread.lastMessagePreview && (
            <span className="block truncate text-[13px] text-label-secondary">
              {thread.lastMessageFromTeam ? 'Zespół FiziYo: ' : 'Ty: '}
              {thread.lastMessagePreview}
            </span>
          )}
        </span>
        <span className="hidden shrink-0 text-[12px] text-label-secondary sm:block">
          {thread.referenceCode ? `${thread.referenceCode} · ` : ''}
          {supportKindLabel(thread)}
        </span>
        <Badge variant={status.tone} className="shrink-0" data-testid={`support-thread-status-${thread.id}`}>
          {status.label}
        </Badge>
        <span className="hidden w-28 shrink-0 text-right text-[12px] text-label-secondary md:block">
          {formatWhen(thread.lastMessageAt)}
        </span>
      </Link>
    </li>
  );
}

/** Wsparcie gabinetu: zakładki Rozmowy i Zgłoszenia (SPEC-056). */
export function SupportInboxPage() {
  const searchParams = useSearchParams();
  const tab = parseSupportTab(searchParams.get('tab'));
  const { currentOrganization } = useOrganization();
  const { count, failed: countFailed } = useSupportUnreadCountState();
  const inboxState = supportInboxState(count, countFailed);
  const [newOpen, setNewOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { data, loading, error } = useQuery<GetSupportThreadsResponse, GetSupportThreadsVariables>(
    GET_SUPPORT_THREADS_QUERY,
    { variables: { tab }, fetchPolicy: 'cache-and-network', errorPolicy: 'all', skip: inboxState !== 'enabled' }
  );
  const canWrite = canStartSupportConversation(currentOrganization?.role);
  const threads = data?.supportThreads;

  if (inboxState === 'disabled') {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 py-6">
        <PageHeader title="Wsparcie" />
        <p className="text-[15px] text-label-secondary" data-testid="support-disabled">
          Wsparcie nie jest jeszcze dostępne dla Twojego gabinetu. Uwagi wyślesz przyciskiem „Zgłoś uwagę”.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 py-2">
      <PageHeader
        title="Wsparcie"
        titleTestId="support-title"
        subtitle="Rozmowy i zgłoszenia Twojego gabinetu z zespołem FiziYo"
        actions={
          tab === 'REPORTS' ? (
            <Button onClick={() => setFeedbackOpen(true)} data-testid="support-report-btn">
              Zgłoś uwagę
            </Button>
          ) : canWrite ? (
            <Button onClick={() => setNewOpen(true)} data-testid="support-new-conversation-btn">
              Napisz do nas
            </Button>
          ) : null
        }
      />

      <nav
        aria-label="Wsparcie"
        className="flex items-stretch gap-x-7 border-b border-border"
        data-testid="support-tabs"
      >
        {SUPPORT_TABS.map((option) => {
          const active = option === tab;
          const unread = supportTabUnread(count, option);
          return (
            <Link
              key={option}
              href={supportTabHref(option)}
              aria-current={active ? 'page' : undefined}
              className={tabLinkVariants({ active, className: '-mb-px' })}
              data-testid={`support-tab-${option.toLowerCase()}`}
            >
              <span className={active ? 'text-[17px] font-semibold leading-[22px]' : 'text-[17px] leading-[22px]'}>
                {SUPPORT_TAB_LABELS[option]}
              </span>
              {unread > 0 && (
                <Badge variant="destructive" className="tabular-nums">
                  {unread}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {!threads ? (
        <p className="text-[14px] text-label-secondary" data-testid="support-loading">
          {inboxState === 'unavailable' || (error && !loading)
            ? 'Nie udało się wczytać wątków. Spróbuj ponownie za chwilę.'
            : 'Wczytywanie…'}
        </p>
      ) : threads.length === 0 ? (
        <p
          className="rounded-card border border-border bg-card px-4 py-6 text-[14px] text-label-secondary"
          data-testid="support-empty"
        >
          {tab === 'REPORTS'
            ? 'Twoje zgłoszenia z „Zgłoś uwagę” pojawią się tutaj razem z odpowiedziami zespołu.'
            : canWrite
              ? 'Nie masz jeszcze rozmów z zespołem FiziYo. Napisz, jeśli czegoś potrzebujesz.'
              : 'Rozmowy gabinetu z zespołem FiziYo prowadzi właściciel albo administrator.'}
        </p>
      ) : (
        <ul
          className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card"
          data-testid="support-thread-list"
        >
          {threads.map((thread) => (
            <ThreadRow key={thread.id} thread={thread} />
          ))}
        </ul>
      )}

      <p className="text-[13px] text-label-secondary">Pilne sprawy: {SUPPORT_EMAIL}</p>

      <NewConversationDialog open={newOpen} onOpenChange={setNewOpen} />
      <FeedbackDialog isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} screenName="Wsparcie" />
    </div>
  );
}
