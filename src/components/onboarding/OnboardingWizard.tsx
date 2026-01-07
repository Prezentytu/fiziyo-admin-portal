'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Dumbbell,
  FolderKanban,
  Send,
  CheckCircle2,
  Circle,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Lightbulb,
  BookOpen,
  Play,
  X,
  Rocket,
  PartyPopper,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Typ dla kroków onboardingu
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Users;
  action: {
    label: string;
    path: string;
  };
  tip?: string;
  completed: boolean;
}

interface OnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string;
  onComplete?: () => void;
}

const STORAGE_KEY = 'fiziyo-onboarding';

const DEFAULT_STEPS: Omit<OnboardingStep, 'completed'>[] = [
  {
    id: 'add-patient',
    title: 'Dodaj pierwszego pacjenta',
    description: 'Stwórz profil pacjenta, aby móc przypisywać mu ćwiczenia i śledzić postępy.',
    icon: Users,
    action: {
      label: 'Dodaj pacjenta',
      path: '/patients?action=add',
    },
    tip: 'Możesz również utworzyć pacjenta tymczasowego, który nie wymaga konta.',
  },
  {
    id: 'create-exercise',
    title: 'Dodaj ćwiczenie',
    description: 'Stwórz własne ćwiczenie lub skorzystaj z biblioteki gotowych ćwiczeń.',
    icon: Dumbbell,
    action: {
      label: 'Biblioteka ćwiczeń',
      path: '/exercises?action=add',
    },
    tip: 'Możesz dodawać zdjęcia, GIF-y i filmy instruktażowe do ćwiczeń.',
  },
  {
    id: 'create-set',
    title: 'Stwórz zestaw ćwiczeń',
    description: 'Połącz ćwiczenia w zestaw i ustaw harmonogram wykonywania.',
    icon: FolderKanban,
    action: {
      label: 'Utwórz zestaw',
      path: '/exercise-sets?action=add',
    },
    tip: 'Użyj AI Generatora, aby automatycznie stworzyć zestaw na podstawie diagnozy.',
  },
  {
    id: 'assign-set',
    title: 'Przypisz zestaw pacjentowi',
    description: 'Przypisz gotowy zestaw ćwiczeń do pacjenta, aby mógł go wykonywać.',
    icon: Send,
    action: {
      label: 'Przypisz zestaw',
      path: '/patients',
    },
    tip: 'Po przypisaniu pacjent otrzyma powiadomienie w aplikacji mobilnej.',
  },
];

