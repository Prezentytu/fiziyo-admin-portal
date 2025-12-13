'use client';

import { toast } from 'sonner';

import { SubscriptionPlans } from '@/components/settings/SubscriptionPlans';

export default function SubscriptionPage() {
  const handleUpgrade = (planId: string) => {
    toast.info(`Przekierowanie do płatności za plan: ${planId}`);
    // TODO: Integracja z systemem płatności (np. Stripe)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Subskrypcja</h1>
        <p className="text-muted-foreground text-sm mt-1">Wybierz plan dopasowany do Twojej praktyki</p>
      </div>

      {/* Subscription Plans */}
      <SubscriptionPlans
        currentPlan={{
          id: 'free',
          name: 'Starter',
          usedPatients: 3,
          usedExercises: 25,
          usedSets: 5,
        }}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}
