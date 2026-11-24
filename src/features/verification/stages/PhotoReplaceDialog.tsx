'use client';

import { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ImageStylePicker } from '@/features/exercises/ImageStylePicker';
import type { ImageStyle } from '@/types/ai.types';

const PHOTO_PROBLEM_OPTIONS = [
  'Dłonie i palce',
  'Napis w tle',
  'Inna osoba lub strój',
  'Ustawienie stawów',
  'Inny ruch niż na nagraniu',
] as const;

interface PhotoReplaceDialogProps {
  open: boolean;
  photoLabel: string;
  /** Nowe zdjęcie (dodawane) zamiast zastępowania istniejącego: bez listy problemów i bez „Wgraj własne”. */
  isNew?: boolean;
  isGenerating: boolean;
  imageStyle: ImageStyle;
  onImageStyleChange: (style: ImageStyle) => void;
  onOpenChange: (open: boolean) => void;
  onGenerate: (problems: string[], note: string) => void;
  onUploadOwn: (file: File) => void;
}

export function PhotoReplaceDialog({
  open,
  photoLabel,
  isNew = false,
  isGenerating,
  imageStyle,
  onImageStyleChange,
  onOpenChange,
  onGenerate,
  onUploadOwn,
}: PhotoReplaceDialogProps) {
  const [problems, setProblems] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetSelection = () => {
    setProblems([]);
    setNote('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetSelection();
    onOpenChange(nextOpen);
  };

  const toggleProblem = (problem: string) =>
    setProblems((previous) =>
      previous.includes(problem) ? previous.filter((entry) => entry !== problem) : [...previous, problem]
    );

  const handleGenerate = () => {
    if (isGenerating) return;
    onGenerate(problems, note.trim());
    resetSelection();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUploadOwn(file);
      resetSelection();
    }
    event.target.value = '';
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      handleGenerate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg" onKeyDown={handleKeyDown} data-testid="verification-photo-replace-dialog">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Nowe zdjęcie' : `Nowe zdjęcie: ${photoLabel}`}</DialogTitle>
          <DialogDescription>
            {isNew
              ? 'Wybierz styl i opisz, co ma być na zdjęciu. Wynik zobaczysz przed zapisaniem.'
              : 'Zaznacz, co jest nie tak. Agent weźmie to pod uwagę, a nowe zdjęcie zobaczysz przed zapisaniem.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-label-secondary">Styl</span>
          <div>
            <ImageStylePicker
              value={imageStyle}
              onChange={onImageStyleChange}
              disabled={isGenerating}
              testIdPrefix="verification-photo-style"
            />
          </div>
        </div>
        {!isNew && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Co jest nie tak">
            {PHOTO_PROBLEM_OPTIONS.map((problem, problemIndex) => {
              const selected = problems.includes(problem);
              return (
                <button
                  key={problem}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleProblem(problem)}
                  className={cn(
                    'h-8 rounded-full px-3 text-[14px] font-semibold transition-colors',
                    selected ? 'bg-tint-muted text-tint' : 'bg-fill-tertiary text-foreground hover:bg-fill-quaternary'
                  )}
                  data-testid={`verification-photo-problem-${problemIndex}-btn`}
                >
                  {problem}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="verification-photo-replace-note" className="text-[13px] text-label-secondary">
            {isNew ? 'Wskazówki dla AI (opcjonalnie)' : 'Co jeszcze poprawić'}
          </Label>
          <Textarea
            id="verification-photo-replace-note"
            value={note}
            rows={3}
            placeholder={
              isNew
                ? 'np. widok z boku, pozycja końcowa, guma zaczepiona o drabinkę'
                : 'np. kolano nie może wychodzić przed palce'
            }
            onChange={(event) => setNote(event.target.value)}
            data-testid="verification-photo-replace-note-input"
          />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          data-testid="verification-photo-replace-file-input"
        />
        <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleOpenChange(false)}
            data-testid="verification-photo-replace-cancel-btn"
          >
            Anuluj
          </Button>
          <div className="flex gap-2">
            {!isNew && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating}
                data-testid="verification-photo-replace-upload-btn"
              >
                Wgraj własne
              </Button>
            )}
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              data-testid="verification-photo-replace-generate-btn"
            >
              {isGenerating && <Loader2 className="animate-spin" />}
              {isNew ? 'Wygeneruj zdjęcie' : 'Wygeneruj nowe zdjęcie'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
