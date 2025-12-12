"use client";

import { useState } from "react";
import {
  Check,
  Sparkles,
  Zap,
  Crown,
  Users,
  Dumbbell,
  FolderKanban,
  Building2,
  Rocket,
  ArrowRight,
  Star,
  TrendingUp,
  Shield,
  Clock,
  Infinity,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  priceYearly: number;
  icon: React.ReactNode;
  color: string;
  popular?: boolean;
  features: PlanFeature[];
  limits: {
    patients: number | "unlimited";
    exercises: number | "unlimited";
    sets: number | "unlimited";
    therapists: number;
  };
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Starter",
    description: "Dla początkujących",
    price: 0,
    priceYearly: 0,
    icon: <Zap className="h-6 w-6" />,
    color: "from-slate-500 to-slate-600",
    features: [
      { text: "Do 5 aktywnych pacjentów", included: true },
      { text: "50 ćwiczeń w bibliotece", included: true },
      { text: "10 zestawów ćwiczeń", included: true },
      { text: "Podstawowe raporty", included: true },
      { text: "Wsparcie email", included: true },
      { text: "Kalendarz wizyt", included: false },
      { text: "Wiele gabinetów", included: false },
      { text: "Eksport danych", included: false },
    ],
    limits: { patients: 5, exercises: 50, sets: 10, therapists: 1 },
  },
  {
    id: "pro",
    name: "Professional",
    description: "Dla praktykujących",
    price: 79,
    priceYearly: 790,
    icon: <Sparkles className="h-6 w-6" />,
    color: "from-primary to-emerald-600",
    popular: true,
    features: [
      { text: "Do 50 aktywnych pacjentów", included: true, highlight: true },
      { text: "Nielimitowane ćwiczenia", included: true, highlight: true },
      { text: "Nielimitowane zestawy", included: true },
      { text: "Zaawansowane raporty", included: true },
      { text: "Priorytetowe wsparcie", included: true },
      { text: "Kalendarz wizyt", included: true, highlight: true },
      { text: "1 dodatkowy gabinet", included: true },
      { text: "Eksport danych CSV", included: true },
    ],
    limits: { patients: 50, exercises: "unlimited", sets: "unlimited", therapists: 1 },
  },
  {
    id: "clinic",
    name: "Clinic",
    description: "Dla gabinetów",
    price: 199,
    priceYearly: 1990,
    icon: <Crown className="h-6 w-6" />,
    color: "from-amber-500 to-orange-600",
    features: [
      { text: "Nielimitowani pacjenci", included: true, highlight: true },
      { text: "Nielimitowane ćwiczenia", included: true },
      { text: "Nielimitowane zestawy", included: true },
      { text: "Pełna analityka", included: true, highlight: true },
      { text: "Dedykowany opiekun", included: true },
      { text: "Kalendarz z integracjami", included: true },
      { text: "Do 5 gabinetów", included: true, highlight: true },
      { text: "Do 10 fizjoterapeutów", included: true, highlight: true },
    ],
    limits: { patients: "unlimited", exercises: "unlimited", sets: "unlimited", therapists: 10 },
  },
];

interface CurrentPlan {
  id: string;
  name: string;
  usedPatients: number;
  usedExercises: number;
  usedSets: number;
  renewalDate?: string;
}

interface SubscriptionPlansProps {
  currentPlan?: CurrentPlan;
  onUpgrade?: (planId: string) => void;
}

