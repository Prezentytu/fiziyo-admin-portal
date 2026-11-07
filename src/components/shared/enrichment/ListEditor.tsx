'use client';

import { Fragment, type ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { DirtyDot } from './DirtyDot';
import { canRemovePlaceholderRow, isBlankText } from './canRemovePlaceholderRow';

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
  /** Extra control next to an existing item, e.g. the phase of a cue. */
  renderItemAccessory?: (index: number) => ReactNode;
  /** Called with the removed index, so data linked by index can shift with the list. */
  onRemoveItem?: (index: number) => void;
  /** Note under an item, e.g. how much of it fits in the patient player. */
  renderItemFooter?: (item: string, index: number) => ReactNode;
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
  renderItemAccessory,
  onRemoveItem,
  renderItemFooter,
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
          data-testid={`${prefix}-add-btn`}
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange([...items, ''])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          {addLabel}
        </Button>
      </div>
      {safeItems.map((item, index) => {
        const canRemove = canRemovePlaceholderRow(safeItems, index, isBlankText);
        return (
          <Fragment key={`${title}-${index}`}>
            <div className={cn('flex min-w-0 gap-2', renderItemAccessory && 'flex-wrap')}>
              <Input
                data-testid={`${prefix}-item-${index}`}
                value={item}
                disabled={disabled}
                placeholder={placeholder}
                className={cn('min-w-0 w-full', renderItemAccessory && 'min-w-[200px] flex-1')}
                onChange={(event) => {
                  const next = [...safeItems];
                  next[index] = event.target.value;
                  onChange(next);
                }}
                onBlur={onBlur}
              />
              {renderItemAccessory && index < items.length ? renderItemAccessory(index) : null}
              <Button
                data-testid={`${prefix}-remove-${index}`}
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled || !canRemove}
                aria-label={canRemove ? 'Usuń' : 'Brak treści do usunięcia'}
                onClick={() => {
                  const next = safeItems.filter((_, entryIndex) => entryIndex !== index);
                  onChange(next);
                  if (index < items.length) onRemoveItem?.(index);
                  onBlur?.();
                }}
              >
                <Trash2 className={cn('h-4 w-4', canRemove ? 'text-destructive' : 'text-muted-foreground')} />
              </Button>
            </div>
            {renderItemFooter?.(item, index)}
          </Fragment>
        );
      })}
    </div>
  );
}
