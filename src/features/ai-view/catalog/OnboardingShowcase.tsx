'use client';

import { useState } from 'react';
import { BookOpen, ClipboardList, EyeOff, Eye, FlaskConical, FolderKanban, Mic, UserPlus, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAvailableExercises } from '../useAvailableExercises';
import { useChatSession } from '../ChatSessionContext';

const HIDDEN_STORAGE_KEY = 'fiziyo:chat-onboarding-hidden';

function readHiddenPreference(): boolean {
  try {
    return window.localStorage.getItem(HIDDEN_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeHiddenPreference(hidden: boolean): void {
  try {
    if (hidden) window.localStorage.setItem(HIDDEN_STORAGE_KEY, '1');
    else window.localStorage.removeItem(HIDDEN_STORAGE_KEY);
  } catch {
    // Brak storage nie blokuje działania czatu.
  }
}

interface OnboardingShowcaseProps {
  readonly disabled: boolean;
  readonly onSend: (text: string) => void;
}

const DEMO_FALLBACK_PROMPT =
  'Utwórz szablon bez pacjenta: Bezpieczna próbka — mobilizacja kręgosłupa, 8 minut, bez sprzętu specjalistycznego';

/**
 * Ekran startowy pierwszego kontaktu WOW (SPEC-073): 4 klikalne scenariusze gabinetowe,
 * przegląd funkcji + samouczek oraz bezpieczny szkic testowy „nic nie zapisuje”.
 * Power user może zwinąć podpowiedzi jednym kliknięciem (zapamiętywane w localStorage).
 */
export function OnboardingShowcase({ disabled, onSend }: OnboardingShowcaseProps) {
  const { organizationId, patients, appendExchange } = useChatSession();
  const [hidden, setHidden] = useState<boolean>(() => readHiddenPreference());
  const { exercises } = useAvailableExercises(organizationId, !hidden);

  const toggleHidden = (next: boolean) => {
    setHidden(next);
    writeHiddenPreference(next);
  };

  const hasPatients = patients.length > 0;

  const openCapabilities = () => {
    appendExchange('Co potrafi Fizjoasystent?', {
      spec: { component: 'ProductHelp', topic: 'capabilities-overview' },
    });
  };

  const startSafeDemo = () => {
    const sampleIds = exercises.slice(0, 3).map((exercise) => exercise.id);
    if (sampleIds.length > 0) {
      appendExchange('Wypróbuj na próbce (nic nie zapisuje)', {
        text: 'To bezpieczny szkic testowy — możesz pozmieniać parametry, podejrzeć ćwiczenia i sprawdzić wydruk PDF. Nic nie trafi do bazy, dopóki sam tego nie zapiszesz.',
        spec: {
          component: 'SetDraft',
          exerciseIds: sampleIds,
          note: 'Próbka testowa (nic nie zapisuje)',
        },
      });
      return;
    }
    onSend(DEMO_FALLBACK_PROMPT);
  };

  if (hidden) {
    return (
      <div className="flex justify-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => toggleHidden(false)}
          data-testid="chat-show-onboarding-btn"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          Pokaż podpowiedzi i przykłady
        </Button>
      </div>
    );
  }

  const cards = [
    {
      slug: 'between-visits',
      icon: Zap,
      title: 'Zestaw między wizytami (10 min)',
      subtitle: 'Ból lędźwi od pracy siedzącej, bez sprzętu specjalistycznego',
      onClick: () =>
        onSend('Ułóż 10-minutowy zestaw na ból lędźwi od siedzącej pracy, bez sprzętu specjalistycznego'),
    },
    {
      slug: 'dictate-notes',
      icon: Mic,
      title: 'Dyktuj albo wrzuć zalecenia',
      subtitle: 'Przykład z notatki po artroskopii — albo kliknij mikrofon / spinacz',
      onClick: () =>
        onSend(
          'Pacjent 3. tydzień po artroskopii kolana: aktywacja czworogłowego, pośladek, bez klęku i bez sprzętu specjalistycznego, max 10 minut'
        ),
    },
    hasPatients
      ? {
          slug: 'visit-briefing',
          icon: ClipboardList,
          title: 'Odprawa przed wizytą',
          subtitle: 'Kto z moich pacjentów nie ćwiczy i jakie ma aktywne plany',
          onClick: () => onSend('Pokaż, kto z moich pacjentów nie ćwiczy i jakie ma aktywne plany'),
        }
      : {
          slug: 'visit-briefing',
          icon: UserPlus,
          title: 'Dodaj pierwszego pacjenta',
          subtitle: 'Załóż kartę pacjenta, aby układać i wysyłać plany',
          onClick: () =>
            appendExchange('Dodaj pierwszego pacjenta', {
              text: 'Uzupełnij imię, nazwisko i kontakt pacjenta, a dodam go do Twojej listy.',
              spec: { component: 'AddPatient' },
            }),
        },
    {
      slug: 'clinic-template',
      icon: FolderKanban,
      title: 'Szablon gabinetowy',
      subtitle: 'Szyja i barki — przerwa biurowa, 8 minut, przy biurku',
      onClick: () =>
        onSend('Utwórz szablon bez pacjenta: Szyja i barki — przerwa biurowa, 8 minut, przy biurku'),
    },
  ];

  return (
    <section className="flex flex-col gap-3.5" aria-label="Przykładowe zastosowania" data-testid="chat-onboarding-showcase">
      <p className="text-center text-[13px] text-label-secondary" data-testid="chat-onboarding-reassurance">
        Pisz lub dyktuj własnymi słowami (także skrótami z karty) — każdą zmianę i wysyłkę zawsze zatwierdzasz
        osobiście.
      </p>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.slug}
              type="button"
              disabled={disabled}
              onClick={card.onClick}
              data-testid={`chat-starter-card-${card.slug}`}
              className="group flex items-start gap-3 rounded-[16px] border-[0.5px] border-separator bg-fill-quaternary/60 px-3.5 py-3 text-left transition-colors hover:bg-fill-quaternary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-tint-muted text-tint">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold leading-5 text-foreground">{card.title}</span>
                <span className="mt-0.5 block text-[12px] leading-[17px] text-label-secondary">{card.subtitle}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={openCapabilities}
          data-testid="chat-open-capabilities-btn"
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          Przegląd funkcji i krótki samouczek
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={startSafeDemo}
          data-testid="chat-try-safe-demo-btn"
        >
          <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
          Wypróbuj na próbce (nic nie zapisuje)
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => toggleHidden(true)}
          data-testid="chat-hide-onboarding-btn"
        >
          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
          Ukryj podpowiedzi
        </Button>
      </div>
    </section>
  );
}
