'use client';

import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { DirtyDot } from '@/components/shared/enrichment/DirtyDot';
import { ListEditor } from '@/components/shared/enrichment/ListEditor';
import { EXERCISE_CONTENT_LABELS as LABELS } from '@/components/shared/enrichment/enrichmentFieldLabels';
import { cn } from '@/lib/utils';
import type { EnrichmentEquipmentItemV33 } from '@/graphql/types/exerciseEnrichment.types';

import {
  acceptTherapistNoteInput,
  readTextItem,
  THERAPIST_NOTE_MAX_LENGTH,
  withTextItem,
} from './utils/enrichmentV33Document';

/**
 * Editors of the v3.3 content facts that have no place in the old form (SPEC-038).
 * Rows keep every key the form does not show (`evidence`, `view`, `code`); only the edited part changes.
 */

const DIRTY_FIELD_CLASS = 'border-status-warning/70 bg-status-warning-muted dark:border-status-warning/40';

interface TextItemsEditorProps {
  title: string;
  /** Rows as stored: `{ text, … }` objects or plain strings. */
  items: readonly unknown[];
  placeholder: string;
  addLabel: string;
  disabled?: boolean;
  dirty?: boolean;
  onChange: (items: unknown[]) => void;
  testIdPrefix: string;
}

export function TextItemsEditor({
  title,
  items,
  placeholder,
  addLabel,
  disabled = false,
  dirty = false,
  onChange,
  testIdPrefix,
}: Readonly<TextItemsEditorProps>) {
  const rows: readonly unknown[] = items.length > 0 ? items : [{ text: '' }];
  const canRemove = (index: number) => rows.length > 1 || readTextItem(rows[index]).trim() !== '';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          {title}
          <DirtyDot active={dirty} />
        </p>
        <Button
          data-testid={`${testIdPrefix}-add-btn`}
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange([...items, { text: '' }])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          {addLabel}
        </Button>
      </div>
      {rows.map((row, index) => (
        <div key={`${testIdPrefix}-${index}`} className="flex min-w-0 gap-2">
          <Input
            data-testid={`${testIdPrefix}-item-${index}`}
            value={readTextItem(row)}
            disabled={disabled}
            placeholder={placeholder}
            className="min-w-0 w-full"
            onChange={(event) =>
              onChange(rows.map((entry, entryIndex) => (entryIndex === index ? withTextItem(entry, event.target.value) : entry)))
            }
          />
          <Button
            data-testid={`${testIdPrefix}-remove-${index}`}
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || !canRemove(index)}
            aria-label={canRemove(index) ? 'Usuń' : 'Brak treści do usunięcia'}
            onClick={() => onChange(rows.filter((_, entryIndex) => entryIndex !== index))}
          >
            <Trash2 className={cn('h-4 w-4', canRemove(index) ? 'text-destructive' : 'text-muted-foreground')} />
          </Button>
        </div>
      ))}
    </div>
  );
}

interface TherapistNoteFieldProps {
  value: string;
  disabled?: boolean;
  dirty?: boolean;
  onChange: (value: string) => void;
}

export function TherapistNoteField({ value, disabled = false, dirty = false, onChange }: Readonly<TherapistNoteFieldProps>) {
  const isOverLimit = value.length > THERAPIST_NOTE_MAX_LENGTH;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Label className="text-xs text-muted-foreground" htmlFor="exercise-detail-therapist-note">
          {LABELS.therapistNote}
        </Label>
        <DirtyDot active={dirty} />
      </div>
      <Textarea
        id="exercise-detail-therapist-note"
        data-testid="exercise-detail-therapist-note-input"
        value={value}
        disabled={disabled}
        maxLength={isOverLimit ? undefined : THERAPIST_NOTE_MAX_LENGTH}
        placeholder="Uzasadnienie kliniczne i uwagi, których nie da się zapisać w innym polu. Pacjent tego nie widzi."
        aria-describedby="exercise-detail-therapist-note-counter"
        className={cn('min-h-[90px] text-sm transition-colors', dirty && DIRTY_FIELD_CLASS)}
        onChange={(event) => onChange(acceptTherapistNoteInput(value, event.target.value))}
      />
      <p
        id="exercise-detail-therapist-note-counter"
        data-testid="exercise-detail-therapist-note-counter"
        className={cn('text-right text-xs', isOverLimit ? 'text-destructive' : 'text-muted-foreground')}
      >
        {value.length}/{THERAPIST_NOTE_MAX_LENGTH} znaków
        {isOverLimit ? ' · tekst jest za długi, skróć go' : ''}
      </p>
    </div>
  );
}

interface EquipmentItemsEditorProps {
  items: readonly EnrichmentEquipmentItemV33[];
  disabled?: boolean;
  dirty?: boolean;
  onChange: (items: EnrichmentEquipmentItemV33[]) => void;
}

const NEW_EQUIPMENT_ITEM: EnrichmentEquipmentItemV33 = { label: '', qty: 1, required: true, substitutes: [] };

export function EquipmentItemsEditor({ items, disabled = false, dirty = false, onChange }: Readonly<EquipmentItemsEditorProps>) {
  const prefix = 'exercise-detail-equipment-items';
  const patchItem = (index: number, patch: Partial<EnrichmentEquipmentItemV33>) =>
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          {LABELS.equipment}
          <DirtyDot active={dirty} />
        </p>
        <Button
          data-testid={`${prefix}-add-btn`}
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange([...items, { ...NEW_EQUIPMENT_ITEM }])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Dodaj sprzęt
        </Button>
      </div>
      {items.length === 0 ? <p className="text-sm text-muted-foreground/60">Bez sprzętu.</p> : null}
      {items.map((item, index) => (
        <div
          key={`${prefix}-${index}`}
          className="space-y-3 rounded-lg border border-border/40 p-2.5"
          data-testid={`${prefix}-row-${index}`}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Input
              data-testid={`${prefix}-label-${index}`}
              aria-label={`Nazwa sprzętu ${index + 1}`}
              value={item.label ?? ''}
              disabled={disabled}
              placeholder="np. mata albo łóżko"
              className="min-w-[200px] flex-1"
              onChange={(event) => patchItem(index, { label: event.target.value })}
            />
            <Input
              data-testid={`${prefix}-qty-${index}`}
              aria-label={`Liczba sztuk sprzętu ${index + 1}`}
              type="number"
              min={1}
              step={1}
              value={typeof item.qty === 'number' ? item.qty : ''}
              disabled={disabled}
              placeholder="szt."
              className="w-20"
              onChange={(event) => {
                const qty = event.target.valueAsNumber;
                patchItem(index, { qty: Number.isFinite(qty) ? qty : undefined });
              }}
            />
            <Button
              data-testid={`${prefix}-remove-${index}`}
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              aria-label="Usuń sprzęt"
              onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id={`${prefix}-required-${index}`}
              data-testid={`${prefix}-required-${index}`}
              checked={item.required === true}
              disabled={disabled}
              onCheckedChange={(checked) => patchItem(index, { required: checked })}
            />
            <Label htmlFor={`${prefix}-required-${index}`}>Niezbędny do wykonania ćwiczenia</Label>
          </div>
          <ListEditor
            title="Czym można zastąpić"
            items={Array.isArray(item.substitutes) ? item.substitutes : []}
            placeholder="np. zwinięty koc"
            addLabel="Dodaj zamiennik"
            disabled={disabled}
            onChange={(substitutes) => patchItem(index, { substitutes })}
            testIdPrefix={`exercise-detail-equipment-subs-${index}`}
          />
        </div>
      ))}
    </div>
  );
}
