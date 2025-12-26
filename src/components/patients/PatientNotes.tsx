'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client/react';
import { StickyNote, Pencil, Save, X, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { UPDATE_PATIENT_NOTES_MUTATION } from '@/graphql/mutations/therapists.mutations';
import { GET_ALL_THERAPIST_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';

interface PatientNotesProps {
  notes?: string;
  therapistId: string;
  patientId: string;
  organizationId: string;
  lastUpdated?: string;
  onUpdate?: () => void;
}

export function PatientNotes({
  notes: initialNotes,
  therapistId,
  patientId,
  organizationId,
  lastUpdated,
  onUpdate,
}: PatientNotesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes || '');

  // Update local state when props change
  useEffect(() => {
    setNotes(initialNotes || '');
  }, [initialNotes]);

  const [updateNotes, { loading }] = useMutation(UPDATE_PATIENT_NOTES_MUTATION, {
    refetchQueries: [
      { query: GET_ALL_THERAPIST_PATIENTS_QUERY, variables: { therapistId, organizationId } },
    ],
  });

  const handleSave = async () => {
    try {
      await updateNotes({
        variables: {
          therapistId,
          patientId,
          organizationId,
          notes: notes.trim(),
        },
      });
      toast.success('Notatki zostały zapisane');
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Błąd zapisywania notatek:', error);
      toast.error('Nie udało się zapisać notatek');
    }
  };

  const handleCancel = () => {
    setNotes(initialNotes || '');
    setIsEditing(false);
  };

  const hasNotes = notes.trim().length > 0;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <StickyNote className="h-4 w-4 text-warning" />
            Notatki kliniczne
          </CardTitle>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 text-xs gap-1.5"
            >
              {hasNotes ? (
                <>
                  <Pencil className="h-3.5 w-3.5" />
                  Edytuj
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Dodaj
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dodaj notatki o pacjencie, historię leczenia, obserwacje..."
              className="min-h-[120px] resize-none"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {notes.length} znaków
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Anuluj
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1 h-3.5 w-3.5" />
                  )}
                  Zapisz
                </Button>
              </div>
            </div>
          </div>
        ) : hasNotes ? (
          <div className="space-y-2">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {notes}
            </p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground">
                Ostatnia aktualizacja: {format(new Date(lastUpdated), 'd MMMM yyyy, HH:mm', { locale: pl })}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="h-10 w-10 mx-auto rounded-xl bg-surface-light flex items-center justify-center mb-3">
              <StickyNote className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Brak notatek o tym pacjencie
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-xs"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Dodaj notatkę
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

