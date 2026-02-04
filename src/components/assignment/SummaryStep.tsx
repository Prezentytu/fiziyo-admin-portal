"use client";

import { useState, useMemo, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Calendar,
  User,
  Users,
  Flag,
  Clock,
  X,
  Pencil,
  Check,
  Settings2,
  Loader2,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ImagePlaceholder } from "@/components/shared/ImagePlaceholder";
import { getMediaUrl } from "@/utils/mediaUrl";
import {
  calculateEstimatedTime,
  formatEstimatedTime,
} from "@/utils/exerciseTime";
import { useOrganization } from "@/contexts/OrganizationContext";
import { sendExerciseReport } from "@/services/exerciseReportService";
import type {
  ExerciseSet,
  Patient,
  Frequency,
  ExerciseOverride,
  ExerciseMapping,
  LocalExerciseMapping,
} from "./types";

interface SummaryStepProps {
  exerciseSet: ExerciseSet;
  localExercises: LocalExerciseMapping[];
  selectedPatients: Patient[];
  startDate: Date;
  endDate: Date;
  frequency: Frequency;
  overrides: Map<string, ExerciseOverride>;
  excludedExercises: Set<string>;
  onGoToStep?: (step: "select-set" | "select-patients" | "schedule") => void;
}

// Helper: Formatuj dawkowanie do kompaktowej formy
function formatDosage(
  mapping: ExerciseMapping,
  override?: ExerciseOverride
): string {
  const exercise = mapping.exercise;
  const sets = override?.sets ?? mapping.sets ?? exercise?.defaultSets ?? 3;
  const reps = override?.reps ?? mapping.reps ?? exercise?.defaultReps ?? 10;
  const duration = override?.duration ?? mapping.duration ?? exercise?.defaultDuration;

  const exerciseType = exercise?.type?.toLowerCase();
  const isTimeBased = exerciseType === "time";

  if (isTimeBased && duration) {
    return `${sets} × ${duration}s`;
  }

  return `${sets} × ${reps}`;
}

// Helper: Oblicz łączny czas zestawu
function calculateTotalTime(
  mappings: ExerciseMapping[],
  overrides: Map<string, ExerciseOverride>
): number {
  return mappings.reduce((total, mapping) => {
    const exercise = mapping.exercise;
    const override = overrides.get(mapping.id);

    const sets = override?.sets ?? mapping.sets ?? exercise?.defaultSets ?? 3;
    const reps = override?.reps ?? mapping.reps ?? exercise?.defaultReps ?? 10;
    const duration = override?.duration ?? mapping.duration ?? exercise?.defaultDuration;
    const executionTime = override?.executionTime ?? mapping.executionTime ?? exercise?.defaultExecutionTime;
    const rest = override?.restSets ?? mapping.restSets ?? exercise?.defaultRestBetweenSets ?? 60;

    return total + calculateEstimatedTime({
      sets,
      reps,
      duration,
      executionTime,
      rest,
    });
  }, 0);
}

