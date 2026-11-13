'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ChipListEditorProps {
  items: string[];
  onChange: (items: string[]) => void;
  addLabel: string;
  inputLabel: string;
  placeholder?: string;
  testIdPrefix: string;
  /** Items are whole sentences: a chip wraps instead of running out of the tile. */
  multiline?: boolean;
}

export function ChipListEditor({
  items,
  onChange,
  addLabel,
  inputLabel,
  placeholder,
  testIdPrefix,
  multiline = false,
}: ChipListEditorProps) {
  const [draft, setDraft] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const commitDraft = () => {
    const value = draft.trim();
    if (value && !items.includes(value)) {
      onChange([...items, value]);
    }
    setDraft('');
    setIsAdding(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      commitDraft();
    }
    if (event.key === 'Escape') {
      event.stopPropagation();
      setDraft('');
      setIsAdding(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid={`${testIdPrefix}-list`}>
      {items.map((item, index) => (
        <span
          key={item}
          className={cn(
            'inline-flex items-center gap-1 bg-card pl-3 pr-1 text-[14px] text-foreground',
            multiline ? 'min-h-8 max-w-full rounded-2xl py-1' : 'h-8 rounded-full'
          )}
        >
          {multiline ? <span className="min-w-0 break-words">{item}</span> : item}
          <button
            type="button"
            aria-label={`Usuń: ${item}`}
            onClick={() => onChange(items.filter((_entry, entryIndex) => entryIndex !== index))}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-label-secondary hover:bg-fill-quaternary hover:text-foreground"
            data-testid={`${testIdPrefix}-remove-${index}-btn`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      {isAdding ? (
        <Input
          autoFocus
          value={draft}
          aria-label={inputLabel}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          className="h-8 w-64"
          data-testid={`${testIdPrefix}-input`}
        />
      ) : (
        <Button
          type="button"
          variant="plain"
          size="sm"
          onClick={() => setIsAdding(true)}
          data-testid={`${testIdPrefix}-add-btn`}
        >
          + {addLabel}
        </Button>
      )}
    </div>
  );
}
