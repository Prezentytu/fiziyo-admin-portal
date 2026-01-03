'use client';

import { useState, useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { Loader2, Tag, X } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils';

import { UPDATE_TREATMENT_CONTEXT_MUTATION } from '@/graphql/mutations/therapists.mutations';
import { GET_ALL_THERAPIST_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';

// Quick tags - same as in PatientForm
const QUICK_TAG_GROUPS = [
  {
    label: 'Obszar',
    tags: ['Kolano', 'Kręgosłup', 'Bark', 'Biodro', 'Stopa', 'Nadgarstek', 'Szyja'],
  },
  {
    label: 'Typ',
    tags: ['Rehabilitacja', 'Profilaktyka', 'Ból', 'Pourazowe', 'Pooperacyjne'],
  },
] as const;

interface EditContextLabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string;
  patientName: string;
  currentLabel?: string;
  therapistId: string;
  organizationId: string;
  onSuccess?: () => void;
}

export function EditContextLabelDialog({
  open,
  onOpenChange,
  assignmentId,
  patientName,
  currentLabel,
  therapistId,
  organizationId,
  onSuccess,
}: Readonly<EditContextLabelDialogProps>) {
  // Compute initial value - don't show default "Leczenie podstawowe"
  const initialLabel = currentLabel === 'Leczenie podstawowe' ? '' : (currentLabel || '');
  const [label, setLabel] = useState(initialLabel);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Track if dialog was previously closed to reset on reopen
  const [wasOpen, setWasOpen] = useState(false);

  if (open && !wasOpen) {
    // Dialog just opened - reset to current value
    setLabel(initialLabel);
    setWasOpen(true);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  // Check if there are unsaved changes
  const hasChanges = label.trim() !== initialLabel.trim();

  const [updateContext, { loading }] = useMutation(UPDATE_TREATMENT_CONTEXT_MUTATION, {
    refetchQueries: [
      { query: GET_ALL_THERAPIST_PATIENTS_QUERY, variables: { therapistId, organizationId } },
    ],
  });

  const handleCloseAttempt = useCallback(() => {
    if (hasChanges) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [hasChanges, onOpenChange]);

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    setLabel(initialLabel); // Reset to original
    onOpenChange(false);
  }, [initialLabel, onOpenChange]);

  const handleSave = async () => {
    try {
      await updateContext({
        variables: {
          assignmentId,
          contextLabel: label.trim() || null,
        },
      });
      toast.success('Notatka została zaktualizowana');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Błąd podczas aktualizacji notatki:', error);
      toast.error('Nie udało się zaktualizować notatki');
    }
  };

  const isTagAdded = (tag: string): boolean => {
    return label.toLowerCase().includes(tag.toLowerCase());
  };

  const handleToggleTag = (tag: string) => {
    if (isTagAdded(tag)) {
      // Remove tag
      const parts = label.split(',').map(p => p.trim()).filter(p => p.toLowerCase() !== tag.toLowerCase());
      setLabel(parts.join(', '));
    } else {
      // Add tag
      const newValue = label.trim() ? `${label.trim()}, ${tag}` : tag;
      setLabel(newValue);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={() => handleCloseAttempt()}>
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            handleCloseAttempt();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Edytuj notatkę
            </DialogTitle>
            <DialogDescription>
              Zmień notatkę dla pacjenta {patientName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="contextLabel">Notatka</Label>
              <Input
                id="contextLabel"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="np. Ból pleców, Rehabilitacja kolana..."
                className="h-11"
                autoFocus
              />
            </div>

            {/* Quick Tags */}
            <div className="space-y-3">
              {QUICK_TAG_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-xs text-muted-foreground mb-1.5">{group.label}:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.tags.map((tag) => {
                      const isAdded = isTagAdded(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleTag(tag)}
                          className={cn(
                            "inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full transition-all duration-200",
                            isAdded
                              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                              : "bg-surface-light text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          )}
                        >
                          {tag}
                          {isAdded && <X className="h-3 w-3 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleCloseAttempt} disabled={loading}>
                Anuluj
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Zapisz
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm close dialog */}
      <ConfirmDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        title="Porzucić zmiany?"
        description="Masz niezapisane zmiany. Czy na pewno chcesz zamknąć bez zapisywania?"
        confirmText="Tak, zamknij"
        cancelText="Kontynuuj edycję"
        variant="destructive"
        onConfirm={handleConfirmClose}
      />
    </>
  );
}
