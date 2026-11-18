'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@apollo/client/react';
import { AlertCircle, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { GET_RELEASE_NOTES_QUERY } from '@/graphql/queries/releaseNotes.queries';
import type { GetReleaseNotesResponse, ReleaseNote, ReleaseNoteItem } from '@/graphql/types';
import { useMarkReleaseNoteSeen, useUnseenReleaseNote } from './useReleaseNotes';
import {
  formatReleaseNoteDate,
  RELEASE_NOTES_TAKE,
  releaseNoteAnchorFromHash,
  releaseNoteAnchorId,
  releaseNoteKindPresentation,
  safeReleaseNoteUrl,
  unseenReleaseNoteIds,
} from './utils/releaseNotes';

const OPT_IN_LINK_LABEL = 'Włącz w ustawieniach';

/** Settings tab „Co nowego”: release history; opening it marks the newest release as seen. */
export function WhatsNewTab() {
  const { data, loading, error, refetch } = useQuery<GetReleaseNotesResponse>(GET_RELEASE_NOTES_QUERY, {
    variables: { take: RELEASE_NOTES_TAKE },
    fetchPolicy: 'cache-and-network',
  });
  const unseen = useUnseenReleaseNote();
  const markSeen = useMarkReleaseNoteSeen();
  const notes = data?.releaseNotes;
  // Snapshot from the first load: marking as seen refetches `seen`, but the badges stay for this visit.
  const [newReleaseIds, setNewReleaseIds] = useState<ReadonlySet<string> | null>(null);
  const markedRef = useRef(false);
  const scrolledRef = useRef(false);

  if (notes && newReleaseIds === null) {
    setNewReleaseIds(unseenReleaseNoteIds(notes));
  }

  const latestId = notes?.[0]?.id;
  const hasUnseen = unseen !== null;

  useEffect(() => {
    if (markedRef.current || !latestId || !hasUnseen) return;
    markedRef.current = true;
    markSeen(latestId);
  }, [latestId, hasUnseen, markSeen]);

  useEffect(() => {
    if (scrolledRef.current || !latestId) return;
    scrolledRef.current = true;
    const anchor = releaseNoteAnchorFromHash(window.location.hash);
    if (anchor) document.getElementById(anchor)?.scrollIntoView({ block: 'start' });
  }, [latestId]);

  return (
    <section className="space-y-6" data-testid="settings-whats-new">
      <header className="space-y-1">
        <h2 className="text-[22px] font-bold leading-7 tracking-tight text-foreground">Co nowego</h2>
        <p className="text-[15px] text-label-secondary">
          Zmiany w portalu FiziYo. Nowości publikujemy najczęściej dwa razy w tygodniu.
        </p>
      </header>

      {!notes && loading ? (
        <LoadingState type="card" count={2} />
      ) : !notes && error ? (
        <Card data-testid="settings-whats-new-error">
          <CardContent>
            <EmptyState
              icon={AlertCircle}
              title="Nie udało się wczytać nowości"
              description="Sprawdź połączenie i spróbuj ponownie."
              actionLabel="Spróbuj ponownie"
              onAction={() => void refetch()}
              actionLoading={loading}
            />
          </CardContent>
        </Card>
      ) : !notes || notes.length === 0 ? (
        <Card data-testid="settings-whats-new-empty">
          <CardContent>
            <EmptyState icon={Sparkles} title="Tu pojawią się nowości w portalu." />
          </CardContent>
        </Card>
      ) : (
        <ol className="space-y-6">
          {notes.map((note) => (
            <li key={note.id}>
              <ReleaseNoteCard note={note} isNew={newReleaseIds?.has(note.id) ?? false} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ReleaseNoteCard({ note, isNew }: Readonly<{ note: ReleaseNote; isNew: boolean }>) {
  const date = formatReleaseNoteDate(note.publishedAt);

  return (
    <Card
      id={releaseNoteAnchorId(note.id)}
      className="scroll-mt-6"
      data-testid={`settings-whats-new-release-${note.id}`}
    >
      <CardContent className="space-y-5 pt-6">
        <header className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-label-secondary">
            {isNew && (
              <Badge variant="solid" data-testid={`settings-whats-new-release-${note.id}-new`}>
                Nowe
              </Badge>
            )}
            {date && <time dateTime={note.publishedAt}>{date}</time>}
          </div>
          <h3 className="text-[19px] font-semibold leading-6 text-foreground">{note.title}</h3>
          {note.lead && <p className="text-[15px] leading-[21px] text-label-secondary">{note.lead}</p>}
        </header>

        {note.items.length > 0 && (
          <ul className="space-y-5">
            {note.items.map((item, index) => (
              <ReleaseNoteItemRow
                key={`${note.id}-${index}`}
                item={item}
                testId={`settings-whats-new-item-${note.id}-${index}`}
              />
            ))}
          </ul>
        )}

        {note.fixes.length > 0 && (
          <details
            className="group rounded-xl bg-fill-quaternary px-4 py-3"
            data-testid={`settings-whats-new-fixes-${note.id}`}
          >
            <summary className="cursor-pointer text-[14px] font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
              Drobne poprawki ({note.fixes.length})
            </summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] leading-5 text-label-secondary">
              {note.fixes.map((fix, index) => (
                <li key={`${note.id}-fix-${index}`}>{fix}</li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

function ReleaseNoteItemRow({ item, testId }: Readonly<{ item: ReleaseNoteItem; testId: string }>) {
  const kind = releaseNoteKindPresentation(item.kind);
  const isOptIn = item.kind === 'OPT_IN';
  const screenshotUrl = safeReleaseNoteUrl(item.screenshotUrl);
  const href = safeReleaseNoteUrl(item.deeplink);
  const linkLabel = item.linkLabel?.trim() || (isOptIn ? OPT_IN_LINK_LABEL : null);
  const isExternal = href?.startsWith('https://') ?? false;

  return (
    <li className="space-y-2" data-testid={testId}>
      <Badge variant={kind.variant}>{kind.label}</Badge>
      <h4 className="text-[16px] font-semibold leading-[22px] text-foreground">{item.title}</h4>
      <p className="whitespace-pre-line text-[15px] leading-[21px] text-label-secondary">{item.body}</p>
      {screenshotUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- Ops may point at any https host, outside next/image remotePatterns
        <img
          src={screenshotUrl}
          alt={item.title}
          loading="lazy"
          className="mt-1 w-full max-w-2xl rounded-xl border border-separator"
          data-testid={`${testId}-screenshot`}
        />
      )}
      {href && linkLabel && (
        <Button
          asChild
          variant={isOptIn ? 'tinted' : 'plain'}
          size="sm"
          className={isOptIn ? undefined : '-ml-3'}
          data-testid={`${testId}-link`}
        >
          <Link href={href} {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {linkLabel}
          </Link>
        </Button>
      )}
    </li>
  );
}
