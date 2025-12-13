"use client";

import { toast } from "sonner";
import { CreditCard } from "lucide-react";

import { SubscriptionPlans } from "@/components/settings/SubscriptionPlans";

export default function SubscriptionPage() {
  const handleUpgrade = (planId: string) => {
    toast.info(`Przekierowanie do płatności za plan: ${planId}`);
    // TODO: Integracja z systemem płatności (np. Stripe)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-600 text-white shadow-lg shadow-primary/30">
          <CreditCard className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Subskrypcja</h1>
          <p className="text-muted-foreground mt-1">
            Wybierz plan dopasowany do Twojej praktyki
          </p>
        </div>
      </div>

      {/* Subscription Plans */}
      <SubscriptionPlans
        currentPlan={{
          id: "free",
          name: "Starter",
          usedPatients: 3,
          usedExercises: 25,
          usedSets: 5,
        }}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}




