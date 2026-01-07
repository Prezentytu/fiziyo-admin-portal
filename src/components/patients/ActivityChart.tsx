"use client";

import { cn } from "@/lib/utils";

interface ChartData {
  label: string;
  value: number;
  maxValue?: number;
}

interface ActivityChartProps {
  data: ChartData[];
  title?: string;
  className?: string;
  variant?: "bar" | "progress";
  showLabels?: boolean;
  color?: "primary" | "secondary" | "info";
}

export function ActivityChart({
  data,
  title,
  className,
  variant = "bar",
  showLabels = true,
  color = "primary",
}: ActivityChartProps) {
  if (data.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        Brak danych do wyświetlenia
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.maxValue || d.value), 1);

  const colorClasses = {
    primary: "bg-primary",
    secondary: "bg-secondary",
    info: "bg-info",
  };

  const bgColorClasses = {
    primary: "bg-primary/20",
    secondary: "bg-secondary/20",
    info: "bg-info/20",
  };

  if (variant === "progress") {
    return (
      <div className={cn("space-y-3", className)}>
        {title && (
          <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
        )}
        <div className="space-y-4">
          {data.map((item, index) => {
            const percentage =
              item.maxValue && item.maxValue > 0
                ? Math.round((item.value / item.maxValue) * 100)
                : 0;

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium truncate pr-2">
                    {item.label}
                  </span>
                  <span className="text-muted-foreground shrink-0">
                    {item.value}/{item.maxValue || 0} ({percentage}%)
                  </span>
                </div>
                <div
                  className={cn(
                    "h-2 rounded-full overflow-hidden",
                    bgColorClasses[color]
                  )}
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      colorClasses[color]
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Bar chart
  return (
    <div className={cn("space-y-3", className)}>
      {title && (
        <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      )}
      <div className="flex items-end gap-2 h-32">
        {data.map((item, index) => {
          const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center gap-2"
            >
              <div className="relative w-full flex items-end justify-center h-24">
                <div
                  className={cn(
                    "w-full max-w-[40px] rounded-t-lg transition-all duration-500",
                    colorClasses[color]
                  )}
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`${item.label}: ${item.value}`}
                />
                {item.value > 0 && (
                  <span className="absolute -top-5 text-xs font-semibold text-foreground">
                    {item.value}
                  </span>
                )}
              </div>
              {showLabels && (
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  {item.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Weekly activity chart
interface WeeklyChartProps {
  dayStatuses: Array<{
    day: string;
    isScheduled: boolean;
    isCompleted: boolean;
    isToday: boolean;
  }>;
  className?: string;
}

const dayLabels: Record<string, string> = {
  MONDAY: "Pn",
  TUESDAY: "Wt",
  WEDNESDAY: "Śr",
  THURSDAY: "Cz",
  FRIDAY: "Pt",
  SATURDAY: "So",
  SUNDAY: "Nd",
};

export function WeeklyActivityChart({ dayStatuses, className }: WeeklyChartProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      {dayStatuses.map((day, index) => (
        <div key={index} className="flex flex-col items-center gap-2">
          <div
            className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center text-sm font-medium transition-all",
              day.isCompleted
                ? "bg-primary text-primary-foreground"
                : day.isScheduled
                ? day.isToday
                  ? "bg-primary/30 text-primary border-2 border-primary"
                  : "bg-surface-light text-muted-foreground"
                : "bg-surface text-muted-foreground/50"
            )}
          >
            {day.isCompleted ? "✓" : dayLabels[day.day]?.[0] || "?"}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {dayLabels[day.day] || day.day}
          </span>
        </div>
      ))}
    </div>
  );
}














