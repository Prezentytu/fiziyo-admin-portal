"use client";

import { MessageSquare, Settings, ThumbsUp, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TherapyStatus, TherapyStatusResult } from "@/lib/therapyStatus";

interface NextStepCardProps {
  statusResult: TherapyStatusResult;
  onSendMessage?: () => void;
  onSendPraise?: () => void;
  onEditPlan?: () => void;
  onCall?: () => void;
  className?: string;
}

const recommendationText: Record<TherapyStatus, string> = {
  success: "Wszystko idzie zgodnie z planem. Możesz pochwalić pacjenta.",
  warning: "Pacjent może potrzebować wsparcia. Rozważ kontakt.",
  alert: "Wymaga pilnej uwagi. Zalecany kontakt telefoniczny.",
};

export function NextStepCard({
  statusResult,
  onSendMessage,
  onSendPraise,
  onEditPlan,
  onCall,
  className,
}: NextStepCardProps) {
  const isSuccess = statusResult.status === 'success';
  const isAlert = statusResult.status === 'alert';

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/5 bg-zinc-900/50 p-6 flex flex-col justify-between",
        className
      )}
    >
      <div>
        <h3 className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 mb-2">
          Rekomendacja
        </h3>
        <p className="text-white font-medium text-sm">
          {recommendationText[statusResult.status]}
        </p>
      </div>
      
      <div className="mt-4 flex gap-2">
        {isSuccess ? (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 text-xs bg-zinc-800 hover:bg-zinc-700 border-zinc-700"
            onClick={onSendPraise || onSendMessage}
          >
            <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
            Wyślij &quot;Brawo&quot;
          </Button>
        ) : isAlert ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 text-xs bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400"
              onClick={onCall || onSendMessage}
            >
              <Phone className="h-3.5 w-3.5 mr-1.5" />
              Zadzwoń
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 text-xs bg-zinc-800 hover:bg-zinc-700 border-zinc-700"
              onClick={onEditPlan}
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Edytuj plan
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 text-xs bg-zinc-800 hover:bg-zinc-700 border-zinc-700"
              onClick={onSendMessage}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Napisz
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 text-xs bg-zinc-800 hover:bg-zinc-700 border-zinc-700"
              onClick={onEditPlan}
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Edytuj plan
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
