'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Calendar,
  CheckCircle,
  Clock,
  Pencil,
  MoreHorizontal,
  Trash2,
  Eye,
  ChevronRight,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { ClinicalNoteEditor } from './ClinicalNoteEditor';
import { cn } from '@/lib/utils';

import { GET_PATIENT_CLINICAL_NOTES_QUERY } from '@/graphql/queries/clinicalNotes.queries';
import { DELETE_CLINICAL_NOTE_MUTATION } from '@/graphql/mutations/clinicalNotes.mutations';
import type { ClinicalNote, VisitType, ClinicalNoteStatus } from '@/types/clinical.types';

interface ClinicalNotesListProps {
  patientId: string;
  therapistId: string;
  organizationId: string;
  patientName?: string;
}

const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  INITIAL: 'Pierwsza wizyta',
  FOLLOWUP: 'Wizyta kontrolna',
  DISCHARGE: 'Wizyta końcowa',
  CONSULTATION: 'Konsultacja',
};

const STATUS_CONFIG: Record<ClinicalNoteStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' }> = {
  DRAFT: { label: 'Wersja robocza', variant: 'warning' },
  COMPLETED: { label: 'Zakończona', variant: 'secondary' },
  SIGNED: { label: 'Podpisana', variant: 'success' },
};

export function ClinicalNotesList({
  patientId,
  therapistId,
  organizationId,
  patientName,
}: ClinicalNotesListProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<ClinicalNote | null>(null);
  const [deletingNote, setDeletingNote] = useState<ClinicalNote | null>(null);
  const [editorIsDirty, setEditorIsDirty] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Fetch notes
  const { data, loading, error } = useQuery(GET_PATIENT_CLINICAL_NOTES_QUERY, {
    variables: { patientId, organizationId },
  });

  // Delete mutation
  const [deleteNote, { loading: deleting }] = useMutation(DELETE_CLINICAL_NOTE_MUTATION, {
    refetchQueries: [
      { query: GET_PATIENT_CLINICAL_NOTES_QUERY, variables: { patientId, organizationId } },
    ],
  });

  const notes = (data as { patientClinicalNotes?: ClinicalNote[] })?.patientClinicalNotes || [];

  const handleNewNote = () => {
    setSelectedNote(null);
    setIsEditorOpen(true);
  };

  const handleEditNote = (note: ClinicalNote) => {
    setSelectedNote(note);
    setIsEditorOpen(true);
  };

  const handleViewNote = (note: ClinicalNote) => {
    setSelectedNote(note);
    setIsEditorOpen(true);
  };

  const handleDeleteNote = async () => {
    if (!deletingNote) return;

    try {
      await deleteNote({ variables: { id: deletingNote.id } });
      toast.success('Notatka została usunięta');
      setDeletingNote(null);
    } catch (err) {
      console.error('Błąd usuwania notatki:', err);
      toast.error('Nie udało się usunąć notatki');
    }
  };

  const handleSaveComplete = () => {
    setEditorIsDirty(false);
    setIsEditorOpen(false);
    setSelectedNote(null);
  };

  // Handle editor close with dirty check
  const handleEditorClose = () => {
    if (editorIsDirty) {
      setShowExitConfirm(true);
    } else {
      setIsEditorOpen(false);
      setSelectedNote(null);
    }
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    setEditorIsDirty(false);
    setIsEditorOpen(false);
    setSelectedNote(null);
  };

  // Controlled dialog open change - block if dirty
  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      handleEditorClose();
    } else {
      setIsEditorOpen(true);
    }
  };

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-8 text-center">
          <p className="text-destructive">Błąd ładowania notatek: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <FileText className="h-4 w-4 text-secondary" />
              Dokumentacja kliniczna
              {notes.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {notes.length}
                </Badge>
              )}
            </CardTitle>
            <Button size="sm" onClick={handleNewNote} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Nowa wizyta
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : notes.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Brak dokumentacji"
              description="Utwórz pierwszą notatkę kliniczną dla tego pacjenta"
              actionLabel="Utwórz notatkę"
              onAction={handleNewNote}
            />
          ) : (
            <div className="space-y-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={cn(
                    'group flex items-center gap-3 p-3 rounded-xl border transition-all duration-200',
                    note.status === 'SIGNED'
                      ? 'border-border/40 bg-surface/30 hover:bg-surface/50'
                      : 'border-border/60 bg-surface hover:border-primary/30 hover:shadow-sm cursor-pointer'
                  )}
                  onClick={() => note.status !== 'SIGNED' ? handleEditNote(note) : handleViewNote(note)}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      note.status === 'SIGNED'
                        ? 'bg-primary/10'
                        : note.status === 'DRAFT'
                        ? 'bg-warning/10'
                        : 'bg-secondary/10'
                    )}
                  >
                    {note.status === 'SIGNED' ? (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    ) : (
                      <Clock className="h-5 w-5 text-warning" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground truncate">
                        {note.title || VISIT_TYPE_LABELS[note.visitType]}
                      </span>
                      <Badge
                        variant={STATUS_CONFIG[note.status].variant}
                        className="text-[10px]"
                      >
                        {STATUS_CONFIG[note.status].label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(note.visitDate), 'd MMMM yyyy', { locale: pl })}
                      {note.therapist?.fullname && (
                        <>
                          <span>•</span>
                          <span>{note.therapist.fullname}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {note.status !== 'SIGNED' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditNote(note);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewNote(note)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Podgląd
                        </DropdownMenuItem>
                        {note.status === 'DRAFT' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeletingNote(note)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Usuń
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent 
          className="max-w-4xl h-[90vh] flex flex-col p-0"
          hideCloseButton
          onInteractOutside={(e) => {
            // Zawsze blokuj zamknięcie przez kliknięcie poza dialog
            e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            handleEditorClose();
          }}
        >
          {/* Custom close button - always visible */}
          <button
            onClick={handleEditorClose}
            className="absolute right-4 top-4 z-20 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Zamknij</span>
          </button>
          
          <DialogHeader className="sr-only">
            <DialogTitle>
              {selectedNote ? 'Edycja notatki klinicznej' : 'Nowa notatka kliniczna'}
            </DialogTitle>
          </DialogHeader>
          <ClinicalNoteEditor
            patientId={patientId}
            therapistId={therapistId}
            organizationId={organizationId}
            existingNote={selectedNote}
            onSave={handleSaveComplete}
            onCancel={handleEditorClose}
            onDirtyChange={setEditorIsDirty}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingNote}
        onOpenChange={(open) => !open && setDeletingNote(null)}
        title="Usuń notatkę"
        description="Czy na pewno chcesz usunąć tę notatkę? Ta operacja jest nieodwracalna."
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleDeleteNote}
        isLoading={deleting}
      />

      {/* Exit Confirmation - unsaved changes */}
      <ConfirmDialog
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        title="Niezapisane zmiany"
        description="Masz niezapisane zmiany w dokumentacji. Czy na pewno chcesz wyjść bez zapisywania?"
        confirmText="Wyjdź bez zapisywania"
        cancelText="Zostań"
        variant="destructive"
        onConfirm={handleConfirmExit}
      />
    </>
  );
}

