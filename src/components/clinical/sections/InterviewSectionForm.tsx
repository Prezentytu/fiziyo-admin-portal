'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { QuickPhrases } from '../QuickPhrases';
import { QUICK_PHRASES } from '@/types/clinical.types';
import type { InterviewSection } from '@/types/clinical.types';

interface InterviewSectionFormProps {
  data: InterviewSection;
  onChange: (data: InterviewSection) => void;
  disabled?: boolean;
}

export function InterviewSectionForm({
  data,
  onChange,
  disabled = false,
}: InterviewSectionFormProps) {
  const updateField = <K extends keyof InterviewSection>(
    field: K,
    value: InterviewSection[K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  const toggleArrayItem = (field: 'painLocation' | 'painCharacter' | 'aggravatingFactors' | 'relievingFactors', item: string) => {
    const currentArray = data[field] || [];
    const newArray = currentArray.includes(item)
      ? currentArray.filter((i) => i !== item)
      : [...currentArray, item];
    updateField(field, newArray);
  };

  return (
    <div className="space-y-6">
      {/* Główna dolegliwość */}
      <div className="space-y-2">
        <Label htmlFor="mainComplaint">Główna dolegliwość / powód wizyty</Label>
        <Textarea
          id="mainComplaint"
          value={data.mainComplaint || ''}
          onChange={(e) => updateField('mainComplaint', e.target.value)}
          placeholder="Opisz główną dolegliwość pacjenta..."
          className="min-h-[80px]"
          disabled={disabled}
        />
        <QuickPhrases
          phrases={QUICK_PHRASES.mainComplaint}
          onSelect={(phrase) => updateField('mainComplaint', phrase)}
          className="mt-2"
        />
      </div>

      {/* Lokalizacja i czas trwania */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Lokalizacja bólu</Label>
          <QuickPhrases
            phrases={QUICK_PHRASES.painLocation}
            onSelect={(phrase) => toggleArrayItem('painLocation', phrase)}
            selectedPhrases={data.painLocation || []}
            multiSelect
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="painDuration">Czas trwania objawów</Label>
          <Input
            id="painDuration"
            value={data.painDuration || ''}
            onChange={(e) => updateField('painDuration', e.target.value)}
            placeholder="np. 2 tygodnie, 3 miesiące"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Charakter bólu i intensywność */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Charakter bólu</Label>
          <QuickPhrases
            phrases={QUICK_PHRASES.painCharacter}
            onSelect={(phrase) => toggleArrayItem('painCharacter', phrase)}
            selectedPhrases={data.painCharacter || []}
            multiSelect
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="painIntensity">Intensywność bólu (0-10)</Label>
          <div className="flex items-center gap-3">
            <Input
              id="painIntensity"
              type="number"
              min={0}
              max={10}
              value={data.painIntensity ?? ''}
              onChange={(e) => updateField('painIntensity', e.target.value ? Number(e.target.value) : undefined)}
              className="w-20"
              disabled={disabled}
            />
            <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Czynniki nasilające i łagodzące */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Czynniki nasilające</Label>
          <QuickPhrases
            phrases={QUICK_PHRASES.aggravatingFactors}
            onSelect={(phrase) => toggleArrayItem('aggravatingFactors', phrase)}
            selectedPhrases={data.aggravatingFactors || []}
            multiSelect
          />
        </div>
        <div className="space-y-2">
          <Label>Czynniki łagodzące</Label>
          <QuickPhrases
            phrases={QUICK_PHRASES.relievingFactors}
            onSelect={(phrase) => toggleArrayItem('relievingFactors', phrase)}
            selectedPhrases={data.relievingFactors || []}
            multiSelect
          />
        </div>
      </div>

      {/* Dotychczasowe leczenie */}
      <div className="space-y-2">
        <Label htmlFor="previousTreatment">Dotychczasowe leczenie</Label>
        <Textarea
          id="previousTreatment"
          value={data.previousTreatment || ''}
          onChange={(e) => updateField('previousTreatment', e.target.value)}
          placeholder="Opisz dotychczasowe leczenie..."
          className="min-h-[60px]"
          disabled={disabled}
        />
      </div>

      {/* Choroby współistniejące i leki */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="comorbidities">Choroby współistniejące</Label>
          <Textarea
            id="comorbidities"
            value={data.comorbidities || ''}
            onChange={(e) => updateField('comorbidities', e.target.value)}
            placeholder="np. nadciśnienie, cukrzyca..."
            className="min-h-[60px]"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="medications">Przyjmowane leki</Label>
          <Textarea
            id="medications"
            value={data.medications || ''}
            onChange={(e) => updateField('medications', e.target.value)}
            placeholder="Wymień przyjmowane leki..."
            className="min-h-[60px]"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Zawód */}
      <div className="space-y-2">
        <Label htmlFor="occupation">Zawód / aktywność fizyczna</Label>
        <Input
          id="occupation"
          value={data.occupation || ''}
          onChange={(e) => updateField('occupation', e.target.value)}
          placeholder="np. pracownik biurowy, sportowiec..."
          disabled={disabled}
        />
      </div>

      {/* Dodatkowe notatki */}
      <div className="space-y-2">
        <Label htmlFor="interviewNotes">Dodatkowe notatki z wywiadu</Label>
        <Textarea
          id="interviewNotes"
          value={data.additionalNotes || ''}
          onChange={(e) => updateField('additionalNotes', e.target.value)}
          placeholder="Inne istotne informacje..."
          className="min-h-[60px]"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

