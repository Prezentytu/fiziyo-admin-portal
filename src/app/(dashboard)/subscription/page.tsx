'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Check,
  User,
  Users,
  Building2,
  Rocket,
  ArrowRight,
  Star,
  Shield,
  Clock,
  HardDrive,
  Sparkles,
  Crown,
  Calendar,
  BarChart3,
  MapPin,
  Construction,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Flag to enable/disable coming soon overlay
const COMING_SOON = false;

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
    therapists: number;
    storage: number;
  };
  features: string[];
}

const plans: Plan[] = [
  {
    id: 'solo',
    name: 'Solo',
    description: 'Dla jednego fizjoterapeuty',
    price: 99,
    priceYearly: 948,
    icon: <User className="h-6 w-6" />,
    color: 'from-slate-500 to-slate-600',
    limits: { therapists: 1, storage: 5 },
    features: ['Bez limitu pacjentów', 'Bez limitu ćwiczeń', 'Pomoc przez email'],
  },
  {
    id: 'team',
    name: 'Team',
    description: 'Dla gabinetu 2-5 osób',
    price: 249,
    priceYearly: 2388,
    icon: <Users className="h-6 w-6" />,
    color: 'from-primary to-emerald-600',
    popular: true,
    limits: { therapists: 5, storage: 25 },
    features: ['Wszystko z Solo', 'AI asystent', 'Kalendarz wizyt', 'Raporty i statystyki'],
  },
  {
    id: 'clinic',
    name: 'Clinic',
    description: 'Dla dużego gabinetu',
    price: 499,
    priceYearly: 4788,
    icon: <Building2 className="h-6 w-6" />,
    color: 'from-amber-500 to-orange-600',
    limits: { therapists: 15, storage: 100 },
    features: ['Wszystko z Team', 'Wiele gabinetów', 'Twoje logo w aplikacji', 'Osobisty opiekun'],
  },
];

// Mock current plan data - in real app this would come from API
const currentPlan = {
  id: 'solo',
  name: 'Solo',
  usedStorage: 2.4, // TODO: Pobierać z API
  usedTherapists: 1,
  renewalDate: '15 stycznia 2025',
};