export function SummaryStep({
  exerciseSet,
  localExercises,
  selectedPatients,
  startDate,
  endDate,
  frequency,
  overrides,
  excludedExercises,
  onGoToStep,
}: SummaryStepProps) {
  const { user } = useUser();
  const { currentOrganization } = useOrganization();
  const [showConcierge, setShowConcierge] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  const durationDays = differenceInDays(endDate, startDate);

  // Oblicz liczbę wybranych konkretnych dni
  const selectedDaysCount = [
    frequency.monday,
    frequency.tuesday,
    frequency.wednesday,
    frequency.thursday,
    frequency.friday,
    frequency.saturday,
    frequency.sunday,
  ].filter(Boolean).length;

  // Czy używamy trybu elastycznego (bez konkretnych dni)?
  const isFlexibleMode = selectedDaysCount === 0;

  // Efektywna częstotliwość tygodniowa
  const effectiveWeeklyFrequency = isFlexibleMode
    ? (frequency.timesPerWeek || 3)
    : selectedDaysCount;

  const customizedCount = [...overrides.values()].filter(
    (o) =>
      Object.keys(o).some(
        (key) =>
          key !== "exerciseMappingId" && o[key as keyof ExerciseOverride] !== undefined
      )
  ).length;

  const getDayNames = () => {
    if (isFlexibleMode) {
      return null; // Nie pokazuj dni w trybie elastycznym
    }
    const days: string[] = [];
    if (frequency.monday) days.push("Pn");
    if (frequency.tuesday) days.push("Wt");
    if (frequency.wednesday) days.push("Śr");
    if (frequency.thursday) days.push("Cz");
    if (frequency.friday) days.push("Pt");
    if (frequency.saturday) days.push("So");
    if (frequency.sunday) days.push("Nd");
    return days.join(", ");
  };

  // Filter out excluded exercises - use localExercises (ghost copy) instead of exerciseSet.exerciseMappings
  const visibleMappings = useMemo(() =>
    localExercises.filter(
      (m) => !excludedExercises.has(m.id)
    ),
    [localExercises, excludedExercises]
  );

  const exerciseCount = visibleMappings.length;
  const excludedCount = excludedExercises.size;

  // Oblicz łączny czas zestawu
  const totalTimeSeconds = useMemo(() =>
    calculateTotalTime(visibleMappings, overrides),
    [visibleMappings, overrides]
  );
  const totalTimeFormatted = formatEstimatedTime(totalTimeSeconds);

  // Obsługa wysyłania feedbacku - wysyła raport na Discord
  const handleSendFeedback = useCallback(async () => {
    if (!feedback.trim() || !user || isSendingFeedback) return;

    setIsSendingFeedback(true);

    try {
      // Przygotuj listę ćwiczeń z zestawu
      const exercises = (exerciseSet.exerciseMappings || []).map((m) => ({
        id: m.id,
        name: m.customName || m.exercise?.name || "Nieznane ćwiczenie",
        exerciseId: m.exerciseId || m.exercise?.id,
      }));

      // Przygotuj listę pacjentów
      const patients = selectedPatients.map((p) => ({
        id: p.id,
        name: p.name,
      }));

      const result = await sendExerciseReport({
        message: feedback.trim(),
        exerciseSet: {
          id: exerciseSet.id,
          name: exerciseSet.name,
          exercises,
        },
        patients,
        reporter: {
          userId: user.id,
          email: user.primaryEmailAddress?.emailAddress || "unknown@email.com",
          name: user.firstName
            ? `${user.firstName} ${user.lastName || ""}`.trim()
            : undefined,
        },
        organizationId: currentOrganization?.organizationId || "unknown",
      });

      if (result.success) {
        setFeedbackSent(true);
        toast.success("Dziękujemy!", {
          description: "Zgłoszenie zostało wysłane do zespołu FiziYo.",
        });
        setTimeout(() => {
          setShowConcierge(false);
          setFeedback("");
          setFeedbackSent(false);
        }, 2000);
      } else {
        toast.error("Błąd wysyłania", {
          description: result.error || "Nie udało się wysłać zgłoszenia.",
        });
      }
    } catch (error) {
      console.error("[SummaryStep] Error sending feedback:", error);
      toast.error("Błąd", {
        description: "Wystąpił nieoczekiwany błąd.",
      });
    } finally {
      setIsSendingFeedback(false);
    }
  }, [feedback, user, exerciseSet, selectedPatients, currentOrganization, isSendingFeedback]);

  return (
    <div
      className="max-w-5xl mx-auto grid grid-cols-12 gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 p-4 sm:p-6 lg:p-8 items-start lg:items-stretch"
      data-testid="summary-step"
    >
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* KOLUMNA LEWA: WSAD MERYTORYCZNY (8/12)                         */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-3 sm:gap-4">

        {/* KARTA 1: ĆWICZENIA (Zawsze rozwinięte!) */}
        <div
          className="bg-surface border border-border/60 rounded-xl overflow-hidden flex flex-col min-h-[200px] sm:min-h-[280px] lg:min-h-0 lg:flex-1"
          data-testid="summary-exercises-card"
        >
          {/* Header */}
          <div className="bg-surface-light/30 p-3 sm:p-4 border-b border-border/40 flex justify-between items-center shrink-0">
            <div>
              <h3 className="text-sm font-bold text-foreground">Zestaw Ćwiczeń</h3>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>&ldquo;{exerciseSet.name}&rdquo;</span>
                <span>•</span>
                <span>{exerciseCount} ćwiczeń</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-primary font-semibold bg-primary/10 px-1.5 py-0.5 rounded">
                  <Clock className="h-3 w-3" />
                  {totalTimeFormatted}
                </span>
                {excludedCount > 0 && (
                  <span className="text-muted-foreground/60">(-{excludedCount} wykluczone)</span>
                )}
              </p>
            </div>
            {/* Edytuj - powrót do kroku 1 */}
            {onGoToStep && (
              <button
                onClick={() => onGoToStep("select-set")}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                data-testid="summary-edit-exercises-btn"
              >
                <Pencil className="h-3 w-3" />
                Edytuj
              </button>
            )}
          </div>

          {/* Lista Kompaktowa (Rozwinięta) */}
          <div className="p-3 flex-1 overflow-y-auto">
            {visibleMappings.map((mapping, i) => {
              const exercise = mapping.exercise;
              const imageUrl = getMediaUrl(exercise?.thumbnailUrl || exercise?.imageUrl || exercise?.images?.[0]);
              const override = overrides.get(mapping.id);
              const hasOverride = override && Object.keys(override).some(
                (key) => key !== "exerciseMappingId" && override[key as keyof ExerciseOverride] !== undefined
              );
              const dosage = formatDosage(mapping, override);
              const exerciseName = mapping.customName || exercise?.name || "Nieznane";

              return (
                <div
                  key={mapping.id}
                  className="flex items-center justify-between p-3 hover:bg-surface-light/50 rounded-lg group transition-colors"
                  data-testid={`summary-exercise-item-${mapping.id}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Numer */}
                    <span className="text-sm text-muted-foreground/50 font-mono w-6 text-right shrink-0">
                      {i + 1}.
                    </span>

                    {/* Miniatura */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-surface-light border border-border/30">
                      {imageUrl ? (
                        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImagePlaceholder type="exercise" iconClassName="h-4 w-4" />
                      )}
                    </div>

                    {/* Nazwa */}
                    <span className="text-base text-foreground font-medium truncate">
                      {exerciseName}
                    </span>

                    {/* Badge "Zmienione" */}
                    {hasOverride && (
                      <Badge variant="outline" className="text-[10px] border-primary/40 text-primary shrink-0 ml-1">
                        <Settings2 className="h-2.5 w-2.5 mr-0.5" />
                        Zmienione
                      </Badge>
                    )}
                  </div>

                  {/* Dawkowanie */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm text-primary font-mono bg-primary/10 px-2.5 py-1.5 rounded-md border border-primary/20 min-w-[72px] text-center">
                      {dosage}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* KARTA 2: EARLY ACCESS CONCIERGE */}
        <div
          className={cn(
            "border rounded-xl p-4 sm:p-5 transition-all shrink-0",
            feedbackSent
              ? "bg-emerald-950/20 border-emerald-500/30"
              : "bg-amber-950/10 border-amber-900/20"
          )}
          data-testid="summary-concierge-card"
        >
          {feedbackSent ? (
            // Sukces wysłania
            <div className="flex items-center gap-3 sm:gap-4 animate-in fade-in">
              <div className="p-2 sm:p-2.5 bg-emerald-500/20 rounded-lg text-emerald-500 shrink-0">
                <Check className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm sm:text-base font-semibold text-emerald-500">Dziękujemy za zgłoszenie!</h4>
                <p className="text-xs sm:text-sm text-emerald-400/60">Nasz zespół zajmie się tym w ciągu 24h.</p>
              </div>
            </div>
          ) : !showConcierge ? (
            // Wersja zwinięta
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 shrink-0">
                  <Flag className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-semibold text-amber-500">Masz uwagi do ćwiczeń?</h4>
                  <p className="text-[10px] sm:text-xs text-amber-400/60 truncate">
                    Jeśli widzisz błąd (zdjęcie, opis), zgłoś to nam.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConcierge(true)}
                className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0"
                data-testid="summary-concierge-open-btn"
              >
                Zgłoś
              </button>
            </div>
          ) : (
            // Wersja rozwinięta - formularz (pełne RWD)
            <div className="space-y-3 animate-in fade-in">
              <div className="flex justify-between items-start gap-2">
                <label className="text-[10px] sm:text-xs font-bold text-amber-500 uppercase tracking-wide">
                  Twoje uwagi dla zespołu FiziYo
                </label>
                <button
                  onClick={() => setShowConcierge(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1 -m-1"
                  data-testid="summary-concierge-close-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                className="w-full bg-black/40 border border-amber-900/30 rounded-lg p-2.5 sm:p-3 text-sm text-amber-100 placeholder-amber-500/30 focus:border-amber-500 outline-none resize-none min-h-[80px] max-h-[120px]"
                placeholder="Np. 'W ćwiczeniu Bird Dog zdjęcie jest niewyraźne, proszę o poprawę'..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                data-testid="summary-concierge-textarea"
              />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
                <p className="text-[10px] text-muted-foreground order-2 sm:order-1">
                  Twoje zgłoszenie nie blokuje przypisania zestawu.
                </p>
                <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
                  <button
                    onClick={() => setShowConcierge(false)}
                    className="text-xs text-amber-500 hover:text-amber-400 px-3 py-1.5 transition-colors flex-1 sm:flex-none"
                    data-testid="summary-concierge-cancel-btn"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleSendFeedback}
                    disabled={!feedback.trim() || isSendingFeedback}
                    className="text-xs bg-amber-500 text-black px-3 py-1.5 rounded font-bold hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none flex items-center justify-center gap-1.5"
                    data-testid="summary-concierge-submit-btn"
                  >
                    {isSendingFeedback ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Wysyłanie...
                      </>
                    ) : (
                      "Wyślij zgłoszenie"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* KOLUMNA PRAWA: KONTEKST I AKCJA (4/12)                         */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-3 sm:gap-4">

        {/* KARTA 3: PACJENT(CI) */}
        <div
          className="bg-surface border border-border/60 rounded-xl p-4 sm:p-5"
          data-testid="summary-patients-card"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase text-muted-foreground font-bold flex items-center gap-2">
              {selectedPatients.length > 1 ? (
                <Users className="w-3 h-3" />
              ) : (
                <User className="w-3 h-3" />
              )}
              {selectedPatients.length > 1 ? "Pacjenci" : "Pacjent"}
            </h3>
            {onGoToStep && (
              <button
                onClick={() => onGoToStep("select-patients")}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                data-testid="summary-edit-patients-btn"
              >
                Zmień
              </button>
            )}
          </div>

          {selectedPatients.length === 1 ? (
            // Pojedynczy pacjent - pełna wizytówka
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                  selectedPatients[0].isShadowUser
                    ? "bg-muted-foreground/60 text-white"
                    : "bg-gradient-to-br from-primary to-primary-dark text-primary-foreground"
                )}
              >
                {selectedPatients[0].name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-base font-bold text-foreground truncate">
                  {selectedPatients[0].name}
                </div>
                {selectedPatients[0].email && (
                  <div className="text-xs text-muted-foreground truncate">
                    {selectedPatients[0].email}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Wielu pacjentów - kompaktowa lista
            <div className="space-y-2">
              {selectedPatients.slice(0, 3).map((patient) => (
                <div key={patient.id} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                      patient.isShadowUser
                        ? "bg-muted-foreground/60 text-white"
                        : "bg-gradient-to-br from-primary to-primary-dark text-primary-foreground"
                    )}
                  >
                    {patient.name[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm text-foreground truncate">{patient.name}</span>
                </div>
              ))}
              {selectedPatients.length > 3 && (
                <p className="text-xs text-muted-foreground pl-9">
                  + {selectedPatients.length - 3} więcej
                </p>
              )}
            </div>
          )}

          {selectedPatients.length > 1 && (
            <div className="mt-3 pt-3 border-t border-border/30">
              <Badge variant="secondary" className="text-xs">
                {selectedPatients.length} pacjentów
              </Badge>
            </div>
          )}
        </div>

        {/* KARTA 4: HARMONOGRAM */}
        <div
          className="bg-surface border border-border/60 rounded-xl p-4 sm:p-5"
          data-testid="summary-schedule-card"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase text-muted-foreground font-bold flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Harmonogram
            </h3>
            {onGoToStep && (
              <button
                onClick={() => onGoToStep("schedule")}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                data-testid="summary-edit-schedule-btn"
              >
                Zmień
              </button>
            )}
          </div>

          <div className="space-y-3">
            {/* Daty */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Start:</span>
              <span className="text-foreground font-mono">
                {format(startDate, "dd.MM.yyyy", { locale: pl })}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Koniec:</span>
              <span className="text-foreground font-mono">
                {format(endDate, "dd.MM.yyyy", { locale: pl })}
              </span>
            </div>

            <div className="w-full h-px bg-border/50 my-2" />

            {/* Podsumowanie */}
            <div className="flex items-center gap-2 text-xs text-info bg-info/10 p-2.5 rounded-lg border border-info/20">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {durationDays} dni • {effectiveWeeklyFrequency}× w tyg. • {frequency.timesPerDay}× dziennie
              </span>
            </div>

            {/* Dni tygodnia (tylko w trybie specyficznym) */}
            {!isFlexibleMode && (
              <div className="text-xs text-muted-foreground">
                Dni: <span className="text-foreground">{getDayNames()}</span>
              </div>
            )}

            {/* Info o trybie elastycznym */}
            {isFlexibleMode && (
              <div className="text-xs text-muted-foreground">
                Pacjent sam wybierze dni ćwiczeń
              </div>
            )}

            {/* Dostosowane ćwiczenia */}
            {customizedCount > 0 && (
              <Badge variant="outline" className="border-primary/40 text-primary text-xs">
                <Settings2 className="h-3 w-3 mr-1" />
                {customizedCount} dostosowane
              </Badge>
            )}
          </div>
        </div>

        {/* Spacer - wypycha compliance na dół (tylko na desktop) */}
        <div className="hidden lg:flex lg:flex-1" />

        {/* Compliance Shield - "Pieczątka prawna" */}
        <div className="p-3 sm:p-4 rounded-xl bg-surface border border-border/40">
          <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
            Przypisując zestaw ćwiczeń potwierdzasz, że dobór ćwiczeń jest odpowiedni
            dla stanu zdrowia pacjenta i został ustalony na podstawie przeprowadzonej
            diagnostyki. FiziYo nie ponosi odpowiedzialności za skutki nieprawidłowego
            doboru ćwiczeń.
          </p>
        </div>
      </div>
    </div>
  );
}
