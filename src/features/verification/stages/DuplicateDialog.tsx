'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Eye, Loader2, Search } from 'lucide-react';

import { Badge, badgeVariants } from '@/components/ui/badge';
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
import { ExercisePreviewDialog, ExerciseThumbnail, fromBuilderExercise } from '@/components/shared/exercise';
import { cn } from '@/lib/utils';
import { getMediaUrl } from '@/utils/mediaUrl';
import {
  GET_EXERCISE_BY_ID_FOR_ADMIN_QUERY,
  GET_VERIFICATION_QUEUE_PAGE_QUERY,
} from '@/graphql/queries/adminExercises.queries';
import type {
  AdminExercise,
  GetVerificationQueuePageResponse,
  GetVerificationQueuePageVariables,
} from '@/graphql/types/adminExercise.types';
import type { Exercise } from '@/graphql/types/exercise.types';

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
  const [searchOverride, setSearch] = useState<string | null>(null);
  const [selected, setSelected] = useState<DuplicateTarget | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const previewButtonRef = useRef<HTMLButtonElement>(null);
  const search = searchOverride ?? exerciseName;
  const searchTerm = search.trim();
  const debouncedSearch = useDebouncedValue(searchTerm, SEARCH_DEBOUNCE_MS);
  const isSearchPending = searchTerm !== debouncedSearch;

  const { data, loading, error } = useQuery<GetVerificationQueuePageResponse, GetVerificationQueuePageVariables>(
    GET_VERIFICATION_QUEUE_PAGE_QUERY,
    {
      variables: { filter: 'published', search: debouncedSearch || null, page: 1, pageSize: RESULT_LIMIT },
      skip: !open || debouncedSearch.length < 2,
      fetchPolicy: 'cache-and-network',
    }
  );

  const previewQuery = useQuery<{ exerciseByIdForAdmin: Exercise | null }>(GET_EXERCISE_BY_ID_FOR_ADMIN_QUERY, {
    variables: { id: selected?.id },
    skip: !open || !selected,
    fetchPolicy: 'cache-and-network',
  });
  const previewResult = previewQuery.data?.exerciseByIdForAdmin;
  const original = previewResult && previewResult.id === selected?.id ? previewResult : null;
  const previewExercise = isPreviewOpen && original
    ? fromBuilderExercise({ ...original, images: [...(original.images ?? []), original.gifUrl] }, {
        tempo: original.tempo,
        notes: original.notes,
        load: original.defaultLoad ?? undefined,
      })
    : null;
  const previewUnavailable = selected && !previewQuery.loading && (previewQuery.error || !original);
  const candidates = isSearchPending || searchTerm.length < 2
    ? []
    : (data?.verificationQueuePage.items ?? []).filter((item) => item.id !== exerciseId);

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return;
    setSearch(null);
    setSelected(null);
    setIsPreviewOpen(false);
    onOpenChange(nextOpen);
  };

  const handlePreviewOpenChange = (nextOpen: boolean) => {
    setIsPreviewOpen(nextOpen);
    if (!nextOpen) requestAnimationFrame(() => previewButtonRef.current?.focus());
  };

  const handleConfirm = () => {
    if (selected && !isSubmitting && !isPreviewOpen) onConfirm(selected);
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
      <DialogContent
        className="max-w-lg gap-3 p-4 sm:gap-4 sm:p-6"
        onKeyDown={handleKeyDown}
        data-testid="verification-duplicate-dialog"
      >
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>Wybierz oryginał z bazy</DialogTitle>
          <DialogDescription>
            Po potwierdzeniu weryfikowane ćwiczenie zniknie z kolejki. Autor dostanie informację, gdzie znaleźć oryginał.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1 rounded-lg bg-fill-quaternary p-3">
          <Badge variant="secondary">Weryfikowane ćwiczenie</Badge>
          <p className="break-words text-sm font-semibold text-foreground">{exerciseName}</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-label-tertiary" />
          <Input
            value={search}
            aria-label="Szukaj oryginału w bazie ćwiczeń"
            disabled={isSubmitting}
            onChange={(event) => {
              setSearch(event.target.value);
              setSelected(null);
            }}
            className="pl-9"
            data-testid="verification-duplicate-search-input"
          />
        </div>
        <div className="flex max-h-[320px] flex-col overflow-y-auto" role="listbox" aria-label="Ćwiczenia w bazie">
          {searchTerm.length >= 2 && (loading || isSearchPending) && candidates.length === 0 && (
            <p className="flex items-center gap-2 py-3 text-[13px] text-label-secondary">
              <Loader2 className="h-4 w-4 animate-spin" /> Szukam w bazie…
            </p>
          )}
          {searchTerm.length < 2 && (
            <p className="py-3 text-[13px] text-label-secondary">Wpisz co najmniej 2 znaki, aby wyszukać oryginał.</p>
          )}
          {!isSearchPending && searchTerm.length >= 2 && error && (
            <p role="status" className="py-3 text-[13px] text-label-secondary">Nie udało się wyszukać ćwiczeń.</p>
          )}
          {!loading && !isSearchPending && !error && searchTerm.length >= 2 && candidates.length === 0 && (
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
                disabled={isSubmitting}
                onClick={() => setSelected({ id: candidate.id, name: candidate.name })}
                className={cn(
                  'flex items-center gap-3 rounded-[14px] px-2 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                  isSelected ? 'bg-tint-muted' : 'hover:bg-fill-quaternary'
                )}
                data-testid={`verification-duplicate-candidate-${candidate.id}`}
              >
                <ExerciseThumbnail src={thumbnailOf(candidate)} sizeClass="h-11 w-11" />
                <span className="min-w-0 flex-1">
                  {isSelected && <span className={badgeVariants({ className: 'mb-1' })}>To jest oryginał</span>}
                  <span className={cn('block text-[15px] font-semibold text-foreground', isSelected ? 'break-words' : 'truncate')}>
                    {candidate.name}
                  </span>
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
        {selected && (
          <div className="space-y-1">
            <Button
              ref={previewButtonRef}
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting || previewQuery.loading}
              onClick={() => {
                if (previewUnavailable) void previewQuery.refetch().catch(() => undefined);
                else handlePreviewOpenChange(true);
              }}
              data-testid="verification-duplicate-preview-btn"
            >
              {previewQuery.loading ? <Loader2 className="animate-spin" /> : <Eye />}
              {previewUnavailable ? 'Ponów ładowanie podglądu' : 'Podgląd oryginału'}
            </Button>
            {previewUnavailable && (
              <p role="status" className="text-sm text-label-secondary">Nie udało się wczytać podglądu oryginału.</p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
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
            <span className="whitespace-normal leading-tight">Oznacz weryfikowane ćwiczenie jako duplikat</span>
          </Button>
        </DialogFooter>
        <ExercisePreviewDialog
          open={isPreviewOpen}
          exercise={previewExercise}
          onOpenChange={handlePreviewOpenChange}
          testIdPrefix="verification-duplicate-original-preview"
        />
      </DialogContent>
    </Dialog>
  );
}
