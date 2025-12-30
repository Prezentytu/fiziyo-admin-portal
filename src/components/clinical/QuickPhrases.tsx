'use client';

import { cn } from '@/lib/utils';

interface QuickPhrasesProps {
  phrases: readonly string[];
  onSelect: (phrase: string) => void;
  selectedPhrases?: string[];
  multiSelect?: boolean;
  className?: string;
}

export function QuickPhrases({
  phrases,
  onSelect,
  selectedPhrases = [],
  multiSelect = false,
  className,
}: QuickPhrasesProps) {
  const handleClick = (phrase: string) => {
    onSelect(phrase);
  };

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {phrases.map((phrase) => {
        const isSelected = selectedPhrases.includes(phrase);
        return (
          <button
            key={phrase}
            type="button"
            onClick={() => handleClick(phrase)}
            className={cn(
              'px-2.5 py-1 text-xs rounded-lg border transition-all duration-200',
              'hover:border-primary/50 hover:bg-primary/5',
              isSelected
                ? 'border-primary bg-primary/10 text-primary font-medium'
                : 'border-border/60 bg-surface text-muted-foreground hover:text-foreground'
            )}
          >
            {multiSelect && isSelected && <span className="mr-1">✓</span>}
            {phrase}
          </button>
        );
      })}
    </div>
  );
}

