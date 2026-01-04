'use client';

import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useVoiceInput, type VoiceInputState } from '@/hooks/useVoiceInput';
import type { VoiceParseResponse } from '@/types/ai.types';

interface ExerciseVoiceInputProps {
  onResult: (parsed: VoiceParseResponse | null, rawText: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Komponent przycisku mikrofonu do voice input dla ćwiczeń
 * Używa hooka useVoiceInput i zwraca sparsowany wynik
 */
export function ExerciseVoiceInput({
  onResult,
  disabled = false,
  className,
}: ExerciseVoiceInputProps) {
  const {
    state,
    isSupported,
    interimTranscript,
    finalTranscript,
    error,
    toggleListening,
  } = useVoiceInput({
    language: 'pl-PL',
    autoSend: true,
    silenceTimeout: 2000,
    onSend: (text) => {
      // Pass raw text to parent - parsing will be done there
      onResult(null, text);
    },
  });

  if (!isSupported) {
    return null;
  }

  const isListening = state === 'listening';
  const isProcessing = state === 'processing';

  const getTooltipText = () => {
    if (isListening) return 'Kliknij aby zakończyć nagrywanie';
    if (isProcessing) return 'Przetwarzanie...';
    return 'Podyktuj ćwiczenie';
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleListening}
              disabled={disabled || isProcessing}
              className={cn(
                "h-10 w-10 rounded-lg transition-all duration-200",
                isListening && "bg-destructive/10 text-destructive",
                !isListening && !isProcessing && "text-muted-foreground hover:text-foreground hover:bg-surface-hover",
                isProcessing && "text-muted-foreground",
                className
              )}
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isListening ? (
                <div className="relative">
                  <MicOff className="h-5 w-5" />
                  {/* Pulsing rings */}
                  <span className="absolute -inset-2 animate-ping rounded-full bg-destructive/30" />
                  <span className="absolute -inset-3 animate-mic-pulse rounded-full bg-destructive/20" style={{ animationDelay: '0.5s' }} />
                </div>
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {getTooltipText()}
          </TooltipContent>
        </Tooltip>

        {/* Voice feedback */}
        {isListening && (
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-200">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
              </span>
              {interimTranscript || 'Słucham...'}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-200">
            <div className="px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs">
              {error}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// Export types and state
export type { VoiceInputState };
