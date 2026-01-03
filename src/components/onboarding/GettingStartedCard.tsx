'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import {
  Users,
  FolderKanban,
  Send,
  CheckCircle2,
  ChevronRight,
  X,
  Check,
  ArrowRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Typy
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Users;
  path: string;
  completed: boolean;
}

interface GettingStartedCardProps {
  patientsCount: number;
  exerciseSetsCount: number;
  assignmentsCount: number;
  className?: string;
}

export function GettingStartedCard({
  patientsCount,
  exerciseSetsCount,
  assignmentsCount,
  className,
}: GettingStartedCardProps) {
  const { user } = useUser();
  const router = useRouter();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationShown, setCelebrationShown] = useState(false);
  const prevCompletedRef = useRef<number>(0);

  // Sprawdź czy onboarding został ukryty (z Clerk metadata)
  useEffect(() => {
    if (user) {
      const metadata = user.unsafeMetadata as {
        onboardingDismissed?: boolean;
        onboardingCompletedAt?: string;
      } | undefined;

      if (metadata?.onboardingDismissed) {
        setIsDismissed(true);
      }
      if (metadata?.onboardingCompletedAt) {
        setCelebrationShown(true);
      }
      setIsLoading(false);
    }
  }, [user]);

  // Kroki - auto-complete na podstawie danych
  const steps: OnboardingStep[] = [
    {
      id: 'patient',
      title: 'Dodaj pierwszego pacjenta',
      description: 'Stwórz profil pacjenta',
      icon: Users,
      path: '/patients',
      completed: patientsCount > 0,
    },
    {
      id: 'set',
      title: 'Stwórz zestaw ćwiczeń',
      description: 'Połącz ćwiczenia w program',
      icon: FolderKanban,
      path: '/exercise-sets',
      completed: exerciseSetsCount > 0,
    },
    {
      id: 'assign',
      title: 'Przypisz zestaw pacjentowi',
      description: 'Wyślij program do pacjenta',
      icon: Send,
      path: '/patients',
      completed: assignmentsCount > 0,
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;
  const allCompleted = completedCount === steps.length;

  // Wykryj ukończenie kroku - subtelne powiadomienie
  useEffect(() => {
    if (completedCount > prevCompletedRef.current && completedCount < steps.length) {
      toast.success('Krok ukończony');
    }
    prevCompletedRef.current = completedCount;
  }, [completedCount, steps.length]);

  // Pokaż ekran sukcesu gdy wszystko ukończone
  useEffect(() => {
    if (allCompleted && !celebrationShown && !isDismissed && user) {
      setShowCelebration(true);

      // Zapisz do Clerk metadata
      const metadata = user.unsafeMetadata as Record<string, unknown> | undefined;
      user.update({
        unsafeMetadata: {
          ...metadata,
          onboardingCompletedAt: new Date().toISOString(),
        },
      });
    }
  }, [allCompleted, celebrationShown, isDismissed, user]);

  // Ukryj onboarding na zawsze
  const handleDismiss = async () => {
    if (!user) return;

    try {
      const metadata = user.unsafeMetadata as Record<string, unknown> | undefined;
      await user.update({
        unsafeMetadata: {
          ...metadata,
          onboardingDismissed: true,
        },
      });
      setIsDismissed(true);
    } catch (error) {
      console.error('Błąd podczas ukrywania onboardingu:', error);
    }
  };

  // Zamknij celebrację
  const handleCloseCelebration = async () => {
    setShowCelebration(false);
    setCelebrationShown(true);
    setIsDismissed(true);

    if (user) {
      const metadata = user.unsafeMetadata as Record<string, unknown> | undefined;
      await user.update({
        unsafeMetadata: {
          ...metadata,
          onboardingDismissed: true,
        },
      });
    }
  };

  // Przejdź do kroku
  const handleStepClick = (step: OnboardingStep) => {
    if (!step.completed) {
      router.push(step.path);
    }
  };

  // Nie pokazuj jeśli ukryty lub loading
  if (isLoading || isDismissed) {
    return null;
  }

  // Ekran sukcesu - profesjonalny i stonowany
  if (showCelebration) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/5 to-surface',
          className
        )}
      >
        <div className="relative p-5 sm:p-6">
          <div className="flex items-center gap-4">
            {/* Success icon */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Check className="h-6 w-6 text-primary" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-foreground">
                Konto skonfigurowane
              </h3>
              <p className="text-sm text-muted-foreground">
                Wszystko gotowe. Możesz teraz w pełni korzystać z aplikacji.
              </p>
            </div>

            {/* Action */}
            <Button
              onClick={handleCloseCelebration}
              size="sm"
              variant="ghost"
              className="shrink-0 gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
            >
              Zamknij
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Nie pokazuj jeśli wszystko ukończone (po celebracji)
  if (allCompleted) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-surface to-surface',
        className
      )}
    >
      {/* Decorative glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-secondary/10 rounded-full blur-3xl" />

      <div className="relative p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Rozpocznij pracę
              </h3>
              <p className="text-sm text-muted-foreground">
                3 kroki do pełnej konfiguracji
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-light transition-colors"
            title="Nie pokazuj więcej"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted-foreground">Postęp</span>
            <span className="font-medium text-primary">{completedCount} z {steps.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = step.completed;
            const isNext = !isCompleted && steps.slice(0, index).every(s => s.completed);

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step)}
                disabled={isCompleted}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200',
                  isCompleted
                    ? 'bg-primary/5 cursor-default'
                    : isNext
                      ? 'bg-surface-light hover:bg-surface-hover border border-primary/30 cursor-pointer'
                      : 'bg-surface/50 hover:bg-surface-light cursor-pointer'
                )}
              >
                {/* Status icon */}
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                  isCompleted
                    ? 'bg-primary text-white'
                    : isNext
                      ? 'bg-primary/20 text-primary'
                      : 'bg-surface-light text-muted-foreground'
                )}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    'text-sm font-medium block',
                    isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
                  )}>
                    {step.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {step.description}
                  </span>
                </div>

                {/* Arrow */}
                {!isCompleted && (
                  <ChevronRight className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    isNext ? 'text-primary' : 'text-muted-foreground/50'
                  )} />
                )}
              </button>
            );
          })}
        </div>

        {/* Almost done message */}
        {completedCount === 2 && (
          <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              Ostatni krok do pełnej konfiguracji
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
