'use client';

import { useState } from 'react';
import { CheckCheck, Gift } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import type { ExerciseOfferDecision } from '@/graphql/types/exerciseOffer.types';

import { ExerciseOfferCard } from './ExerciseOfferCard';
import { ExerciseOfferNoteDialog, type PendingDecision } from './ExerciseOfferNoteDialog';
import { useExerciseOffers } from './useExerciseOffers';
import { countAdoptable, exercisesLabel, runBatchAccept, type OfferView } from './utils/exerciseOffers';

/**
 * Offers from the FiziYo team waiting for the owner or admin. Nothing reaches the library or the therapists until
 * accepted; the panel renders nothing when there is nothing to decide.
 */
export function ExerciseOffersPanel() {
  const { offers, respond, refetch } = useExerciseOffers();
  const [pending, setPending] = useState<PendingDecision | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const adoptable = countAdoptable(offers);

  const submit = async (offer: OfferView, decision: ExerciseOfferDecision, note: string | null) => {
    setSubmitting(true);
    try {
      await respond(offer.id, decision, note);
      setPending(null);
      toast.success(
        decision === 'ACCEPT'
          ? offer.mode === 'adopt'
            ? `„${offer.exerciseName}” jest w bibliotece gabinetu.`
            : 'Zapisano ocenę bez uwag.'
          : decision === 'REQUEST_CHANGES'
            ? 'Odesłano do poprawki. Zespół FiziYo prześle nową wersję.'
            : 'Propozycja odrzucona.'
      );
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nie udało się zapisać odpowiedzi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecide = (offer: OfferView, decision: ExerciseOfferDecision) => {
    if (decision === 'ACCEPT') {
      void submit(offer, decision, null);
      return;
    }
    setPending({ offer, decision });
  };

  const handleAcceptAll = async () => {
    const ids = offers.filter((offer) => offer.mode === 'adopt').map((offer) => offer.id);
    setSubmitting(true);
    try {
      const result = await runBatchAccept(ids, (offerId) => respond(offerId, 'ACCEPT', null));
      if (result.failed === 0) {
        toast.success(`Dodano do gabinetu ${exercisesLabel(result.accepted)}.`);
      } else {
        toast.warning(`Dodano ${exercisesLabel(result.accepted)}, nie udało się: ${result.failed}.`);
      }
      await refetch();
    } finally {
      setSubmitting(false);
    }
  };

  if (offers.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4" data-testid="exercise-offers-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Gift className="mt-0.5 h-5 w-5 shrink-0 text-tint" />
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold text-foreground" data-testid="exercise-offers-title">
              Propozycje od FiziYo ({offers.length})
            </h2>
            <p className="text-sm text-muted-foreground">
              Zespół FiziYo przygotował ćwiczenia dla Twojego gabinetu. Terapeuci zobaczą je dopiero po Twojej akceptacji.
            </p>
          </div>
        </div>
        {adoptable > 1 ? (
          <Button
            variant="tinted"
            size="sm"
            disabled={submitting}
            onClick={() => void handleAcceptAll()}
            data-testid="exercise-offers-accept-all-btn"
          >
            <CheckCheck />
            Dodaj wszystkie ({adoptable})
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offers.map((offer) => (
          <ExerciseOfferCard key={offer.id} offer={offer} disabled={submitting} onDecide={handleDecide} />
        ))}
      </div>

      <ExerciseOfferNoteDialog
        pending={pending}
        isSubmitting={submitting}
        onCancel={() => setPending(null)}
        onConfirm={(note) => (pending ? submit(pending.offer, pending.decision, note) : undefined)}
      />
    </section>
  );
}
