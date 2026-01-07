"use client";

import { Dumbbell, Clock, TrendingUp, Star } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ExerciseStat {
  exerciseId: string;
  exerciseName: string;
  completedCount: number;
  totalSets?: number;
  totalReps?: number;
  averageRating?: number;
  lastCompleted?: string;
  type?: string;
}

interface ExerciseStatsProps {
  stats: ExerciseStat[];
  className?: string;
}

export function ExerciseStats({ stats, className }: ExerciseStatsProps) {
  if (stats.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        Brak statystyk ćwiczeń
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {stats.map((stat) => (
        <Card key={stat.exerciseId} className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-light">
                  <Dumbbell className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-medium text-foreground truncate">
                    {stat.exerciseName}
                  </h4>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {stat.completedCount}x wykonane
                    </span>
                    {stat.totalSets && stat.totalSets > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {stat.totalSets} serii
                      </span>
                    )}
                    {stat.averageRating && stat.averageRating > 0 && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                        {stat.averageRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {stat.type && (
                <Badge variant="secondary" className="shrink-0">
                  {stat.type === "time" ? "czasowe" : "powtórzenia"}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Stats summary cards
interface StatsSummaryProps {
  totalCompleted: number;
  currentStreak: number;
  averageCompletion: number;
  lastActivity?: string;
  className?: string;
}

export function StatsSummary({
  totalCompleted,
  currentStreak,
  averageCompletion,
  lastActivity,
  className,
}: StatsSummaryProps) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalCompleted}</p>
              <p className="text-xs text-muted-foreground">Wykonanych sesji</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
              <TrendingUp className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{currentStreak}</p>
              <p className="text-xs text-muted-foreground">Dni z rzędu</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
              <Star className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {averageCompletion}%
              </p>
              <p className="text-xs text-muted-foreground">Średnie ukończenie</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground truncate">
                {lastActivity || "—"}
              </p>
              <p className="text-xs text-muted-foreground">Ostatnia aktywność</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}














