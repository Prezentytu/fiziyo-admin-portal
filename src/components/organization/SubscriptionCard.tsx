"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  Crown,
  Dumbbell,
  ExternalLink,
  Flame,
  Loader2,
  MapPin,
  Rocket,
  Sparkles,
  Users,
  Zap,
  Building2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ACTIVATE_PLAN_WITH_CODE_MUTATION } from "@/graphql/mutations/organizations.mutations";
import { triggerCreditsRefresh } from "@/components/settings/AICreditsPanel";

interface SubscriptionLimits {
  maxExercises?: number;
  maxPatients?: number;
  maxTherapists?: number;
  maxClinics?: number;
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

// Plans configuration
const allPlans = [
  {
    id: "STARTER",
    name: "Starter",
    description: "Idealne na start",
    monthlyPrice: 0,
    yearlyPrice: 0,
    icon: Sparkles,
    gradient: "from-slate-500 to-slate-600",
    features: ["10 pacjentów", "1 terapeuta", "30 ćwiczeń", "1 gabinet", "50 kredytów AI"],
  },
  {
    id: "SOLO",
    name: "Solo",
    description: "Dla samodzielnych terapeutów",
    monthlyPrice: 99,
    yearlyPrice: 990,
    icon: Rocket,
    gradient: "from-primary to-emerald-600",
    features: ["50 pacjentów", "1 terapeuta", "∞ ćwiczeń", "1 gabinet", "150 kredytów AI"],
  },
  {
    id: "PRO",
    name: "Pro",
    description: "Dla rozwijających się praktyk",
    monthlyPrice: 219,
    yearlyPrice: 2190,
    icon: Zap,
    gradient: "from-orange-500 to-red-500",
    bestValue: true,
    features: ["200 pacjentów", "5 terapeutów", "∞ ćwiczeń", "3 gabinety", "400 kredytów AI"],
  },
  {
    id: "BUSINESS",
    name: "Business",
    description: "Dla klinik i sieci gabinetów",
    monthlyPrice: 399,
    yearlyPrice: 3990,
    icon: Crown,
    gradient: "from-violet-500 to-indigo-600",
    features: ["∞ pacjentów", "20 terapeutów", "∞ ćwiczeń", "10 gabinetów", "1000 kredytów AI", "Priorytetowe wsparcie"],
  },
];

const planConfig: Record<string, { label: string; icon: React.ElementType; gradient: string }> = {
  STARTER: { label: "Starter", icon: Sparkles, gradient: "from-slate-500 to-slate-600" },
  FREE: { label: "Starter", icon: Sparkles, gradient: "from-slate-500 to-slate-600" },
  SOLO: { label: "Solo", icon: Rocket, gradient: "from-primary to-emerald-600" },
  PRO: { label: "Pro", icon: Zap, gradient: "from-orange-500 to-red-500" },
  BUSINESS: { label: "Business", icon: Crown, gradient: "from-violet-500 to-indigo-600" },
};

// Usage tile component - bigger, centered display
interface UsageTileProps {
  label: string;
  current: number;
  max: number | null;
  icon: React.ElementType;
  accentClass: string;
}

function UsageTile({ label, current, max, icon: Icon, accentClass }: UsageTileProps) {
  const percentage = max ? Math.min((current / max) * 100, 100) : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;
  const isUnlimited = max === null;

  // Override color only for warnings/limits
  const valueColor = isAtLimit ? "text-destructive" : isNearLimit ? "text-warning" : accentClass;
  const barColor = isAtLimit ? "bg-destructive" : isNearLimit ? "bg-warning" : accentClass.replace("text-", "bg-");

  return (
    <div className="flex flex-col items-center justify-center p-4 text-center">
      <Icon className={cn("h-6 w-6 mb-2", valueColor)} />
      <div className="flex items-center gap-1.5 mb-1">
        <span className={cn("text-2xl font-bold tabular-nums leading-none", valueColor)}>{current}</span>
        <span className="text-lg text-muted-foreground/50 leading-none">/</span>
        {isUnlimited ? (
          <span className="text-lg text-muted-foreground/50 leading-none">∞</span>
        ) : (
          <span className="text-lg text-muted-foreground/50 tabular-nums leading-none">{max}</span>
        )}
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="h-1.5 w-full max-w-[80px] mt-2 rounded-full bg-surface-light overflow-hidden">
        <div
          className={cn("h-full rounded-full", barColor)}
          style={{ width: isUnlimited ? "100%" : `${percentage}%`, opacity: isUnlimited ? 0.2 : 1 }}
        />
      </div>
    </div>
  );
}

export function SubscriptionCard({
  organizationId,
  subscriptionPlan = "STARTER",
  limits,
  currentUsage,
  isLoading = false,
  onUpgradeSuccess,
}: SubscriptionCardProps) {
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(true);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [activationCode, setActivationCode] = useState("");

  const [activatePlanWithCode, { loading: activating }] = useMutation(ACTIVATE_PLAN_WITH_CODE_MUTATION, {
    onCompleted: () => {
      toast.success("Plan został aktywowany!");
      setIsCodeModalOpen(false);
      setIsUpgradeDialogOpen(false);
      setSelectedPlan(null);
      setActivationCode("");
      triggerCreditsRefresh(); // Odśwież widget kredytów po zmianie planu
      onUpgradeSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Nieprawidłowy kod aktywacyjny");
    },
  });

  const currentPlanKey = subscriptionPlan.toUpperCase() === "FREE" ? "STARTER" : subscriptionPlan.toUpperCase();
  const plan = planConfig[currentPlanKey] || planConfig.STARTER;
  const PlanIcon = plan.icon;
  const currentPlanData = allPlans.find(p => p.id === currentPlanKey) || allPlans[0];

  // Accent color based on plan
  const accentClass = currentPlanKey === "PRO" ? "text-orange-500"
    : currentPlanKey === "BUSINESS" ? "text-violet-500"
    : currentPlanKey === "SOLO" ? "text-primary"
    : "text-slate-400";

  const handleUpgrade = async () => {
    if (!selectedPlan) return;
    // Otwórz modal kodu aktywacyjnego zamiast płatności (Early Access)
    setIsCodeModalOpen(true);
  };

  const handleCodeSubmit = async () => {
    if (!selectedPlan || !activationCode.trim()) return;
    await activatePlanWithCode({
      variables: {
        organizationId,
        newPlan: selectedPlan,
        activationCode: activationCode.trim(),
      },
    });
  };

  if (isLoading) {
    return (
      <Card className="border-border/40 bg-surface/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="h-6 w-40" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Main Card */}
      <Card className="border-border/40 bg-surface/50 backdrop-blur-sm overflow-hidden h-full">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-4 text-lg font-semibold">
              <div className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg",
                plan.gradient
              )}>
                <PlanIcon className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-bold">Plan {plan.label}</span>
                  <Badge className={cn("bg-gradient-to-r text-white border-0", plan.gradient)}>
                    Aktywny
                  </Badge>
                  {currentPlanKey !== "STARTER" && (
                    <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0">
                      🎉 Early Access -100%
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground font-normal mt-0.5">
                  {currentPlanKey === "STARTER"
                    ? "Darmowy, bezterminowy"
                    : (
                      <span className="flex items-center gap-2">
                        <span className="line-through text-muted-foreground/50">{currentPlanData.monthlyPrice} zł/mies.</span>
                        <span className="text-emerald-500 font-semibold">0 zł</span>
                        <span className="text-muted-foreground/70">· Early Access</span>
                      </span>
                    )
                  }
                </p>
              </div>
            </CardTitle>
            <Button
              onClick={() => setIsUpgradeDialogOpen(true)}
              className={cn(
                "gap-2",
                `bg-gradient-to-r ${plan.gradient} hover:opacity-90`
              )}
            >
              <Sparkles className="h-4 w-4" />
              Zmień plan
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-6">
          {/* Usage Section - Grid tiles */}
          {currentUsage && (
            <div className="rounded-xl bg-surface-light/30 py-4">
              <div className="grid grid-cols-4 divide-x divide-border/30">
                <UsageTile label="Pacjenci" current={currentUsage.patients || 0} max={limits?.maxPatients ?? null} icon={Users} accentClass={accentClass} />
                <UsageTile label="Terapeuci" current={currentUsage.therapists || 0} max={limits?.maxTherapists ?? null} icon={Users} accentClass={accentClass} />
                <UsageTile label="Ćwiczenia" current={currentUsage.exercises || 0} max={limits?.maxExercises ?? null} icon={Dumbbell} accentClass={accentClass} />
                <UsageTile label="Gabinety" current={currentUsage.clinics || 0} max={limits?.maxClinics ?? null} icon={MapPin} accentClass={accentClass} />
              </div>
            </div>
          )}

          {/* Next plan suggestion */}
          {currentPlanKey === "STARTER" ? (
            <button
              onClick={() => setIsUpgradeDialogOpen(true)}
              className={cn(
                "w-full group rounded-xl p-4 text-left transition-all cursor-pointer",
                "bg-gradient-to-r from-primary/10 to-emerald-500/10 border border-primary/30",
                "hover:from-primary/15 hover:to-emerald-500/15 hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-600">
                  <Rocket className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Przejdź na Solo</p>
                  <p className="text-sm text-muted-foreground">Nielimitowane ćwiczenia, 50 pacjentów, 150 kredytów AI</p>
                </div>
                <ArrowRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ) : currentPlanKey === "SOLO" ? (
            <button
              onClick={() => setIsUpgradeDialogOpen(true)}
              className={cn(
                "w-full group rounded-xl p-4 text-left transition-all cursor-pointer",
                "bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30",
                "hover:from-orange-500/15 hover:to-red-500/15 hover:border-orange-500/50"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Przejdź na Pro</p>
                  <p className="text-sm text-muted-foreground">5 terapeutów, 200 pacjentów, 400 kredytów AI</p>
                </div>
                <ArrowRight className="h-5 w-5 text-orange-500 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ) : currentPlanKey === "PRO" ? (
            <button
              onClick={() => setIsUpgradeDialogOpen(true)}
              className={cn(
                "w-full group rounded-xl p-4 text-left transition-all cursor-pointer",
                "bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/30",
                "hover:from-violet-500/15 hover:to-indigo-500/15 hover:border-violet-500/50"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Przejdź na Business</p>
                  <p className="text-sm text-muted-foreground">Nielimitowani pacjenci, 20 terapeutów, 1000 kredytów AI</p>
                </div>
                <ArrowRight className="h-5 w-5 text-violet-500 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ) : null}
        </CardContent>
      </Card>

      {/* Upgrade Dialog - Larger, more readable */}
      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-5xl p-0 gap-0">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-border/60">
            <DialogHeader className="text-center space-y-2">
              <DialogTitle className="text-2xl font-bold">Wybierz plan dla swojej praktyki</DialogTitle>
              <DialogDescription className="text-base">
                Zmiana planu wchodzi w życie natychmiast
              </DialogDescription>
            </DialogHeader>

            {/* Billing toggle - Segment Control */}
            <div className="flex items-center justify-center mt-6">
              <div className="inline-flex items-center rounded-full bg-surface-light p-1.5 gap-1">
                <button
                  type="button"
                  onClick={() => setIsYearly(false)}
                  className={cn(
                    "px-5 py-2.5 text-sm font-medium rounded-full transition-all duration-300",
                    !isYearly
                      ? "bg-surface text-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Miesięcznie
                </button>
                <button
                  type="button"
                  onClick={() => setIsYearly(true)}
                  className={cn(
                    "px-5 py-2.5 text-sm font-medium rounded-full transition-all duration-300 flex items-center gap-2",
                    isYearly
                      ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Rocznie
                  <Badge className={cn(
                    "border-0 px-2 py-0.5 text-xs transition-all",
                    isYearly
                      ? "bg-white/20 text-white"
                      : "bg-orange-500/20 text-orange-500"
                  )}>
                    <Flame className="h-3 w-3 mr-0.5" />
                    -17%
                  </Badge>
                </button>
              </div>
            </div>
          </div>

          {/* Plans grid - 4 columns */}
          <div className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {allPlans.map((planOption) => {
                const PlanOptionIcon = planOption.icon;
                const isCurrentPlan = planOption.id === currentPlanKey;
                const isSelected = selectedPlan === planOption.id;
                const isBestValue = planOption.bestValue;
                const price = isYearly ? planOption.yearlyPrice : planOption.monthlyPrice;
                const monthlyEq = isYearly && price > 0 ? Math.round(price / 12) : null;
                // Calculate yearly savings
                const yearlyFullPrice = planOption.monthlyPrice * 12;
                const yearlySavings = yearlyFullPrice - planOption.yearlyPrice;

                return (
                  <button
                    key={planOption.id}
                    type="button"
                    disabled={isCurrentPlan}
                    onClick={() => setSelectedPlan(planOption.id)}
                    className={cn(
                      "group relative flex flex-col rounded-2xl border-2 p-5 text-left min-h-[440px]",
                      "transition-all duration-300",
                      "hover:-translate-y-2 hover:shadow-2xl",
                      isCurrentPlan
                        ? "border-border/60 bg-surface-light/50 opacity-60 cursor-default"
                        : isSelected
                        ? isBestValue
                          ? "border-orange-500 bg-orange-500/5 shadow-xl shadow-orange-500/20"
                          : "border-primary bg-primary/5 shadow-xl shadow-primary/20"
                        : isBestValue
                        ? "border-orange-500/50 hover:border-orange-500 hover:shadow-orange-500/10 cursor-pointer"
                        : "border-border/60 hover:border-primary/50 hover:shadow-primary/10 cursor-pointer"
                    )}
                  >
                    {/* Badges */}
                    {isBestValue && !isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                        <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-lg px-3 py-1">
                          <Flame className="h-3 w-3 mr-1" />
                          Najlepsza wartość
                        </Badge>
                      </div>
                    )}
                    {isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                        <Badge variant="secondary" className="px-3 py-1">
                          Obecny plan
                        </Badge>
                      </div>
                    )}

                    {/* Icon with hover animation */}
                    <div className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white mb-4 shadow-lg",
                      "transition-transform duration-300 group-hover:scale-110",
                      planOption.gradient
                    )}>
                      <PlanOptionIcon className="h-7 w-7" />
                    </div>

                    {/* Name */}
                    <h3 className="font-bold text-lg">{planOption.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{planOption.description}</p>

                    {/* Price section - fixed height for alignment */}
                    <div className="mb-4 min-h-[72px]">
                      {price === 0 ? (
                        <div>
                          <span className="text-3xl font-bold">Darmowy</span>
                          <p className="text-sm text-primary font-medium">Zawsze za darmo</p>
                        </div>
                      ) : isYearly ? (
                        <div>
                          {/* Yearly price with savings */}
                          <div className="flex items-baseline gap-2">
                            <span className={cn("text-3xl font-bold", isBestValue ? "text-orange-500" : "text-foreground")}>
                              {price}
                            </span>
                            <span className="text-base text-muted-foreground">zł/rok</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{monthlyEq} zł/miesiąc</p>
                          {yearlySavings > 0 && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-muted-foreground/60 line-through">{yearlyFullPrice} zł</span>
                              <Badge className={cn(
                                "text-xs px-1.5 py-0 border-0",
                                isBestValue ? "bg-orange-500/20 text-orange-500" : "bg-primary/20 text-primary"
                              )}>
                                -{yearlySavings} zł
                              </Badge>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className={cn("text-3xl font-bold", isBestValue ? "text-orange-500" : "text-foreground")}>
                              {price}
                            </span>
                            <span className="text-base text-muted-foreground">zł/mies.</span>
                          </div>
                          <p className="text-sm text-muted-foreground/60">
                            {yearlyFullPrice} zł/rok
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Features - flex-1 to push to bottom */}
                    <ul className="space-y-2 flex-1">
                      {planOption.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className={cn("h-4 w-4 shrink-0", isBestValue ? "text-orange-500" : "text-primary")} />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className={cn(
                          "h-6 w-6 rounded-full flex items-center justify-center transition-transform duration-300",
                          isBestValue ? "bg-orange-500" : "bg-primary"
                        )}>
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Enterprise */}
            <div className="mt-6 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Enterprise</p>
                  <p className="text-sm text-muted-foreground">Potrzebujesz więcej? Skontaktuj się z nami.</p>
                </div>
              </div>
              <Button variant="outline" className="gap-2 border-violet-500/50 text-violet-400 hover:bg-violet-500/10">
                Kontakt
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 pt-4 border-t border-border/60">
            <Button variant="outline" onClick={() => { setIsUpgradeDialogOpen(false); setSelectedPlan(null); }}>
              Anuluj
            </Button>
            <Button
              onClick={handleUpgrade}
              disabled={!selectedPlan}
              className={cn(
                "gap-2 min-w-[160px]",
                selectedPlan && allPlans.find(p => p.id === selectedPlan)?.bestValue
                  ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  : "bg-primary hover:bg-primary/90"
              )}
            >
              Aktywuj plan
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal kodu aktywacyjnego (Early Access) */}
      <Dialog open={isCodeModalOpen} onOpenChange={(open) => {
        setIsCodeModalOpen(open);
        if (!open) setActivationCode("");
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white",
                selectedPlan && allPlans.find(p => p.id === selectedPlan)?.gradient
              )}>
                <Zap className="h-5 w-5" />
              </div>
              Aktywuj plan {selectedPlan && allPlans.find(p => p.id === selectedPlan)?.name}
            </DialogTitle>
            <DialogDescription>
              Wpisz kod aktywacyjny, aby zmienić plan (Early Access)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Input
              placeholder="Wpisz kod aktywacyjny..."
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && activationCode.trim()) {
                  handleCodeSubmit();
                }
              }}
              className="text-center text-lg"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsCodeModalOpen(false)}>
              Anuluj
            </Button>
            <Button
              onClick={handleCodeSubmit}
              disabled={!activationCode.trim() || activating}
              className={cn(
                "gap-2",
                selectedPlan && allPlans.find(p => p.id === selectedPlan)?.bestValue
                  ? "bg-gradient-to-r from-orange-500 to-red-500"
                  : "bg-primary"
              )}
            >
              {activating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Aktywuj
                  <Check className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
