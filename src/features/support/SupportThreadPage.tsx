'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@apollo/client/react';
import { ChevronLeft, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/shared/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { SUPPORT_REPLY_MUTATION } from '@/graphql/mutations/support.mutations';
import { GET_SUPPORT_THREAD_QUERY } from '@/graphql/queries/support.queries';
import type {
  GetSupportThreadResponse,
  GetSupportThreadVariables,
  SupportMessage,
  SupportReplyResponse,
  SupportReplyVariables,
} from '@/graphql/types';
import { useMarkSupportThreadRead } from './useSupport';
import {
  SUPPORT_BODY_MAX,
  supportCtaTarget,
  supportKindLabel,
  supportStatusLabel,
  supportTabHref,
} from './utils/support';

function formatWhen(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function MessageCta({ message }: { message: SupportMessage }) {
  const target = supportCtaTarget(message);
  if (!target) return null;
  if (target.kind === 'internal') {
    return (
      <Button asChild size="sm" className="self-start" data-testid={`support-message-cta-${message.id}`}>
        <Link href={target.href}>{target.label}</Link>
      </Button>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <Button asChild size="sm" data-testid={`support-message-cta-${message.id}`}>
        <a
          href={target.href}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`support-message-cta-link-${message.id}`}
        >
          {target.label}
          <ExternalLink aria-hidden="true" />
        </a>
      </Button>
      <span className="text-[12px] text-label-secondary">Otworzy się {target.host}</span>
    </div>
  );
}

function MessageBubble({ message }: { message: SupportMessage }) {
  const fromTeam = message.authorKind === 'OPS';
  return (
    <li
      className={cn(
        'flex max-w-[620px] flex-col gap-2 rounded-card px-4 py-3',
        fromTeam ? 'self-start border border-border bg-card' : 'self-end bg-tint-muted'
      )}
      data-testid={`support-message-${message.id}`}
    >
      <p className="text-[12px] text-label-secondary">
        <span className="font-semibold text-foreground">{message.isMine ? 'Ty' : message.authorName}</span>
        {' · '}
        {formatWhen(message.createdAt)}
      </p>
      <p className="whitespace-pre-line text-[14px] leading-relaxed text-foreground">{message.body}</p>
      <MessageCta message={message} />
    </li>
  );
}

/** Wątek Wsparcia: wiadomości bez notatek zespołu (backend ich nie wysyła), odpowiedź i „przeczytane” po otwarciu. */
export function SupportThreadPage({ threadId }: { threadId: string }) {
  const [body, setBody] = useState('');
  const markRead = useMarkSupportThreadRead();
  const markedFor = useRef<string | null>(null);
  const { data, loading, error } = useQuery<GetSupportThreadResponse, GetSupportThreadVariables>(
    GET_SUPPORT_THREAD_QUERY,
    { variables: { id: threadId }, fetchPolicy: 'cache-and-network', errorPolicy: 'all' }
  );
  const [reply, { loading: sending }] = useMutation<SupportReplyResponse, SupportReplyVariables>(
    SUPPORT_REPLY_MUTATION,
    {
      refetchQueries: ['GetSupportThread', 'GetSupportThreads', 'GetSupportUnreadCount'],
    }
  );
  const detail = data?.supportThread;
  const lastMessageAt = detail?.thread.lastMessageAt;

  useEffect(() => {
    // Mark read once per newest message, so a team reply arriving later marks it again.
    if (lastMessageAt && markedFor.current !== lastMessageAt) {
      markedFor.current = lastMessageAt;
      markRead(threadId);
    }
  }, [lastMessageAt, markRead, threadId]);

  const handleReply = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    if (!text) return;
    try {
      const result = await reply({ variables: { threadId, body: text } });
      if (!result.data?.supportReply) {
        toast.error('Nie udało się wysłać odpowiedzi.');
        return;
      }
      setBody('');
    } catch {
      toast.error('Nie udało się wysłać odpowiedzi.');
    }
  };

  if (!detail) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 py-2">
        <Link href={supportTabHref('CONVERSATIONS')} className="text-[13px] text-tint">
          ‹ Wsparcie
        </Link>
        <p className="text-[14px] text-label-secondary" data-testid="support-thread-missing">
          {loading
            ? 'Wczytywanie…'
            : error
              ? 'Nie udało się wczytać wątku.'
              : 'Nie ma takiego wątku albo nie masz do niego dostępu.'}
        </p>
      </div>
    );
  }

  const { thread, messages } = detail;
  const status = supportStatusLabel(thread.status);
  const backHref = supportTabHref(thread.isReport ? 'REPORTS' : 'CONVERSATIONS');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 py-2">
      <Link href={backHref} className="flex items-center gap-1 text-[13px] text-tint" data-testid="support-thread-back">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Wsparcie
      </Link>
      <div className="flex flex-col gap-2">
        <PageHeader title={thread.subject} titleTestId="support-thread-title" />
        <div className="flex flex-wrap items-center gap-2 text-[15px] text-label-secondary">
          <Badge variant={status.tone} data-testid="support-thread-status">
            {status.label}
          </Badge>
          <span>
            {thread.referenceCode ? `${thread.referenceCode} · ` : ''}
            {supportKindLabel(thread)}
          </span>
        </div>
      </div>

      <ol className="flex flex-col gap-3" data-testid="support-messages">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </ol>

      <form
        onSubmit={handleReply}
        className="flex flex-col gap-3 rounded-card border border-border bg-card p-3"
        data-testid="support-reply-form"
      >
        <label htmlFor="support-reply-body" className="text-[13px] font-semibold text-foreground">
          {thread.status === 'CLOSED' ? 'Odpowiedź otworzy wątek ponownie' : 'Twoja odpowiedź'}
        </label>
        <Textarea
          id="support-reply-body"
          rows={3}
          value={body}
          maxLength={SUPPORT_BODY_MAX}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Napisz wiadomość do zespołu FiziYo"
          data-testid="support-reply-input"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[12px] text-label-secondary">
            Nie wpisuj danych pacjentów (imion, rozpoznań). Zespół nie potrzebuje ich do pomocy.
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={sending || body.trim().length === 0}
            data-testid="support-reply-send-btn"
          >
            {sending ? 'Wysyłanie…' : 'Wyślij'}
          </Button>
        </div>
      </form>
    </div>
  );
}
