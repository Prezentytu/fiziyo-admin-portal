'use client';

import { cn } from '@/lib/utils';
import type { ImageStyle } from '@/types/ai.types';

const STYLE_OPTIONS: Array<{ value: ImageStyle; label: string }> = [
  { value: 'illustration', label: 'Ilustracja' },
  { value: 'diagram', label: 'Diagram' },
  { value: 'photo', label: 'Zdjęcie' },
];

interface ImageStylePickerProps {
  value: ImageStyle;
  onChange: (style: ImageStyle) => void;
  disabled?: boolean;
  testIdPrefix?: string;
}

export function ImageStylePicker({
  value,
  onChange,
  disabled = false,
  testIdPrefix = 'exercise-ai-image-style',
}: ImageStylePickerProps) {
  return (
    <div
      className="inline-flex items-center rounded-lg border border-border bg-surface p-0.5"
      role="group"
      aria-label="Styl obrazu AI"
      data-testid={`${testIdPrefix}-group`}
    >
      {STYLE_OPTIONS.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-50',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-pressed={isActive}
            data-testid={`${testIdPrefix}-${option.value}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
