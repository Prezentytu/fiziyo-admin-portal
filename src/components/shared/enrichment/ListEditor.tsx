'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DirtyDot } from './DirtyDot';

interface ListEditorProps {
  title: string;
  items: string[];
  placeholder: string;
  addLabel: string;
  disabled?: boolean;
  dirty?: boolean;
  onChange: (items: string[]) => void;
  onBlur?: () => void;
  testIdPrefix?: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function ListEditor({
  title,
  items,
  placeholder,
  addLabel,
  disabled = false,
  dirty = false,
  onChange,
  onBlur,
  testIdPrefix,
}: Readonly<ListEditorProps>) {
  const safeItems = items.length > 0 ? items : [''];
  const prefix = testIdPrefix ?? (slugify(title) || 'list-editor');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {title && (
          <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            {title}
            <DirtyDot active={dirty} />
          </p>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange([...items, ''])}
          data-testid={`${prefix}-add-btn`}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          {addLabel}
        </Button>
      </div>
      {safeItems.map((item, index) => (
        <div key={`${title}-${index}`} className="flex min-w-0 gap-2">
          <Input
            value={item}
            disabled={disabled}
            placeholder={placeholder}
            className="min-w-0 w-full"
            onChange={(event) => {
              const next = [...safeItems];
              next[index] = event.target.value;
              onChange(next);
            }}
            onBlur={onBlur}
            data-testid={`${prefix}-item-${index}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label="Usuń"
            onClick={() => {
              const next = safeItems.filter((_, entryIndex) => entryIndex !== index);
              onChange(next);
              onBlur?.();
            }}
            data-testid={`${prefix}-remove-${index}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}