export function SubscriptionPlans({
  currentPlan = {
    id: "free",
    name: "Starter",
    usedPatients: 3,
    usedExercises: 25,
    usedSets: 5,
  },
  onUpgrade,
}: SubscriptionPlansProps) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  const currentPlanData = plans.find((p) => p.id === currentPlan.id) || plans[0];
  const usagePercentage = {
    patients:
      currentPlanData.limits.patients === "unlimited"
        ? 0
        : (currentPlan.usedPatients / currentPlanData.limits.patients) * 100,
    exercises:
      currentPlanData.limits.exercises === "unlimited"
        ? 0
        : (currentPlan.usedExercises / currentPlanData.limits.exercises) * 100,
    sets:
      currentPlanData.limits.sets === "unlimited"
        ? 0
        : (currentPlan.usedSets / currentPlanData.limits.sets) * 100,
  };

  const isNearLimit = Object.values(usagePercentage).some((p) => p >= 80);

  return (
    <div className="space-y-8">
      {/* Current Plan Usage Alert */}
      {isNearLimit && currentPlan.id === "free" && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning/20">
                <TrendingUp className="h-6 w-6 text-warning" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">
                  Zbliżasz się do limitu!
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Wykorzystujesz już {Math.max(...Object.values(usagePercentage)).toFixed(0)}% 
                  swojego planu. Przejdź na wyższy plan, aby rozwijać swoją praktykę bez ograniczeń.
                </p>
                <Button
                  size="sm"
                  className="bg-warning text-warning-foreground hover:bg-warning/90 shadow-lg shadow-warning/20"
                  onClick={() => onUpgrade?.("pro")}
                >
                  <Rocket className="mr-2 h-4 w-4" />
                  Ulepsz teraz
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Plan Status */}
      <Card className="border-border/60 overflow-hidden">
        <div className={cn("h-1.5 bg-gradient-to-r", currentPlanData.color)} />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white",
                  currentPlanData.color
                )}
              >
                {currentPlanData.icon}
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Twój plan: {currentPlan.name}
                  {currentPlan.id === "free" && (
                    <Badge variant="secondary">Darmowy</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {currentPlan.renewalDate
                    ? `Odnawia się: ${currentPlan.renewalDate}`
                    : "Bezpłatny plan startowy"}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Usage bars */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Pacjenci
                </span>
                <span className="font-medium">
                  {currentPlan.usedPatients} / {currentPlanData.limits.patients === "unlimited" ? "∞" : currentPlanData.limits.patients}
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-light overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    usagePercentage.patients >= 90
                      ? "bg-destructive"
                      : usagePercentage.patients >= 70
                      ? "bg-warning"
                      : "bg-primary"
                  )}
                  style={{ width: `${Math.min(usagePercentage.patients, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Dumbbell className="h-4 w-4" />
                  Ćwiczenia
                </span>
                <span className="font-medium">
                  {currentPlan.usedExercises} / {currentPlanData.limits.exercises === "unlimited" ? "∞" : currentPlanData.limits.exercises}
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-light overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    usagePercentage.exercises >= 90
                      ? "bg-destructive"
                      : usagePercentage.exercises >= 70
                      ? "bg-warning"
                      : "bg-secondary"
                  )}
                  style={{ width: `${Math.min(usagePercentage.exercises, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <FolderKanban className="h-4 w-4" />
                  Zestawy
                </span>
                <span className="font-medium">
                  {currentPlan.usedSets} / {currentPlanData.limits.sets === "unlimited" ? "∞" : currentPlanData.limits.sets}
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-light overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    usagePercentage.sets >= 90
                      ? "bg-destructive"
                      : usagePercentage.sets >= 70
                      ? "bg-warning"
                      : "bg-info"
                  )}
                  style={{ width: `${Math.min(usagePercentage.sets, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setBillingPeriod("monthly")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-medium transition-all",
            billingPeriod === "monthly"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Miesięcznie
        </button>
        <button
          onClick={() => setBillingPeriod("yearly")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
            billingPeriod === "yearly"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Rocznie
          <Badge variant="secondary" className="bg-secondary/20 text-secondary text-[10px]">
            -17%
          </Badge>
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan.id;
          const price = billingPeriod === "yearly" ? plan.priceYearly : plan.price;
          const monthlyEquivalent = billingPeriod === "yearly" ? Math.round(plan.priceYearly / 12) : plan.price;

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative overflow-hidden transition-all duration-300",
                plan.popular
                  ? "border-primary shadow-xl shadow-primary/10 scale-105 z-10"
                  : "border-border/60 hover:border-border hover:shadow-lg",
                isCurrent && "ring-2 ring-primary/50"
              )}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-bl-xl flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    NAJPOPULARNIEJSZY
                  </div>
                </div>
              )}

              {/* Gradient top */}
              <div className={cn("h-1 bg-gradient-to-r", plan.color)} />

              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg",
                      plan.color
                    )}
                  >
                    {plan.icon}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </div>
                </div>

                {/* Price */}
                <div className="mt-4">
                  {price === 0 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-foreground">Bezpłatnie</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-foreground">{monthlyEquivalent}</span>
                      <span className="text-muted-foreground">zł/mies.</span>
                    </div>
                  )}
                  {billingPeriod === "yearly" && price > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {price} zł/rok (oszczędzasz {plan.price * 12 - plan.priceYearly} zł)
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Key limits */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-surface-light p-3 text-center">
                    <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-lg font-bold text-foreground">
                      {plan.limits.patients === "unlimited" ? (
                        <Infinity className="h-5 w-5 mx-auto" />
                      ) : (
                        plan.limits.patients
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase">Pacjentów</p>
                  </div>
                  <div className="rounded-lg bg-surface-light p-3 text-center">
                    <Building2 className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-lg font-bold text-foreground">
                      {plan.limits.therapists}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase">Terapeutów</p>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li
                      key={index}
                      className={cn(
                        "flex items-start gap-3 text-sm",
                        !feature.included && "opacity-50"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full mt-0.5",
                          feature.included
                            ? feature.highlight
                              ? "bg-primary text-primary-foreground"
                              : "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </div>
                      <span
                        className={cn(
                          feature.highlight && feature.included && "font-medium text-foreground"
                        )}
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {isCurrent ? (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl h-12"
                    disabled
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Obecny plan
                  </Button>
                ) : plan.id === "free" ? (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl h-12"
                    disabled
                  >
                    Darmowy plan
                  </Button>
                ) : (
                  <Button
                    className={cn(
                      "w-full rounded-xl h-12 font-semibold shadow-lg transition-all",
                      plan.popular
                        ? "bg-primary hover:bg-primary-dark shadow-primary/30"
                        : "bg-gradient-to-r " + plan.color + " hover:opacity-90"
                    )}
                    onClick={() => onUpgrade?.(plan.id)}
                  >
                    <Rocket className="mr-2 h-4 w-4" />
                    Wybierz {plan.name}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Trust badges */}
      <div className="flex flex-wrap items-center justify-center gap-6 pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4 text-primary" />
          <span>Bezpieczne płatności</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 text-primary" />
          <span>Anuluj w każdej chwili</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Star className="h-4 w-4 text-primary" />
          <span>14 dni gwarancji zwrotu</span>
        </div>
      </div>

      {/* Enterprise CTA */}
      <Card className="border-border/60 bg-gradient-to-br from-surface to-surface-light">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">
                  Potrzebujesz więcej?
                </h3>
                <p className="text-muted-foreground">
                  Skontaktuj się z nami w sprawie planu Enterprise dla dużych sieci klinik.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-xl px-6 shrink-0"
              onClick={() => window.open("mailto:kontakt@fiziyo.pl?subject=Enterprise", "_blank")}
            >
              Skontaktuj się
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

