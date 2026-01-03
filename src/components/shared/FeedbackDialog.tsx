'use client';

/**
 * FeedbackDialog - Dialog do zgłaszania feedbacku
 * Umożliwia dodanie opisu, typu zgłoszenia i zdjęć
 *
 * 2025 Best Practices:
 * - Plain function (no React.FC)
 * - Design tokens from CSS variables
 * - Null-safe props pattern
 */

import { useState, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { Send, Info } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileUpload } from '@/components/shared/FileUpload';
import { cn } from '@/lib/utils';
import { sendFeedbackToDiscord, createFeedbackMetadata } from '@/services/feedbackService';
import type {
  FeedbackType,
  FeedbackData,
  FeedbackImage,
  FeedbackUserRole,
} from '@/types/feedback.types';
import { FEEDBACK_TYPE_CONFIG } from '@/types/feedback.types';

// ============================================================================
// TYPES
// ============================================================================

interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  screenName?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_IMAGES = 3;
const MAX_DESCRIPTION_LENGTH = 2000;
const MIN_DESCRIPTION_LENGTH = 10;

// ============================================================================
// COMPONENT
// ============================================================================

export function FeedbackDialog({
  isOpen,
  onClose,
  screenName,
}: FeedbackDialogProps) {
  // === HOOKS ===
  const { user } = useUser();
  const pathname = usePathname();

  // === STATE ===
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('bug');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);

  // === MEMOIZED VALUES ===
  const canSubmit = useMemo(() => {
    return (
      description.trim().length >= MIN_DESCRIPTION_LENGTH && !isSending
    );
  }, [description, isSending]);


  const images: FeedbackImage[] = useMemo(() => {
    return files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
  }, [files]);

  // === HANDLERS ===

  const resetForm = useCallback(() => {
    setFeedbackType('bug');
    setDescription('');
    setFiles([]);
  }, []);

  const handleClose = useCallback(() => {
    if (isSending) return;
    resetForm();
    onClose();
  }, [isSending, resetForm, onClose]);

  const handleFilesChange = useCallback((newFiles: File[]) => {
    // Limit do MAX_IMAGES
    setFiles(newFiles.slice(0, MAX_IMAGES));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !user) return;

    setIsSending(true);

    try {
      // Pobierz aktualną nazwę ekranu
      const currentScreen = screenName || getScreenNameFromPath(pathname);

      const feedbackData: FeedbackData = {
        type: feedbackType,
        description: description.trim(),
        images,
        user: {
          userId: user.id,
          email: user.primaryEmailAddress?.emailAddress || 'unknown@email.com',
          role: 'physio' as FeedbackUserRole, // W admin portalu domyślnie fizjoterapeuta
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
        },
        metadata: createFeedbackMetadata(currentScreen),
      };

      const result = await sendFeedbackToDiscord(feedbackData);

      if (result.success) {
        toast.success('Dziękujemy! 🎉', {
          description: 'Twoje zgłoszenie zostało wysłane.',
        });
        handleClose();
      } else {
        toast.error('Błąd wysyłania', {
          description: result.error || 'Nie udało się wysłać zgłoszenia.',
        });
      }
    } catch (error) {
      console.error('[FeedbackDialog] Error submitting feedback:', error);
      toast.error('Błąd', {
        description: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.',
      });
    } finally {
      setIsSending(false);
    }
  }, [
    canSubmit,
    user,
    feedbackType,
    description,
    images,
    screenName,
    pathname,
    handleClose,
  ]);

  // === RENDER ===

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Zgłoś uwagę</DialogTitle>
          <DialogDescription>
            Pomóż nam ulepszyć aplikację - zgłoś błąd, sugestię lub zadaj pytanie.
          </DialogDescription>
        </DialogHeader>

        {/* Two-column layout on desktop */}
        <div className="grid gap-6 py-4 md:grid-cols-2">
          {/* Left column - Type & Description */}
          <div className="space-y-4">
            {/* Typ zgłoszenia */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Typ zgłoszenia
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(FEEDBACK_TYPE_CONFIG) as FeedbackType[]).map(
                  (type) => {
                    const config = FEEDBACK_TYPE_CONFIG[type];
                    const isSelected = feedbackType === type;
                    const Icon = config.icon;

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFeedbackType(type)}
                        className={cn(
                          'flex flex-col items-center justify-center gap-1 rounded-lg border p-2.5 transition-all duration-200',
                          isSelected
                            ? 'border-2 shadow-sm'
                            : 'border-border hover:border-muted-foreground/50'
                        )}
                        style={{
                          borderColor: isSelected ? config.color : undefined,
                          backgroundColor: isSelected
                            ? `${config.color}15`
                            : undefined,
                        }}
                      >
                        <Icon
                          className="h-5 w-5"
                          style={{
                            color: isSelected
                              ? config.color
                              : 'var(--muted-foreground)',
                          }}
                        />
                        <span
                          className={cn(
                            'text-xs font-medium',
                            isSelected
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          )}
                        >
                          {config.label}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Opis */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Opis problemu
              </label>
              <Textarea
                placeholder="Opisz co się dzieje, jak odtworzyć problem, czego oczekujesz..."
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))
                }
                rows={8}
                className="resize-none"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {description.length > 0 &&
                    description.length < MIN_DESCRIPTION_LENGTH && (
                      <span className="text-warning">
                        Min. {MIN_DESCRIPTION_LENGTH} znaków
                      </span>
                    )}
                </span>
                <span>
                  {description.length} / {MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
            </div>
          </div>

          {/* Right column - Images & Info */}
          <div className="space-y-4">
            {/* Zdjęcia */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Zdjęcia (opcjonalne) • {files.length}/{MAX_IMAGES}
              </label>
              <FileUpload
                accept="image/*"
                multiple
                maxFiles={MAX_IMAGES}
                maxSizeMB={5}
                value={files}
                onChange={handleFilesChange}
                preview
              />
            </div>

            {/* Info box */}
            <div className="flex items-start gap-2 rounded-lg bg-info/10 p-3">
              <Info className="h-4 w-4 text-info mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Twoje zgłoszenie zostanie wysłane do zespołu deweloperskiego wraz
                z informacją o Twoim koncie.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSending}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="gap-2"
          >
            {isSending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Wysyłanie...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Wyślij zgłoszenie
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Konwertuje ścieżkę URL na czytelną nazwę ekranu
 */
function getScreenNameFromPath(pathname: string): string {
  const pathMap: Record<string, string> = {
    '/': 'Dashboard',
    '/exercises': 'Ćwiczenia',
    '/exercise-sets': 'Zestawy ćwiczeń',
    '/patients': 'Pacjenci',
    '/organization': 'Organizacja',
    '/settings': 'Ustawienia',
    '/subscription': 'Subskrypcja',
  };

  // Sprawdź dokładne dopasowanie
  if (pathMap[pathname]) {
    return pathMap[pathname];
  }

  // Sprawdź prefiks dla szczegółów
  for (const [path, name] of Object.entries(pathMap)) {
    if (pathname.startsWith(path) && path !== '/') {
      return `${name} (szczegóły)`;
    }
  }

  return pathname;
}

