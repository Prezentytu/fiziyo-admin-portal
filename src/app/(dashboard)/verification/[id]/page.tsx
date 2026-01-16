"use client";

import { use, useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Sparkles, Keyboard } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { MobileSimulator } from "@/components/verification/MobileSimulator";
import { QualityChecklist, type QualityChecks } from "@/components/verification/QualityChecklist";
import { TagRefinementPanel } from "@/components/verification/TagRefinementPanel";
import { VerificationStickyFooter } from "@/components/verification/VerificationStickyFooter";
import { RejectReasonDialog } from "@/components/verification/RejectReasonDialog";
import { ApproveDialog } from "@/components/verification/ApproveDialog";
import { useSystemRole } from "@/hooks/useSystemRole";

import { GET_EXERCISE_BY_ID_QUERY } from "@/graphql/queries/exercises.queries";
import {
  GET_PENDING_EXERCISES_QUERY,
  GET_VERIFICATION_STATS_QUERY,
} from "@/graphql/queries/adminExercises.queries";
import {
  APPROVE_EXERCISE_MUTATION,
  REJECT_EXERCISE_MUTATION,
} from "@/graphql/mutations/adminExercises.mutations";
import type { ExerciseByIdResponse } from "@/types/apollo";
import type {
  AdminExercise,
  RejectionReason,
  ApproveExerciseResponse,
  RejectExerciseResponse,
  GetPendingReviewExercisesResponse,
  GetVerificationStatsResponse,
} from "@/graphql/types/adminExercise.types";

