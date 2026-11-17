'use client';

import { useState } from 'react';
import { Check, MessageSquareText, PlayCircle, Undo2, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExerciseThumbnail } from '@/components/shared/exercise/ExerciseThumbnail';
import type { ExerciseOfferDecision } from '@/graphql/types/exerciseOffer.types';
import { getMediaUrl } from '@/utils/mediaUrl';

import type { OfferView } from './utils/exerciseOffers';

interface ExerciseOfferCardProps {
  offer: OfferView;
  disabled: boolean;
  onDecide: (offer: OfferView, decision: ExerciseOfferDecision) => void;
}

export function ExerciseOfferCard({ offer, disabled, onDecide }: ExerciseOfferCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isAdopt = offer.mode === 'adopt';

  return (
    <article
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
      data-testid={`exercise-offer-card-${offer.id}`}
    >
      <div className="flex items-start gap-3">
        <ExerciseThumbnail src={getMediaUrl(offer.imageUrl)} sizeClass="h-16 w-16 shrink-0 rounded-lg" sizes="64px" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="truncate text-sm font-semibold text-foreground">{offer.exerciseName}</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={isAdopt ? 'info' : 'secondary'}>{isAdopt ? 'Do gabinetu' : 'Do recenzji'}</Badge>
            {offer.hasVideo ? (
              <Badge variant="outline" className="gap-1">
                <PlayCircle className="h-3 w-3" />
                Film
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {offer.description ? (
        <div className="flex flex-col gap-1">
          <p
            className={`whitespace-pre-line text-sm text-muted-foreground ${expanded ? '' : 'line-clamp-3'}`}
            data-testid={`exercise-offer-description-${offer.id}`}
          >
            {offer.description}
          </p>
          <Button
            variant="link"
            size="sm"
            className="h-auto self-start px-0"
            onClick={() => setExpanded((value) => !value)}
            data-testid={`exercise-offer-expand-btn-${offer.id}`}
          >
            {expanded ? 'Zwiń' : 'Pokaż cały opis'}
          </Button>
        </div>
      ) : null}

      {offer.message ? (
        <p className="flex items-start gap-2 rounded-lg bg-fill-quaternary p-2 text-xs text-muted-foreground">
          <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{offer.message}</span>
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={disabled}
          onClick={() => onDecide(offer, 'ACCEPT')}
          data-testid={`exercise-offer-accept-btn-${offer.id}`}
        >
          <Check />
          {isAdopt ? 'Dodaj do gabinetu' : 'Bez uwag'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onDecide(offer, 'REQUEST_CHANGES')}
          data-testid={`exercise-offer-changes-btn-${offer.id}`}
        >
          <Undo2 />
          Do poprawki
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() => onDecide(offer, 'REJECT')}
          data-testid={`exercise-offer-reject-btn-${offer.id}`}
        >
          <X />
          Odrzuć
        </Button>
      </div>
    </article>
  );
}
