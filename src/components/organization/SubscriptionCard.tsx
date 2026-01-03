"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertCircle,
  Building2,
  Check,
  Crown,
  Dumbbell,
  Loader2,
  MapPin,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UPDATE_SUBSCRIPTION_MUTATION } from "@/graphql/mutations/organizations.mutations";

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
  clinics?: number;
}

interface SubscriptionCardProps {
  organizationId: string;
  subscriptionPlan?: string;
  expiresAt?: string;
  limits?: SubscriptionLimits;
  currentUsage?: CurrentUsage;
  isLoading?: boolean;
  onUpgradeSuccess?: () => void;
}

// Konfiguracja 3 planów: Free, Pro, Business
const planConfig: Record<
  string,
  {
    label: string;
    color: string;
    icon: React.ElementType;
    price: number;
    priceYearly: number;
  }
> = {
  FREE: {
    label: "Darmowy",
    color: "text-muted-foreground",
    icon: Sparkles,
    price: 0,
    priceYearly: 0,
  },
  PRO: {
    label: "Pro",
    color: "text-primary",
    icon: Zap,
    price: 99,
    priceYearly: 990,
  },
  BUSINESS: {
    label: "Business",
    color: "text-amber-500",
    icon: Crown,
    price: 249,
    priceYearly: 2490,
  },
};

const allPlans = [
  {
    id: "FREE",
    name: "Darmowy",
    description: "Dla nowych użytkowników",
    price: 0,
    icon: Sparkles,
    color: "from-slate-500 to-slate-600",
    features: [
      "10 pacjentów",
      "1 fizjoterapeuta",
      "30 ćwiczeń",
      "15 zestawów",
    ],
    limits: { patients: 10, therapists: 1, exercises: 30, sets: 15 },
  },
  {
    id: "PRO",
    name: "Pro",
    description: "Dla aktywnych praktyk",
    price: 99,
    icon: Zap,
    color: "from-primary to-emerald-600",
    popular: true,
    features: [
      "100 pacjentów",
      "5 fizjoterapeutów",
      "Bez limitu ćwiczeń",
      "QR kody i raporty",
    ],
    limits: { patients: 100, therapists: 5 },
  },
  {
    id: "BUSINESS",
    name: "Business",
    description: "Dla gabinetów i klinik",
    price: 249,
    icon: Crown,
    color: "from-amber-500 to-orange-600",
    features: [
      "Bez limitu pacjentów",
      "20 fizjoterapeutów",
      "Własny branding",
      "Priorytetowe wsparcie",
    ],
    limits: { therapists: 20 },
  },
];

interface UsageBarProps {
  label: string;
  current: number;
  max: number | null;
  icon: React.ElementType;
}

function UsageBar({ label, current, max, icon: Icon }: UsageBarProps) {
  if (max === null) {
    return (
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm text-primary font-medium">
          {current} / ∞
        </span>
      </div>
    );
  }

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
  organizationId,
  subscriptionPlan = "FREE",
  expiresAt,
  limits,
  currentUsage,
  isLoading = false,
  onUpgradeSuccess,
}: SubscriptionCardProps) {
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const [updateSubscription, { loading: upgrading }] = useMutation(
    UPDATE_SUBSCRIPTION_MUTATION,
    {
      onCompleted: () => {
        toast.success("Plan został zmieniony pomyślnie!");
        setIsUpgradeDialogOpen(false);
        setSelectedPlan(null);
        onUpgradeSuccess?.();
      },
      onError: (error) => {
        toast.error(`Błąd: ${error.message}`);
      },
    }
  );

  const currentPlanKey = subscriptionPlan.toUpperCase();
  const plan = planConfig[currentPlanKey] || planConfig.FREE;
  const PlanIcon = plan.icon;

  const handleUpgrade = async () => {
    if (!selectedPlan) return;

    await updateSubscription({
      variables: {
        organizationId,
        newPlan: selectedPlan,
        expiresAt: null,
      },
    });
  };

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
    { enabled: limits?.allowReports, label: "Raporty PDF" },
    { enabled: limits?.allowCustomBranding, label: "Własny branding" },
    { enabled: limits?.allowSMSReminders, label: "Przypomnienia SMS" },
  ];

  return (
    <>
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  currentPlanKey === "FREE"
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
                    variant={currentPlanKey === "FREE" ? "secondary" : "default"}
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
                  ) : currentPlanKey === "FREE" ? (
                    "Plan bezterminowy"
                  ) : (
                    <>
                      {plan.price} PLN/miesiąc
                    </>
                  )}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsUpgradeDialogOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
              Zmień plan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage bars */}
          {currentUsage && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                Wykorzystanie zasobów
              </h4>
              <UsageBar
                label="Ćwiczenia"
                current={currentUsage.exercises || 0}
                max={limits?.maxExercises ?? null}
                icon={Dumbbell}
              />
              <UsageBar
                label="Pacjenci"
                current={currentUsage.patients || 0}
                max={limits?.maxPatients ?? null}
                icon={Users}
              />
              <UsageBar
                label="Terapeuci"
                current={currentUsage.therapists || 0}
                max={limits?.maxTherapists ?? null}
                icon={Users}
              />
              <UsageBar
                label="Gabinety"
                current={currentUsage.clinics || 0}
                max={limits?.maxClinics ?? null}
                icon={MapPin}
              />
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

      {/* Upgrade Dialog */}
      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Zmień plan subskrypcji</DialogTitle>
            <DialogDescription>
              Wybierz plan odpowiedni dla Twojej praktyki. Zmiana wchodzi w
              życie natychmiast.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 sm:grid-cols-3">
            {allPlans.map((planOption) => {
              const PlanOptionIcon = planOption.icon;
              const isCurrentPlan = planOption.id === currentPlanKey;
              const isSelected = selectedPlan === planOption.id;

              return (
                <button
                  key={planOption.id}
                  type="button"
                  disabled={isCurrentPlan}
                  onClick={() => setSelectedPlan(planOption.id)}
                  className={cn(
                    "relative flex flex-col rounded-xl border p-4 text-left transition-all",
                    isCurrentPlan
                      ? "border-primary/50 bg-primary/5 cursor-default"
                      : isSelected
                      ? "border-primary bg-primary/10 ring-2 ring-primary"
                      : "border-border hover:border-primary/50 hover:bg-surface-light cursor-pointer"
                  )}
                >
                  {planOption.popular && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground text-xs">
                        Popularne
                      </Badge>
                    </div>
                  )}

                  {isCurrentPlan && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <Badge variant="secondary" className="text-xs">
                        Obecny plan
                      </Badge>
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white mb-3",
                      planOption.color
                    )}
                  >
                    <PlanOptionIcon className="h-5 w-5" />
                  </div>

                  <h3 className="font-semibold text-foreground">
                    {planOption.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    {planOption.description}
                  </p>

                  <div className="mb-3">
                    <span className="text-2xl font-bold text-foreground">
                      {planOption.price}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {" "}
                      PLN/mies.
                    </span>
                  </div>

                  <ul className="space-y-1.5 text-xs">
                    {planOption.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-1.5 text-muted-foreground"
                      >
                        <Check className="h-3 w-3 text-primary shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsUpgradeDialogOpen(false);
                setSelectedPlan(null);
              }}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleUpgrade}
              disabled={!selectedPlan || upgrading}
              className="gap-2"
            >
              {upgrading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
              {upgrading ? "Zmieniam..." : "Zmień plan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
