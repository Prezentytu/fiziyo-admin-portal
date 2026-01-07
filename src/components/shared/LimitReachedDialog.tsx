'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Crown,
  Dumbbell,
  Rocket,
  Sparkles,
  Users,
  MapPin,
  X,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// ========================================
// Types
// ========================================

export type LimitType = 'patients' | 'exercises' | 'therapists' | 'clinics';

export interface LimitErrorInfo {
  type: LimitType;
  currentCount: number;
  maxLimit: number;
  plan: string;
}

interface LimitReachedDialogProps {
  open: boolean;
  onClose: () => void;
  limitInfo: LimitErrorInfo | null;
}

// ========================================
// Config
// ========================================

const limitConfig: Record<LimitType, {
  label: string;
  labelGenitive: string;
  icon: typeof Users;
  description: string;
}> = {
  patients: {
    label: 'pacjentów',
    labelGenitive: 'pacjentów',
    icon: Users,
    description: 'Ulepsz plan aby dodać więcej pacjentów i rozwijać swoją praktykę.'
  },
  exercises: {
    label: 'ćwiczeń',
    labelGenitive: 'ćwiczeń',
    icon: Dumbbell,
    description: 'Ulepsz plan aby tworzyć więcej własnych ćwiczeń.'
  },
  therapists: {
    label: 'fizjoterapeutów',
    labelGenitive: 'fizjoterapeutów',
    icon: Users,
    description: 'Ulepsz plan aby zaprosić więcej fizjoterapeutów do zespołu.'
  },
  clinics: {
    label: 'gabinetów',
    labelGenitive: 'gabinetów',
    icon: MapPin,
    description: 'Ulepsz plan aby dodać więcej gabinetów.'
  },
};

const planPricing: Record<string, { nextPlan: string; price: string }> = {
  Free: { nextPlan: 'Pro', price: '99 zł/mies' },
  Pro: { nextPlan: 'Business', price: '249 zł/mies' },
  Business: { nextPlan: 'Enterprise', price: 'Kontakt' },
};

// ========================================
// Component
// ========================================

export function LimitReachedDialog({
  open,
  onClose,
  limitInfo,
}: LimitReachedDialogProps) {
  if (!limitInfo) return null;

  const config = limitConfig[limitInfo.type] || limitConfig.patients;
  const Icon = config.icon;
  const pricing = planPricing[limitInfo.plan] || planPricing.Free;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Osiągnięto limit</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center text-center py-4">
          {/* Icon */}
          <div className="relative mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30">
              <Rocket className="h-8 w-8" />
            </div>
            <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold shadow-lg">
              !
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-foreground mb-2">
            Osiągnięto limit {config.label}
          </h2>

          {/* Stats */}
          <div className="flex items-center gap-3 mb-4 px-4 py-2 rounded-lg bg-surface-light border border-border/60">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Plan <span className="font-semibold text-foreground">{limitInfo.plan}</span>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-sm">
              <span className="font-semibold text-foreground">{limitInfo.currentCount}</span>
              <span className="text-muted-foreground"> / {limitInfo.maxLimit}</span>
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            {config.description}
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button
              asChild
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-500/20"
            >
              <Link href="/subscription" onClick={onClose}>
                <Crown className="h-4 w-4 mr-2" />
                Ulepsz do {pricing.nextPlan}
                <span className="ml-1 text-white/70 text-xs">({pricing.price})</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" onClick={onClose} className="sm:w-auto">
              Anuluj
            </Button>
          </div>

          {/* Promo hint */}
          <div className="flex items-center gap-1.5 mt-4 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-violet-500" />
            <span>14 dni gwarancji zwrotu pieniędzy</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

