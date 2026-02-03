"use client";

import { cn } from "@/lib/utils";
import { formatDateWithTime, mapDifficultyToFeeling, getFeelingLabel } from "@/lib/therapyStatus";
import type { ExerciseProgressData } from "@/lib/therapyStatus";

export type EventType = 'discomfort' | 'training' | 'message' | 'inactive';

export interface JournalEvent {
  id: string;
  type: EventType;
  date: Date;
  title: string;
  description?: string;
  feeling?: string;
}

interface EventJournalProps {
  progress: ExerciseProgressData[];
  maxEvents?: number;
  className?: string;
}

const eventConfig: Record<EventType, {
  dotColor: string;
  lineColor: string;
  priority: number;
  glowEffect?: boolean;
}> = {
  discomfort: {
    dotColor: "bg-red-500",
    lineColor: "border-red-500/30",
    priority: 1,
  },
  message: {
    dotColor: "bg-blue-500",
    lineColor: "border-zinc-800",
    priority: 2,
  },
  training: {
    dotColor: "bg-green-500",
    lineColor: "border-green-500/50",
    priority: 3,
    glowEffect: true,
  },
  inactive: {
    dotColor: "bg-zinc-600",
    lineColor: "border-zinc-800",
    priority: 4,
  },
};

/**
 * Konwertuje postępy ćwiczeń na zdarzenia dziennika (z dniami bez aktywności)
 */
function progressToEvents(progress: ExerciseProgressData[], maxDays: number = 7): JournalEvent[] {
  const events: JournalEvent[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Grupuj postępy po dniu
  const byDay = new Map<string, ExerciseProgressData[]>();
  
  for (const p of progress) {
    if (!p.completedAt || p.status !== 'completed') continue;
    const dateKey = new Date(p.completedAt).toDateString();
    if (!byDay.has(dateKey)) {
      byDay.set(dateKey, []);
    }
    byDay.get(dateKey)!.push(p);
  }
  
  // Iteruj przez ostatnie N dni
  for (let i = 0; i < maxDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toDateString();
    const dayProgress = byDay.get(dateKey);
    
    if (!dayProgress || dayProgress.length === 0) {
      // Brak aktywności w tym dniu
      events.push({
        id: `inactive-${dateKey}`,
        type: 'inactive' as EventType,
        date,
        title: 'Brak aktywności',
      });
      continue;
    }
    
    // Sprawdź dyskomfort
    const discomfortEvent = dayProgress.find(p => p.painLevel && p.painLevel > 5);
    if (discomfortEvent) {
      events.push({
        id: `discomfort-${discomfortEvent.id}`,
        type: 'discomfort',
        date: new Date(discomfortEvent.completedAt!),
        title: 'Zgłoszono dyskomfort',
        description: discomfortEvent.patientNotes || undefined,
      });
      continue;
    }
    
    // Sprawdź notatki (wiadomości)
    const messageEvent = dayProgress.find(p => p.patientNotes && p.patientNotes.trim().length > 0);
    if (messageEvent) {
      const feeling = mapDifficultyToFeeling(messageEvent.difficultyLevel);
      const feelingLabel = getFeelingLabel(feeling);
      events.push({
        id: `message-${messageEvent.id}`,
        type: 'training',
        date: new Date(messageEvent.completedAt!),
        title: 'Trening wykonany',
        description: messageEvent.patientNotes || undefined,
        feeling: feelingLabel,
      });
      continue;
    }
    
    // Zwykły trening
    const firstProgress = dayProgress[0];
    const feeling = mapDifficultyToFeeling(firstProgress.difficultyLevel);
    const feelingLabel = getFeelingLabel(feeling);
    
    events.push({
      id: `training-${firstProgress.id}`,
      type: 'training',
      date: new Date(firstProgress.completedAt!),
      title: 'Trening wykonany',
      feeling: feelingLabel,
    });
  }
  
  return events;
}

export function EventJournal({ progress, maxEvents = 5, className }: EventJournalProps) {
  const events = progressToEvents(progress, maxEvents);

  if (events.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-white/5 bg-zinc-900/50 p-6", className)}>
        <h3 className="font-bold text-white mb-6">Dziennik Zdarzeń</h3>
        <p className="text-sm text-zinc-500 text-center py-8">
          Brak zdarzeń do wyświetlenia
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-white/5 bg-zinc-900/50 p-6 flex flex-col h-full", className)}>
      <h3 className="font-bold text-white mb-6">Dziennik Zdarzeń</h3>
      
      <div className="space-y-6 overflow-y-auto pr-2 flex-1">
        {events.map((event, index) => {
          const config = eventConfig[event.type];
          const isLast = index === events.length - 1;
          
          return (
            <div
              key={event.id}
              className={cn(
                "relative pl-6 border-l-2",
                isLast ? "border-zinc-800" : config.lineColor,
                !isLast && "pb-1"
              )}
            >
              {/* Dot */}
              <div
                className={cn(
                  "absolute -left-[5px] top-0 w-2 h-2 rounded-full",
                  config.dotColor,
                  config.glowEffect && "shadow-[0_0_8px_rgba(34,197,94,0.8)]"
                )}
              />
              
              {/* Content */}
              <div className="text-[10px] text-zinc-500 mb-1">
                {formatDateWithTime(event.date)}
              </div>
              <p className={cn(
                "text-sm mb-1",
                event.type === 'inactive' ? "text-zinc-400" : "text-white font-medium"
              )}>
                {event.title}
              </p>
              
              {event.description && (
                <p className="text-zinc-500 text-xs italic">
                  &ldquo;{event.description}&rdquo;
                </p>
              )}
              
              {event.feeling && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300">
                    Ocena: {event.feeling}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
