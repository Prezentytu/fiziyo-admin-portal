"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type StatsVariant = "primary" | "secondary" | "info" | "warning" | "success";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  variant?: StatsVariant;
  loading?: boolean;
  description?: string;
  className?: string;
}

const variantClasses: Record<StatsVariant, string> = {
  primary: "stats-icon",
  secondary: "stats-icon-secondary",
  info: "stats-icon-info",
  warning: "stats-icon-warning",
  success: "stats-icon",
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  variant = "primary",
  loading = false,
  description,
  className,
}: StatsCardProps) {
  return (
    <Card className={cn("card-interactive", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <p className="text-3xl font-bold tracking-tight">{value}</p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={cn(variantClasses[variant])}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}




