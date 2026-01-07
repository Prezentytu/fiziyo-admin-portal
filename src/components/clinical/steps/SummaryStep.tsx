'use client';

import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  ClipboardList,
  Stethoscope,
  FileText,
  Target,
  Activity,
  Pencil,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  ClinicalNoteSections,
  VisitType,
  InterviewSection,
  ExaminationSection,
  DiagnosisSection,
  TreatmentPlanSection,
  VisitProgressSection,
} from '@/types/clinical.types';

interface SummaryStepProps {
  visitType: VisitType;
  visitDate: string;
  title: string;
  sections: ClinicalNoteSections;
  onEditStep: (stepIndex: number) => void;
  disabled?: boolean;
}

const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  INITIAL: 'Pierwsza wizyta',
  FOLLOWUP: 'Wizyta kontrolna',
  DISCHARGE: 'Wizyta końcowa',
  CONSULTATION: 'Konsultacja',
};

interface SectionSummaryProps {
  title: string;
  icon: React.ReactNode;
  stepIndex: number;
  onEdit: () => void;
  isEmpty: boolean;
  children: React.ReactNode;
  disabled?: boolean;
}

function SectionSummary({
  title,
  icon,
  onEdit,
  isEmpty,
  children,
  disabled,
}: SectionSummaryProps) {
  return (
    <Card className={cn(
      'border-border/40 transition-all',
      isEmpty && 'border-warning/30 bg-warning/5'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {icon}
            {title}
            {isEmpty && (
              <Badge variant="warning" className="text-[10px]">
                <AlertCircle className="h-3 w-3 mr-1" />
                Niewypełnione
              </Badge>
            )}
            {!isEmpty && (
              <Badge variant="success" className="text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Wypełnione
              </Badge>
            )}
          </CardTitle>
          {!disabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-7 text-xs gap-1"
            >
              <Pencil className="h-3 w-3" />
              Edytuj
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isEmpty ? (
          <p className="text-sm text-muted-foreground italic">
            Brak danych - kliknij &quot;Edytuj&quot; aby uzupełnić
          </p>
        ) : (
          <div className="text-sm text-foreground space-y-1">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InterviewSummary({ data }: { data?: InterviewSection }) {
  if (!data) return null;
  
  return (
    <>
      {data.mainComplaint && (
        <p><strong>Dolegliwość:</strong> {data.mainComplaint}</p>
      )}
      {data.painLocation && data.painLocation.length > 0 && (
        <p><strong>Lokalizacja:</strong> {data.painLocation.join(', ')}</p>
      )}
      {data.painIntensity !== undefined && data.painIntensity !== null && (
        <p><strong>Intensywność bólu:</strong> {data.painIntensity}/10</p>
      )}
      {data.painDuration && (
        <p><strong>Czas trwania:</strong> {data.painDuration}</p>
      )}
    </>
  );
}

function ExaminationSummary({ data }: { data?: ExaminationSection }) {
  if (!data) return null;
  
  return (
    <>
      {data.posture && (
        <p><strong>Postawa:</strong> {data.posture}</p>
      )}
      {data.specialTests && data.specialTests.length > 0 && (
        <p>
          <strong>Testy specjalne:</strong>{' '}
          {data.specialTests.map(t => `${t.name} (${t.result || 'brak wyniku'})`).join(', ')}
        </p>
      )}
      {data.muscleStrength && (
        <p><strong>Siła mięśniowa:</strong> {data.muscleStrength}</p>
      )}
    </>
  );
}

function DiagnosisSummary({ data }: { data?: DiagnosisSection }) {
  if (!data) return null;
  
  return (
    <>
      {data.icd10Codes && data.icd10Codes.length > 0 && (
        <p>
          <strong>ICD-10:</strong>{' '}
          {data.icd10Codes.map(c => `${c.code} - ${c.description}`).join('; ')}
        </p>
      )}
      {data.clinicalReasoning && (
        <p><strong>Rozumowanie kliniczne:</strong> {data.clinicalReasoning}</p>
      )}
    </>
  );
}

function TreatmentPlanSummary({ data }: { data?: TreatmentPlanSection }) {
  if (!data) return null;
  
  return (
    <>
      {data.shortTermGoals && (
        <p><strong>Cele krótkoterminowe:</strong> {data.shortTermGoals}</p>
      )}
      {data.longTermGoals && (
        <p><strong>Cele długoterminowe:</strong> {data.longTermGoals}</p>
      )}
      {data.interventions && data.interventions.length > 0 && (
        <p><strong>Interwencje:</strong> {data.interventions.join(', ')}</p>
      )}
    </>
  );
}

function VisitProgressSummary({ data }: { data?: VisitProgressSection }) {
  if (!data) return null;
  
  return (
    <>
      {data.techniques && (
        <p><strong>Zastosowane techniki:</strong> {data.techniques}</p>
      )}
      {data.patientResponse && (
        <p><strong>Reakcja pacjenta:</strong> {data.patientResponse}</p>
      )}
      {data.currentPainLevel !== undefined && data.currentPainLevel !== null && (
        <p><strong>Aktualny poziom bólu:</strong> {data.currentPainLevel}/10</p>
      )}
    </>
  );
}

export function SummaryStep({
  visitType,
  visitDate,
  title,
  sections,
  onEditStep,
  disabled = false,
}: SummaryStepProps) {
  const hasInterview = !!(sections.interview?.mainComplaint || sections.interview?.painLocation?.length);
  const hasExamination = !!(sections.examination?.posture || sections.examination?.specialTests?.length);
  const hasDiagnosis = !!(sections.diagnosis?.icd10Codes?.length);
  const hasTreatmentPlan = !!(sections.treatmentPlan?.shortTermGoals || sections.treatmentPlan?.interventions?.length);
  const hasVisitProgress = !!(sections.visitProgress?.techniques);

  const showVisitProgress = visitType === 'FOLLOWUP' || visitType === 'DISCHARGE';

  return (
    <div className="space-y-4">
      {/* Header info */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Typ wizyty: </span>
              <strong>{VISIT_TYPE_LABELS[visitType]}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Data: </span>
              <strong>{format(new Date(visitDate), 'd MMMM yyyy', { locale: pl })}</strong>
            </div>
            {title && (
              <div>
                <span className="text-muted-foreground">Tytuł: </span>
                <strong>{title}</strong>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation message */}
      {(!hasInterview || !hasDiagnosis) && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">Niektóre sekcje wymagają uzupełnienia</p>
            <p className="text-xs text-muted-foreground mt-1">
              Zalecamy wypełnienie przynajmniej wywiadu i rozpoznania przed podpisaniem dokumentacji.
            </p>
          </div>
        </div>
      )}

      {/* Section summaries */}
      <div className="space-y-3">
        <SectionSummary
          title="Wywiad"
          icon={<ClipboardList className="h-4 w-4 text-primary" />}
          stepIndex={1}
          onEdit={() => onEditStep(1)}
          isEmpty={!hasInterview}
          disabled={disabled}
        >
          <InterviewSummary data={sections.interview} />
        </SectionSummary>

        <SectionSummary
          title="Badanie przedmiotowe"
          icon={<Stethoscope className="h-4 w-4 text-primary" />}
          stepIndex={2}
          onEdit={() => onEditStep(2)}
          isEmpty={!hasExamination}
          disabled={disabled}
        >
          <ExaminationSummary data={sections.examination} />
        </SectionSummary>

        <SectionSummary
          title="Rozpoznanie"
          icon={<FileText className="h-4 w-4 text-primary" />}
          stepIndex={3}
          onEdit={() => onEditStep(3)}
          isEmpty={!hasDiagnosis}
          disabled={disabled}
        >
          <DiagnosisSummary data={sections.diagnosis} />
        </SectionSummary>

        <SectionSummary
          title="Plan terapii"
          icon={<Target className="h-4 w-4 text-primary" />}
          stepIndex={4}
          onEdit={() => onEditStep(4)}
          isEmpty={!hasTreatmentPlan}
          disabled={disabled}
        >
          <TreatmentPlanSummary data={sections.treatmentPlan} />
        </SectionSummary>

        {showVisitProgress && (
          <SectionSummary
            title="Przebieg wizyty"
            icon={<Activity className="h-4 w-4 text-primary" />}
            stepIndex={5}
            onEdit={() => onEditStep(5)}
            isEmpty={!hasVisitProgress}
            disabled={disabled}
          >
            <VisitProgressSummary data={sections.visitProgress} />
          </SectionSummary>
        )}
      </div>
    </div>
  );
}










