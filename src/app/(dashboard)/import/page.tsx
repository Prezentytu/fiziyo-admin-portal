'use client';

import { useMemo } from 'react';
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

const stepConfig = [
  { id: 'upload', label: 'Upload', icon: FileUp },
  { id: 'processing', label: 'Analiza', icon: Sparkles },
  { id: 'review-exercises', label: 'Ćwiczenia', icon: Dumbbell },
  { id: 'review-sets', label: 'Zestawy', icon: Layers },
  { id: 'summary', label: 'Podsumowanie', icon: CheckCircle },
] as const;

/**
 * Strona importu dokumentów fizjoterapeutycznych
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
  } = useDocumentImport();

  // Current step index
  const currentStepIndex = useMemo(() => {
    return stepConfig.findIndex((s) => s.id === step);
  }, [step]);

  // Czy pokazać warning o notatkach bez pacjenta
  const showNotesWarning = stats.notesToCreate > 0 && !selectedPatientId;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary to-primary-dark shadow-lg shadow-primary/20">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Import dokumentów</h1>
            <p className="text-muted-foreground">
              Wyciągnij ćwiczenia, zestawy i notatki z dokumentów PDF lub Excel
            </p>
          </div>
        </div>
      </div>

      {/* Progress steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {stepConfig.map((s, index) => {
            const Icon = s.icon;
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;

            return (
              <div
                key={s.id}
                className={cn(
                  'flex flex-1 items-center',
                  index < stepConfig.length - 1 && 'after:mx-2 after:h-0.5 after:flex-1 after:bg-border'
                )}
              >
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-full px-3 py-1.5 transition-all',
                    isActive && 'bg-primary/10',
                    isCompleted && 'opacity-60'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                      isActive
                        ? 'bg-primary text-white'
                        : isCompleted
                        ? 'bg-primary/20 text-primary'
                        : 'bg-surface-light text-muted-foreground'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'hidden text-sm font-medium sm:inline',
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <Card className="mb-6 border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4">
            <X className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
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
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    Wybierz dokument do analizy
                  </h2>
                  <p className="text-muted-foreground">
                    AI wyekstrahuje ćwiczenia, zestawy i notatki kliniczne
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
            {/* Stats */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="flex items-center gap-3 p-4">
                  <Dumbbell className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-lg font-bold">{stats.totalExercises}</p>
                    <p className="text-xs text-muted-foreground">Znalezionych</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-lg font-bold">{stats.exercisesToCreate}</p>
                    <p className="text-xs text-muted-foreground">Do utworzenia</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <Link2 className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-lg font-bold">{stats.exercisesToReuse}</p>
                    <p className="text-xs text-muted-foreground">Istniejące</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <X className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-bold">{stats.exercisesToSkip}</p>
                    <p className="text-xs text-muted-foreground">Pominięte</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Document info */}
            {analysisResult.documentInfo.patientName && (
              <Card className="bg-surface-light">
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  {analysisResult.documentInfo.patientName && (
                    <Badge variant="secondary">
                      Pacjent: {analysisResult.documentInfo.patientName}
                    </Badge>
                  )}
                  {analysisResult.documentInfo.date && (
                    <Badge variant="secondary">
                      Data: {analysisResult.documentInfo.date}
                    </Badge>
                  )}
                  {analysisResult.documentInfo.therapistName && (
                    <Badge variant="secondary">
                      Terapeuta: {analysisResult.documentInfo.therapistName}
                    </Badge>
                  )}
                  {analysisResult.documentInfo.clinicName && (
                    <Badge variant="secondary">
                      {analysisResult.documentInfo.clinicName}
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
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">
                {exerciseFilter === 'all'
                  ? `Znalezione ćwiczenia (${filteredExercises.length})`
                  : `Filtrowane ćwiczenia (${filteredExercises.length} z ${stats.totalExercises})`
                }
              </h3>

              {filteredExercises.map((exercise) => (
                <ExerciseReviewCard
                  key={exercise.tempId}
                  exercise={exercise}
                  matchSuggestions={analysisResult.matchSuggestions[exercise.tempId] || []}
                  decision={exerciseDecisions[exercise.tempId]}
                  onDecisionChange={(d) => updateExerciseDecision(exercise.tempId, d)}
                />
              ))}

              {filteredExercises.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Dumbbell className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
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
            {/* Patient Context Panel - pokazuj gdy są notatki */}
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

            {/* Warning banner gdy notatki bez pacjenta */}
            {showNotesWarning && (
              <Card className="border-warning/50 bg-warning/5">
                <CardContent className="flex items-start gap-3 p-4">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">
                      Notatki kliniczne nie zostaną zaimportowane
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Aby zaimportować {stats.notesToCreate} {stats.notesToCreate === 1 ? 'notatkę' : 'notatki'},
                      wybierz pacjenta powyżej. Ćwiczenia i zestawy zostaną zaimportowane normalnie.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Exercise Sets */}
            {analysisResult.exerciseSets.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Zestawy ćwiczeń ({analysisResult.exerciseSets.length})
                </h3>

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
            )}

            {/* Clinical Notes */}
            {analysisResult.clinicalNotes.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-orange-500" />
                  Notatki kliniczne ({analysisResult.clinicalNotes.length})
                  {!selectedPatientId && (
                    <Badge variant="secondary" className="ml-2 bg-warning/20 text-warning border-0">
                      Wymaga pacjenta
                    </Badge>
                  )}
                </h3>

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
            )}

            {/* Empty state */}
            {analysisResult.exerciseSets.length === 0 &&
              analysisResult.clinicalNotes.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Layers className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      Nie znaleziono zestawów ani notatek klinicznych
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
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

      {/* Navigation buttons */}
      {step !== 'processing' && step !== 'summary' && (
        <div className="mt-8 flex items-center justify-between border-t border-border/60 pt-6">
          <Button
            variant="outline"
            onClick={step === 'upload' ? undefined : goBack}
            disabled={step === 'upload' || isAnalyzing || isImporting}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Wstecz
          </Button>

          <div className="flex items-center gap-2">
            {step === 'review-exercises' && (
              <p className="text-sm text-muted-foreground mr-4">
                {stats.exercisesToCreate + stats.exercisesToReuse} ćwiczeń do importu
              </p>
            )}

            {step === 'upload' && (
              <Button
                onClick={() => analyzeDocument()}
                disabled={!file || isAnalyzing}
                className="gap-2 bg-primary hover:bg-primary-dark"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Analizuj dokument
              </Button>
            )}

            {step === 'review-exercises' && (
              <Button
                onClick={goNext}
                disabled={!canProceed}
                className="gap-2 bg-primary hover:bg-primary-dark"
              >
                Dalej
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {step === 'review-sets' && (
              <Button
                onClick={executeImport}
                disabled={isImporting}
                className="gap-2 bg-primary hover:bg-primary-dark"
              >
                {isImporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
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
