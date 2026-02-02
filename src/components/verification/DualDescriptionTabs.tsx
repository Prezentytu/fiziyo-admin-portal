"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  User,
  Stethoscope,
  Sparkles,
  Loader2,
  Check,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DualDescriptionTabsProps {
  /** Opis dla pacjenta */
  patientDescription: string | null;
  /** Opis kliniczny */
  clinicalDescription: string | null;
  /** Callback przy zmianie pola */
  onFieldChange: (field: string, value: unknown) => Promise<void>;
  /** Pola wypełnione przez AI */
  aiSuggestedFields?: Set<string>;
  /** Callback gdy użytkownik kliknie w pole AI */
  onAiFieldTouched?: (field: string) => void;
  /** Callback przy zmianie walidacji (do Smart Tabs) */
  onValidityChange?: (isValid: boolean) => void;
  /** Czy wyłączony */
  disabled?: boolean;
  /** Dodatkowe klasy CSS */
  className?: string;
  /** data-testid */
  "data-testid"?: string;
}

/**
 * DualDescriptionTabs - Zakładki dla opisu pacjenta i klinicznego
 *
 * Struktura:
 * Tabs: [ Pacjent ] | [ Kliniczny ]
 * - Tab "Pacjent": patientDescription (prosty język)
 * - Tab "Kliniczny": clinicalDescription (żargon medyczny)
 *
 * Funkcje:
 * - AI: Tłumacz na Pacjenta (bierze opis kliniczny -> upraszcza)
 */
