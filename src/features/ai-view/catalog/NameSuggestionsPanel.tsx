'use client';

import { Eye, Loader2, Plus } from 'lucide-react';

import { ChoiceChip } from '@/components/ui/choice-chip';
import { ExerciseThumbnail } from '@/components/shared/exercise/ExerciseThumbnail';
import { buildExerciseImageUrls } from '@/components/shared/exercise/adapters';
import type { ChatCatalogExercise } from '../useAvailableExercises';
import type { NameSuggestions } from './useNameSuggestions';

/**
 * Under a typed exercise name: „Czy chodziło Ci o” (AI names that replace the typed one) and „W katalogu są
 * podobne” (catalog exercises with a preview and, where the card can take one, a way to use it instead).
 */
export function NameSuggestionsPanel({
  suggestions,
  similar,
  onPickName,
  onPreview,
  onUse,
  useLabel,
  testId,
}: {
  readonly suggestions: NameSuggestions;
  readonly similar: readonly ChatCatalogExercise[];
  readonly onPickName: (name: string) => void;
  readonly onPreview: (exercise: ChatCatalogExercise) => void;
  readonly onUse?: (exercise: ChatCatalogExercise) => void;
  readonly useLabel?: string;
  readonly testId: string;
}) {
  const { status, names } = suggestions;
  if (status === 'idle' && similar.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5" data-testid={testId}>
      {status === 'loading' && (
        <p className="flex items-center gap-2 px-2 text-[13px] text-label-secondary" role="status">
          <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden="true" />
          Sprawdzam podobne nazwy…
        </p>
      )}
      {names.length > 0 && (
        <div className="flex flex-col gap-1.5 px-2" data-testid={`${testId}-names`}>
          <span className="text-[13px] text-label-secondary">Czy chodziło Ci o:</span>
          <div className="flex flex-wrap gap-1.5">
            {names.map((name, index) => (
              <ChoiceChip
                key={name}
                className="h-8 px-3 text-[13px]"
                onClick={() => onPickName(name)}
                data-testid={`${testId}-name-${index}-btn`}
              >
                {name}
              </ChoiceChip>
            ))}
          </div>
        </div>
      )}
      {similar.length > 0 && (
        <div className="flex flex-col gap-1" data-testid={`${testId}-similar`}>
          <span className="px-2 text-[13px] text-label-secondary">W katalogu są podobne ćwiczenia:</span>
          <ul className="flex flex-col">
            {similar.map((exercise) => (
              <li key={exercise.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onPreview(exercise)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-[10px] px-2 py-1.5 text-left text-[14px] hover:bg-fill-quaternary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid={`${testId}-similar-${exercise.id}-preview-btn`}
                >
                  <ExerciseThumbnail
                    src={buildExerciseImageUrls(exercise)[0] ?? null}
                    sizeClass="h-8 w-8"
                    className="rounded-[8px]"
                  />
                  <span className="min-w-0 flex-1 truncate">{exercise.name}</span>
                  <Eye className="h-4 w-4 shrink-0 text-label-tertiary" aria-label="Podgląd" />
                </button>
                {onUse && (
                  <button
                    type="button"
                    onClick={() => onUse(exercise)}
                    aria-label={`${useLabel ?? 'Dodaj'}: ${exercise.name}`}
                    className="flex h-8 shrink-0 items-center gap-1 rounded-[10px] px-2 text-[13px] font-medium text-tint hover:bg-fill-quaternary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    data-testid={`${testId}-similar-${exercise.id}-use-btn`}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {useLabel ?? 'Dodaj'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
