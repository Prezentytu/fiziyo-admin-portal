'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { toast } from 'sonner';
import {
  Check,
  Users,
  Building2,
  Rocket,
  ArrowRight,
  Star,
  Shield,
  Clock,
  Sparkles,
  Crown,
  Zap,
  Loader2,
  Dumbbell,
  MapPin,
  FileText,
  QrCode,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { UPDATE_SUBSCRIPTION_MUTATION } from '@/graphql/mutations/organizations.mutations';
import { GET_ORGANIZATION_BY_ID_QUERY } from '@/graphql/queries/organizations.queries';
import { useOrganization } from '@/contexts/OrganizationContext';

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
    sets: number | null;
  };
  features: string[];
  badges: { icon: React.ReactNode; label: string }[];
}

const plans: Plan[] = [
  {
    id: 'FREE',
    name: 'Darmowy',
    description: 'Dla nowych użytkowników',
    price: 0,
    priceYearly: 0,
    icon: <Sparkles className="h-6 w-6" />,
    color: 'from-slate-500 to-slate-600',
    limits: {
      patients: 10,
      therapists: 1,
      clinics: 1,
      exercises: 30,
      sets: 15,
    },
    features: ['10 pacjentów', '30 własnych ćwiczeń', '15 zestawów ćwiczeń', 'Wsparcie przez email'],
    badges: [],
  },
  {
    id: 'PRO',
    name: 'Pro',
    description: 'Dla aktywnych praktyk',
    price: 99,
    priceYearly: 990,
    icon: <Zap className="h-6 w-6" />,
    color: 'from-primary to-emerald-600',
    popular: true,
    limits: {
      patients: 100,
      therapists: 5,
      clinics: 3,
      exercises: null,
      sets: null,
    },
    features: ['100 pacjentów', '5 fizjoterapeutów', 'Bez limitu ćwiczeń', 'QR kody i raporty PDF'],
    badges: [
      { icon: <QrCode className="h-3 w-3" />, label: 'QR kody' },
      { icon: <FileText className="h-3 w-3" />, label: 'Raporty PDF' },
    ],
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    description: 'Dla gabinetów i klinik',
    price: 249,
    priceYearly: 2490,
    icon: <Crown className="h-6 w-6" />,
    color: 'from-amber-500 to-orange-600',
    limits: {
      patients: null,
      therapists: 20,
      clinics: 10,
      exercises: null,
      sets: null,
    },
    features: ['Bez limitu pacjentów', '20 fizjoterapeutów', 'Własny branding (logo)', 'Priorytetowe wsparcie'],
    badges: [
      { icon: <Building2 className="h-3 w-3" />, label: 'Branding' },
      { icon: <MapPin className="h-3 w-3" />, label: '10 gabinetów' },
      { icon: <Crown className="h-3 w-3" />, label: 'Priorytet' },
    ],
  },
];

export default function SubscriptionPage() {
  const { currentOrganization } = useOrganization();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [upgradingTo, setUpgradingTo] = useState<string | null>(null);

  // Get organization ID from context (changes when user switches organization)
  const organizationId = currentOrganization?.organizationId;

  const { data, loading, refetch } = useQuery(GET_ORGANIZATION_BY_ID_QUERY, {
    variables: { id: organizationId || '' },
    skip: !organizationId,
  });

  const [updateSubscription] = useMutation(UPDATE_SUBSCRIPTION_MUTATION, {
    onCompleted: () => {
      toast.success('Plan został zmieniony pomyślnie!');
      setUpgradingTo(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
      setUpgradingTo(null);
    },
  });

  interface OrganizationData {
    organizationById?: {
      subscriptionPlan?: string;
    };
  }
  const organization = (data as OrganizationData)?.organizationById;
  const currentPlanId = organization?.subscriptionPlan?.toUpperCase() || 'FREE';
  const currentPlanData = plans.find((p) => p.id === currentPlanId) || plans[0];

  const handleUpgrade = async (planId: string) => {
    if (!organizationId) return;

    setUpgradingTo(planId);
    await updateSubscription({
      variables: {
        organizationId,
        newPlan: planId,
        expiresAt: null,
      },
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header: Title + Billing Toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subskrypcja</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Obecny plan: <span className="font-medium text-foreground">{currentPlanData.name}</span>
          </p>
        </div>
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
            <Badge className="bg-background text-primary border-0 text-[10px] font-bold px-1.5">
              -15%
            </Badge>
          </button>
        </div>
      </div>

      {/* Current Plan Summary */}
      <Card className="border-border/60 overflow-hidden">
        <div className={cn('h-1 bg-gradient-to-r', currentPlanData.color)} />
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shrink-0',
                currentPlanData.color
              )}
            >
              {currentPlanData.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">Plan: {currentPlanData.name}</span>
                <Badge variant="success">Aktywny</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {currentPlanData.limits.patients ? `${currentPlanData.limits.patients} pacjentów` : '∞ pacjentów'}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {currentPlanData.limits.therapists} terapeutów
                </span>
                <span className="flex items-center gap-1">
                  <Dumbbell className="h-3.5 w-3.5" />
                  {currentPlanData.limits.exercises ? `${currentPlanData.limits.exercises} ćwiczeń` : '∞ ćwiczeń'}
                </span>
              </div>
            </div>
            {currentPlanId !== 'BUSINESS' && (
              <Button
                onClick={() => handleUpgrade(currentPlanId === 'FREE' ? 'PRO' : 'BUSINESS')}
                disabled={upgradingTo !== null}
                className="gap-2"
              >
                {upgradingTo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                Ulepsz plan
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plans Grid */}
      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isUpgrading = upgradingTo === plan.id;
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
                <div className="mb-6 min-h-[72px]">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">{monthlyEquivalent}</span>
                    <span className="text-lg text-muted-foreground">PLN/mies.</span>
                  </div>
                  {plan.price === 0 ? (
                    <p className="text-sm text-primary mt-1 font-medium">Bezpłatnie na zawsze</p>
                  ) : billingPeriod === 'yearly' ? (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-sm text-muted-foreground">{yearlyTotal} PLN/rok</p>
                      <p className="text-sm font-medium text-primary">
                        Oszczędzasz {savings} PLN rocznie
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      lub <span className="font-medium text-primary">{Math.round(plan.priceYearly / 12)} PLN/mies.</span> rocznie
                    </p>
                  )}
                </div>

                {/* Key Limits */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="rounded-xl bg-surface-light p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{plan.limits.patients ?? '∞'}</p>
                    <p className="text-xs text-muted-foreground uppercase mt-1">pacjentów</p>
                  </div>
                  <div className="rounded-xl bg-surface-light p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{plan.limits.therapists}</p>
                    <p className="text-xs text-muted-foreground uppercase mt-1">terapeutów</p>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="text-sm text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Feature Badges */}
                {plan.badges.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {plan.badges.map((badge) => (
                      <Badge key={badge.label} variant="outline" className="text-xs gap-1 px-2 py-1">
                        {badge.icon} {badge.label}
                      </Badge>
                    ))}
                  </div>
                )}

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
                    disabled={isUpgrading}
                  >
                    {isUpgrading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Rocket className="mr-2 h-4 w-4" />
                    )}
                    {isUpgrading ? 'Zmieniam...' : `Wybierz ${plan.name}`}
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
          Większy zespół? Skontaktuj się
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
