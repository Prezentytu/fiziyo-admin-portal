"use client";

import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  AlertCircle,
  Check,
  Crown,
  Dumbbell,
  MapPin,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SubscriptionLimits {
  maxExercises?: number;
  maxPatients?: number;
  maxTherapists?: number;
  maxClinics?: number;
  allowQRCodes?: boolean;
  allowReports?: boolean;
  allowCustomBranding?: boolean;
  allowSMSReminders?: boolean;
}

interface CurrentUsage {
  exercises?: number;
  patients?: number;
  therapists?: number;
}

interface SubscriptionCardProps {
  subscriptionPlan?: string;
  expiresAt?: string;
  limits?: SubscriptionLimits;
  currentUsage?: CurrentUsage;
  isLoading?: boolean;
}

const planConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  FREE: { label: "Darmowy", color: "text-muted-foreground", icon: Sparkles },
  BASIC: { label: "Basic", color: "text-blue-500", icon: Zap },
  PRO: { label: "Pro", color: "text-primary", icon: Crown },
  ENTERPRISE: { label: "Enterprise", color: "text-amber-500", icon: Crown },
};

interface UsageBarProps {
  label: string;
  current: number;
  max: number;
  icon: React.ElementType;
}

function UsageBar({ label, current, max, icon: Icon }: UsageBarProps) {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span
          className={cn(
            "text-sm font-medium",
            isAtLimit
              ? "text-destructive"
              : isNearLimit
              ? "text-warning"
              : "text-muted-foreground"
          )}
        >
          {current} / {max}
        </span>
      </div>
      <Progress
        value={percentage}
        className={cn(
          "h-2",
          isAtLimit && "[&>div]:bg-destructive",
          isNearLimit && !isAtLimit && "[&>div]:bg-warning"
        )}
      />
    </div>
  );
}

export function SubscriptionCard({
  subscriptionPlan = "FREE",
  expiresAt,
  limits,
  currentUsage,
  isLoading = false,
}: SubscriptionCardProps) {
  const plan = planConfig[subscriptionPlan.toUpperCase()] || planConfig.FREE;
  const PlanIcon = plan.icon;

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const features = [
    { enabled: limits?.allowQRCodes, label: "Kody QR dla pacjentów" },
    { enabled: limits?.allowReports, label: "Raporty aktywności" },
    { enabled: limits?.allowCustomBranding, label: "Własne branding" },
    { enabled: limits?.allowSMSReminders, label: "Przypomnienia SMS" },
  ];

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                subscriptionPlan.toUpperCase() === "FREE"
                  ? "bg-muted"
                  : "bg-gradient-to-br from-primary/20 to-secondary/20"
              )}
            >
              <PlanIcon className={cn("h-5 w-5", plan.color)} />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Plan subskrypcji
                <Badge
                  variant={
                    subscriptionPlan.toUpperCase() === "FREE"
                      ? "secondary"
                      : "default"
                  }
                  className="gap-1"
                >
                  <PlanIcon className="h-3 w-3" />
                  {plan.label}
                </Badge>
              </CardTitle>
              <CardDescription>
                {expiresAt ? (
                  <>
                    Ważny do{" "}
                    {format(new Date(expiresAt), "d MMMM yyyy", { locale: pl })}
                  </>
                ) : subscriptionPlan.toUpperCase() === "FREE" ? (
                  "Plan bezterminowy"
                ) : (
                  "Subskrypcja aktywna"
                )}
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" className="gap-2" asChild>
            <a href="/subscription">
              <Sparkles className="h-4 w-4" />
              Zmień plan
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Usage bars */}
        {limits && currentUsage && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Wykorzystanie zasobów
            </h4>
            {limits.maxExercises && (
              <UsageBar
                label="Ćwiczenia"
                current={currentUsage.exercises || 0}
                max={limits.maxExercises}
                icon={Dumbbell}
              />
            )}
            {limits.maxPatients && (
              <UsageBar
                label="Pacjenci"
                current={currentUsage.patients || 0}
                max={limits.maxPatients}
                icon={Users}
              />
            )}
            {limits.maxTherapists && (
              <UsageBar
                label="Terapeuci"
                current={currentUsage.therapists || 0}
                max={limits.maxTherapists}
                icon={Users}
              />
            )}
            {limits.maxClinics && (
              <UsageBar
                label="Gabinety"
                current={0} // We don't have this in currentUsage yet
                max={limits.maxClinics}
                icon={MapPin}
              />
            )}
          </div>
        )}

        {/* Features */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Dostępne funkcje
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.label}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg text-sm",
                  feature.enabled
                    ? "text-foreground bg-primary/5"
                    : "text-muted-foreground bg-muted/30"
                )}
              >
                {feature.enabled ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {feature.label}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}





