'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GET_EXERCISE_NAME_VOCABULARY_QUERY } from '@/graphql/queries/exerciseNameReview.queries';
import { SAVE_EXERCISE_NAME_VOCABULARY_MUTATION } from '@/graphql/mutations/exerciseNameReview.mutations';
import type {
  GetExerciseNameVocabularyResponse,
  SaveExerciseNameVocabularyResponse,
} from '@/graphql/types/exerciseNameReview.types';
import { writeSavedVocabulary } from '@/features/exercise-names/utils/vocabularyCache';

interface TermDraft {
  preferred: string;
  avoid: string;
}

function toDrafts(terms: GetExerciseNameVocabularyResponse['exerciseNameVocabulary']): TermDraft[] {
  return terms.map((term) => ({ preferred: term.preferred, avoid: term.avoid.join(', ') }));
}

/** One equipment name across the catalog; the proposal job reads this list. */
export function VocabularyEditor() {
  const { data, loading } = useQuery<GetExerciseNameVocabularyResponse>(GET_EXERCISE_NAME_VOCABULARY_QUERY, {
    fetchPolicy: 'cache-and-network',
  });
  const [save, { loading: saving }] = useMutation<SaveExerciseNameVocabularyResponse>(SAVE_EXERCISE_NAME_VOCABULARY_MUTATION, {
    update: (cache, { data: saved }) => {
      if (saved) writeSavedVocabulary(cache, saved.saveExerciseNameVocabulary);
    },
  });
  const [terms, setTerms] = useState<TermDraft[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data && !dirty) {
      setTerms(toDrafts(data.exerciseNameVocabulary));
    }
  }, [data, dirty]);

  const update = (index: number, patch: Partial<TermDraft>) => {
    setDirty(true);
    setTerms((current) => current.map((term, i) => (i === index ? { ...term, ...patch } : term)));
  };

  const handleSave = async () => {
    try {
      const result = await save({
        variables: {
          terms: terms
            .filter((term) => term.preferred.trim())
            .map((term) => ({
              preferred: term.preferred.trim(),
              avoid: term.avoid
                .split(',')
                .map((word) => word.trim())
                .filter(Boolean),
            })),
        },
      });
      if (result.data) {
        setTerms(toDrafts(result.data.saveExerciseNameVocabulary));
        setDirty(false);
        toast.success('Słownik sprzętu zapisany. Następne propozycje go użyją.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nie udało się zapisać słownika.');
    }
  };

  return (
    <div className="flex flex-col gap-2" data-testid="name-review-vocabulary">
      <p className="text-xs text-muted-foreground">
        Jedna nazwa sprzętu w całej bazie. Po lewej nazwa, której używamy, po prawej odmiany, których AI ma unikać (po przecinku).
      </p>
      {loading && terms.length === 0 && <p className="text-sm text-muted-foreground">Wczytuję słownik…</p>}
      {terms.map((term, index) => (
        <div key={index} className="grid grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto] items-center gap-2">
          <Input
            value={term.preferred}
            aria-label="Nazwa sprzętu"
            className="h-9 text-sm"
            data-testid={`name-review-vocabulary-preferred-${index}`}
            onChange={(event) => update(index, { preferred: event.target.value })}
          />
          <Input
            value={term.avoid}
            aria-label="Zamiast"
            placeholder="np. odważnik kulowy"
            className="h-9 text-sm"
            data-testid={`name-review-vocabulary-avoid-${index}`}
            onChange={(event) => update(index, { avoid: event.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Usuń z słownika"
            data-testid={`name-review-vocabulary-remove-${index}`}
            onClick={() => {
              setDirty(true);
              setTerms((current) => current.filter((_, i) => i !== index));
            }}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="plain"
          size="sm"
          data-testid="name-review-vocabulary-add"
          onClick={() => {
            setDirty(true);
            setTerms((current) => [...current, { preferred: '', avoid: '' }]);
          }}
        >
          <Plus aria-hidden />
          Dodaj sprzęt
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!dirty || saving}
          data-testid="name-review-vocabulary-save"
          onClick={handleSave}
        >
          Zapisz słownik
        </Button>
      </div>
    </div>
  );
}
