'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { BookHeart, ChevronDown, ChevronUp, Eye } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card className="rounded-none bg-transparent" data-testid="patient-journal-notes-card">
      <CardHeader className="px-0 pb-2 pt-0">
        <div className="flex min-h-11 items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Notatki pacjenta
            {entries.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {entries.length}
              </Badge>
            )}
          </CardTitle>
        </div>
        <p className="text-[13px] text-label-secondary">Wpisy, które pacjent Ci udostępnił</p>
      </CardHeader>
      <CardContent className="px-0 pb-0 pt-0">
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={BookHeart}
            title="Brak udostępnionych notatek"
            description="Pacjent nie udostępnił jeszcze żadnego wpisu ze swojego dziennika"
          />
        ) : (
          <div className="space-y-2.5">
            {entries.map((entry) => {
              const isExpanded = expandedIds.has(entry.id);
              const truncated = isJournalEntryTruncated(entry.content);
              const displayDate = resolveJournalEntryDisplayDate(entry);

              return (
                <div
                  key={entry.id}
                  className="border-t-[0.5px] border-separator py-3"
                  data-testid={`patient-journal-entry-${entry.id}`}
                >
                  <div className="grid min-w-0 grid-cols-[1fr] items-start gap-3">

                    <div className="min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        {entry.title && (
                          <span className="truncate text-sm font-semibold text-foreground">{entry.title}</span>
                        )}
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-fill-tertiary px-2 py-0.5 text-[11px] font-semibold text-label-secondary">
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
                            'inline-flex items-center gap-1 rounded-md text-xs font-medium text-secondary',
                            'transition-colors hover:text-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
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
      </CardContent>
    </Card>
  );
}
