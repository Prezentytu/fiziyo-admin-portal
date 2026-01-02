'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { QuickPhrases } from '../QuickPhrases';
import { QUICK_PHRASES } from '@/types/clinical.types';
import type { TreatmentPlanSection } from '@/types/clinical.types';

interface TreatmentPlanSectionFormProps {
  data: TreatmentPlanSection;
  onChange: (data: TreatmentPlanSection) => void;
  disabled?: boolean;
}

export function TreatmentPlanSectionForm({
  data,
  onChange,
  disabled = false,
}: TreatmentPlanSectionFormProps) {
  const updateField = <K extends keyof TreatmentPlanSection>(
    field: K,
    value: TreatmentPlanSection[K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  const toggleIntervention = (intervention: string) => {
    const currentInterventions = data.interventions || [];
    const newInterventions = currentInterventions.includes(intervention)
      ? currentInterventions.filter((i) => i !== intervention)
      : [...currentInterventions, intervention];
    updateField('interventions', newInterventions);
  };

  return (
    <div className="space-y-6">
      {/* Cele */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="shortTermGoals">Cele krótkoterminowe</Label>
          <Textarea
            id="shortTermGoals"
            value={data.shortTermGoals || ''}
            onChange={(e) => updateField('shortTermGoals', e.target.value)}
            placeholder="Cele do osiągnięcia w ciągu 2-4 tygodni..."
            className="min-h-[80px]"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="longTermGoals">Cele długoterminowe</Label>
          <Textarea
            id="longTermGoals"
            value={data.longTermGoals || ''}
            onChange={(e) => updateField('longTermGoals', e.target.value)}
            placeholder="Cele do osiągnięcia w ciągu 2-3 miesięcy..."
            className="min-h-[80px]"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Planowane interwencje */}
      <div className="space-y-2">
        <Label>Planowane interwencje</Label>
        <QuickPhrases
          phrases={QUICK_PHRASES.interventions}
          onSelect={toggleIntervention}
          selectedPhrases={data.interventions || []}
          multiSelect
        />
        {(data.interventions?.length ?? 0) > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Wybrano: {data.interventions?.join(', ')}
          </p>
        )}
      </div>

      {/* Częstotliwość i czas */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="visitFrequency">Częstotliwość wizyt</Label>
          <Input
            id="visitFrequency"
            value={data.visitFrequency || ''}
            onChange={(e) => updateField('visitFrequency', e.target.value)}
            placeholder="np. 2x w tygodniu"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expectedDuration">Przewidywany czas leczenia</Label>
          <Input
            id="expectedDuration"
            value={data.expectedDuration || ''}
            onChange={(e) => updateField('expectedDuration', e.target.value)}
            placeholder="np. 6-8 tygodni"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Zalecenia domowe */}
      <div className="space-y-2">
        <Label htmlFor="homeRecommendations">Zalecenia domowe</Label>
        <Textarea
          id="homeRecommendations"
          value={data.homeRecommendations || ''}
          onChange={(e) => updateField('homeRecommendations', e.target.value)}
          placeholder="Ćwiczenia do wykonania w domu, zalecenia ergonomiczne..."
          className="min-h-[80px]"
          disabled={disabled}
        />
      </div>

      {/* Dodatkowe notatki */}
      <div className="space-y-2">
        <Label htmlFor="planNotes">Dodatkowe notatki</Label>
        <Textarea
          id="planNotes"
          value={data.additionalNotes || ''}
          onChange={(e) => updateField('additionalNotes', e.target.value)}
          placeholder="Inne uwagi dotyczące planu terapii..."
          className="min-h-[60px]"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

