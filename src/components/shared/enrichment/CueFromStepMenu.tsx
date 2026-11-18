'use client';

import { ListPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CueFromStepMenuProps {
  steps: readonly string[];
  onPick: (stepText: string) => void;
  testIdPrefix: string;
  disabled?: boolean;
}

const PREVIEW_CHARS = 60;

function preview(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > PREVIEW_CHARS ? `${trimmed.slice(0, PREVIEW_CHARS).trimEnd()}…` : trimmed;
}

/**
 * Player pokazuje tylko wskazówki, nie kroki (T-0064). Fizjoterapeuta może świadomie wziąć krok jako punkt
 * wyjścia: wskazówka dostaje fazę „Przygotowanie” i licznik pokaże, ile trzeba skrócić.
 */
export function CueFromStepMenu({ steps, onPick, testIdPrefix, disabled = false }: Readonly<CueFromStepMenuProps>) {
  const filled = steps.map((text, index) => ({ text, index })).filter(({ text }) => text.trim().length > 0);
  if (filled.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="plain" size="sm" disabled={disabled} data-testid={`${testIdPrefix}-trigger`}>
          <ListPlus className="h-4 w-4" aria-hidden />
          Dodaj z kroku
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-w-[min(28rem,calc(100vw-2rem))]">
        <DropdownMenuLabel className="text-[12px] font-normal text-muted-foreground">
          Kopia kroku jako wskazówka przygotowania. Skróć ją potem do hasła.
        </DropdownMenuLabel>
        {filled.map(({ text, index }) => (
          <DropdownMenuItem key={index} onSelect={() => onPick(text)} data-testid={`${testIdPrefix}-step-${index + 1}`}>
            <span className="mr-2 tabular-nums text-muted-foreground">{index + 1}.</span>
            <span className="min-w-0 truncate">{preview(text)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
