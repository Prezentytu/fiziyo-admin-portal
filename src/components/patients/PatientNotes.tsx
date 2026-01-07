'use client';

import { useState, useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { StickyNote, Pencil, Save, X, Loader2, Plus, Sparkles, Maximize2, FileText, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { UPDATE_PATIENT_NOTES_MUTATION } from '@/graphql/mutations/therapists.mutations';
import { GET_ALL_THERAPIST_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { aiService } from '@/services/aiService';
import type { ClinicalNoteAction } from '@/types/ai.types';

interface PatientNotesProps {
  notes?: string;
  therapistId: string;
  patientId: string;
  organizationId: string;
  lastUpdated?: string;
  onUpdate?: () => void;
  /** Kontekst pacjenta dla AI (diagnoza, historia) */
  patientContext?: string;
  /** Kontekst zestawu ćwiczeń dla AI */
  exerciseSetContext?: string;
}

// AI action configurations
const AI_ACTIONS: { id: ClinicalNoteAction; label: string; icon: typeof Sparkles; description: string }[] = [
  { id: 'expand', label: 'Rozwiń', icon: Maximize2, description: 'Dodaj szczegóły medyczne' },
  { id: 'summarize', label: 'Podsumuj', icon: FileText, description: 'Streść notatkę' },
  { id: 'suggest', label: 'Sugestie', icon: Lightbulb, description: 'Co dopisać?' },
];

export function PatientNotes({
  notes: initialNotes,
  therapistId,
  patientId,
  organizationId,
  lastUpdated,
  onUpdate,
  patientContext,
  exerciseSetContext,
}: PatientNotesProps) {
  const [isEditing, setIsEditing] = useState(false);
  // Track edits separately - only used when editing
  const [editedNotes, setEditedNotes] = useState('');
  // AI state
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiKeyPoints, setAiKeyPoints] = useState<string[]>([]);

  // Start editing with current notes
  const startEditing = () => {
    setEditedNotes(initialNotes || '');
    setIsEditing(true);
    setAiKeyPoints([]);
  };

  // Handle AI action
  const handleAIAction = useCallback(async (action: ClinicalNoteAction) => {
    if (isAILoading) return;

    setIsAILoading(true);
    setAiKeyPoints([]);

    try {
      const result = await aiService.assistClinicalNote(
        editedNotes,
        action,
        patientContext,
        exerciseSetContext
      );

      if (result) {
        setEditedNotes(result.suggestedNote);
        if (result.keyPoints.length > 0) {
          setAiKeyPoints(result.keyPoints);
        }
        toast.success(
          action === 'expand' ? 'Notatka rozwinięta' :
          action === 'summarize' ? 'Notatka podsumowana' :
          'Sugestie dodane'
        );
      } else {
        toast.error('Nie udało się uzyskać sugestii AI');
      }
    } catch {
      toast.error('Błąd AI - spróbuj ponownie');
    } finally {
      setIsAILoading(false);
    }
  }, [editedNotes, patientContext, exerciseSetContext, isAILoading]);

  const [updateNotes, { loading }] = useMutation(UPDATE_PATIENT_NOTES_MUTATION, {
    refetchQueries: [{ query: GET_ALL_THERAPIST_PATIENTS_QUERY, variables: { therapistId, organizationId } }],
  });

  const handleSave = async () => {
    try {
      await updateNotes({
        variables: {
          therapistId,
          patientId,
          organizationId,
          notes: editedNotes.trim(),
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
    setIsEditing(false);
  };

  const hasNotes = (initialNotes || '').trim().length > 0;

  return (
    <Card className="border-border/60" data-testid="patient-notes-section">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <StickyNote className="h-4 w-4 text-warning" />
            Notatki
          </CardTitle>
          {!isEditing && (
            <Button variant="ghost" size="sm" onClick={startEditing} className="h-8 text-xs gap-1.5" data-testid="patient-notes-add-btn">
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
              value={editedNotes}
              onChange={(e) => setEditedNotes(e.target.value)}
              placeholder="Dodaj notatki o pacjencie, historię leczenia, obserwacje..."
              className="min-h-[120px] resize-none"
              autoFocus
              disabled={isAILoading}
              data-testid="patient-notes-input"
            />

            {/* AI Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>AI:</span>
              </div>
              {AI_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 text-xs gap-1",
                      isAILoading && "opacity-50"
                    )}
                    onClick={() => handleAIAction(action.id)}
                    disabled={isAILoading || editedNotes.trim().length < 5}
                    title={action.description}
                  >
                    {isAILoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Icon className="h-3 w-3" />
                    )}
                    {action.label}
                  </Button>
                );
              })}
            </div>

            {/* AI Key Points */}
            {aiKeyPoints.length > 0 && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" />
                  Kluczowe punkty:
                </p>
                <div className="flex flex-wrap gap-1">
                  {aiKeyPoints.map((point, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[10px]">
                      {point}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{editedNotes.length} znaków</p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel} disabled={loading || isAILoading}>
                  <X className="mr-1 h-3.5 w-3.5" />
                  Anuluj
                </Button>
                <Button size="sm" onClick={handleSave} disabled={loading || isAILoading} data-testid="patient-notes-save-btn">
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
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{initialNotes}</p>
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
            <p className="text-sm text-muted-foreground mb-3">Brak notatek o tym pacjencie</p>
            <Button variant="outline" size="sm" onClick={startEditing} className="text-xs">
              <Plus className="mr-1 h-3.5 w-3.5" />
              Dodaj notatkę
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
