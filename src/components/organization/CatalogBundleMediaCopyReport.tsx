'use client';

import { ChevronDown, Images } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { ExerciseBundleMediaCopy } from '@/graphql/mutations/exercises.mutations';
import { mediaCopyOutcomeLabel, summarizeMediaCopy } from '@/lib/organization/catalogBundleMediaCopy';

interface CatalogBundleMediaCopyReportProps {
  mediaCopy: ExerciseBundleMediaCopy | null | undefined;
}

export function CatalogBundleMediaCopyReport({ mediaCopy }: CatalogBundleMediaCopyReportProps) {
  const summary = summarizeMediaCopy(mediaCopy);
  if (!summary || !mediaCopy) {
    return null;
  }

  return (
    <div
      className="space-y-3 rounded-xl border border-border/50 bg-background/60 p-4"
      data-testid="settings-catalog-import-media-report"
    >
      <div className="flex items-start gap-3">
        <Images className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Kopia mediów: {summary.totalUrls} adresów</p>
          <div className="flex flex-wrap gap-2">
            {summary.counts.map((entry) => (
              <Badge key={entry.key} variant={entry.tone} data-testid={`settings-catalog-import-media-${entry.key}`}>
                {entry.label}: {entry.count}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {summary.failedItems.length > 0 ? (
        <div className="space-y-1" data-testid="settings-catalog-import-media-failed">
          <p className="text-sm text-muted-foreground">
            Te adresy zostały w rekordach bez zmian. Popraw źródło i wgraj plik ponownie.
          </p>
          <ul className="space-y-1 text-xs">
            {summary.failedItems.map((item) => (
              <li key={item.sourceUrl} className="break-all">
                <span className="text-foreground">{item.sourceUrl}</span>
                {item.reason ? <span className="text-status-danger"> · {item.reason}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="group gap-1 px-2"
            data-testid="settings-catalog-import-media-toggle"
          >
            Wszystkie adresy
            <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-xs" data-testid="settings-catalog-import-media-list">
            {mediaCopy.items.map((item) => (
              <li key={item.sourceUrl} className="break-all">
                <p className="text-foreground">{item.sourceUrl}</p>
                <p className="text-muted-foreground">
                  {mediaCopyOutcomeLabel(item.outcome)}
                  {item.targetUrl && item.targetUrl !== item.sourceUrl ? ` → ${item.targetUrl}` : null}
                  {item.reason && item.outcome !== 'FAILED' ? ` · ${item.reason}` : null}
                </p>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