export function DualDescriptionTabs({
  patientDescription,
  clinicalDescription,
  onFieldChange,
  aiSuggestedFields = new Set(),
  onAiFieldTouched,
  onValidityChange,
  disabled = false,
  className,
  "data-testid": testId,
}: DualDescriptionTabsProps) {
  const [activeTab, setActiveTab] = useState<"patient" | "clinical">("patient");
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Patient description state
  const [patientValue, setPatientValue] = useState(patientDescription || "");
  const [isPatientEditing, setIsPatientEditing] = useState(false);
  const [isPatientSaving, setIsPatientSaving] = useState(false);
  const patientRef = useRef<HTMLTextAreaElement>(null);

  // Clinical description state
  const [clinicalValue, setClinicalValue] = useState(clinicalDescription || "");
  const [isClinicalEditing, setIsClinicalEditing] = useState(false);
  const [isClinicalSaving, setIsClinicalSaving] = useState(false);
  const clinicalRef = useRef<HTMLTextAreaElement>(null);

  // AI translation state
  const [isTranslating, setIsTranslating] = useState(false);

  // Sync with external values
  useEffect(() => {
    if (!isPatientEditing) {
      setPatientValue(patientDescription || "");
    }
  }, [patientDescription, isPatientEditing]);

  useEffect(() => {
    if (!isClinicalEditing) {
      setClinicalValue(clinicalDescription || "");
    }
  }, [clinicalDescription, isClinicalEditing]);

  const isAiSuggested = (field: string) =>
    aiSuggestedFields.has(field) && !touchedFields.has(field);

  const handleFieldFocus = useCallback(
    (field: string) => {
      if (aiSuggestedFields.has(field) && !touchedFields.has(field)) {
        setTouchedFields((prev) => new Set([...prev, field]));
        onAiFieldTouched?.(field);
      }
    },
    [aiSuggestedFields, touchedFields, onAiFieldTouched]
  );

  // Patient description handlers
  const handlePatientEdit = () => {
    if (disabled) return;
    setIsPatientEditing(true);
    handleFieldFocus("patientDescription");
    setTimeout(() => patientRef.current?.focus(), 0);
  };

  const handlePatientSave = async () => {
    if (patientValue === (patientDescription || "")) {
      setIsPatientEditing(false);
      return;
    }

    setIsPatientSaving(true);
    try {
      await onFieldChange("patientDescription", patientValue || null);
      setIsPatientEditing(false);
      toast.success("Opis pacjenta zapisany");
    } catch {
      toast.error("Nie udało się zapisać opisu");
    } finally {
      setIsPatientSaving(false);
    }
  };

  const handlePatientCancel = () => {
    setPatientValue(patientDescription || "");
    setIsPatientEditing(false);
  };

  // Clinical description handlers
  const handleClinicalEdit = () => {
    if (disabled) return;
    setIsClinicalEditing(true);
    handleFieldFocus("clinicalDescription");
    setTimeout(() => clinicalRef.current?.focus(), 0);
  };

  const handleClinicalSave = async () => {
    if (clinicalValue === (clinicalDescription || "")) {
      setIsClinicalEditing(false);
      return;
    }

    setIsClinicalSaving(true);
    try {
      await onFieldChange("clinicalDescription", clinicalValue || null);
      setIsClinicalEditing(false);
      toast.success("Opis kliniczny zapisany");
    } catch {
      toast.error("Nie udało się zapisać opisu");
    } finally {
      setIsClinicalSaving(false);
    }
  };

  const handleClinicalCancel = () => {
    setClinicalValue(clinicalDescription || "");
    setIsClinicalEditing(false);
  };

  // AI: Translate clinical to patient
  const handleTranslateToPatient = async () => {
    if (!clinicalValue.trim()) {
      toast.error("Najpierw wypełnij opis kliniczny");
      return;
    }

    setIsTranslating(true);
    try {
      // TODO: Podpiąć prawdziwy endpoint AI
      // Na razie mockup - prosty placeholder
      const simplifiedText = `[Tłumaczenie AI]\n\n${clinicalValue
        .replace(/m\.\s*/g, "mięsień ")
        .replace(/ćw\.\s*/g, "ćwiczenie ")
        .replace(/aktywacja/gi, "napięcie")
        .replace(/stabilizacja/gi, "utrzymanie")
        .substring(0, 500)}...`;

      setPatientValue(simplifiedText);
      setActiveTab("patient");
      setIsPatientEditing(true);

      toast.success("Wygenerowano uproszczony opis", {
        description: "Sprawdź i dostosuj tekst przed zapisaniem",
      });
    } catch {
      toast.error("Nie udało się przetłumaczyć opisu");
    } finally {
      setIsTranslating(false);
    }
  };

  const patientLength = patientValue.length;
  const clinicalLength = clinicalValue.length;
  const isPatientValid = patientLength >= 50;
  const isClinicalValid = clinicalLength >= 20;

  // Notify parent about validity changes
  useEffect(() => {
    const isValid = isPatientValid && isClinicalValid;
    onValidityChange?.(isValid);
  }, [isPatientValid, isClinicalValid, onValidityChange]);

  return (
    <TooltipProvider>
      <div
        className={cn("flex flex-col", className)}
        data-testid={testId}
      >
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "patient" | "clinical")}
          className="flex flex-col flex-1"
        >
          {/* Tab Header with Actions */}
          <div className="flex items-center justify-between mb-2">
            <TabsList className="h-8 bg-surface-light/50">
              <TabsTrigger
                value="patient"
                className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="dual-desc-patient-tab"
              >
                <User className="h-3.5 w-3.5" />
                Pacjent
                {isAiSuggested("patientDescription") && (
                  <Zap className="h-3 w-3 text-purple-400" />
                )}
              </TabsTrigger>
              <TabsTrigger
                value="clinical"
                className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="dual-desc-clinical-tab"
              >
                <Stethoscope className="h-3.5 w-3.5" />
                Kliniczny
                {isAiSuggested("clinicalDescription") && (
                  <Zap className="h-3 w-3 text-purple-400" />
                )}
              </TabsTrigger>
            </TabsList>

            {/* AI Actions */}
            <div className="flex items-center gap-2">
              {activeTab === "patient" && clinicalValue.trim() && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleTranslateToPatient}
                      disabled={disabled || isTranslating}
                      className="h-7 text-xs gap-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                      data-testid="dual-desc-translate-btn"
                    >
                      {isTranslating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      Tłumacz z klinicznego
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">AI uprości opis kliniczny na język zrozumiały dla pacjenta</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Patient Tab */}
          <TabsContent
            value="patient"
            className={cn(
              "flex-1 mt-0",
              isAiSuggested("patientDescription") && "ai-suggested rounded-lg"
            )}
          >
            {isPatientEditing ? (
              <div className="flex flex-col h-full">
                <Textarea
                  ref={patientRef}
                  value={patientValue}
                  onChange={(e) => setPatientValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") handlePatientCancel();
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handlePatientSave();
                  }}
                  placeholder="Wpisz opis ćwiczenia zrozumiały dla pacjenta..."
                  disabled={isPatientSaving}
                  className={cn(
                    "flex-1 min-h-[200px] resize-none text-base leading-relaxed border-primary bg-surface",
                    isPatientSaving && "opacity-70"
                  )}
                  data-testid="dual-desc-patient-textarea"
                />
                <div className="flex items-center justify-end gap-2 mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePatientCancel}
                    disabled={isPatientSaving}
                  >
                    Anuluj
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePatientSave}
                    disabled={isPatientSaving}
                  >
                    {isPatientSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Zapisz
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={handlePatientEdit}
                disabled={disabled}
                className={cn(
                  "w-full text-left p-4 rounded-lg border transition-colors min-h-[140px]",
                  "hover:border-primary/40 hover:bg-surface-light/50",
                  patientValue ? "border-transparent" : "border-dashed border-border/40"
                )}
                data-testid="dual-desc-patient-display"
              >
                {patientValue ? (
                  <p className="text-foreground text-base leading-relaxed whitespace-pre-wrap">{patientValue}</p>
                ) : (
                  <p className="text-muted-foreground italic flex items-center gap-2 text-sm">
                    <User className="h-5 w-5" />
                    Kliknij aby dodać opis dla pacjenta...
                  </p>
                )}
              </button>
            )}
          </TabsContent>

          {/* Clinical Tab */}
          <TabsContent
            value="clinical"
            className={cn(
              "flex-1 mt-0",
              isAiSuggested("clinicalDescription") && "ai-suggested rounded-lg"
            )}
          >
            {isClinicalEditing ? (
              <div className="flex flex-col h-full">
                <Textarea
                  ref={clinicalRef}
                  value={clinicalValue}
                  onChange={(e) => setClinicalValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") handleClinicalCancel();
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleClinicalSave();
                  }}
                  placeholder="Opis kliniczny: biomechanika, mięśnie aktywowane, wskazania medyczne..."
                  disabled={isClinicalSaving}
                  className={cn(
                    "flex-1 min-h-[200px] resize-none text-base leading-relaxed border-primary bg-surface",
                    isClinicalSaving && "opacity-70"
                  )}
                  data-testid="dual-desc-clinical-textarea"
                />
                <div className="flex items-center justify-end gap-2 mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClinicalCancel}
                    disabled={isClinicalSaving}
                  >
                    Anuluj
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleClinicalSave}
                    disabled={isClinicalSaving}
                  >
                    {isClinicalSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Zapisz
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleClinicalEdit}
                disabled={disabled}
                className={cn(
                  "w-full text-left p-4 rounded-lg border transition-colors min-h-[200px]",
                  "hover:border-primary/40 hover:bg-surface-light/50",
                  clinicalValue ? "border-transparent" : "border-dashed border-border/40"
                )}
                data-testid="dual-desc-clinical-display"
              >
                {clinicalValue ? (
                  <p className="text-foreground text-base leading-relaxed whitespace-pre-wrap">{clinicalValue}</p>
                ) : (
                  <p className="text-muted-foreground italic flex items-center gap-2 text-sm">
                    <Stethoscope className="h-5 w-5" />
                    Kliknij aby dodać opis kliniczny...
                  </p>
                )}
              </button>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
