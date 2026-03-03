'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';
import { Loader2, Save, CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AutoSaveIndicator, SaveStatus } from '@/components/shared/AutoSaveIndicator';

import {
  CREATE_CLINICAL_NOTE_MUTATION,
  UPDATE_CLINICAL_NOTE_MUTATION,
  SIGN_CLINICAL_NOTE_MUTATION,
} from '@/graphql/mutations/clinicalNotes.mutations';
import {
  GET_PATIENT_CLINICAL_NOTES_QUERY,
  GET_CLINICAL_NOTE_BY_ID_QUERY,
} from '@/graphql/queries/clinicalNotes.queries';

import type { ClinicalNote, ClinicalNoteSections, VisitType } from '@/types/clinical.types';

interface CreateClinicalNoteResponse {
  createClinicalNote: ClinicalNote;
}

interface UpdateClinicalNoteResponse {
  updateClinicalNote: ClinicalNote;
}

interface ClinicalNoteEditorProps {
  readonly patientId: string;
  readonly therapistId: string;
  readonly organizationId: string;
  readonly existingNote?: ClinicalNote | null;
  readonly onSave?: (note: ClinicalNote) => void;
  readonly onCancel?: () => void;
  readonly onDirtyChange?: (isDirty: boolean) => void;
}

function omitTypename<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(omitTypename) as T;
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key !== '__typename') result[key] = omitTypename(value);
    }
    return result as T;
  }
  return obj;
}

function getNoteContentFromSections(sections?: ClinicalNoteSections | null): string {
  if (!sections) return '';
  const interview = sections.interview;
  if (interview?.additionalNotes) return interview.additionalNotes;
  const parts: string[] = [];
  if (interview?.mainComplaint) parts.push(interview.mainComplaint);
  if (interview?.previousTreatment) parts.push(`Leczenie: ${interview.previousTreatment}`);
  if (interview?.comorbidities) parts.push(`Choroby/leki: ${interview.comorbidities}`);
  if (sections.examination?.posture) parts.push(`Badanie: ${sections.examination.posture}`);
  if (sections.diagnosis?.clinicalReasoning) parts.push(`Rozpoznanie: ${sections.diagnosis.clinicalReasoning}`);
  if (sections.treatmentPlan?.shortTermGoals) parts.push(`Cele: ${sections.treatmentPlan.shortTermGoals}`);
  if (sections.treatmentPlan?.homeRecommendations) parts.push(`Zalecenia: ${sections.treatmentPlan.homeRecommendations}`);
  return parts.join('\n\n');
}

const VISIT_TYPES: { value: VisitType; label: string }[] = [
  { value: 'INITIAL', label: 'Pierwsza wizyta' },
  { value: 'FOLLOWUP', label: 'Wizyta kontrolna' },
  { value: 'DISCHARGE', label: 'Wizyta końcowa' },
  { value: 'CONSULTATION', label: 'Konsultacja' },
];

