'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  ClipboardList,
  Stethoscope,
  FileText,
  Target,
  Activity,
  Save,
  Loader2,
  CheckCircle,
  Copy,
  ArrowLeft,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { SectionAccordion } from './SectionAccordion';
import { InterviewSectionForm } from './sections/InterviewSectionForm';
import { ExaminationSectionForm } from './sections/ExaminationSectionForm';
import { DiagnosisSectionForm } from './sections/DiagnosisSectionForm';
import { TreatmentPlanSectionForm } from './sections/TreatmentPlanSectionForm';
import { VisitProgressSectionForm } from './sections/VisitProgressSectionForm';

import {
  CREATE_CLINICAL_NOTE_MUTATION,
  UPDATE_CLINICAL_NOTE_MUTATION,
  SIGN_CLINICAL_NOTE_MUTATION,
} from '@/graphql/mutations/clinicalNotes.mutations';
import {
  GET_PATIENT_CLINICAL_NOTES_QUERY,
  GET_LAST_CLINICAL_NOTE_QUERY,
  GET_CLINICAL_NOTE_BY_ID_QUERY,
} from '@/graphql/queries/clinicalNotes.queries';

import type {
  ClinicalNote,
  ClinicalNoteSections,
  VisitType,
  InterviewSection,
  ExaminationSection,
  DiagnosisSection,
  TreatmentPlanSection,
  VisitProgressSection,
  VISIT_TYPE_LABELS,
  STATUS_LABELS,
} from '@/types/clinical.types';

interface ClinicalNoteEditorProps {
  patientId: string;
  therapistId: string;
  organizationId: string;
  existingNote?: ClinicalNote | null;
  onSave?: (note: ClinicalNote) => void;
  onCancel?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

// Helper to remove __typename from objects before sending to mutation
function omitTypename<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(omitTypename) as T;
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key !== '__typename') {
        result[key] = omitTypename(value);
      }
    }
    return result as T;
  }
  return obj;
}

const VISIT_TYPES: { value: VisitType; label: string }[] = [
  { value: 'INITIAL', label: 'Pierwsza wizyta' },
  { value: 'FOLLOWUP', label: 'Wizyta kontrolna' },
  { value: 'DISCHARGE', label: 'Wizyta końcowa' },
  { value: 'CONSULTATION', label: 'Konsultacja' },
];

