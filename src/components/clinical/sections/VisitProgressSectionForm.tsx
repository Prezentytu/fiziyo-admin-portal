'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { VisitProgressSection } from '@/types/clinical.types';

interface VisitProgressSectionFormProps {
  data: VisitProgressSection;
  onChange: (data: VisitProgressSection) => void;
  disabled?: boolean;
}

export function VisitProgressSectionForm({
  data,
  onChange,
  disabled = false,
}: VisitProgressSectionFormProps) {
  const updateField = <K extends keyof VisitProgressSection>(
    field: K,
    value: VisitProgressSection[K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Aktualny poziom bólu */}
      <div className="space-y-2">
        <Label htmlFor="currentPainLevel">Aktualny poziom bólu (0-10)</Label>
        <div className="flex items-center gap-3">
          <Input
            id="currentPainLevel"
            type="number"
            min={0}
            max={10}
            value={data.currentPainLevel ?? ''}
            onChange={(e) => updateField('currentPainLevel', e.target.value ? Number(e.target.value) : undefined)}
            className="w-20"
            disabled={disabled}
          />
          <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 opacity-50" />
          <span className="text-sm text-muted-foreground w-8 text-right">
            {data.currentPainLevel ?? '-'}/10
          </span>
        </div>
      </div>

      {/* Porównanie z poprzednią wizytą */}
      <div className="space-y-2">
        <Label htmlFor="progressComparison">Porównanie z poprzednią wizytą</Label>
        <Textarea
          id="progressComparison"
          value={data.progressComparison || ''}
          onChange={(e) => updateField('progressComparison', e.target.value)}
          placeholder="Opisz zmiany od ostatniej wizyty (poprawa, pogorszenie, bez zmian)..."
          className="min-h-[80px]"
          disabled={disabled}
        />
      </div>

      {/* Zastosowane techniki */}
      <div className="space-y-2">
        <Label htmlFor="techniques">Zastosowane techniki</Label>
        <Textarea
          id="techniques"
          value={data.techniques || ''}
          onChange={(e) => updateField('techniques', e.target.value)}
          placeholder="Jakie techniki/zabiegi wykonano podczas wizyty..."
          className="min-h-[80px]"
          disabled={disabled}
        />
      </div>

      {/* Reakcja pacjenta */}
      <div className="space-y-2">
        <Label htmlFor="patientResponse">Reakcja pacjenta na leczenie</Label>
        <Textarea
          id="patientResponse"
          value={data.patientResponse || ''}
          onChange={(e) => updateField('patientResponse', e.target.value)}
          placeholder="Jak pacjent reagował na zastosowane techniki..."
          className="min-h-[60px]"
          disabled={disabled}
        />
      </div>

      {/* Modyfikacje planu */}
      <div className="space-y-2">
        <Label htmlFor="planModifications">Modyfikacje planu terapii</Label>
        <Textarea
          id="planModifications"
          value={data.planModifications || ''}
          onChange={(e) => updateField('planModifications', e.target.value)}
          placeholder="Zmiany wprowadzone do planu terapii..."
          className="min-h-[60px]"
          disabled={disabled}
        />
      </div>

      {/* Zalecenia domowe */}
      <div className="space-y-2">
        <Label htmlFor="progressHomeRecommendations">Zalecenia domowe na kolejny okres</Label>
        <Textarea
          id="progressHomeRecommendations"
          value={data.homeRecommendations || ''}
          onChange={(e) => updateField('homeRecommendations', e.target.value)}
          placeholder="Ćwiczenia i zalecenia do wykonania w domu do następnej wizyty..."
          className="min-h-[80px]"
          disabled={disabled}
        />
      </div>

      {/* Następne kroki */}
      <div className="space-y-2">
        <Label htmlFor="nextSteps">Następne kroki</Label>
        <Textarea
          id="nextSteps"
          value={data.nextSteps || ''}
          onChange={(e) => updateField('nextSteps', e.target.value)}
          placeholder="Plan na następne wizyty, cele do osiągnięcia..."
          className="min-h-[60px]"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

