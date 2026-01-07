'use client';

import { useMemo, useCallback } from 'react';
import {
  FileUp,
  Sparkles,
  Dumbbell,
  Layers,
  FileText,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle,
  Link2,
  X,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDocumentImport } from '@/hooks/useDocumentImport';
import {
  DocumentDropzone,
  ImportProgress,
  ExerciseReviewCard,
  SetReviewCard,
  NoteReviewCard,
  ImportSummary,
  PatientContextPanel,
  BulkActionsToolbar,
} from '@/components/import';

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
  const {
    step,
    file,
    isAnalyzing,
    isImporting,
    analysisResult,
    exerciseDecisions,
    setDecisions,
    noteDecisions,
    selectedPatientId,
    assignSetsToPatient,
    exerciseFilter,
    error,
    importResult,
    stats,
    canProceed,
    filteredExercises,
    setFile,
    setPatientId,
    setAssignSetsToPatient,
    setExerciseFilter,
    analyzeDocument,
    updateExerciseDecision,
    updateSetDecision,
    updateNoteDecision,
    setAllExercisesCreate,
    setAllExercisesSkip,
    useAllMatchedExercises,
    goNext,
    goBack,
    executeImport,
    reset,
    goToStep,
  } = useDocumentImport();

  // Current step index
  const currentStepIndex = useMemo(() => {
    return stepConfig.findIndex((s) => s.id === step);
  }, [step]);

  // Czy pokazać warning o notatkach bez pacjenta
  const showNotesWarning = stats.notesToCreate > 0 && !selectedPatientId;

  // Handler kliknięcia w krok (nawigacja wstecz)
  const handleStepClick = useCallback((stepId: StepId, index: number) => {
    // Można klikać tylko w ukończone kroki
    if (index < currentStepIndex && goToStep) {
      goToStep(stepId);
    }
  }, [currentStepIndex, goToStep]);

  return (
    <div className="min-h-screen" data-testid="import-page">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="import-page-title">Import dokumentów</h1>
            <p className="text-muted-foreground">
              Wyciągnij ćwiczenia, zestawy i notatki z dokumentów PDF lub Excel
            </p>
          </div>
        </div>
      </div>

      {/* Stepper - większy, czytelniejszy */}
      <div className="mb-10">
        <div className="flex items-center">
          {stepConfig.map((s, index) => {
            const Icon = s.icon;
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            const isClickable = isCompleted && !isAnalyzing && !isImporting;

            return (
              <div
                key={s.id}
                className={cn(
                  'flex flex-1 items-center',
                  index < stepConfig.length - 1 && 'after:mx-3 after:h-0.5 after:flex-1 after:transition-colors after:duration-200',
                  index < stepConfig.length - 1 && (isCompleted ? 'after:bg-primary' : 'after:bg-border')
                )}
              >
                <button
                  type="button"
                  onClick={() => handleStepClick(s.id, index)}
                  disabled={!isClickable}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200',
                    isActive && 'bg-primary/10',
                    isClickable && 'cursor-pointer hover:bg-surface-light',
                    !isClickable && !isActive && 'cursor-default'
                  )}
                >
                  {/* Ikona kroku - większa */}
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
                      isActive
                        ? 'bg-primary text-white'
                        : isCompleted
                        ? 'bg-primary text-white'
                        : 'bg-surface-light text-muted-foreground'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>

                  {/* Etykieta - zawsze widoczna */}
                  <span
                    className={cn(
                      'text-sm font-medium transition-colors duration-200 hidden sm:block',
                      isActive
                        ? 'text-foreground'
                        : isCompleted
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    {s.label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <Card className="mb-6 border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-4 p-5">
            <X className="h-6 w-6 text-destructive shrink-0" />
            <p className="text-base text-destructive">{error}</p>
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
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    Wybierz dokument do analizy
                  </h2>
                  <p className="text-muted-foreground">
                    AI przeanalizuje plik i znajdzie ćwiczenia, zestawy oraz notatki
                  </p>
                </div>

                <DocumentDropzone
                  file={file}
                  onFileSelect={setFile}
                  disabled={isAnalyzing}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Processing */}
        {step === 'processing' && <ImportProgress />}

        {/* Step 3: Review Exercises */}
        {step === 'review-exercises' && analysisResult && (
          <div className="space-y-6">
            {/* Stats - prostsze */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                    <Dumbbell className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalExercises}</p>
                    <p className="text-sm text-muted-foreground">Znaleziono</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.exercisesToCreate}</p>
                    <p className="text-sm text-muted-foreground">Do utworzenia</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20">
                    <Link2 className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.exercisesToReuse}</p>
                    <p className="text-sm text-muted-foreground">Istniejących</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-light">
                    <X className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.exercisesToSkip}</p>
                    <p className="text-sm text-muted-foreground">Pominiętych</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Document info */}
            {analysisResult.documentInfo.patientName && (
              <Card className="bg-surface-light">
                <CardContent className="flex flex-wrap items-center gap-4 p-5">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    Informacje z dokumentu:
                  </span>
                  {analysisResult.documentInfo.patientName && (
                    <Badge variant="secondary" className="text-sm">
                      Pacjent: {analysisResult.documentInfo.patientName}
                    </Badge>
                  )}
                  {analysisResult.documentInfo.date && (
                    <Badge variant="secondary" className="text-sm">
                      Data: {analysisResult.documentInfo.date}
                    </Badge>
                  )}
                  {analysisResult.documentInfo.therapistName && (
                    <Badge variant="secondary" className="text-sm">
                      Terapeuta: {analysisResult.documentInfo.therapistName}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Bulk Actions Toolbar */}
            <BulkActionsToolbar
              totalCount={stats.totalExercises}
              matchedCount={stats.exercisesWithMatches}
              createCount={stats.exercisesToCreate}
              reuseCount={stats.exercisesToReuse}
              skipCount={stats.exercisesToSkip}
              activeFilter={exerciseFilter}
              onFilterChange={setExerciseFilter}
              onSetAllCreate={setAllExercisesCreate}
              onSetAllSkip={setAllExercisesSkip}
              onUseAllMatched={useAllMatchedExercises}
              disabled={isAnalyzing}
            />

            {/* Exercises list */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                {exerciseFilter === 'all'
                  ? `Znalezione ćwiczenia (${filteredExercises.length})`
                  : `Filtrowane ćwiczenia (${filteredExercises.length} z ${stats.totalExercises})`
                }
              </h3>

              <div className="space-y-3">
                {filteredExercises.map((exercise) => (
                  <ExerciseReviewCard
                    key={exercise.tempId}
                    exercise={exercise}
                    matchSuggestions={analysisResult.matchSuggestions[exercise.tempId] || []}
                    decision={exerciseDecisions[exercise.tempId]}
                    onDecisionChange={(d) => updateExerciseDecision(exercise.tempId, d)}
                  />
                ))}
              </div>

              {filteredExercises.length === 0 && (
                <Card>
                  <CardContent className="py-16 text-center">
                    <Dumbbell className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
                    <p className="text-lg text-muted-foreground">
                      {exerciseFilter !== 'all'
                        ? 'Brak ćwiczeń pasujących do filtra'
                        : 'Nie znaleziono ćwiczeń w dokumencie'
                      }
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
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

            {/* Warning gdy notatki bez pacjenta */}
            {showNotesWarning && (
              <Card className="border-warning/50 bg-warning/5">
                <CardContent className="flex items-start gap-4 p-5">
                  <AlertTriangle className="h-6 w-6 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">
                      Notatki kliniczne nie zostaną zaimportowane
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Wybierz pacjenta powyżej, aby zaimportować {stats.notesToCreate} {stats.notesToCreate === 1 ? 'notatkę' : 'notatki'}.
                      Ćwiczenia i zestawy zostaną zaimportowane normalnie.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Exercise Sets */}
            {analysisResult.exerciseSets.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                    <Layers className="h-5 w-5 text-purple-500" />
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20">
                    <FileText className="h-5 w-5 text-orange-500" />
                  </div>
                  Notatki kliniczne ({analysisResult.clinicalNotes.length})
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
            {analysisResult.exerciseSets.length === 0 &&
              analysisResult.clinicalNotes.length === 0 && (
                <Card>
                  <CardContent className="py-16 text-center">
                    <Layers className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
                    <p className="text-lg text-muted-foreground">
                      Nie znaleziono zestawów ani notatek klinicznych
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Możesz kontynuować z samymi ćwiczeniami
                    </p>
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
            notesSkippedDueToNoPatient={!selectedPatientId && stats.notesToCreate > 0}
            skippedNotesCount={!selectedPatientId ? stats.notesToCreate : 0}
          />
        )}
      </div>

      {/* Navigation buttons - większe, czytelniejsze */}
      {step !== 'processing' && step !== 'summary' && (
        <div className="mt-10 flex items-center justify-between border-t border-border/60 pt-6">
          <Button
            variant="outline"
            size="lg"
            onClick={step === 'upload' ? undefined : goBack}
            disabled={step === 'upload' || isAnalyzing || isImporting}
            className="gap-2 h-12 px-6"
          >
            <ArrowLeft className="h-5 w-5" />
            Wstecz
          </Button>

          <div className="flex items-center gap-4">
            {step === 'review-exercises' && (
              <p className="text-sm text-muted-foreground">
                {stats.exercisesToCreate + stats.exercisesToReuse} ćwiczeń do importu
              </p>
            )}

            {step === 'upload' && (
              <Button
                size="lg"
                onClick={() => analyzeDocument()}
                disabled={!file || isAnalyzing}
                className="gap-2 h-12 px-8 bg-primary hover:bg-primary-dark"
                data-testid="import-analyze-btn"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
                Analizuj dokument
              </Button>
            )}

            {step === 'review-exercises' && (
              <Button
                size="lg"
                onClick={goNext}
                disabled={!canProceed}
                className="gap-2 h-12 px-8 bg-primary hover:bg-primary-dark"
                data-testid="import-next-btn"
              >
                Dalej
                <ArrowRight className="h-5 w-5" />
              </Button>
            )}

            {step === 'review-sets' && (
              <Button
                size="lg"
                onClick={executeImport}
                disabled={isImporting}
                className="gap-2 h-12 px-8 bg-primary hover:bg-primary-dark"
                data-testid="import-execute-btn"
              >
                {isImporting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                Importuj dane
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
