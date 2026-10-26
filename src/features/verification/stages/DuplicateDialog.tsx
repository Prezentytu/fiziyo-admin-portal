'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Loader2, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ExerciseThumbnail } from '@/components/shared/exercise';
import { cn } from '@/lib/utils';
import { getMediaUrl } from '@/utils/mediaUrl';
import { GET_VERIFICATION_QUEUE_PAGE_QUERY } from '@/graphql/queries/adminExercises.queries';
import type {
  AdminExercise,
  GetVerificationQueuePageResponse,
  GetVerificationQueuePageVariables,
} from '@/graphql/types/adminExercise.types';

const SEARCH_DEBOUNCE_MS = 300;
const RESULT_LIMIT = 8;

export interface DuplicateTarget {
  id: string;
  name: string;
}

interface DuplicateDialogProps {
  open: boolean;
  exerciseId: string;
  exerciseName: string;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (target: DuplicateTarget) => void;
}

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function thumbnailOf(exercise: AdminExercise): string | null {
  return getMediaUrl(exercise.thumbnailUrl ?? exercise.imageUrl ?? exercise.images?.[0] ?? null);
}

export function DuplicateDialog({
  open,
  exerciseId,
  exerciseName,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: DuplicateDialogProps) {
  const [search, setSearch] = useState(exerciseName);
  const [selected, setSelected] = useState<DuplicateTarget | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);

  const { data, loading } = useQuery<GetVerificationQueuePageResponse, GetVerificationQueuePageVariables>(
    GET_VERIFICATION_QUEUE_PAGE_QUERY,
    {
      variables: { filter: 'published', search: debouncedSearch || null, page: 1, pageSize: RESULT_LIMIT },
      skip: !open || debouncedSearch.length < 2,
      fetchPolicy: 'cache-and-network',
    }
  );

  const candidates = (data?.verificationQueuePage.items ?? []).filter((item) => item.id !== exerciseId);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSearch(exerciseName);
    }
    setSelected(null);
    onOpenChange(nextOpen);
  };

  const handleConfirm = () => {
    if (selected && !isSubmitting) onConfirm(selected);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg" onKeyDown={handleKeyDown} data-testid="verification-duplicate-dialog">
        <DialogHeader>
          <DialogTitle>To ćwiczenie jest już w bazie</DialogTitle>
          <DialogDescription>
            Wskaż ćwiczenie, które już jest w bazie. To zniknie z listy do weryfikacji, a autor dostanie informację,
            gdzie znaleźć istniejące.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-label-tertiary" />
          <Input
            value={search}
            aria-label="Szukaj w bazie ćwiczeń"
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
            data-testid="verification-duplicate-search-input"
          />
        </div>
        <div className="flex max-h-[320px] flex-col overflow-y-auto" role="listbox" aria-label="Ćwiczenia w bazie">
          {loading && candidates.length === 0 && (
            <p className="flex items-center gap-2 py-3 text-[13px] text-label-secondary">
              <Loader2 className="h-4 w-4 animate-spin" /> Szukam w bazie…
            </p>
          )}
          {!loading && debouncedSearch.length >= 2 && candidates.length === 0 && (
            <p className="py-3 text-[13px] text-label-secondary">Brak opublikowanych ćwiczeń o tej nazwie.</p>
          )}
          {candidates.map((candidate) => {
            const isSelected = selected?.id === candidate.id;
            return (
              <button
                key={candidate.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => setSelected({ id: candidate.id, name: candidate.name })}
                className={cn(
                  'flex items-center gap-3 rounded-[14px] px-2 py-2 text-left transition-colors',
                  isSelected ? 'bg-tint-muted' : 'hover:bg-fill-quaternary'
                )}
                data-testid={`verification-duplicate-candidate-${candidate.id}`}
              >
                <ExerciseThumbnail src={thumbnailOf(candidate)} sizeClass="h-11 w-11" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-foreground">{candidate.name}</span>
                  {candidate.patientDescription && (
                    <span className="block truncate text-[13px] text-label-secondary">
                      {candidate.patientDescription}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleOpenChange(false)}
            data-testid="verification-duplicate-cancel-btn"
          >
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selected || isSubmitting}
            data-testid="verification-duplicate-confirm-btn"
          >
            {isSubmitting && <Loader2 className="animate-spin" />}
            Oznacz jako duplikat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
