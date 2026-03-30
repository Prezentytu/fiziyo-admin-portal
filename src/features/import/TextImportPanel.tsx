'use client';

import { useCallback, useState } from 'react';
import { Clipboard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface TextImportPanelProps {
  text: string;
  onTextChange: (text: string) => void;
  disabled?: boolean;
  minLength?: number;
  className?: string;
}

export function TextImportPanel({
  text,
  onTextChange,
  disabled = false,
  minLength = 30,
  className,
}: TextImportPanelProps) {
  const [isPasting, setIsPasting] = useState(false);
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null);

  const textLength = text.trim().length;
  const isReady = textLength >= minLength;

  const handleClipboardPaste = useCallback(async () => {
    if (!navigator?.clipboard?.readText) {
      setClipboardMessage('Twoja przeglądarka nie wspiera wklejania ze schowka. Wklej tekst ręcznie.');
      return;
    }

    setIsPasting(true);
    setClipboardMessage(null);

    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText.trim()) {
        setClipboardMessage('Schowek jest pusty. Skopiuj treść i spróbuj ponownie.');
        return;
      }
      onTextChange(clipboardText);
      setClipboardMessage('Wklejono treść ze schowka.');
    } catch {
      setClipboardMessage('Brak dostępu do schowka. Wklej tekst ręcznie (Ctrl/Cmd + V).');
    } finally {
      setIsPasting(false);
    }
  }, [onTextChange]);

  return (
    <div className={cn('space-y-4', className)} data-testid="import-text-panel">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Wklej treść dokumentu lub fragment z ćwiczeniami.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClipboardPaste}
          disabled={disabled || isPasting}
          className="gap-2 shrink-0"
          data-testid="import-text-clipboard-btn"
        >
          {isPasting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clipboard className="h-4 w-4" />}
          Wklej ze schowka
        </Button>
      </div>

      <Textarea
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        placeholder="Np. Plan terapii po urazie barku..."
        className="min-h-[220px]"
        disabled={disabled}
        data-testid="import-textarea-input"
      />

      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">Ctrl/Cmd + V działa jak zwykle.</span>
        <span
          className={cn('font-medium', isReady ? 'text-muted-foreground' : 'text-warning')}
          data-testid="import-text-char-count"
        >
          {textLength}/{minLength} znaków
        </span>
      </div>

      {clipboardMessage && <p className="text-xs text-muted-foreground">{clipboardMessage}</p>}
    </div>
  );
}
