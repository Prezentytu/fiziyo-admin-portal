"use client";

import { useState } from "react";
import {
  User,
  Users,
  Building2,
  Rocket,
  ArrowRight,
  Star,
  Shield,
  Clock,
  Sparkles,
  Crown,
  Check,
  Briefcase,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  priceYearly: number;
  icon: React.ReactNode;
  color: string;
  popular?: boolean;
  limits: {
    patients: number | null;
    therapists: number;
    clinics: number;
    exercises: number | null;
    aiCredits: number;
  };
  features: string[];
}

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Darmowy plan na start",
    price: 0,
    priceYearly: 0,
    icon: <User className="h-5 w-5" />,
    color: "from-slate-500 to-slate-600",
    limits: {
      patients: 5,
      therapists: 1,
      clinics: 1,
      exercises: 30,
      aiCredits: 50,
    },
    features: ["Podstawowe funkcje", "Wsparcie email 48h"],
  },
  {
    id: "solo",
    name: "Solo",
    description: "Dla pojedynczego fizjoterapeuty",
    price: 99,
    priceYearly: 990,
    icon: <Briefcase className="h-5 w-5" />,
    color: "from-blue-500 to-blue-600",
    limits: {
      patients: 50,
      therapists: 1,
      clinics: 1,
      exercises: null,
      aiCredits: 200,
    },
    features: ["Bez limitu ćwiczeń", "QR kody", "Raporty PDF", "Wsparcie 24h"],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Dla małego gabinetu",
    price: 219,
    priceYearly: 2190,
    icon: <Users className="h-5 w-5" />,
    color: "from-primary to-emerald-600",
    popular: true,
    limits: {
      patients: 200,
      therapists: 5,
      clinics: 3,
      exercises: null,
      aiCredits: 500,
    },
    features: ["Wszystko z Solo", "Wieloosobowy zespół", "Wiele gabinetów", "Priorytetowe wsparcie"],
  },
  {
    id: "business",
    name: "Business",
    description: "Dla dużych klinik",
    price: 399,
    priceYearly: 3990,
    icon: <Building2 className="h-5 w-5" />,
    color: "from-amber-500 to-orange-600",
    limits: {
      patients: 500,
      therapists: 20,
      clinics: 10,
      exercises: null,
      aiCredits: 2000,
    },
    features: ["Wszystko z Pro", "Własny branding", "API access", "Dedykowany opiekun"],
  },
];

interface CurrentPlan {
  id: string;
  name: string;
  usedPatients: number;
  usedTherapists: number;
  usedClinics: number;
  renewalDate?: string;
}

interface SubscriptionPlansProps {
  currentPlan?: CurrentPlan;
  onUpgrade?: (planId: string) => void;
}

export function SubscriptionPlans({
  currentPlan = {
    id: "starter",
    name: "Starter",
    usedPatients: 2,
    usedTherapists: 1,
    usedClinics: 1,
  },
  onUpgrade,
}: SubscriptionPlansProps) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  const currentPlanData = plans.find((p) => p.id === currentPlan.id) || plans[0];

  return (
    <div className="space-y-4">
      {/* Compact Header: Current Plan + Usage + Billing Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br text-white",
              currentPlanData.color
            )}
          >
            {currentPlanData.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm">
                Plan: {currentPlan.name}
              </span>
              {currentPlan.renewalDate && (
                <span className="text-xs text-muted-foreground">
                  · Odnawia się {currentPlan.renewalDate}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {currentPlan.usedPatients}/{currentPlanData.limits.patients ?? "∞"} pacjentów
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {currentPlan.usedTherapists}/{currentPlanData.limits.therapists} terapeutów
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {currentPlan.usedClinics}/{currentPlanData.limits.clinics} gabinetów
              </span>
            </div>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center gap-1 rounded-lg bg-surface p-1">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              billingPeriod === "monthly"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Miesięcznie
          </button>
          <button
            onClick={() => setBillingPeriod("yearly")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
              billingPeriod === "yearly"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Rocznie
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
              -17%
            </Badge>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan.id;
          const monthlyEquivalent =
            billingPeriod === "yearly" && plan.priceYearly > 0
              ? Math.round(plan.priceYearly / 12)
              : plan.price;
          const yearlyTotal = plan.priceYearly;
          const savings = plan.price * 12 - plan.priceYearly;

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative overflow-hidden transition-all duration-200",
                plan.popular
                  ? "border-primary shadow-lg shadow-primary/10"
                  : "border-border/60 hover:border-border",
                isCurrent && "ring-2 ring-primary/50"
              )}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-bl-lg flex items-center gap-1">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    POPULARNY
                  </div>
                </div>
              )}

              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white",
                      plan.color
                    )}
                  >
                    {plan.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    {plan.price === 0 ? (
                      <span className="text-2xl font-bold text-foreground">Darmowy</span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-foreground">
                          {monthlyEquivalent}
                        </span>
                        <span className="text-sm text-muted-foreground">zł/mies.</span>
                      </>
                    )}
                  </div>
                  {billingPeriod === "yearly" && plan.price > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      {yearlyTotal} zł/rok · oszczędzasz {savings} zł
                    </p>
                  )}
                </div>

                {/* Key Limits */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pacjenci</span>
                    <span className="font-medium text-foreground">
                      {plan.limits.patients ?? "∞"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Terapeuci</span>
                    <span className="font-medium text-foreground">{plan.limits.therapists}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Gabinety</span>
                    <span className="font-medium text-foreground">{plan.limits.clinics}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary" />
                      Kredyty AI/mies.
                    </span>
                    <span className="font-medium text-primary">{plan.limits.aiCredits}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-1.5 mb-4">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-primary shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                {isCurrent ? (
                  <Button variant="outline" size="sm" className="w-full rounded-lg" disabled>
                    <Shield className="mr-1.5 h-3.5 w-3.5" />
                    Obecny plan
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className={cn(
                      "w-full rounded-lg font-medium shadow-md transition-all",
                      plan.popular
                        ? "bg-primary hover:bg-primary-dark shadow-primary/20"
                        : `bg-gradient-to-r ${plan.color} hover:opacity-90`
                    )}
                    onClick={() => onUpgrade?.(plan.id)}
                  >
                    <Rocket className="mr-1.5 h-3.5 w-3.5" />
                    {plan.price === 0 ? "Aktywuj" : "Wybierz"}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Compact Footer: Trust + Enterprise */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
        {/* Trust Badges */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-primary" />
            Bezpieczne płatności
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            Anuluj kiedy chcesz
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-primary" />
            14 dni gwarancji
          </span>
        </div>

        {/* Enterprise Link */}
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => window.open("mailto:kontakt@fiziyo.pl?subject=Enterprise", "_blank")}
        >
          <Crown className="mr-1.5 h-3.5 w-3.5" />
          Enterprise? Skontaktuj się
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
