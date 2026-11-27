'use client';

import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Check, Film, ImageOff, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ExerciseNameReviewRow } from '@/graphql/types/exerciseNameReview.types';
import { getVerificationStatusBadge } from '@/features/verification/utils/statusBadge';
import { PillarPicker } from '@/features/exercise-names/PillarPicker';
import { isDone, type NameReviewDraft } from '@/features/exercise-names/utils/nameReviewRows';

export const NAME_REVIEW_GRID =
  'grid grid-cols-[20px_44px_minmax(0,1fr)_minmax(0,1.6fr)_64px_minmax(0,1fr)_88px_172px] items-center gap-2.5';

/** The name field grows with the text: one line for a short name, more for a long one, never a hidden tail. */
function fitHeight(field: HTMLTextAreaElement | null) {
  if (!field) return;
  field.style.height = 'auto';
  // scrollHeight leaves out the border; border-box height needs it, or the last line scrolls under the edge.
  field.style.height = `${field.scrollHeight + field.offsetHeight - field.clientHeight}px`;
}

export const PILLAR_TOOLTIP = 'Podstawowa, klasyczna wersja ruchu. Inne ćwiczenia mogą być jej wariantami.';

interface NameReviewRowItemProps {
  row: ExerciseNameReviewRow;
  draft: NameReviewDraft;
  active: boolean;
  expanded: boolean;
  selected: boolean;
  saving: boolean;
  isVariant: boolean;
  /** Every pillar of the organization; the picker leaves out this row. */
  pillarCandidates: ReadonlyArray<ExerciseNameReviewRow>;
  drafts: Readonly<Record<string, NameReviewDraft>>;
  pickerOpen: boolean;
  onPickerOpenChange: (open: boolean) => void;
  onActivate: () => void;
  onToggleExpanded: () => void;
  onToggleSelected: () => void;
  onDraftChange: (draft: NameReviewDraft) => void;
  onDone: () => void;
  onKeepName: () => void;
  onUndo: () => void;
  onPreview: () => void;
  onEscapeField: () => void;
}

