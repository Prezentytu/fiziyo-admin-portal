'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChipListEditorProps {
  items: string[];
  onChange: (items: string[]) => void;
  addLabel: string;
  inputLabel: string;
  placeholder?: string;
  testIdPrefix: string;
}

export function ChipListEditor({
  items,
  onChange,
  addLabel,
  inputLabel,
  placeholder,
  testIdPrefix,
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
          className="inline-flex h-8 items-center gap-1 rounded-full bg-card pl-3 pr-1 text-[14px] text-foreground"
        >
          {item}
          <button
            type="button"
            aria-label={`Usuń: ${item}`}
            onClick={() => onChange(items.filter((_entry, entryIndex) => entryIndex !== index))}
            className="grid h-6 w-6 place-items-center rounded-full text-label-secondary hover:bg-fill-quaternary hover:text-foreground"
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