export function OnboardingWizard({
  open,
  onOpenChange,
  userName = 'Użytkowniku',
  onComplete,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);

  // Wczytanie stanu onboardingu
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { completedSteps: string[] };
        const stepsWithStatus = DEFAULT_STEPS.map(step => ({
          ...step,
          completed: parsed.completedSteps.includes(step.id),
        }));
        setSteps(stepsWithStatus);

        // Znajdź pierwszy niezakończony krok
        const firstIncomplete = stepsWithStatus.findIndex(s => !s.completed);
        if (firstIncomplete >= 0) {
          setCurrentStep(firstIncomplete);
        }
      } catch {
        setSteps(DEFAULT_STEPS.map(s => ({ ...s, completed: false })));
      }
    } else {
      setSteps(DEFAULT_STEPS.map(s => ({ ...s, completed: false })));
    }
  }, []);

  // Zapisanie stanu
  const saveProgress = useCallback((newSteps: OnboardingStep[]) => {
    const completedSteps = newSteps.filter(s => s.completed).map(s => s.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ completedSteps }));
  }, []);

  // Oznacz krok jako zakończony
  const markStepCompleted = (stepId: string) => {
    const newSteps = steps.map(step =>
      step.id === stepId ? { ...step, completed: true } : step
    );
    setSteps(newSteps);
    saveProgress(newSteps);

    // Sprawdź czy wszystko zakończone
    if (newSteps.every(s => s.completed)) {
      setShowCelebration(true);
    } else {
      // Przejdź do następnego kroku
      const nextIncomplete = newSteps.findIndex(s => !s.completed);
      if (nextIncomplete >= 0) {
        setCurrentStep(nextIncomplete);
      }
    }
  };

  // Wykonaj akcję kroku
  const handleStepAction = (step: OnboardingStep) => {
    onOpenChange(false);
    router.push(step.action.path);

    // Symulacja zakończenia (w rzeczywistej aplikacji byłoby to wykrywane automatycznie)
    setTimeout(() => {
      markStepCompleted(step.id);
    }, 1000);
  };

  // Pomiń onboarding
  const handleSkip = () => {
    const confirmed = window.confirm('Czy na pewno chcesz pominąć tutorial? Możesz do niego wrócić później w ustawieniach.');
    if (confirmed) {
      onOpenChange(false);
      onComplete?.();
    }
  };

  // Zakończ i zamknij
  const handleFinish = () => {
    setShowCelebration(false);
    onOpenChange(false);
    onComplete?.();
    toast.success('Świetnie! Twoje konto jest gotowe do pracy.');
  };

  // Reset onboardingu
  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSteps(DEFAULT_STEPS.map(s => ({ ...s, completed: false })));
    setCurrentStep(0);
    setShowCelebration(false);
  };

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;
  const currentStepData = steps[currentStep];

  if (steps.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden" data-testid="onboarding-wizard">
        {/* Hidden title for accessibility */}
        <DialogTitle className="sr-only">
          {showCelebration ? 'Onboarding zakończony' : 'Wprowadzenie do FiziYo'}
        </DialogTitle>

        {/* Celebration screen */}
        {showCelebration ? (
          <div className="p-8 text-center space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark">
              <PartyPopper className="h-10 w-10 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                Gratulacje, {userName}! 🎉
              </h2>
              <p className="text-muted-foreground">
                Ukończyłeś wszystkie kroki wprowadzenia. Twoje konto jest w pełni skonfigurowane.
              </p>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              <Button onClick={handleFinish} size="lg" className="gap-2" data-testid="onboarding-finish-btn">
                <Rocket className="h-5 w-5" />
                Rozpocznij pracę
              </Button>
              <Button variant="ghost" onClick={handleReset} className="text-muted-foreground" data-testid="onboarding-reset-btn">
                Powtórz tutorial
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="relative border-b border-border bg-gradient-to-br from-primary/5 to-transparent p-6">
              <button
                onClick={handleSkip}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                data-testid="onboarding-skip-btn"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark shadow-lg">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    Witaj, {userName}!
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Kilka kroków, aby w pełni skonfigurować Twoje konto
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Postęp</span>
                  <span className="font-medium text-foreground">{completedCount} z {steps.length}</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Step list */}
              <div className="space-y-2">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === currentStep;
                  const isCompleted = step.completed;

                  return (
                    <button
                      key={step.id}
                      onClick={() => !isCompleted && setCurrentStep(index)}
                      data-testid={`onboarding-step-${step.id}`}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all',
                        isActive && !isCompleted
                          ? 'bg-primary/10 border-2 border-primary/30'
                          : 'bg-surface hover:bg-surface-light border border-border/60',
                        isCompleted && 'opacity-70'
                      )}
                    >
                      {/* Status indicator */}
                      <div className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                        isCompleted
                          ? 'bg-primary text-white'
                          : isActive
                            ? 'bg-primary/20 text-primary'
                            : 'bg-surface-light text-muted-foreground'
                      )}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'font-medium text-sm',
                            isCompleted
                              ? 'text-muted-foreground line-through'
                              : 'text-foreground'
                          )}>
                            {step.title}
                          </span>
                          {isActive && !isCompleted && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                              Aktualny
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {step.description}
                        </p>
                      </div>

                      {/* Arrow */}
                      {!isCompleted && (
                        <ChevronRight className={cn(
                          'h-5 w-5 shrink-0 transition-colors',
                          isActive ? 'text-primary' : 'text-muted-foreground/50'
                        )} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Current step details */}
              {currentStepData && !currentStepData.completed && (
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                        <currentStepData.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {currentStepData.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {currentStepData.description}
                        </p>
                      </div>
                    </div>

                    {/* Tip */}
                    {currentStepData.tip && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-info/10 border border-info/20">
                        <Lightbulb className="h-4 w-4 text-info shrink-0 mt-0.5" />
                        <p className="text-xs text-info">
                          {currentStepData.tip}
                        </p>
                      </div>
                    )}

                    {/* Action button */}
                    <Button
                      onClick={() => handleStepAction(currentStepData)}
                      className="w-full gap-2"
                      size="lg"
                      data-testid="onboarding-step-action-btn"
                    >
                      {currentStepData.action.label}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Quick tips */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <BookOpen className="h-4 w-4" />
                  Dokumentacja
                </button>
                <span className="text-border">•</span>
                <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Play className="h-4 w-4" />
                  Film instruktażowy
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Hook do zarządzania stanem onboardingu
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      // Nowy użytkownik - pokaż onboarding po chwili
      setIsNewUser(true);
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      try {
        const parsed = JSON.parse(saved);
        // Sprawdź czy nie ukończono wszystkich kroków
        if (parsed.completedSteps?.length < DEFAULT_STEPS.length) {
          setIsNewUser(true);
        }
      } catch {
        // Ignore
      }
    }
  }, []);

  const openOnboarding = () => setShowOnboarding(true);
  const closeOnboarding = () => setShowOnboarding(false);

  return {
    showOnboarding,
    setShowOnboarding,
    openOnboarding,
    closeOnboarding,
    isNewUser,
  };
}