/** One-line review row; the name field is editable right away, a click on the row expands details. */
export const NameReviewRowItem = forwardRef<HTMLTextAreaElement, NameReviewRowItemProps>(function NameReviewRowItem(
  {
    row,
    draft,
    active,
    expanded,
    selected,
    saving,
    isVariant,
    pillarCandidates,
    drafts,
    pickerOpen,
    onPickerOpenChange,
    onActivate,
    onToggleExpanded,
    onToggleSelected,
    onDraftChange,
    onDone,
    onKeepName,
    onUndo,
    onPreview,
    onEscapeField,
  },
  nameInputRef
) {
  const done = isDone(row);
  const status = getVerificationStatusBadge(row, row.status === 'DRAFT' ? 'organization' : 'global');
  const thumbnail = row.thumbnailUrl ?? row.imageUrl;
  const renamed = draft.name.trim() !== row.name;
  const nameField = useRef<HTMLTextAreaElement | null>(null);
  const setNameField = useCallback(
    (field: HTMLTextAreaElement | null) => {
      nameField.current = field;
      if (typeof nameInputRef === 'function') nameInputRef(field);
      else if (nameInputRef) nameInputRef.current = field;
    },
    [nameInputRef]
  );
  useLayoutEffect(() => fitHeight(nameField.current), [draft.name]);
  useEffect(() => {
    const field = nameField.current;
    if (!field || typeof ResizeObserver === 'undefined') return undefined;
    let width = field.clientWidth;
    const observer = new ResizeObserver(() => {
      if (field.clientWidth === width) return;
      width = field.clientWidth;
      fitHeight(field);
    });
    observer.observe(field);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      data-testid={`name-review-row-${row.exerciseId}`}
      data-active={active || undefined}
      data-done={done || undefined}
      className={cn(
        'border-b border-border px-3 py-2 transition-colors',
        active ? 'bg-tint-muted/60' : 'hover:bg-fill-quaternary',
        isVariant && 'pl-8'
      )}
      onMouseDown={onActivate}
    >
      <div className={NAME_REVIEW_GRID}>
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelected}
          aria-label="Zaznacz wiersz"
          data-testid={`name-review-select-${row.exerciseId}`}
        />
        <button
          type="button"
          className="relative flex size-11 items-center justify-center overflow-hidden rounded-md bg-fill-tertiary"
          onClick={onPreview}
          aria-label="Podgląd wideo"
          data-testid={`name-review-preview-${row.exerciseId}`}
        >
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element -- external exercise media of any host
            <img src={thumbnail} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <ImageOff className="size-4 text-muted-foreground" aria-hidden />
          )}
          {row.videoUrl && (
            <Film
              className="absolute bottom-0.5 right-0.5 size-3.5 rounded-sm bg-background/80 text-foreground"
              aria-hidden
            />
          )}
        </button>
        <button
          type="button"
          className="min-w-0 text-left text-sm text-muted-foreground"
          onClick={onToggleExpanded}
          title={row.name}
          data-testid={`name-review-current-${row.exerciseId}`}
        >
          <span className={cn('break-words', renamed && 'line-through decoration-muted-foreground/50')}>
            {row.name}
          </span>
        </button>
        <div className="flex min-w-0 flex-col gap-1">
          <Textarea
            ref={setNameField}
            rows={1}
            value={draft.name}
            disabled={done || saving}
            maxLength={200}
            aria-label="Krótka nazwa"
            data-testid={`name-review-name-${row.exerciseId}`}
            className="min-h-9 resize-none overflow-hidden px-3.5 py-2 text-sm leading-5 font-medium"
            onFocus={onActivate}
            onChange={(event) => onDraftChange({ ...draft, name: event.target.value.replace(/\s*\n\s*/g, ' ') })}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                onEscapeField();
              }
            }}
          />
          <p
            className={cn('min-w-0 text-xs text-muted-foreground', !expanded && 'line-clamp-1')}
            title={row.proposal?.reason ?? undefined}
            data-testid={`name-review-reason-${row.exerciseId}`}
          >
            {row.proposal?.reason ?? (row.proposal?.proposedName ? '' : 'Bez propozycji AI')}
          </p>
        </div>
        <label className="flex items-center" title={PILLAR_TOOLTIP}>
          <Switch
            checked={draft.isPillar}
            disabled={done || saving}
            onCheckedChange={(checked) =>
              onDraftChange({ ...draft, isPillar: checked, pillarId: checked ? null : draft.pillarId })
            }
            data-testid={`name-review-pillar-${row.exerciseId}`}
            aria-label="Filarowe"
          />
        </label>
        <div className="min-w-0">
          <PillarPicker
            exerciseId={row.exerciseId}
            value={draft.isPillar ? null : draft.pillarId}
            candidates={pillarCandidates}
            drafts={drafts}
            aiPillarId={row.proposal?.proposedPillarExerciseId ?? null}
            disabled={done || saving || draft.isPillar}
            open={pickerOpen}
            onOpenChange={onPickerOpenChange}
            onChange={(pillarId) => onDraftChange({ ...draft, pillarId })}
          />
        </div>
        <span
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
          data-testid={`name-review-status-${row.exerciseId}`}
        >
          <span className={cn('size-2 shrink-0 rounded-full', status.dotClassName)} aria-hidden />
          {status.label}
        </span>
        <div className="flex items-center justify-end gap-1">
          {done ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={onUndo}
              data-testid={`name-review-undo-${row.exerciseId}`}
            >
              <RotateCcw aria-hidden />
              Cofnij
            </Button>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={saving}
                onClick={onKeepName}
                title="Zostaw nazwę (n)"
                data-testid={`name-review-keep-${row.exerciseId}`}
              >
                Zostaw
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={saving || draft.name.trim().length < 2}
                onClick={onDone}
                title="Zrobione (Enter)"
                data-testid={`name-review-done-${row.exerciseId}`}
              >
                <Check aria-hidden />
                Zrobione
              </Button>
            </>
          )}
        </div>
      </div>
      {expanded && (
        <dl
          className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pl-[86px] text-xs text-muted-foreground"
          data-testid={`name-review-details-${row.exerciseId}`}
        >
          <dt>Rodzina</dt>
          <dd className="text-foreground">{row.proposal?.family ?? '—'}</dd>
          <dt>Aliasy</dt>
          <dd className="text-foreground">{row.aliases.length > 0 ? row.aliases.join(' · ') : '—'}</dd>
          <dt>Propozycja AI</dt>
          <dd className="text-foreground">{row.proposal?.proposedName ?? '—'}</dd>
          {done && (
            <>
              <dt>Zdecydował(a)</dt>
              <dd className="text-foreground">
                {row.proposal?.decidedByName ?? row.proposal?.decidedById ?? '—'}
                {row.proposal?.decidedAt ? `, ${new Date(row.proposal.decidedAt).toLocaleString('pl-PL')}` : ''}
              </dd>
            </>
          )}
        </dl>
      )}
    </div>
  );
});
