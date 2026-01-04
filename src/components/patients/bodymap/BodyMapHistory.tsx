'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Minus,
  History,
  GitCompare,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import type { PainSession, AnatomicalRegionId } from '@/types/painMap';
import { ANATOMICAL_REGIONS, PAIN_INTENSITY_COLORS } from './BodyMapRegions';

interface BodyMapHistoryProps {
  sessions: PainSession[];
  currentSession?: PainSession | null;
  onSelectSession: (session: PainSession) => void;
  onCompare?: (before: PainSession, after: PainSession) => void;
  className?: string;
}

interface SessionStats {
  totalPoints: number;
  averageIntensity: number;
  maxIntensity: number;
  affectedRegions: AnatomicalRegionId[];
}

function calculateSessionStats(session: PainSession): SessionStats {
  const points = session.painPoints;
  const areas = session.painAreas;

  const allIntensities = [
    ...points.map((p) => p.intensity),
    ...areas.map((a) => a.intensity),
  ];

  const regions = new Set<AnatomicalRegionId>();
  points.forEach((p) => p.region && regions.add(p.region));
  areas.forEach((a) => regions.add(a.regionId));

  return {
    totalPoints: points.length + areas.length,
    averageIntensity:
      allIntensities.length > 0
        ? Math.round((allIntensities.reduce((a, b) => a + b, 0) / allIntensities.length) * 10) / 10
        : 0,
    maxIntensity: allIntensities.length > 0 ? Math.max(...allIntensities) : 0,
    affectedRegions: Array.from(regions),
  };
}

function calculateImprovement(before: SessionStats, after: SessionStats): number {
  if (before.averageIntensity === 0) return 0;
  return Math.round(
    ((before.averageIntensity - after.averageIntensity) / before.averageIntensity) * 100
  );
}

export function BodyMapHistory({
  sessions,
  currentSession,
  onSelectSession,
  onCompare,
  className,
}: BodyMapHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<PainSession | null>(null);

  // Sort sessions by date (newest first)
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [sessions]
  );

  // Calculate stats for each session
  const sessionStats = useMemo(
    () => new Map(sortedSessions.map((s) => [s.id, calculateSessionStats(s)])),
    [sortedSessions]
  );

  // Calculate improvement between sessions
  const improvements = useMemo(() => {
    const result = new Map<string, number>();
    for (let i = 0; i < sortedSessions.length - 1; i++) {
      const current = sessionStats.get(sortedSessions[i].id);
      const previous = sessionStats.get(sortedSessions[i + 1].id);
      if (current && previous) {
        result.set(sortedSessions[i].id, calculateImprovement(previous, current));
      }
    }
    return result;
  }, [sortedSessions, sessionStats]);

  const handleCompareClick = (session: PainSession) => {
    if (!selectedForCompare) {
      setSelectedForCompare(session);
    } else if (selectedForCompare.id === session.id) {
      setSelectedForCompare(null);
    } else {
      // Determine which is before/after based on date
      const selected = new Date(selectedForCompare.date);
      const clicked = new Date(session.date);
      if (selected < clicked) {
        onCompare?.(selectedForCompare, session);
      } else {
        onCompare?.(session, selectedForCompare);
      }
      setSelectedForCompare(null);
    }
  };

  if (sessions.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-3 rounded-xl bg-surface/50 border border-border/40 hover:bg-surface-light transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10">
              <History className="h-4 w-4 text-info" />
            </div>
            <div className="text-left">
              <span className="font-medium text-sm block">Historia sesji</span>
              <span className="text-xs text-muted-foreground">
                {sessions.length} {sessions.length === 1 ? 'sesja' : sessions.length < 5 ? 'sesje' : 'sesji'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Quick stats badge */}
            {sortedSessions.length > 1 && (
              <Badge
                variant="secondary"
                className={cn(
                  'text-xs',
                  improvements.get(sortedSessions[0].id) !== undefined &&
                    improvements.get(sortedSessions[0].id)! > 0 &&
                    'bg-primary/20 text-primary',
                  improvements.get(sortedSessions[0].id) !== undefined &&
                    improvements.get(sortedSessions[0].id)! < 0 &&
                    'bg-destructive/20 text-destructive'
                )}
              >
                {(() => {
                  const imp = improvements.get(sortedSessions[0].id);
                  if (imp === undefined) return null;
                  if (imp > 0) return `+${imp}% poprawa`;
                  if (imp < 0) return `${imp}% pogorszenie`;
                  return 'bez zmian';
                })()}
              </Badge>
            )}
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-3">
        <div className="space-y-2">
          {/* Compare mode hint */}
          {selectedForCompare && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-info/10 border border-info/20 text-sm">
              <GitCompare className="h-4 w-4 text-info" />
              <span className="text-info">
                Wybierz drugą sesję do porównania lub kliknij ponownie aby anulować
              </span>
            </div>
          )}

          {/* Sessions list */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {sortedSessions.map((session, index) => {
              const stats = sessionStats.get(session.id);
              const improvement = improvements.get(session.id);
              const isSelected = currentSession?.id === session.id;
              const isSelectedForCompare = selectedForCompare?.id === session.id;

              return (
                <div
                  key={session.id}
                  className={cn(
                    'group relative rounded-xl border p-3 transition-all cursor-pointer',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : isSelectedForCompare
                      ? 'border-info bg-info/5'
                      : 'border-border/40 bg-surface/50 hover:bg-surface-light hover:border-border'
                  )}
                  onClick={() => onSelectSession(session)}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Date and stats */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {format(new Date(session.date), 'd MMMM yyyy', { locale: pl })}
                        </span>
                        {isSelected && (
                          <Badge variant="secondary" className="text-[10px]">
                            Aktywna
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{stats?.totalPoints || 0} oznaczeń</span>
                        <span>•</span>
                        <span>
                          Śr. intensywność:{' '}
                          <span
                            className="font-medium"
                            style={{ color: PAIN_INTENSITY_COLORS[Math.round(stats?.averageIntensity || 1)].bg }}
                          >
                            {stats?.averageIntensity || 0}
                          </span>
                        </span>
                      </div>

                      {/* Affected regions preview */}
                      {stats && stats.affectedRegions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {stats.affectedRegions.slice(0, 3).map((regionId) => (
                            <Badge
                              key={regionId}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {ANATOMICAL_REGIONS[regionId]?.namePolish || regionId}
                            </Badge>
                          ))}
                          {stats.affectedRegions.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              +{stats.affectedRegions.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Improvement indicator */}
                    <div className="flex flex-col items-end gap-1">
                      {improvement !== undefined && (
                        <div
                          className={cn(
                            'flex items-center gap-1 text-xs font-medium',
                            improvement > 0 && 'text-primary',
                            improvement < 0 && 'text-destructive',
                            improvement === 0 && 'text-muted-foreground'
                          )}
                        >
                          {improvement > 0 ? (
                            <TrendingDown className="h-3.5 w-3.5" />
                          ) : improvement < 0 ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <Minus className="h-3.5 w-3.5" />
                          )}
                          <span>
                            {improvement > 0 ? `−${improvement}%` : improvement < 0 ? `+${Math.abs(improvement)}%` : '0%'}
                          </span>
                        </div>
                      )}

                      {/* Compare button */}
                      {onCompare && sessions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            'h-6 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity',
                            isSelectedForCompare && 'opacity-100 bg-info/10 text-info'
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompareClick(session);
                          }}
                        >
                          <GitCompare className="h-3 w-3 mr-1" />
                          Porównaj
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}




