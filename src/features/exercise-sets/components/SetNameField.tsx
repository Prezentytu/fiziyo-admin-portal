'use client';

import type { Ref } from 'react';
import { Loader2, Pencil, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SetNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  onGenerateAiName: () => void;
  isGeneratingName?: boolean;
  showError?: boolean;
  onClearError?: () => void;
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  placeholder?: string;
  autoFocus?: boolean;
  testIdPrefix?: string;
  /** Override AI button test id (defaults to `${testIdPrefix}-ai-btn`) */
  aiButtonTestId?: string;
  className?: string;
}

export function SetNameField({
  value,
  onChange,
  onGenerateAiName,
  isGeneratingName = false,
  showError = false,
  onClearError,
  disabled = false,
  inputRef,
  placeholder = 'np. Rehabilitacja kolana - tydzień 1',
  autoFocus = false,
  testIdPrefix = 'set-name',
  aiButtonTestId,
  className,
}: SetNameFieldProps) {
  const errorId = `${testIdPrefix}-name-error`;
  const resolvedAiButtonTestId = aiButtonTestId ?? `${testIdPrefix}-ai-btn`;

  return (
    <div className={cn('flex flex-col', className)}>
      <label
        className={cn(
          'flex-1 flex h-9 items-center min-w-0 rounded-md border border-transparent px-1.5 focus-within:bg-surface transition-colors cursor-text hover:bg-surface-light/50',
          showError
            ? 'bg-destructive/5 border-destructive/50 ring-1 ring-destructive/30 focus-within:border-destructive/60 focus-within:ring-destructive/40'
            : 'focus-within:border-border focus-within:ring-1 focus-within:ring-primary/20',
          disabled && 'opacity-60 pointer-events-none'
        )}
      >
        <input
          type="text"
          value={value}
          onChange={(event) => {
            const nextName = event.target.value;
            onChange(nextName);
            if (showError && nextName.trim().length >= 2) {
              onClearError?.();
            }
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          ref={inputRef}
          disabled={disabled}
          aria-invalid={showError}
          aria-describedby={showError ? errorId : undefined}
          data-testid={`${testIdPrefix}-name-input`}
          className="peer flex-1 min-w-0 bg-transparent text-base font-semibold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 border-none p-0 cursor-text"
        />
        <Pencil
          className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 ml-2 peer-focus:hidden transition-opacity pointer-events-none"
          aria-hidden
        />
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            onGenerateAiName();
          }}
          title="Wygeneruj nazwę AI"
          className={cn(
            'p-1.5 rounded-md shrink-0 transition-colors ml-1 relative z-10',
            isGeneratingName || disabled
              ? 'text-muted-foreground cursor-not-allowed opacity-50'
              : 'text-muted-foreground hover:text-secondary hover:bg-secondary/10'
          )}
          data-testid={resolvedAiButtonTestId}
          aria-label="Wygeneruj nazwę AI"
          disabled={isGeneratingName || disabled}
        >
          {isGeneratingName ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
        </button>
      </label>
      {showError && (
        <p
          id={errorId}
          className="mt-1 px-1.5 text-[11px] font-medium text-destructive"
          data-testid={errorId}
        >
          Podaj nazwę zestawu (minimum 2 znaki), aby utworzyć zestaw.
        </p>
      )}
    </div>
  );
}