interface VerificationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function VerificationDetailPage({ params }: VerificationDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { canReviewExercises, isLoading: roleLoading } = useSystemRole();

  // State
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [qualityChecks, setQualityChecks] = useState<QualityChecks>({
    clinicallyCorrect: null,
    mediaQuality: null,
    descriptionComplete: null,
    tagsAppropriate: null,
  });
  const [mainTags, setMainTags] = useState<string[]>([]);
  const [additionalTags, setAdditionalTags] = useState<string[]>([]);
  const [patientDescription, setPatientDescription] = useState("");
  const [clinicalDescription, setClinicalDescription] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Queries
  const { data, loading, error } = useQuery<ExerciseByIdResponse>(GET_EXERCISE_BY_ID_QUERY, {
    variables: { id },
    onCompleted: (data) => {
      if (data?.exerciseById && !isInitialized) {
        const ex = data.exerciseById as unknown as AdminExercise;
        setMainTags(ex.mainTags || []);
        setAdditionalTags(ex.additionalTags || []);
        setPatientDescription(ex.patientDescription || ex.description || "");
        setClinicalDescription(ex.clinicalDescription || "");
        setIsInitialized(true);
      }
    },
  });

  // Query for pending exercises (for progress indicator and auto-advance)
  const { data: pendingData } = useQuery<GetPendingReviewExercisesResponse>(GET_PENDING_EXERCISES_QUERY);

  // Query for stats
  const { data: statsData } = useQuery<GetVerificationStatsResponse>(GET_VERIFICATION_STATS_QUERY);

  // Calculate progress
  const pendingExercises = pendingData?.pendingReviewExercises || [];
  const currentIndex = pendingExercises.findIndex((ex) => ex.id === id);
  const totalPending = statsData?.verificationStats?.pendingReview || pendingExercises.length;
  const positionInQueue = currentIndex >= 0 ? currentIndex + 1 : null;

  // Get next exercise ID for auto-advance
  const getNextExerciseId = useCallback((): string | null => {
    if (currentIndex < 0 || currentIndex >= pendingExercises.length - 1) {
      return null;
    }
    return pendingExercises[currentIndex + 1]?.id || null;
  }, [currentIndex, pendingExercises]);

  // Mutations
  const [approveExercise, { loading: approving }] = useMutation<ApproveExerciseResponse>(
    APPROVE_EXERCISE_MUTATION,
    {
      refetchQueries: [
        { query: GET_PENDING_EXERCISES_QUERY },
        { query: GET_VERIFICATION_STATS_QUERY },
      ],
    }
  );

  const [rejectExercise, { loading: rejecting }] = useMutation<RejectExerciseResponse>(
    REJECT_EXERCISE_MUTATION,
    {
      refetchQueries: [
        { query: GET_PENDING_EXERCISES_QUERY },
        { query: GET_VERIFICATION_STATS_QUERY },
      ],
    }
  );

  const exercise = data?.exerciseById as unknown as AdminExercise | null;

  // Handlers with auto-advance
  const handleApprove = useCallback(
    async (notes: string | null) => {
      try {
        await approveExercise({
          variables: { exerciseId: id, notes },
        });
        toast.success("Ćwiczenie zostało zatwierdzone i opublikowane!");
        setIsApproveDialogOpen(false);

        // Auto-advance to next exercise or go back to list
        const nextId = getNextExerciseId();
        if (nextId) {
          router.push(`/verification/${nextId}`);
        } else {
          router.push("/verification");
        }
      } catch (err) {
        console.error("Błąd zatwierdzania:", err);
        toast.error("Nie udało się zatwierdzić ćwiczenia");
      }
    },
    [approveExercise, id, router, getNextExerciseId]
  );

  const handleReject = useCallback(
    async (reason: RejectionReason, notes: string) => {
      try {
        const fullNotes = `[${reason}] ${notes}`;
        await rejectExercise({
          variables: { exerciseId: id, notes: fullNotes },
        });
        toast.success("Ćwiczenie zostało odrzucone z uwagami");
        setIsRejectDialogOpen(false);

        // Auto-advance to next exercise or go back to list
        const nextId = getNextExerciseId();
        if (nextId) {
          router.push(`/verification/${nextId}`);
        } else {
          router.push("/verification");
        }
      } catch (err) {
        console.error("Błąd odrzucania:", err);
        toast.error("Nie udało się odrzucić ćwiczenia");
      }
    },
    [rejectExercise, id, router, getNextExerciseId]
  );

  const handleSkip = useCallback(() => {
    router.push("/verification");
  }, [router]);

  // Check if all quality checks are passed
  const allChecksPassed = Object.values(qualityChecks).every((v) => v === true);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs/textareas
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Ctrl+Enter = Open Approve dialog (if checks passed)
      if (e.ctrlKey && e.key === "Enter" && allChecksPassed && !isApproveDialogOpen && !isRejectDialogOpen) {
        e.preventDefault();
        setIsApproveDialogOpen(true);
      }

      // Ctrl+Backspace = Open Reject dialog
      if (e.ctrlKey && e.key === "Backspace" && !isApproveDialogOpen && !isRejectDialogOpen) {
        e.preventDefault();
        setIsRejectDialogOpen(true);
      }

      // Escape = Skip (close dialogs first or navigate away)
      if (e.key === "Escape") {
        if (isApproveDialogOpen) {
          setIsApproveDialogOpen(false);
        } else if (isRejectDialogOpen) {
          setIsRejectDialogOpen(false);
        } else {
          handleSkip();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [allChecksPassed, isApproveDialogOpen, isRejectDialogOpen, handleSkip]);

  // Access denied
  if (!roleLoading && !canReviewExercises) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={FileText}
          title="Brak dostępu"
          description="Nie masz uprawnień do weryfikacji ćwiczeń."
        />
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row overflow-hidden -m-6">
        <div className="w-full lg:w-[400px] bg-zinc-950 p-8 flex items-center justify-center">
          <Skeleton className="w-[280px] h-[560px] rounded-[2.5rem]" />
        </div>
        <div className="flex-1 p-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // Error or not found
  if (error || !exercise) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={FileText}
          title="Nie znaleziono"
          description={error ? `Błąd: ${error.message}` : "Ćwiczenie nie istnieje."}
          action={
            <Button variant="outline" onClick={() => router.push("/verification")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Wróć do listy
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row overflow-hidden -m-6">
      {/* Left Column: Mobile Preview */}
      <div className="w-full lg:w-[420px] bg-zinc-950 border-r border-border/20 flex-shrink-0 overflow-y-auto">
        <div className="p-6 lg:p-8">
          {/* Progress indicator + Back button */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/verification")}
              className="text-zinc-400 hover:text-white -ml-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Powrót do listy
            </Button>

            {/* Progress indicator */}
            {positionInQueue && totalPending > 0 && (
              <div className="flex items-center gap-3">
                <div className="text-xs text-zinc-500">
                  <span className="text-zinc-300 font-semibold">{positionInQueue}</span>
                  <span> z </span>
                  <span className="text-zinc-300 font-semibold">{totalPending}</span>
                  <span className="ml-1">oczekujących</span>
                </div>
                <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${(positionInQueue / totalPending) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Phone simulator */}
          <MobileSimulator exercise={exercise} />
        </div>
      </div>

      {/* Right Column: Expert Panel */}
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        <ScrollArea className="flex-1">
          <div className="p-6 lg:p-8 pb-32 space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">
                  {exercise.name}
                </h1>
                <Badge
                  variant="outline"
                  className={
                    exercise.status === "PENDING_REVIEW"
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      : exercise.status === "CHANGES_REQUESTED"
                      ? "bg-orange-500/10 text-orange-600 border-orange-500/20"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {exercise.status === "PENDING_REVIEW"
                    ? "Oczekuje na weryfikację"
                    : exercise.status === "CHANGES_REQUESTED"
                    ? "Wymaga poprawek"
                    : exercise.status}
                </Badge>
              </div>
              {exercise.createdBy && (
                <p className="text-sm text-muted-foreground">
                  Autor: {exercise.createdBy.fullname || exercise.createdBy.email}
                </p>
              )}
            </div>

            {/* Previous review notes */}
            {exercise.adminReviewNotes && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-600 mb-1">
                        Poprzednie uwagi weryfikatora:
                      </p>
                      <p className="text-sm text-foreground">{exercise.adminReviewNotes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quality Checklist */}
            <QualityChecklist
              exercise={exercise}
              checks={qualityChecks}
              onChecksChange={setQualityChecks}
            />

            {/* Tag Refinement */}
            <TagRefinementPanel
              exercise={exercise}
              mainTags={mainTags}
              additionalTags={additionalTags}
              onMainTagsChange={setMainTags}
              onAdditionalTagsChange={setAdditionalTags}
            />

            {/* Description Editor */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Opisy ćwiczenia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patientDesc">Opis dla pacjenta</Label>
                  <Textarea
                    id="patientDesc"
                    placeholder="Prosty, zrozumiały opis dla pacjenta..."
                    value={patientDescription}
                    onChange={(e) => setPatientDescription(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {patientDescription.length} znaków
                    </p>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                      <Sparkles className="h-3 w-3 text-primary" />
                      Popraw styl z AI
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clinicalDesc">Opis kliniczny (dla fizjo)</Label>
                  <Textarea
                    id="clinicalDesc"
                    placeholder="Profesjonalny opis medyczny..."
                    value={clinicalDescription}
                    onChange={(e) => setClinicalDescription(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Sticky Footer */}
        <VerificationStickyFooter
          onReject={() => setIsRejectDialogOpen(true)}
          onSkip={handleSkip}
          onApprove={() => setIsApproveDialogOpen(true)}
          isRejectLoading={rejecting}
          isApproveLoading={approving}
          canApprove={allChecksPassed}
        />
      </div>

      {/* Dialogs */}
      <RejectReasonDialog
        open={isRejectDialogOpen}
        onOpenChange={setIsRejectDialogOpen}
        onConfirm={handleReject}
        isLoading={rejecting}
        exerciseName={exercise.name}
      />

      <ApproveDialog
        open={isApproveDialogOpen}
        onOpenChange={setIsApproveDialogOpen}
        onConfirm={handleApprove}
        isLoading={approving}
        exerciseName={exercise.name}
      />
    </div>
  );
}
