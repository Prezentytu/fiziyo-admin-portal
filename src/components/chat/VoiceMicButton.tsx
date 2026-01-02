"use client";

import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { VoiceInputState } from "@/hooks/useVoiceInput";

interface VoiceMicButtonProps {
  state: VoiceInputState;
  isSupported: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Przycisk mikrofonu do voice input
 */
export function VoiceMicButton({
  state,
  isSupported,
  onClick,
  disabled = false,
  className,
}: VoiceMicButtonProps) {
  if (!isSupported) {
    return null;
  }

  const isListening = state === "listening";
  const isProcessing = state === "processing";

  const getTooltipText = () => {
    if (isListening) return "Kliknij aby zakończyć";
    if (isProcessing) return "Przetwarzanie...";
    return "Mów do mikrofonu";
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClick}
            disabled={disabled || isProcessing}
            className={cn(
              "h-8 w-8 shrink-0 rounded-lg transition-all duration-200",
              isListening && "bg-destructive/10 text-destructive hover:bg-destructive/20",
              !isListening && !isProcessing && "text-muted-foreground hover:text-foreground hover:bg-surface-hover",
              isProcessing && "text-muted-foreground",
              className
            )}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isListening ? (
              <div className="relative">
                <MicOff className="h-4 w-4" />
                {/* Pulsing animation */}
                <span className="absolute -inset-1 animate-ping rounded-full bg-destructive/30" />
              </div>
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {getTooltipText()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

