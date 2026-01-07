'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  Loader2,
  CheckCircle,
  Copy,
  Calendar,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StepperHeader, Step } from './StepperHeader';
import { StepperFooter } from './StepperFooter';
import { SummaryStep } from './steps/SummaryStep';
import { AutoSaveIndicator, SaveStatus } from '@/components/shared/AutoSaveIndicator';
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
} from '@/types/clinical.types';

// Mutation response types
interface CreateClinicalNoteResponse {
  createClinicalNote: ClinicalNote;
}

interface UpdateClinicalNoteResponse {
  updateClinicalNote: ClinicalNote;
}

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

// Wizard steps configuration
const BASE_STEPS: Step[] = [
  { id: 'basic', label: 'Podstawowe', icon: Calendar },
  { id: 'interview', label: 'Wywiad', icon: ClipboardList },
  { id: 'examination', label: 'Badanie', icon: Stethoscope },
  { id: 'diagnosis', label: 'Rozpoznanie', icon: FileText },
  { id: 'treatment', label: 'Plan', icon: Target },
  { id: 'summary', label: 'Podsumowanie', icon: CheckCircle },
];

const FOLLOWUP_STEPS: Step[] = [
  { id: 'basic', label: 'Podstawowe', icon: Calendar },
  { id: 'interview', label: 'Wywiad', icon: ClipboardList },
  { id: 'examination', label: 'Badanie', icon: Stethoscope },
  { id: 'diagnosis', label: 'Rozpoznanie', icon: FileText },
  { id: 'treatment', label: 'Plan', icon: Target },
  { id: 'progress', label: 'Przebieg', icon: Activity },
  { id: 'summary', label: 'Podsumowanie', icon: CheckCircle },
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

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Form state
  const [visitType, setVisitType] = useState<VisitType>(existingNote?.visitType || 'INITIAL');
  const [visitDate, setVisitDate] = useState(
    existingNote?.visitDate
      ? format(new Date(existingNote.visitDate), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd')
  );
  const [title, setTitle] = useState(existingNote?.title || '');
  const [sections, setSections] = useState<ClinicalNoteSections>(existingNote?.sections || {});

  // Dirty state - track if form has unsaved changes
  const [isDirty, setIsDirty] = useState(false);

  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const noteIdRef = useRef<string | null>(null);

  // Get steps based on visit type
  const steps = (visitType === 'FOLLOWUP' || visitType === 'DISCHARGE') ? FOLLOWUP_STEPS : BASE_STEPS;
  const totalSteps = steps.length;

  // Sync state when note data changes
  useEffect(() => {
    if (loadingFullNote && existingNote?.id) return;

    setVisitType(noteData?.visitType || 'INITIAL');
    setVisitDate(
      noteData?.visitDate
        ? format(new Date(noteData.visitDate), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd')
    );
    setTitle(noteData?.title || '');
    setSections(noteData?.sections || {});
    setIsDirty(false);
    noteIdRef.current = noteData?.id || null;

    // Mark completed steps based on existing data
    const completed = new Set<number>();
    completed.add(0); // Basic info always completed if we have data
    if (noteData?.sections?.interview?.mainComplaint) completed.add(1);
    if (noteData?.sections?.examination?.posture || noteData?.sections?.examination?.specialTests?.length) completed.add(2);
    if (noteData?.sections?.diagnosis?.icd10Codes?.length) completed.add(3);
    if (noteData?.sections?.treatmentPlan?.shortTermGoals || noteData?.sections?.treatmentPlan?.interventions?.length) completed.add(4);
    setCompletedSteps(completed);
  }, [noteData, loadingFullNote, existingNote?.id]);

  // Notify parent when dirty state changes
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Auto-save effect
  useEffect(() => {
    if (!isDirty || isSigned) return;

    // Clear previous timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (30 seconds)
    autoSaveTimeoutRef.current = setTimeout(async () => {
      await performAutoSave();
    }, 30000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [isDirty, sections, visitType, visitDate, title]);

  // Auto-save function
  const performAutoSave = async () => {
    if (isSigned) return;

    setSaveStatus('saving');
    try {
      const sectionInput = omitTypename({
        interview: sections.interview,
        examination: sections.examination,
        diagnosis: sections.diagnosis,
        treatmentPlan: sections.treatmentPlan,
        visitProgress: sections.visitProgress,
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
        const response = data as CreateClinicalNoteResponse;
        noteIdRef.current = response.createClinicalNote.id;
      }

      setSaveStatus('saved');
      setLastSavedAt(new Date());
      setIsDirty(false);

      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveStatus('error');
    }
  };

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
    // Reset to first step when changing visit type
    setCurrentStep(0);
  };

  const handleVisitDateChange = (value: string) => {
    setVisitDate(value);
    setIsDirty(true);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setIsDirty(true);
  };

  // Calculate completion percentage
  const calculateCompletion = useCallback(() => {
    let completed = 0;
    let total = 4;

    if (visitType === 'FOLLOWUP' || visitType === 'DISCHARGE') {
      total = 5;
    }

    if (sections.interview?.mainComplaint) completed++;
    if (sections.examination?.posture || (sections.examination?.specialTests?.length ?? 0) > 0) completed++;
    if ((sections.diagnosis?.icd10Codes?.length ?? 0) > 0) completed++;
    if (sections.treatmentPlan?.shortTermGoals || sections.treatmentPlan?.interventions?.length) completed++;
    if ((visitType === 'FOLLOWUP' || visitType === 'DISCHARGE') && sections.visitProgress?.techniques) completed++;

    return Math.round((completed / total) * 100);
  }, [sections, visitType]);

  const completionPercentage = calculateCompletion();

  // Navigation handlers
  const handleNext = () => {
    // Mark current step as completed
    setCompletedSteps((prev) => new Set([...prev, currentStep]));

    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  // Save handler
  const handleSave = async (shouldSign = false) => {
    try {
      let result: ClinicalNote;

      const sectionInput = omitTypename({
        interview: sections.interview,
        examination: sections.examination,
        diagnosis: sections.diagnosis,
        treatmentPlan: sections.treatmentPlan,
        visitProgress: sections.visitProgress,
      });

      if (noteIdRef.current) {
        const { data } = await updateNote({
          variables: {
            id: noteIdRef.current,
            visitType,
            visitDate: new Date(visitDate).toISOString(),
            title: title || null,
            sections: sectionInput,
          },
          refetchQueries: [
            { query: GET_PATIENT_CLINICAL_NOTES_QUERY, variables: { patientId, organizationId } },
          ],
        });
        const response = data as UpdateClinicalNoteResponse;
        result = response.updateClinicalNote;
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
        const response = data as CreateClinicalNoteResponse;
        result = response.createClinicalNote;
        noteIdRef.current = result.id;
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

      setIsDirty(false);
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
    setIsDirty(true);
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

  // Render step content
  const renderStepContent = () => {
    const stepId = steps[currentStep]?.id;

    switch (stepId) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-2">Informacje podstawowe</h3>
              <p className="text-sm text-muted-foreground">
                Wybierz typ wizyty i datę
              </p>
            </div>

            <div className="max-w-md mx-auto space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Typ wizyty</Label>
                <Select
                  value={visitType}
                  onValueChange={(v) => handleVisitTypeChange(v as VisitType)}
                  disabled={isSigned}
                >
                  <SelectTrigger className="h-12" data-testid="clinical-note-visit-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value} className="py-3">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Data wizyty</Label>
                <Input
                  type="date"
                  value={visitDate}
                  onChange={(e) => handleVisitDateChange(e.target.value)}
                  disabled={isSigned}
                  className="h-12"
                  data-testid="clinical-note-visit-date-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Tytuł (opcjonalnie)</Label>
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="np. Wizyta kontrolna - kolano"
                  disabled={isSigned}
                  className="h-12"
                  data-testid="clinical-note-title-input"
                />
              </div>

              {/* Copy from last note */}
              {!isEditing && lastNote && (
                <Card className="border-primary/30 bg-primary/5 mt-6">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Poprzednia wizyta</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(lastNote.visitDate), 'd MMMM yyyy', { locale: pl })}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyFromLastNote}
                        className="gap-2"
                        data-testid="clinical-note-copy-from-last-btn"
                      >
                        <Copy className="h-4 w-4" />
                        Kopiuj dane
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        );

      case 'interview':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold mb-1">Wywiad (badanie podmiotowe)</h3>
              <p className="text-sm text-muted-foreground">
                Opisz dolegliwości i historię pacjenta
              </p>
            </div>
            <InterviewSectionForm
              data={sections.interview || {}}
              onChange={(data) => updateSection('interview', data)}
              disabled={isSigned}
            />
          </div>
        );

      case 'examination':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold mb-1">Badanie przedmiotowe</h3>
              <p className="text-sm text-muted-foreground">
                Wyniki badania fizycznego
              </p>
            </div>
            <ExaminationSectionForm
              data={sections.examination || {}}
              onChange={(data) => updateSection('examination', data)}
              disabled={isSigned}
            />
          </div>
        );

      case 'diagnosis':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold mb-1">Rozpoznanie</h3>
              <p className="text-sm text-muted-foreground">
                Kody ICD-10, ICF i rozumowanie kliniczne
              </p>
            </div>
            <DiagnosisSectionForm
              data={sections.diagnosis || {}}
              onChange={(data) => updateSection('diagnosis', data)}
              disabled={isSigned}
            />
          </div>
        );

      case 'treatment':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold mb-1">Plan terapii</h3>
              <p className="text-sm text-muted-foreground">
                Cele i planowane interwencje
              </p>
            </div>
            <TreatmentPlanSectionForm
              data={sections.treatmentPlan || {}}
              onChange={(data) => updateSection('treatmentPlan', data)}
              disabled={isSigned}
            />
          </div>
        );

      case 'progress':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold mb-1">Przebieg wizyty</h3>
              <p className="text-sm text-muted-foreground">
                Opis wykonanych zabiegów i reakcji pacjenta
              </p>
            </div>
            <VisitProgressSectionForm
              data={sections.visitProgress || {}}
              onChange={(data) => updateSection('visitProgress', data)}
              disabled={isSigned}
            />
          </div>
        );

      case 'summary':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold mb-1">Podsumowanie</h3>
              <p className="text-sm text-muted-foreground">
                Sprawdź dokumentację przed podpisaniem
              </p>
            </div>
            <SummaryStep
              visitType={visitType}
              visitDate={visitDate}
              title={title}
              sections={sections}
              onEditStep={handleStepClick}
              disabled={isSigned}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="clinical-note-editor">
      {/* Header with title and auto-save indicator */}
      <div className="flex items-center justify-between p-6 pb-4 shrink-0">
        <div>
          <h2 className="text-lg font-semibold" data-testid="clinical-note-title">
            {isEditing ? 'Edytuj wizytę' : 'Nowa wizyta'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isEditing && existingNote
              ? `Utworzona: ${format(new Date(existingNote.createdAt), 'd MMMM yyyy', { locale: pl })}`
              : 'Wypełnij dokumentację krok po kroku'}
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

      {/* Stepper header */}
      <div className="px-6 pb-4 shrink-0">
        <StepperHeader
          steps={steps}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          readOnly={isSigned}
        />
      </div>

      {/* Step content - scrollable area */}
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {renderStepContent()}
      </div>

      {/* Stepper footer - sticky at bottom */}
      <StepperFooter
        currentStep={currentStep}
        totalSteps={totalSteps}
        onBack={handleBack}
        onNext={handleNext}
        onSaveDraft={() => handleSave(false)}
        onSignAndComplete={() => handleSave(true)}
        isLoading={isLoading}
        isSaving={saveStatus === 'saving'}
        canSign={completionPercentage >= 25}
        readOnly={isSigned}
      />
    </div>
  );
}