export default function SubscriptionPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');

  const currentPlanData = plans.find((p) => p.id === currentPlan.id) || plans[0];
  const storagePercentage = (currentPlan.usedStorage / currentPlanData.limits.storage) * 100;

  const handleUpgrade = (planId: string) => {
    toast.info(`Przekierowanie do płatności za plan: ${planId}`);
  };

  return (
    <div className="relative">
      {/* Coming Soon Overlay */}
      {COMING_SOON && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          {/* Blur backdrop */}
          <div className="absolute inset-0 backdrop-blur-md bg-background/30" />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center gap-6 p-8 rounded-3xl bg-surface/90 border border-border/60 shadow-2xl max-w-md mx-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark shadow-lg shadow-primary/30">
              <Construction className="h-10 w-10 text-white" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Panel w przygotowaniu</h2>
              <p className="text-muted-foreground">Pracujemy nad systemem subskrypcji. Wkrótce będzie dostępny!</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 text-primary" />
              <span>Planowane uruchomienie: Q1 2025</span>
            </div>
          </div>
        </div>
      )}

      <div className={cn('space-y-6', COMING_SOON && 'select-none pointer-events-none')}>
        {/* Header: Title + Billing Toggle */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-foreground">Subskrypcja</h1>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-border/60">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                billingPeriod === 'monthly'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Miesięcznie
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                billingPeriod === 'yearly'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Rocznie
              <Badge variant="secondary" className="bg-secondary/20 text-secondary text-[10px]">
                -20%
              </Badge>
            </button>
          </div>
        </div>

        {/* Current Plan + Stats Row */}
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Current Plan Card */}
          <Card className="border-border/60 overflow-hidden lg:col-span-5">
            <div className={cn('h-1 bg-gradient-to-r', currentPlanData.color)} />
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shrink-0',
                    currentPlanData.color
                  )}
                >
                  {currentPlanData.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Plan: {currentPlan.name}</span>
                    <Badge variant="success">Aktywny</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentPlan.usedTherapists}/{currentPlanData.limits.therapists} terapeutów ·{' '}
                    {currentPlan.usedStorage}/{currentPlanData.limits.storage} GB · Odnawia się:{' '}
                    {currentPlan.renewalDate}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Storage Usage */}
          <Card className="border-border/60 lg:col-span-3">
            <CardContent className="p-5 flex flex-col h-full justify-center">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Przestrzeń
                </span>
                <span className="font-semibold text-foreground">
                  {currentPlan.usedStorage}/{currentPlanData.limits.storage} GB
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-surface-light overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    storagePercentage >= 90 ? 'bg-destructive' : storagePercentage >= 70 ? 'bg-warning' : 'bg-primary'
                  )}
                  style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Upgrade CTA */}
          {currentPlan.id !== 'clinic' && (
            <button
              onClick={() => handleUpgrade('team')}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark p-5 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 cursor-pointer lg:col-span-4"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />
              <div className="relative flex items-center gap-4 h-full">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 shrink-0">
                  <Rocket className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-white">Ulepsz do Team</h3>
                  <p className="text-sm text-white/70">AI asystent, kalendarz, raporty</p>
                </div>
                <ArrowRight className="h-5 w-5 text-white/60 group-hover:text-white transition-colors shrink-0" />
              </div>
            </button>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan.id;
            const monthlyEquivalent = billingPeriod === 'yearly' ? Math.round(plan.priceYearly / 12) : plan.price;
            const yearlyTotal = plan.priceYearly;
            const savings = plan.price * 12 - plan.priceYearly;

            return (
              <Card
                key={plan.id}
                className={cn(
                  'relative overflow-hidden transition-all duration-300',
                  plan.popular
                    ? 'border-primary shadow-xl shadow-primary/10'
                    : 'border-border/60 hover:border-border hover:shadow-lg',
                  isCurrent && 'ring-2 ring-primary/50'
                )}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      POPULARNY
                    </div>
                  </div>
                )}

                <div className={cn('h-1 bg-gradient-to-r', plan.color)} />

                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg',
                        plan.color
                      )}
                    >
                      {plan.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-foreground">{monthlyEquivalent}</span>
                      <span className="text-lg text-muted-foreground">zł/mies.</span>
                    </div>
                    {billingPeriod === 'yearly' && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {yearlyTotal} zł/rok · oszczędzasz {savings} zł
                      </p>
                    )}
                  </div>

                  {/* Key Limits */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="rounded-xl bg-surface-light p-4 text-center">
                      <p className="text-2xl font-bold text-foreground">{plan.limits.therapists}</p>
                      <p className="text-xs text-muted-foreground uppercase mt-1">terapeutów</p>
                    </div>
                    <div className="rounded-xl bg-surface-light p-4 text-center">
                      <p className="text-2xl font-bold text-foreground">{plan.limits.storage}</p>
                      <p className="text-xs text-muted-foreground uppercase mt-1">GB na pliki</p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                          <Check className="h-3 w-3" />
                        </div>
                        <span className="text-sm text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Feature Badges */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {plan.id === 'team' && (
                      <>
                        <Badge variant="outline" className="text-xs gap-1 px-2 py-1">
                          <Sparkles className="h-3 w-3" /> AI
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1 px-2 py-1">
                          <Calendar className="h-3 w-3" /> Kalendarz
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1 px-2 py-1">
                          <BarChart3 className="h-3 w-3" /> Raporty
                        </Badge>
                      </>
                    )}
                    {plan.id === 'clinic' && (
                      <>
                        <Badge variant="outline" className="text-xs gap-1 px-2 py-1">
                          <MapPin className="h-3 w-3" /> Wiele gabinetów
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1 px-2 py-1">
                          <BarChart3 className="h-3 w-3" /> Analityka
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1 px-2 py-1">
                          <Crown className="h-3 w-3" /> Opiekun
                        </Badge>
                      </>
                    )}
                  </div>

                  {/* CTA Button */}
                  {isCurrent ? (
                    <Button variant="outline" className="w-full rounded-xl h-12" disabled>
                      <Shield className="mr-2 h-4 w-4" />
                      Obecny plan
                    </Button>
                  ) : (
                    <Button
                      className={cn(
                        'w-full rounded-xl h-12 font-semibold shadow-lg',
                        plan.popular
                          ? 'bg-primary hover:bg-primary-dark shadow-primary/20'
                          : `bg-gradient-to-r ${plan.color} hover:opacity-90`
                      )}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      <Rocket className="mr-2 h-4 w-4" />
                      Wybierz {plan.name}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Bezpieczne płatności
            </span>
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Anuluj kiedy chcesz
            </span>
            <span className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              14 dni na zwrot
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => window.open('mailto:kontakt@fiziyo.pl?subject=Enterprise', '_blank')}
          >
            <Building2 className="mr-2 h-4 w-4" />
            Enterprise? Skontaktuj się
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
