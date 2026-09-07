'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { BookHeart, ChevronDown, ChevronUp, Eye } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';

import { GET_PATIENT_SHARED_JOURNAL_ENTRIES_QUERY } from '@/graphql/queries/patientJournal.queries';
import type { PatientSharedJournalEntriesResponse } from '@/types/patientJournal.types';
import {
  buildJournalEntryPreview,
  isJournalEntryTruncated,
  resolveJournalEntryDisplayDate,
  sortJournalEntriesByDisplayDate,
} from './utils/patientJournalDisplay';

interface PatientJournalNotesProps {
  readonly patientId: string;
  readonly organizationId: string;
}

export function PatientJournalNotes({ patientId, organizationId }: PatientJournalNotesProps) {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());

  const { data, loading, error } = useQuery<PatientSharedJournalEntriesResponse>(
    GET_PATIENT_SHARED_JOURNAL_ENTRIES_QUERY,
    {
      variables: { patientId, organizationId, limit: 50 },
      skip: !organizationId,
      fetchPolicy: 'cache-and-network',
    }
  );

  const entries = sortJournalEntriesByDisplayDate(data?.patientSharedJournalEntries ?? []);

  const toggleExpanded = (entryId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-8 text-center">
          <p className="text-destructive">Błąd ładowania notatek pacjenta: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="min-w-0" aria-label="Notatki pacjenta" data-testid="patient-journal-notes-card">
      <header className="mb-4">
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
          <h2 className="flex min-w-0 flex-wrap items-center gap-2 text-base font-semibold text-foreground">
            <BookHeart className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            Notatki pacjenta
            {entries.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {entries.length}
              </Badge>
            )}
          </h2>
        </div>
      </header>
      <div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-sm" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState density="inline" icon={BookHeart} title="Pacjent nie udostępnił jeszcze wpisów." />
        ) : (
          <div className="space-y-2.5">
            {entries.map((entry) => {
              const isExpanded = expandedIds.has(entry.id);
              const truncated = isJournalEntryTruncated(entry.content);
              const displayDate = resolveJournalEntryDisplayDate(entry);

              return (
                <div
                  key={entry.id}
                  className="min-w-0 rounded-sm border border-border bg-card p-3 wrap-anywhere"
                  data-testid={`patient-journal-entry-${entry.id}`}
                >
                  <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-muted">
                      <BookHeart className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {entry.title && <span className="text-sm font-semibold text-foreground">{entry.title}</span>}
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/50 bg-surface-light px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          Udostępniona
                        </span>
                      </div>

                      <p className="whitespace-pre-line text-sm text-foreground">
                        {isExpanded ? entry.content.trim() : buildJournalEntryPreview(entry.content)}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{format(displayDate, 'd MMMM yyyy', { locale: pl })}</span>
                        <span>({formatDistanceToNow(displayDate, { addSuffix: true, locale: pl })})</span>
                      </div>

                      {truncated && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(entry.id)}
                          className={cn(
                            'inline-flex min-h-11 items-center gap-1 rounded-sm text-sm font-medium text-primary',
                            'transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                          )}
                          data-testid={`patient-journal-entry-expand-${entry.id}`}
                        >
                          {isExpanded ? (
                            <>
                              Zwiń
                              <ChevronUp className="h-3.5 w-3.5" />
                            </>
                          ) : (
                            <>
                              Pokaż więcej
                              <ChevronDown className="h-3.5 w-3.5" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
