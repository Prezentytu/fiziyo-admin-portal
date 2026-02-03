"use client";

import { cn } from "@/lib/utils";
import type { DayData } from "@/lib/therapyStatus";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FeelingsHeatmapProps {
  data: DayData[];
  className?: string;
}

const dayLabels = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

export function FeelingsHeatmap({ data, className }: FeelingsHeatmapProps) {
  const today = new Date().toDateString();
  
  // Podziel dane na tygodnie (7 dni na tydzień)
  const weeks: DayData[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  const getSquareStyle = (day: DayData) => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    
    // Przyszłe dni (po dzisiaj) - wyszarzone
    if (day.date > now) {
      return "bg-zinc-900/30 border-zinc-800/50 opacity-50";
    }
    
    // Przed rozpoczęciem planu - neutralne, bez alarmu
    if (day.isBeforeStart) {
      return "bg-zinc-900/30 border-zinc-800/50 opacity-40";
    }
    
    // Wykonał trening
    if (day.hasActivity) {
      // Priorytet: dyskomfort > ciężko > OK
      if (day.wellbeing === 'discomfort') {
        return "bg-red-500/20 border-red-500/50 hover:bg-red-500/30";
      }
      
      if (day.feeling === 'hard') {
        return "bg-yellow-500/20 border-yellow-500/50 hover:bg-yellow-500/30";
      }
      
      // OK/Lekko - zielony z glow effect
      return "bg-green-500/20 border-green-500/50 hover:bg-green-500/30 shadow-[0_0_10px_-2px_rgba(34,197,94,0.2)]";
    }
    
    // Nie ćwiczył
    if (day.isScheduled) {
      // Był zaplanowany ale nie ćwiczył - subtelne ostrzeżenie (nie czerwone!)
      return "bg-zinc-900/50 border-orange-500/30 hover:border-orange-500/50";
    }
    
    // Nie był zaplanowany - neutralne
    return "bg-zinc-900/50 border-zinc-800 hover:border-zinc-600";
  };

  const formatTooltip = (day: DayData) => {
    const date = day.date;
    const dateStr = `${date.getDate()}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    
    // Przyszły dzień
    if (day.date > now) {
      return day.isScheduled ? `${dateStr} - Zaplanowany` : `${dateStr}`;
    }
    
    // Przed rozpoczęciem planu
    if (day.isBeforeStart) {
      return `${dateStr} - Przed rozpoczęciem planu`;
    }
    
    if (day.hasActivity) {
      let status = '';
      if (day.wellbeing === 'discomfort') {
        status = 'Zgłoszono dyskomfort';
      } else if (day.feeling === 'hard') {
        status = 'Trening wykonany: Ciężko';
      } else if (day.feeling === 'easy') {
        status = 'Trening wykonany: Lekko';
      } else {
        status = 'Trening wykonany: OK';
      }
      
      let tooltip = `${dateStr} - ${status}`;
      if (day.notes) {
        tooltip += `\n"${day.notes}"`;
      }
      return tooltip;
    }
    
    // Nie ćwiczył
    if (day.isScheduled) {
      return `${dateStr} - Pominięty trening`;
    }
    
    return `${dateStr} - Dzień wolny`;
  };

  return (
    <div className={cn("rounded-2xl border border-white/5 bg-zinc-900/50 p-6", className)}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-white text-sm">Regularność (Ostatnie 28 dni)</h3>
        <div className="flex gap-3 text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            <span>OK</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-yellow-500" />
            <span>Ciężko</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-red-500" />
            <span>Dyskomfort</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-zinc-800 border border-zinc-700" />
            <span>Brak</span>
          </div>
        </div>
      </div>

      <TooltipProvider delayDuration={100}>
        <div className="space-y-2">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-2">
            {dayLabels.map((label) => (
              <div key={label} className="text-center text-zinc-600 text-[10px] uppercase pb-1">
                {label}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week) => (
            <div key={week[0]?.dateStr || Math.random()} className="grid grid-cols-7 gap-2">
              {week.map((day) => {
                const isToday = day.date.toDateString() === today;
                
                return (
                  <Tooltip key={day.dateStr}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "aspect-square rounded-md border transition-colors relative",
                          getSquareStyle(day)
                        )}
                      >
                        {/* Marker dla "dzisiaj" - biała kropka */}
                        {isToday && day.hasActivity && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="top" 
                      className="bg-zinc-800 border-zinc-700 text-white max-w-[200px]"
                    >
                      <p className="whitespace-pre-line text-xs">{formatTooltip(day)}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