export function ClinicalNoteEditor({
  patientId,
  organizationId,
  existingNote,
  onSave,
  onDirtyChange,
}: ClinicalNoteEditorProps) {
  const isEditing = !!existingNote;

  const [createNote, { loading: creating }] = useMutation(CREATE_CLINICAL_NOTE_MUTATION);
  const [updateNote, { loading: updating }] = useMutation(UPDATE_CLINICAL_NOTE_MUTATION);
  const [signNote, { loading: signing }] = useMutation(SIGN_CLINICAL_NOTE_MUTATION);

  const { data: fullNoteData, loading: loadingFullNote } = useQuery(GET_CLINICAL_NOTE_BY_ID_QUERY, {
    variables: { id: existingNote?.id || '' },
    skip: !existingNote?.id,
  });

  const fullNote = (fullNoteData as { clinicalNoteById?: ClinicalNote })?.clinicalNoteById;
  const noteData = fullNote || existingNote;
  const isSigned = noteData?.status === 'SIGNED';
  const isLoading = creating || updating || signing;
  const isLoadingData = loadingFullNote && !!existingNote?.id;

  const [visitType, setVisitType] = useState<VisitType>(existingNote?.visitType || 'INITIAL');
  const [visitDate, setVisitDate] = useState(
    existingNote?.visitDate
      ? format(new Date(existingNote.visitDate), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd')
  );
  const [title, setTitle] = useState(existingNote?.title || '');
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const noteIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loadingFullNote && existingNote?.id) return;
    setVisitType(noteData?.visitType || 'INITIAL');
    setVisitDate(
      noteData?.visitDate
        ? format(new Date(noteData.visitDate), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd')
    );
    setTitle(noteData?.title || '');
    setContent(getNoteContentFromSections(noteData?.sections));
    setIsDirty(false);
    noteIdRef.current = noteData?.id || null;
  }, [noteData, loadingFullNote, existingNote?.id]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const performSave = useCallback(
    async (shouldSign: boolean) => {
      const sectionInput = omitTypename({
        ...noteData?.sections,
        interview: {
          ...noteData?.sections?.interview,
          additionalNotes: content,
        },
      });

      if (noteIdRef.current) {
        await updateNote({
          variables: {
            id: noteIdRef.current,
            visitType,
            visitDate: new Date(visitDate).toISOString(),
            title: title || null,
            sections: sectionInput,
          },
        });
      } else {
        const { data } = await createNote({
          variables: {
            patientId,
            organizationId,
            visitType,
            visitDate: new Date(visitDate).toISOString(),
            title: title || null,
            sections: sectionInput,
          },
        });
        const res = data as CreateClinicalNoteResponse;
        noteIdRef.current = res.createClinicalNote.id;
      }

      setSaveStatus('saved');
      setLastSavedAt(new Date());
      setIsDirty(false);
      setTimeout(() => setSaveStatus('idle'), 2000);

      if (shouldSign && noteIdRef.current) {
        await signNote({
          variables: { id: noteIdRef.current },
          refetchQueries: [{ query: GET_PATIENT_CLINICAL_NOTES_QUERY, variables: { patientId, organizationId } }],
        });
        toast.success('Notatka została podpisana');
      }
    },
    [
      content,
      visitType,
      visitDate,
      title,
      noteData?.sections,
      updateNote,
      createNote,
      signNote,
      patientId,
      organizationId,
    ]
  );

  useEffect(() => {
    if (!isDirty || isSigned) return;
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => {
      setSaveStatus('saving');
      performSave(false).catch(() => setSaveStatus('error'));
    }, 30000);
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [isDirty, isSigned, performSave]);

  const handleVisitTypeChange = (value: VisitType) => {
    setVisitType(value);
    setIsDirty(true);
  };

  const handleVisitDateChange = (value: string) => {
    setVisitDate(value);
    setIsDirty(true);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setIsDirty(true);
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    setIsDirty(true);
  };

  const handleSave = async (shouldSign = false) => {
    try {
      setSaveStatus('saving');
      const sectionInput = omitTypename({
        ...noteData?.sections,
        interview: {
          ...noteData?.sections?.interview,
          additionalNotes: content,
        },
      });

      let result: ClinicalNote;

      if (noteIdRef.current) {
        const { data } = await updateNote({
          variables: {
            id: noteIdRef.current,
            visitType,
            visitDate: new Date(visitDate).toISOString(),
            title: title || null,
            sections: sectionInput,
          },
          refetchQueries: [{ query: GET_PATIENT_CLINICAL_NOTES_QUERY, variables: { patientId, organizationId } }],
        });
        result = (data as UpdateClinicalNoteResponse).updateClinicalNote;
        toast.success('Notatka zapisana');
      } else {
        const { data } = await createNote({
          variables: {
            patientId,
            organizationId,
            visitType,
            visitDate: new Date(visitDate).toISOString(),
            title: title || null,
            sections: sectionInput,
          },
          refetchQueries: [{ query: GET_PATIENT_CLINICAL_NOTES_QUERY, variables: { patientId, organizationId } }],
        });
        result = (data as CreateClinicalNoteResponse).createClinicalNote;
        noteIdRef.current = result.id;
        toast.success('Notatka utworzona');
      }

      if (shouldSign && result) {
        await signNote({
          variables: { id: result.id },
          refetchQueries: [{ query: GET_PATIENT_CLINICAL_NOTES_QUERY, variables: { patientId, organizationId } }],
        });
        toast.success('Notatka podpisana');
      }

      setSaveStatus('saved');
      setLastSavedAt(new Date());
      setIsDirty(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
      onSave?.(result);
    } catch (error) {
      console.error('Błąd zapisu notatki:', error);
      toast.error('Nie udało się zapisać notatki');
      setSaveStatus('error');
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Ładowanie...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0" data-testid="clinical-note-editor">
      <div className="flex items-center justify-between p-6 pb-4 shrink-0">
        <div>
          <h2 className="text-lg font-semibold" data-testid="clinical-note-title">
            {isEditing ? 'Notatka' : 'Nowa notatka'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isEditing && existingNote
              ? `Utworzona: ${format(new Date(existingNote.createdAt), 'd MMMM yyyy', { locale: pl })}`
              : 'Opisz wizytę w dowolny sposób'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSigned && (
            <Badge variant="success" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Podpisana
            </Badge>
          )}
          <AutoSaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
        </div>
      </div>

      <div className="overflow-y-auto px-6 pb-4 space-y-4">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="flex flex-col gap-2.5">
            <Label className="text-sm font-medium">Typ wizyty</Label>
            <Select
              value={visitType}
              onValueChange={(v) => handleVisitTypeChange(v as VisitType)}
              disabled={isSigned}
            >
              <SelectTrigger className="h-11" data-testid="clinical-note-visit-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2.5">
            <Label className="text-sm font-medium">Data</Label>
            <Input
              type="date"
              value={visitDate}
              onChange={(e) => handleVisitDateChange(e.target.value)}
              disabled={isSigned}
              className="h-11"
              data-testid="clinical-note-visit-date-input"
            />
          </div>
          <div className="flex flex-col gap-2.5">
            <Label className="text-sm font-medium">Tytuł</Label>
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="np. Kolano, bark"
              disabled={isSigned}
              className="h-11"
              data-testid="clinical-note-title-input"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <Label htmlFor="clinical-note-content" className="text-sm font-medium">
            Treść notatki
          </Label>
          <Textarea
            id="clinical-note-content"
            data-testid="clinical-note-content-input"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Opisz wizytę: objawy, badanie, wnioski, zalecenia..."
            disabled={isSigned}
            className="min-h-[280px] resize-y text-base"
          />
        </div>
      </div>

      <div className="shrink-0 border-t border-border py-4 px-6 flex items-center justify-end gap-3">
        {!isSigned && (
          <>
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={isLoading}
              className="gap-2"
              data-testid="clinical-note-save-draft-btn"
            >
              {saveStatus === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Zapisz
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={isLoading}
              className="gap-2"
              data-testid="clinical-note-sign-btn"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Podpisz i zakończ
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
