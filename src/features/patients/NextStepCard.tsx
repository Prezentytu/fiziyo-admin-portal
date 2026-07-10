'use client';

import { MessageSquare, Settings, ThumbsUp, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TherapyStatusResult } from '@/lib/therapyStatus';

interface NextStepCardProps {
  statusResult: TherapyStatusResult;
  onSendMessage?: () => void;
  onSendPraise?: () => void;
  onEditPlan?: () => void;
  onCall?: () => void;
  className?: string;
}

export function NextStepCard({
  statusResult,
  onSendMessage,
  onSendPraise,
  onEditPlan,
  onCall,
  className,
}: Readonly<NextStepCardProps>) {
  const isLongInactivity = statusResult.reason === 'inactivity' && (statusResult.daysSinceLastActivity ?? 0) >= 7;
  const recommendationText = (() => {
    switch (statusResult.reason) {
      case 'on_track':
        return 'Pacjent działa regularnie. Utrzymaj dobre tempo i pozytywny feedback.';
      case 'inactivity':
        return isLongInactivity
          ? 'Widać dłuższą przerwę. Warto skontaktować się i sprawdzić, co blokuje regularność.'
          : 'Aktywność lekko spadła. Delikatne przypomnienie zwykle wystarcza, aby wrócić do rytmu.';
      case 'discomfort':
        return 'Pacjent zgłasza dyskomfort. Najlepiej zweryfikować plan i obciążenia.';
      case 'high_difficulty':
      case 'missed_schedule':
        return 'Warto monitorować postępy i dopasować plan, aby pacjent łatwiej utrzymał regularność.';
      default:
        return 'Monitoruj postępy pacjenta i reaguj na zmiany aktywności.';
    }
  })();

  // Dominant (primary) action gets a tinted, higher-contrast style; secondary action stays neutral/ghost
  // so there is always exactly one visual anchor per recommendation (Contrast Effect).
  const primaryButtonClass = 'flex-1 text-xs bg-primary/10 hover:bg-primary/15 border-primary/30 text-primary';
  const urgentButtonClass = 'flex-1 text-xs bg-warning/10 hover:bg-warning/20 border-warning/30 text-warning';
  const secondaryButtonClass =
    'flex-1 text-xs bg-transparent hover:bg-background/60 border-border/70 text-foreground';

  const actionButtons = (() => {
    if (statusResult.reason === 'on_track') {
      return (
        <Button
          variant="secondary"
          size="sm"
          className={cn('flex-1 text-xs bg-success/10 hover:bg-success/15 border-success/30 text-success')}
          onClick={onSendPraise || onSendMessage}
          disabled={!onSendPraise && !onSendMessage}
          data-testid="patient-next-step-message-btn"
        >
          <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
          Wyślij &quot;Brawo&quot; (wkrótce)
        </Button>
      );
    }

    if (statusResult.reason === 'inactivity' && isLongInactivity) {
      return (
        <>
          <Button
            variant="secondary"
            size="sm"
            className={urgentButtonClass}
            onClick={onCall}
            disabled={!onCall}
            aria-disabled={!onCall}
            data-testid="patient-next-step-call-btn"
          >
            <Phone className="h-3.5 w-3.5 mr-1.5" />
            Zadzwoń
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className={secondaryButtonClass}
            onClick={onEditPlan}
            disabled={!onEditPlan}
            aria-disabled={!onEditPlan}
            data-testid="patient-next-step-edit-plan-btn"
          >
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Edytuj plan
          </Button>
        </>
      );
    }

    if (statusResult.reason === 'inactivity') {
      return (
        <>
          <Button
            variant="secondary"
            size="sm"
            className={primaryButtonClass}
            onClick={onSendMessage}
            disabled={!onSendMessage}
            data-testid="patient-next-step-message-btn"
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Przypomnij (wkrótce)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className={secondaryButtonClass}
            onClick={onEditPlan}
            disabled={!onEditPlan}
            aria-disabled={!onEditPlan}
            data-testid="patient-next-step-edit-plan-btn"
          >
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Edytuj plan
          </Button>
        </>
      );
    }

    if (statusResult.reason === 'discomfort') {
      return (
        <>
          <Button
            variant="secondary"
            size="sm"
            className={urgentButtonClass}
            onClick={onCall}
            disabled={!onCall}
            aria-disabled={!onCall}
            data-testid="patient-next-step-call-btn"
          >
            <Phone className="h-3.5 w-3.5 mr-1.5" />
            Zadzwoń
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className={secondaryButtonClass}
            onClick={onEditPlan}
            disabled={!onEditPlan}
            aria-disabled={!onEditPlan}
            data-testid="patient-next-step-edit-plan-btn"
          >
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Edytuj plan
          </Button>
        </>
      );
    }

    return (
      <>
        <Button
          variant="secondary"
          size="sm"
          className={primaryButtonClass}
          onClick={onSendMessage}
          disabled={!onSendMessage}
          data-testid="patient-next-step-message-btn"
        >
          <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
          Napisz (wkrótce)
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className={secondaryButtonClass}
          onClick={onEditPlan}
          disabled={!onEditPlan}
          aria-disabled={!onEditPlan}
          data-testid="patient-next-step-edit-plan-btn"
        >
          <Settings className="h-3.5 w-3.5 mr-1.5" />
          Edytuj plan
        </Button>
      </>
    );
  })();

  return (
    <div
      className={cn(
        'rounded-xl md:rounded-2xl border border-border/60 bg-background/40 dark:bg-background/20 p-5 md:p-6 flex flex-col justify-between',
        className
      )}
    >
      <div>
        <h3 className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Rekomendacja</h3>
        <p className="text-foreground font-medium text-sm">{recommendationText}</p>
        <p className="mt-2 text-xs text-muted-foreground">Wiadomości do pacjenta będą wkrótce dostępne w panelu.</p>
      </div>

      <div className="mt-4 flex gap-2">{actionButtons}</div>
    </div>
  );
}
