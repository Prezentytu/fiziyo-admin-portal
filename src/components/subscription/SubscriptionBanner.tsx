'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Crown,
  Dumbbell,
  Rocket,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';

type LimitType = 'patients' | 'exercises' | 'therapists';

interface SubscriptionBannerProps {
  variant: 'urgent' | 'promo';
  limitType?: LimitType;
  currentUsage?: number;
  maxLimit?: number;
  planName?: string;
}

const limitConfig: Record<LimitType, { label: string; icon: typeof Users }> = {
  patients: { label: 'pacjentów', icon: Users },
  exercises: { label: 'ćwiczeń', icon: Dumbbell },
  therapists: { label: 'terapeutów', icon: Users },
};

export function SubscriptionBanner({
  variant,
  limitType = 'patients',
  planName = 'Free',
}: SubscriptionBannerProps) {
  const config = limitConfig[limitType];

  if (variant === 'urgent') {
    return (
      <Link
        href="/subscription"
        className="group relative block rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-red-500/5 to-orange-500/10 p-4 overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:shadow-orange-500/10 hover:border-orange-500/50 cursor-pointer"
      >
        {/* Animated background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all duration-500" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-all duration-500" />

        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/20 shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                Osiągnąłeś limit {config.label}
                <Zap className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
              </p>
              <p className="text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors">
                Ulepsz plan i rozwijaj praktykę bez ograniczeń
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium shadow-lg shadow-orange-500/20 shrink-0">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ulepsz plan</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </div>
      </Link>
    );
  }

  // Promo variant - lighter, encouraging
  return (
    <Link
      href="/subscription"
      className="group relative block rounded-xl border border-violet-500/25 bg-gradient-to-r from-violet-500/10 via-indigo-500/8 to-violet-500/10 p-4 overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:shadow-violet-500/10 hover:border-violet-500/40 cursor-pointer"
    >
      {/* Animated background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-violet-500/15 rounded-full blur-2xl group-hover:bg-violet-500/25 transition-all duration-500" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-500" />

      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/20 shrink-0 group-hover:scale-110 transition-transform duration-300">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              Odkryj pełnię możliwości
              <Sparkles className="h-3.5 w-3.5 text-violet-500 group-hover:text-violet-400 transition-colors" />
            </p>
            <p className="text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors">
              {planName === 'FREE'
                ? 'Ulepsz do Pro i odblokuj więcej funkcji'
                : 'Poznaj wyższe plany i rozwijaj swoją praktykę'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-violet-500/30 text-violet-400 text-sm font-medium shrink-0 group-hover:bg-violet-500/10 group-hover:border-violet-500/50 group-hover:text-violet-300 transition-all duration-300">
          <Crown className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Zobacz plany</span>
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-300" />
        </div>
      </div>
    </Link>
  );
}
