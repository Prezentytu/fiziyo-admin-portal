'use client';

import { useState } from 'react';
import { BookOpen, ClipboardCheck, Dumbbell, ShieldCheck, Sparkles, UserPlus, Wand2 } from 'lucide-react';

import { FeedbackDialog } from '@/components/shared/FeedbackDialog';
import { Button } from '@/components/ui/button';
import { isFeedbackEnabled } from '@/lib/featureFlags';
import { useChatActions } from '../ChatSessionContext';
import { useChatShellControls } from '../ChatShellControls';
import { ChatCard } from './ChatCard';
import type { CardProps } from './cardProps';

const SAMPLE_SET_PROMPT =
  'Ułóż 10-minutowy zestaw na ból lędźwi od siedzącej pracy, bez sprzętu specjalistycznego';

/**
 * Skanowalny przegląd możliwości Asystenta za 0 kredytów AI (SPEC-073 / S01):
 * dla fizjoterapeutów, którzy na starcie pytają „co potrafisz?” albo chcą najpierw poczytać.
 */
export function CapabilitiesOverviewCard({ testId }: CardProps<'ProductHelp'>) {
  const { sendMessage, appendExchange } = useChatActions();
  const { restartTour } = useChatShellControls();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <ChatCard title="W czym pomaga Fizjoasystent" testId={testId}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[12px] bg-fill-quaternary p-3">
          <p className="flex items-center gap-1.5 text-[14px] font-semibold text-foreground">
            <Dumbbell className="h-4 w-4 text-tint" aria-hidden="true" />
            Zestawy z bazy 4500+ ćwiczeń
          </p>
          <p className="mt-1 text-[13px] leading-[19px] text-label-secondary">
            Pilnuję limitu czasu, sprzętu domowego (krzesło, ściana, mata) i czerwonych flag. Każde ćwiczenie możesz od
            razu podejrzeć jak u pacjenta.
          </p>
        </div>

        <div className="rounded-[12px] bg-fill-quaternary p-3">
          <p className="flex items-center gap-1.5 text-[14px] font-semibold text-foreground">
            <ClipboardCheck className="h-4 w-4 text-tint" aria-hidden="true" />
            Pacjenci między wizytami
          </p>
          <p className="mt-1 text-[13px] leading-[19px] text-label-secondary">
            Szybka odprawa przed kontrolą: kto nie ćwiczy, przy którym ćwiczeniu był ból i co napisał pacjent. Plan
            przekażesz kodem QR, linkiem lub w PDF.
          </p>
        </div>

        <div className="rounded-[12px] bg-fill-quaternary p-3">
          <p className="flex items-center gap-1.5 text-[14px] font-semibold text-foreground">
            <Wand2 className="h-4 w-4 text-tint" aria-hidden="true" />
            Szablony, dyktowanie i dokumenty
          </p>
          <p className="mt-1 text-[13px] leading-[19px] text-label-secondary">
            Tworzę szablony gabinetu i nowe ćwiczenia. Możesz dyktować polecenia mikrofonem albo wrzucić zdjęcie lub PDF
            z zaleceniami.
          </p>
        </div>

        <div className="rounded-[12px] bg-fill-quaternary p-3">
          <p className="flex items-center gap-1.5 text-[14px] font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-tint" aria-hidden="true" />
            Czego Asystent nie zrobi bez Ciebie
          </p>
          <p className="mt-1 text-[13px] leading-[19px] text-label-secondary">
            Niczego nie zapisuję ani nie wysyłam bez Twojego kliknięcia. Nie wystawiam faktur, nie umawiam wizyt i nie
            wysyłam SMS-ów.{' '}
            {isFeedbackEnabled() && (
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                className="font-medium text-tint underline-offset-2 hover:underline"
                data-testid={`${testId}-request-feature-btn`}
              >
                Zgłoś potrzebę funkcji
              </button>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          onClick={() => sendMessage(SAMPLE_SET_PROMPT)}
          data-testid={`${testId}-try-sample-btn`}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Wypróbuj przykładowy zestaw
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            appendExchange('Dodaj pierwszego pacjenta', {
              text: 'Uzupełnij imię, nazwisko i kontakt pacjenta, a dodam go do Twojej listy.',
              spec: { component: 'AddPatient' },
            })
          }
          data-testid={`${testId}-add-patient-btn`}
        >
          <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
          Dodaj pierwszego pacjenta
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={restartTour}
          data-testid={`${testId}-start-tour-btn`}
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          Uruchom krótki samouczek
        </Button>
      </div>

      {feedbackOpen && (
        <FeedbackDialog
          isOpen
          onClose={() => setFeedbackOpen(false)}
          initialDescription="Potrzeba z czatu: "
          screenName="Czat w portalu (przegląd możliwości)"
        />
      )}
    </ChatCard>
  );
}
