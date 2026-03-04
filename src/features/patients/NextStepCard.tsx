'use client';

import { MessageSquare, Settings, ThumbsUp, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TherapyStatus, TherapyStatusResult } from '@/lib/therapyStatus';

interface NextStepCardProps {
  statusResult: TherapyStatusResult;
  onSendMessage?: () => void;
  onSendPraise?: () => void;
  onEditPlan?: () => void;
  onCall?: () => void;
  className?: string;
}

const recommendationText: Record<TherapyStatus, string> = {
  success: 'Wszystko idzie zgodnie z planem. Możesz pochwalić pacjenta.',
  warning: 'Pacjent może potrzebować wsparcia. Rozważ kontakt.',
  alert: 'Wymaga pilnej uwagi. Zalecany kontakt telefoniczny.',
};

export function NextStepCard({
  statusResult,
  onSendMessage,
  onSendPraise,
  onEditPlan,
  onCall,
  className,
}: Readonly<NextStepCardProps>) {
  const isSuccess = statusResult.status === 'success';
  const isAlert = statusResult.status === 'alert';
  const actionButtons = (() => {
    if (isSuccess) {
      return (
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 text-xs bg-surface-elevated hover:bg-surface-light border-border text-foreground"
          onClick={onSendPraise || onSendMessage}
        >
          <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
          Wyślij &quot;Brawo&quot;
        </Button>
      );
    }

    if (isAlert) {
      return (
        <>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 text-xs bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-700 dark:text-red-300"
            onClick={onCall || onSendMessage}
          >
            <Phone className="h-3.5 w-3.5 mr-1.5" />
            Zadzwoń
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 text-xs bg-surface-elevated hover:bg-surface-light border-border text-foreground"
            onClick={onEditPlan}
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
          className="flex-1 text-xs bg-surface-elevated hover:bg-surface-light border-border text-foreground"
          onClick={onSendMessage}
        >
          <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
          Napisz
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 text-xs bg-surface-elevated hover:bg-surface-light border-border text-foreground"
          onClick={onEditPlan}
        >
          <Settings className="h-3.5 w-3.5 mr-1.5" />
          Edytuj plan
        </Button>
      </>
    );
  })();

  return (
    <div
      className={cn('rounded-2xl border border-border bg-surface dark:bg-zinc-900/50 p-6 flex flex-col justify-between', className)}
    >
      <div>
        <h3 className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Rekomendacja</h3>
        <p className="text-foreground font-medium text-sm">{recommendationText[statusResult.status]}</p>
      </div>

      <div className="mt-4 flex gap-2">{actionButtons}</div>
    </div>
  );
}
