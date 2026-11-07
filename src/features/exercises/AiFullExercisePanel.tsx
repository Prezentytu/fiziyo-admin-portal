'use client';

import { Check, ImagePlus, ListChecks, Loader2, Sparkles, Undo2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { aiVariantAttributes, type AiExerciseVariant, type AiFilledPart } from './utils/aiFullExercise';

export interface AiFullExerciseSummary {
  filled: AiFilledPart[];
}

interface AiFullExercisePanelProps {
  canAsk: boolean;
  variants: AiExerciseVariant[] | null;
  isLoadingVariants: boolean;
  isFilling: boolean;
  /** Name of the variant being filled; highlights the chosen row while AI works. */
  fillingVariantName: string | null;
  summary: AiFullExerciseSummary | null;
  canGenerateImage: boolean;
  isGeneratingImage: boolean;
  onSuggestVariants: () => void;
  onFillAll: (variant: AiExerciseVariant | null) => void;
  onUndo: () => void;
  onGenerateImage: () => void;
}

/**
 * Whole-exercise AI assistant in the create wizard: name variants first, then one action that drafts
 * every field. The result is only a form draft; the therapist reviews it and saves.
 */
export function AiFullExercisePanel({
  canAsk,
  variants,
  isLoadingVariants,
  isFilling,
  fillingVariantName,
  summary,
  canGenerateImage,
  isGeneratingImage,
  onSuggestVariants,
  onFillAll,
  onUndo,
  onGenerateImage,
}: AiFullExercisePanelProps) {
  const busy = isLoadingVariants || isFilling;

  return (
    <section
      className="mt-3 rounded-lg border border-border bg-surface-light/40 p-3"
      aria-label="Asystent AI: całe ćwiczenie"
      data-testid="exercise-create-ai-full-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-secondary" />
            Uzupełnij całe ćwiczenie z AI
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Wpisz, czego potrzebujesz, i wybierz wariant. AI przygotuje opis, podstawowe parametry, kroki, wskazówki i
            typowe błędy jako szkic do przejrzenia.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSuggestVariants}
            disabled={!canAsk || busy}
            data-testid="exercise-create-ai-variants-btn"
          >
            {isLoadingVariants ? <Loader2 className="animate-spin" /> : <ListChecks />}
            Podpowiedz nazwy
          </Button>
          <Button
            type="button"
            variant="tinted"
            size="sm"
            onClick={() => onFillAll(null)}
            disabled={!canAsk || busy}
            data-testid="exercise-create-ai-fill-all-btn"
          >
            {isFilling && !fillingVariantName ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Wypełnij całość
          </Button>
        </div>
      </div>

      {variants !== null && (
        <div className="mt-3" data-testid="exercise-create-ai-variants">
          {variants.length === 0 ? (
            <p className="text-xs text-muted-foreground" data-testid="exercise-create-ai-variants-empty">
              AI nie znalazło pasujących wariantów. Doprecyzuj opis i spróbuj ponownie.
            </p>
          ) : (
            <>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Wybierz wariant, AI wypełni resztę
              </p>
              <ul className="space-y-1.5" aria-label="Propozycje nazw i wariantów">
                {variants.map((variant, idx) => {
                  const isChosen = fillingVariantName === variant.name;
                  return (
                    <li key={variant.name}>
                      <button
                        type="button"
                        onClick={() => onFillAll(variant)}
                        disabled={busy}
                        className={cn(
                          'flex w-full items-start justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-left',
                          'transition-colors hover:border-secondary/50 hover:bg-surface-hover',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          'disabled:cursor-not-allowed disabled:opacity-60',
                          isChosen && 'border-secondary/60'
                        )}
                        data-testid={`exercise-create-ai-variant-${idx}`}
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-foreground">{variant.name}</span>
                          <span className="mt-1 flex flex-wrap gap-1">
                            {aiVariantAttributes(variant).map((attribute) => (
                              <Badge key={attribute} variant="secondary" className="text-[10px]">
                                {attribute}
                              </Badge>
                            ))}
                          </span>
                        </span>
                        {isChosen ? (
                          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-secondary" />
                        ) : (
                          <span className="mt-0.5 shrink-0 text-[11px] font-medium text-secondary">Wybierz</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}

      {summary && (
        <div
          role="status"
          className="mt-3 rounded-md border border-status-success/30 bg-status-success-muted px-3 py-2"
          data-testid="exercise-create-ai-fill-summary"
        >
          <p className="flex items-start gap-1.5 text-xs text-foreground">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-success" />
            <span>
              {summary.filled.length > 0
                ? `AI wypełniło: ${summary.filled.join(', ')}. Przejrzyj i popraw przed zapisem.`
                : 'AI nie miało nic do dodania. Pola zostały bez zmian.'}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {summary.filled.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onUndo}
                data-testid="exercise-create-ai-fill-undo"
              >
                <Undo2 />
                Cofnij
              </Button>
            )}
            {canGenerateImage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onGenerateImage}
                disabled={isGeneratingImage}
                data-testid="exercise-create-ai-fill-image-btn"
              >
                {isGeneratingImage ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                Zaproponuj obraz
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