export function ClinicalNoteEditor({
  patientId,
  therapistId,
  organizationId,
  existingNote,
  onSave,
  onCancel,
  onDirtyChange,
}: ClinicalNoteEditorProps) {
  const isEditing = !!existingNote;

  // Mutations
  const [createNote, { loading: creating }] = useMutation(CREATE_CLINICAL_NOTE_MUTATION);
  const [updateNote, { loading: updating }] = useMutation(UPDATE_CLINICAL_NOTE_MUTATION);
  const [signNote, { loading: signing }] = useMutation(SIGN_CLINICAL_NOTE_MUTATION);

  // Query for full note data (existingNote from list has only basic fields)
  const { data: fullNoteData, loading: loadingFullNote } = useQuery(GET_CLINICAL_NOTE_BY_ID_QUERY, {
    variables: { id: existingNote?.id || '' },
    skip: !existingNote?.id,
  });

  const fullNote = (fullNoteData as { clinicalNoteById?: ClinicalNote })?.clinicalNoteById;

  // Query for last note (for copy feature)
  const { data: lastNoteData } = useQuery(GET_LAST_CLINICAL_NOTE_QUERY, {
    variables: { patientId, therapistId, organizationId },
    skip: isEditing,
  });

  const lastNote = (lastNoteData as { lastClinicalNote?: ClinicalNote })?.lastClinicalNote;

  // Use fullNote when available (has sections), otherwise existingNote (basic data)
  const noteData = fullNote || existingNote;
  const isSigned = noteData?.status === 'SIGNED';
  const isLoading = creating || updating || signing;
  const isLoadingData = loadingFullNote && !!existingNote?.id;

  // Form state
  const [visitType, setVisitType] = useState<VisitType>(existingNote?.visitType || 'INITIAL');
  const [visitDate, setVisitDate] = useState(
    existingNote?.visitDate 
      ? format(new Date(existingNote.visitDate), 'yyyy-MM-dd') 
      : format(new Date(), 'yyyy-MM-dd')
  );
  const [title, setTitle] = useState(existingNote?.title || '');
  const [sections, setSections] = useState<ClinicalNoteSections>(existingNote?.sections || {});

  // Accordion state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    interview: !isEditing || !!existingNote?.sections?.interview,
    examination: false,
    diagnosis: false,
    treatmentPlan: false,
    visitProgress: visitType === 'FOLLOWUP',
  });

  // Dirty state - track if form has unsaved changes
  const [isDirty, setIsDirty] = useState(false);

  // Sync state when note data changes
  useEffect(() => {
    if (loadingFullNote && existingNote?.id) return; // Wait for full data to load
    
    setVisitType(noteData?.visitType || 'INITIAL');
    setVisitDate(
      noteData?.visitDate 
        ? format(new Date(noteData.visitDate), 'yyyy-MM-dd') 
        : format(new Date(), 'yyyy-MM-dd')
    );
    setTitle(noteData?.title || '');
    setSections(noteData?.sections || {});
    setOpenSections({
      interview: !noteData || !!noteData?.sections?.interview,
      examination: !!noteData?.sections?.examination,
      diagnosis: !!noteData?.sections?.diagnosis,
      treatmentPlan: !!noteData?.sections?.treatmentPlan,
      visitProgress: noteData?.visitType === 'FOLLOWUP' || noteData?.visitType === 'DISCHARGE',
    });
    setIsDirty(false); // Reset dirty state when data loads
  }, [noteData, loadingFullNote, existingNote?.id]);

  // Notify parent when dirty state changes
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Section update handlers
  const updateSection = useCallback(<K extends keyof ClinicalNoteSections>(
    sectionKey: K,
    value: ClinicalNoteSections[K]
  ) => {
    setSections((prev) => ({ ...prev, [sectionKey]: value }));
    setIsDirty(true);
  }, []);

  // Handle form field changes with dirty tracking
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

  // Handle close - parent will handle confirmation if dirty
  const handleClose = () => {
    onCancel?.();
  };

  // Calculate completion percentage
  const calculateCompletion = useCallback(() => {
    let completed = 0;
    let total = 4; // interview, examination, diagnosis, treatmentPlan

    if (visitType === 'FOLLOWUP') {
      total = 5; // + visitProgress
    }

    if (sections.interview?.mainComplaint) completed++;
    if (sections.examination?.posture || (sections.examination?.specialTests?.length ?? 0) > 0) completed++;
    if ((sections.diagnosis?.icd10Codes?.length ?? 0) > 0) completed++;
    if (sections.treatmentPlan?.shortTermGoals || sections.treatmentPlan?.interventions?.length) completed++;
    if (visitType === 'FOLLOWUP' && sections.visitProgress?.techniques) completed++;

    return Math.round((completed / total) * 100);
  }, [sections, visitType]);

  const completionPercentage = calculateCompletion();

  // Check if section has content
  const hasInterviewContent = !!(sections.interview?.mainComplaint || sections.interview?.painLocation?.length);
  const hasExaminationContent = !!(sections.examination?.posture || sections.examination?.specialTests?.length);
  const hasDiagnosisContent = !!(sections.diagnosis?.icd10Codes?.length);
  const hasTreatmentPlanContent = !!(sections.treatmentPlan?.shortTermGoals || sections.treatmentPlan?.interventions?.length);
  const hasVisitProgressContent = !!(sections.visitProgress?.techniques);

  // Save handler
  const handleSave = async (shouldSign = false) => {
    try {
      let result: ClinicalNote;

      // Remove __typename from all nested objects before sending to mutation
      const sectionInput = omitTypename({
        interview: sections.interview,
        examination: sections.examination,
        diagnosis: sections.diagnosis,
        treatmentPlan: sections.treatmentPlan,
        visitProgress: sections.visitProgress,
      });

      if (isEditing && existingNote) {
        const { data } = await updateNote({
          variables: {
            id: existingNote.id,
            visitType,
            visitDate: new Date(visitDate).toISOString(),
            title: title || null,
            sections: sectionInput,
          },
          refetchQueries: [
            { query: GET_PATIENT_CLINICAL_NOTES_QUERY, variables: { patientId, organizationId } },
          ],
        });
        result = data.updateClinicalNote;
        toast.success('Notatka została zaktualizowana');
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
          refetchQueries: [
            { query: GET_PATIENT_CLINICAL_NOTES_QUERY, variables: { patientId, organizationId } },
          ],
        });
        result = data.createClinicalNote;
        toast.success('Notatka została utworzona');
      }

      if (shouldSign && result) {
        await signNote({
          variables: { id: result.id },
          refetchQueries: [
            { query: GET_PATIENT_CLINICAL_NOTES_QUERY, variables: { patientId, organizationId } },
          ],
        });
        toast.success('Notatka została podpisana');
      }

      setIsDirty(false); // Reset dirty state after successful save
      onSave?.(result);
    } catch (error) {
      console.error('Błąd zapisu notatki:', error);
      toast.error('Nie udało się zapisać notatki');
    }
  };

  // Copy from last note
  const copyFromLastNote = () => {
    if (!lastNote?.sections) return;

    setSections({
      interview: lastNote.sections.interview,
      examination: lastNote.sections.examination,
      diagnosis: lastNote.sections.diagnosis,
      treatmentPlan: lastNote.sections.treatmentPlan,
    });
    toast.success('Skopiowano dane z poprzedniej wizyty');
  };

  // Show loading state while fetching full note data
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Ładowanie dokumentacji...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h2 className="text-lg font-semibold">
              {isEditing ? 'Edytuj notatkę' : 'Nowa notatka kliniczna'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isEditing && existingNote
                ? `Utworzona: ${format(new Date(existingNote.createdAt), 'd MMMM yyyy', { locale: pl })}`
                : 'Dokumentacja wizyty fizjoterapeutycznej'}
            </p>
          </div>
        </div>
        {isSigned && (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Podpisana
          </Badge>
        )}
      </div>

      {/* Progress bar */}
      <Card className="border-border/40">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Kompletność dokumentacji</span>
            <span className="text-sm font-semibold">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </CardContent>
      </Card>

      {/* Basic info */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Informacje podstawowe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Typ wizyty</Label>
              <Select
                value={visitType}
                onValueChange={(v) => handleVisitTypeChange(v as VisitType)}
                disabled={isSigned}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data wizyty</Label>
              <Input
                type="date"
                value={visitDate}
                onChange={(e) => handleVisitDateChange(e.target.value)}
                disabled={isSigned}
              />
            </div>
            <div className="space-y-2">
              <Label>Tytuł (opcjonalnie)</Label>
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="np. Wizyta kontrolna - kolano"
                disabled={isSigned}
              />
            </div>
          </div>

          {/* Copy from last note */}
          {!isEditing && lastNote && (
            <Button variant="outline" size="sm" onClick={copyFromLastNote} className="gap-2">
              <Copy className="h-4 w-4" />
              Kopiuj z poprzedniej wizyty ({format(new Date(lastNote.visitDate), 'd MMM yyyy', { locale: pl })})
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="space-y-3">
        {/* Wywiad */}
        <SectionAccordion
          title="Wywiad (badanie podmiotowe)"
          icon={<ClipboardList className="h-4 w-4" />}
          isOpen={openSections.interview}
          onOpenChange={(open) => setOpenSections((prev) => ({ ...prev, interview: open }))}
          isComplete={hasInterviewContent && !!sections.interview?.mainComplaint}
          hasContent={hasInterviewContent}
        >
          <InterviewSectionForm
            data={sections.interview || {}}
            onChange={(data) => updateSection('interview', data)}
            disabled={isSigned}
          />
        </SectionAccordion>

        {/* Badanie przedmiotowe */}
        <SectionAccordion
          title="Badanie przedmiotowe"
          icon={<Stethoscope className="h-4 w-4" />}
          isOpen={openSections.examination}
          onOpenChange={(open) => setOpenSections((prev) => ({ ...prev, examination: open }))}
          isComplete={hasExaminationContent}
          hasContent={hasExaminationContent}
        >
          <ExaminationSectionForm
            data={sections.examination || {}}
            onChange={(data) => updateSection('examination', data)}
            disabled={isSigned}
          />
        </SectionAccordion>

        {/* Rozpoznanie */}
        <SectionAccordion
          title="Rozpoznanie (ICD-10 / ICF)"
          icon={<FileText className="h-4 w-4" />}
          isOpen={openSections.diagnosis}
          onOpenChange={(open) => setOpenSections((prev) => ({ ...prev, diagnosis: open }))}
          isComplete={hasDiagnosisContent}
          hasContent={hasDiagnosisContent}
        >
          <DiagnosisSectionForm
            data={sections.diagnosis || {}}
            onChange={(data) => updateSection('diagnosis', data)}
            disabled={isSigned}
          />
        </SectionAccordion>

        {/* Plan terapii */}
        <SectionAccordion
          title="Plan terapii"
          icon={<Target className="h-4 w-4" />}
          isOpen={openSections.treatmentPlan}
          onOpenChange={(open) => setOpenSections((prev) => ({ ...prev, treatmentPlan: open }))}
          isComplete={hasTreatmentPlanContent}
          hasContent={hasTreatmentPlanContent}
        >
          <TreatmentPlanSectionForm
            data={sections.treatmentPlan || {}}
            onChange={(data) => updateSection('treatmentPlan', data)}
            disabled={isSigned}
          />
        </SectionAccordion>

        {/* Przebieg wizyty (dla wizyt kontrolnych) */}
        {(visitType === 'FOLLOWUP' || visitType === 'DISCHARGE') && (
          <SectionAccordion
            title="Przebieg wizyty"
            icon={<Activity className="h-4 w-4" />}
            isOpen={openSections.visitProgress}
            onOpenChange={(open) => setOpenSections((prev) => ({ ...prev, visitProgress: open }))}
            isComplete={hasVisitProgressContent}
            hasContent={hasVisitProgressContent}
          >
            <VisitProgressSectionForm
              data={sections.visitProgress || {}}
              onChange={(data) => updateSection('visitProgress', data)}
              disabled={isSigned}
            />
          </SectionAccordion>
        )}
      </div>

      {/* Actions */}
      {!isSigned && (
        <div className="flex items-center justify-between pt-4 border-t border-border/40">
          <div className="text-sm text-muted-foreground">
            {isEditing ? 'Zmiany zostaną zapisane' : 'Notatka zostanie zapisana jako wersja robocza'}
          </div>
          <div className="flex items-center gap-3">
            {onCancel && (
              <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
                Anuluj
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Zapisz wersję roboczą
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={isLoading || completionPercentage < 50}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Zapisz i podpisz
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}

