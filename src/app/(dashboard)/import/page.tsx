'use client';

import { useMemo, useCallback } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  FileUp,
  Sparkles,
  Dumbbell,
  Layers,
  FileText,
  ArrowLeft,
  Loader2,
  CheckCircle,
  X,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDocumentImport } from '@/hooks/useDocumentImport';
import { useOrganization } from '@/contexts/OrganizationContext';
import { GET_AVAILABLE_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import type { AvailableExercisesResponse } from '@/types/apollo';
import {
  DocumentDropzone,
  TextImportPanel,
  ImportProgress,
  SetReviewCard,
  NoteReviewCard,
  ImportSummary,
  PatientContextPanel,
  ImportReviewDashboard,
} from '@/features/import';
import { PageHeader, PageSheet } from '@/components/shared/page';

type StepId = 'upload' | 'processing' | 'review-exercises' | 'review-sets' | 'summary';

const stepConfig: { id: StepId; label: string; icon: React.ElementType }[] = [
  { id: 'upload', label: 'Wybierz plik', icon: FileUp },
  { id: 'processing', label: 'Analiza AI', icon: Sparkles },
  { id: 'review-exercises', label: 'Ćwiczenia', icon: Dumbbell },
  { id: 'review-sets', label: 'Zestawy', icon: Layers },
  { id: 'summary', label: 'Gotowe', icon: CheckCircle },
];

/**
 * Strona importu dokumentów fizjoterapeutycznych
 * Uproszczony UI dla użytkowników 45+
 */
export default function ImportPage() {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organizationId;
  const {
    step,
    inputMode,
    file,
    pastedText,
    isAnalyzing,
    isImporting,
    analysisResult,
    exerciseDecisions,
    setDecisions,
    noteDecisions,
    selectedPatientId,
    assignSetsToPatient,
    createSetAfterImport,
    error,
    importResult,
    stats,
    setFile,
    setInputMode,
    setPastedText,
    setPatientId,
    setAssignSetsToPatient,
    setCreateSetAfterImport,
    analyzeInput,
    updateExerciseDecision,
    updateSetDecision,
    updateNoteDecision,
    approveAllConfidentMatches,
    goNext,
    goBack,
    executeImport,
    reset,
    goToStep,
  } = useDocumentImport();

  const { data: availableExercisesData } = useQuery<AvailableExercisesResponse>(GET_AVAILABLE_EXERCISES_QUERY, {
    variables: { organizationId },
    skip: !organizationId,
  });

  // Current step index
  const currentStepIndex = useMemo(() => {
    return stepConfig.findIndex((s) => s.id === step);
  }, [step]);

  const hasSelectedPatient = Boolean(selectedPatientId);
  const skippedNotesCount = hasSelectedPatient ? 0 : stats.notesToCreate;
  const isUploadAnalyzeDisabled =
    isAnalyzing || (inputMode === 'file' ? !file : pastedText.trim().length < 30);
  const availableExercisesForFallback = useMemo(() => {
    return (availableExercisesData?.availableExercises ?? []).map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      imageUrl: exercise.imageUrl || exercise.thumbnailUrl,
    }));
  }, [availableExercisesData]);

  // Handler kliknięcia w krok (nawigacja wstecz)
  const handleStepClick = useCallback(
    (stepId: StepId, index: number) => {
      // Można klikać tylko w ukończone kroki
      if (index < currentStepIndex && goToStep) {
        goToStep(stepId);
      }
    },
    [currentStepIndex, goToStep]
  );

  return (
    <PageSheet contentClassName="gap-6" data-testid="import-page">
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            Import dokumentów
            <Badge variant="info" className="text-[12px]" data-testid="import-experimental-badge">
              Eksperymentalne
            </Badge>
          </span>
        }
        titleTestId="import-page-title"
        subtitle={
          <>
            Wybierz plik albo wklej tekst. AI zaproponuje ćwiczenia i zestawy.{' '}
            <span data-testid="import-experimental-note">Wyniki AI wymagają potwierdzenia przed importem.</span>
          </>
        }
      />

      {/* Stepper - większy, czytelniejszy */}
      <nav aria-label="Kroki importu" data-testid="import-step-indicator">
        <div className="flex items-center">
          {stepConfig.map((s, index) => {
            const Icon = s.icon;
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            const isClickable = isCompleted && !isAnalyzing && !isImporting;
            const stepCircleClass =
              isActive || isCompleted ? 'bg-tint-fill text-on-tint' : 'bg-fill-tertiary text-label-secondary';
            const stepLabelClass = isActive ? 'text-foreground font-semibold' : isCompleted ? 'text-foreground' : 'text-label-secondary';

            return (
              <div
                key={s.id}
                className={cn(
                  'flex flex-1 items-center',
                  index < stepConfig.length - 1 &&
                    'after:mx-2 after:h-px after:flex-1 after:transition-colors after:duration-200',
                  index < stepConfig.length - 1 && (isCompleted ? 'after:bg-tint' : 'after:bg-separator')
                )}
              >
                <button
                  type="button"
                  data-testid={`import-step-${s.id}-btn`}
                  onClick={() => handleStepClick(s.id, index)}
                  disabled={!isClickable}
                  className={cn(
                    'flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-3 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive && 'bg-tint-muted',
                    isClickable && 'cursor-pointer hover:bg-fill-quaternary',
                    !isClickable && !isActive && 'cursor-default'
                  )}
                >
                  {/* Ikona kroku - większa */}
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
                      stepCircleClass
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>

                  {/* Etykieta - zawsze widoczna */}
                  <span
                    className={cn(
                      'text-[13px] transition-colors duration-200 hidden sm:block',
                      stepLabelClass
                    )}
                  >
                    {s.label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Error message */}
      {error && (
        <Card className="bg-status-danger-muted">
          <CardContent className="flex items-center gap-3 p-4">
            <X className="h-5 w-5 text-status-danger shrink-0" aria-hidden="true" />
            <p className="text-[15px] text-status-danger" role="alert">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Step content */}
      <div className="min-h-[400px]">
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-bold text-foreground mb-2">Wybierz dokument do analizy</h2>
                  <p className="text-muted-foreground">Plik albo tekst - dalszy proces będzie taki sam.</p>
                </div>

                <Tabs
                  value={inputMode}
                  onValueChange={(value) => setInputMode(value as 'file' | 'text')}
                  data-testid="import-input-mode-tabs"
                >
                  <TabsList className="grid w-full grid-cols-2" data-testid="import-input-mode-tabs-list">
                    <TabsTrigger value="file" data-testid="import-mode-file-tab">
                      Prześlij plik
                    </TabsTrigger>
                    <TabsTrigger value="text" data-testid="import-mode-text-tab">
                      Wklej tekst
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="file" className="mt-4">
                    <DocumentDropzone file={file} onFileSelect={setFile} disabled={isAnalyzing} />
                  </TabsContent>

                  <TabsContent value="text" className="mt-4">
                    <TextImportPanel text={pastedText} onTextChange={setPastedText} disabled={isAnalyzing} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Processing */}
        {step === 'processing' && <ImportProgress />}

        {/* Step 3: Review Exercises - New Review Dashboard */}
        {step === 'review-exercises' && analysisResult && (
          <ImportReviewDashboard
            exercises={analysisResult.exercises}
            matchSuggestions={analysisResult.matchSuggestions}
            decisions={exerciseDecisions}
            onDecisionChange={updateExerciseDecision}
            onApproveAllConfident={approveAllConfidentMatches}
            onNext={goNext}
            createSetAfterImport={createSetAfterImport}
            onCreateSetChange={setCreateSetAfterImport}
            disabled={isAnalyzing}
          />
        )}

        {/* Step 4: Review Sets & Notes */}
        {step === 'review-sets' && analysisResult && (
          <div className="space-y-8">
            {/* Patient Context Panel */}
            {analysisResult.clinicalNotes.length > 0 && (
              <PatientContextPanel
                detectedPatientName={analysisResult.documentInfo.patientName}
                selectedPatientId={selectedPatientId}
                onPatientChange={setPatientId}
                assignSetsToPatient={assignSetsToPatient}
                onAssignSetsChange={setAssignSetsToPatient}
                notesToCreateCount={stats.notesToCreate}
                disabled={isImporting}
              />
            )}

            {/* Exercise Sets */}
            {analysisResult.exerciseSets.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet/20">
                    <Layers className="h-5 w-5 text-violet" />
                  </div>
                  Zestawy ćwiczeń ({analysisResult.exerciseSets.length})
                </h3>

                <div className="space-y-3">
                  {analysisResult.exerciseSets.map((set) => (
                    <SetReviewCard
                      key={set.tempId}
                      exerciseSet={set}
                      exercises={analysisResult.exercises}
                      exerciseDecisions={exerciseDecisions}
                      decision={setDecisions[set.tempId]}
                      onDecisionChange={(d) => updateSetDecision(set.tempId, d)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Clinical Notes */}
            {analysisResult.clinicalNotes.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-warning-muted">
                    <FileText className="h-5 w-5 text-status-warning" />
                  </div>
                  Notatki ({analysisResult.clinicalNotes.length})
                  {!selectedPatientId && (
                    <Badge variant="secondary" className="ml-2 bg-warning/20 text-warning border-0">
                      Wymaga pacjenta
                    </Badge>
                  )}
                </h3>

                <div className="space-y-3">
                  {analysisResult.clinicalNotes.map((note) => (
                    <NoteReviewCard
                      key={note.tempId}
                      note={note}
                      decision={noteDecisions[note.tempId]}
                      onDecisionChange={(d) => updateNoteDecision(note.tempId, d)}
                      disabled={!selectedPatientId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {analysisResult.exerciseSets.length === 0 && analysisResult.clinicalNotes.length === 0 && (
              <Card>
                <CardContent className="py-16 text-center">
                  <Layers className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
                  <p className="text-lg text-muted-foreground">Nie znaleziono zestawów ani notatek</p>
                  <p className="text-sm text-muted-foreground mt-2">Możesz kontynuować z samymi ćwiczeniami</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 5: Summary */}
        {step === 'summary' && (
          <ImportSummary
            result={importResult}
            onReset={reset}
            notesSkippedDueToNoPatient={!hasSelectedPatient && stats.notesToCreate > 0}
            skippedNotesCount={skippedNotesCount}
          />
        )}
      </div>

      {/* Navigation buttons - większe, czytelniejsze */}
      {/* Note: review-exercises step has its own sticky footer */}
      {step !== 'processing' && step !== 'summary' && step !== 'review-exercises' && (
        <div className="mt-10 flex items-center justify-between border-t border-border/60 pt-6">
          <Button
            variant="outline"
            size="lg"
            data-testid="import-back-btn"
            onClick={step === 'upload' ? undefined : goBack}
            disabled={step === 'upload' || isAnalyzing || isImporting}
            className="gap-2 h-12 px-6"
          >
            <ArrowLeft className="h-5 w-5" />
            Wstecz
          </Button>

          <div className="flex items-center gap-4">
            {step === 'upload' && (
              <Button
                size="lg"
                onClick={() => analyzeInput({ availableExercises: availableExercisesForFallback })}
                disabled={isUploadAnalyzeDisabled}
                className="gap-2 h-12 px-8"
                data-testid="import-analyze-btn"
              >
                {isAnalyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                {inputMode === 'file' ? 'Analizuj dokument' : 'Analizuj tekst'}
              </Button>
            )}

            {step === 'review-sets' && (
              <Button
                size="lg"
                onClick={executeImport}
                disabled={isImporting}
                className="gap-2 h-12 px-8"
                data-testid="import-execute-btn"
              >
                {isImporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                Importuj dane
              </Button>
            )}
          </div>
        </div>
      )}
    </PageSheet>
  );
}
