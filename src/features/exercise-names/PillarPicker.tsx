'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ExerciseNameReviewRow } from '@/graphql/types/exerciseNameReview.types';
import { foldText, type NameReviewDraft } from '@/features/exercise-names/utils/nameReviewRows';

interface PillarPickerProps {
  exerciseId: string;
  value: string | null;
  candidates: ReadonlyArray<ExerciseNameReviewRow>;
  drafts: Readonly<Record<string, NameReviewDraft>>;
  aiPillarId: string | null;
  disabled?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (pillarId: string | null) => void;
}

/** Variant target: searchable list of pillars in the organization (without the row itself), AI suggestion first. */
export function PillarPicker({
  exerciseId,
  value,
  candidates,
  drafts,
  aiPillarId,
  disabled,
  open,
  onOpenChange,
  onChange,
}: PillarPickerProps) {
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  const labelOf = (row: ExerciseNameReviewRow) =>
    drafts[row.exerciseId]?.name ?? row.proposal?.proposedName ?? row.name;
  const selected = candidates.find((row) => row.exerciseId === value) ?? null;
  // Pickers never opened (almost every mounted row) skip the search over all pillars. Once opened, the list stays
  // computed so the closing animation does not flash the empty state.
  const [listed, setListed] = useState(open);
  if (open && !listed) setListed(true);
  const options = useMemo(() => {
    if (!listed) return [];
    const words = foldText(query).split(/\s+/).filter(Boolean);
    const matching = candidates.filter((row) => {
      if (row.exerciseId === exerciseId) return false;
      const text = foldText(`${drafts[row.exerciseId]?.name ?? ''} ${row.proposal?.proposedName ?? ''} ${row.name}`);
      return words.every((word) => text.includes(word));
    });
    return [...matching].sort(
      (left, right) => Number(right.exerciseId === aiPillarId) - Number(left.exerciseId === aiPillarId)
    );
  }, [listed, candidates, drafts, query, aiPillarId, exerciseId]);

  const choose = (pillarId: string | null) => {
    onChange(pillarId);
    onOpenChange(false);
    setQuery('');
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        setHighlight(0);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-auto min-h-8 w-full min-w-0 justify-between py-1.5 text-left whitespace-normal"
          data-testid={`name-review-variant-${exerciseId}`}
          aria-label="Wariant ćwiczenia filarowego"
        >
          <span className="min-w-0 break-words">
            {selected ? labelOf(selected) : value ? 'Filarowe spoza listy' : disabled ? '—' : 'Bez wariantu'}
          </span>
          <ChevronDown aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[360px] p-2" onOpenAutoFocus={(event) => event.preventDefault()}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            placeholder="Szukaj filarowego"
            className="pl-9"
            data-testid="name-review-variant-search"
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlight(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setHighlight((index) => Math.min(index + 1, options.length - 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setHighlight((index) => Math.max(index - 1, 0));
              } else if (event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
                if (options[highlight]) choose(options[highlight].exerciseId);
              }
            }}
          />
        </div>
        <ul className="mt-2 max-h-72 overflow-y-auto" role="listbox" aria-label="Ćwiczenia filarowe">
          {value && (
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-fill-quaternary"
                data-testid="name-review-variant-clear"
                onClick={() => choose(null)}
              >
                <X className="size-4" aria-hidden />
                Bez wariantu
              </button>
            </li>
          )}
          {options.map((row, index) => (
            <li key={row.exerciseId}>
              <button
                type="button"
                role="option"
                aria-selected={row.exerciseId === value}
                className={
                  index === highlight
                    ? 'flex w-full items-center justify-between gap-2 rounded-md bg-fill-tertiary px-2 py-1.5 text-left text-sm text-foreground'
                    : 'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-fill-quaternary'
                }
                data-testid={`name-review-variant-option-${row.exerciseId}`}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => choose(row.exerciseId)}
              >
                <span className="min-w-0 break-words">{labelOf(row)}</span>
                {row.exerciseId === aiPillarId && <span className="shrink-0 text-xs text-tint">propozycja AI</span>}
              </button>
            </li>
          ))}
          {options.length === 0 && (
            <li className="px-2 py-3 text-sm text-muted-foreground">Brak filarowych pasujących do szukania.</li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
