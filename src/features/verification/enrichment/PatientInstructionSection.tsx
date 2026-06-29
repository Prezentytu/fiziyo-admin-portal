'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ListEditor } from './ListEditor';
import type { EnrichmentInstructionStep, ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

interface PatientInstructionSectionProps {
  draft: ExerciseEnrichmentData;
  disabled?: boolean;
  setPath: (path: string, value: unknown) => void;
  updateDraft: (updater: (current: ExerciseEnrichmentData) => ExerciseEnrichmentData) => void;
  persist: () => Promise<void>;
}

export function PatientInstructionSection({
  draft,
  disabled = false,
  setPath,
  updateDraft,
  persist,
}: Readonly<PatientInstructionSectionProps>) {
  const preExercise = draft.patient_instruction?.pre_exercise;
  const simplifiedInstruction = draft.simplified_instruction ?? '';

  const setSteps = (field: keyof NonNullable<NonNullable<ExerciseEnrichmentData['patient_instruction']>['pre_exercise']>, value: EnrichmentInstructionStep[]) => {
    updateDraft((current) => {
      const next: ExerciseEnrichmentData = {
        ...current,
        patient_instruction: {
          ...(current.patient_instruction ?? {}),
          pre_exercise: {
            ...(current.patient_instruction?.pre_exercise ?? {}),
            [field]: value,
          },
        },
      };
      return next;
    });
  };

  const renderStepsEditor = (
    title: string,
    field: keyof NonNullable<NonNullable<ExerciseEnrichmentData['patient_instruction']>['pre_exercise']>,
    items: EnrichmentInstructionStep[] | undefined
  ) => {
    const safeItems = items && items.length > 0 ? items : [{ step: 1, text: '', phase: '' }];

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() =>
              setSteps(field, [
                ...safeItems,
                { step: safeItems.length + 1, text: '', phase: '' },
              ])
            }
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Dodaj krok
          </Button>
        </div>
        {safeItems.map((item, index) => (
          <div
            key={`${String(field)}-${index}`}
            className="flex min-w-0 flex-col gap-2 @md/enrich:flex-row @md/enrich:items-start"
          >
            <Input
              type="number"
              min={1}
              value={item.step ?? index + 1}
              disabled={disabled}
              className="w-full @md/enrich:w-[70px] @md/enrich:shrink-0"
              onChange={(event) => {
                const next = [...safeItems];
                next[index] = { ...next[index], step: Number(event.target.value) || index + 1 };
                setSteps(field, next);
              }}
              onBlur={() => void persist()}
            />
            <Input
              value={item.phase ?? ''}
              disabled={disabled}
              placeholder="Faza"
              className="w-full @md/enrich:w-[130px] @md/enrich:shrink-0"
              onChange={(event) => {
                const next = [...safeItems];
                next[index] = { ...next[index], phase: event.target.value };
                setSteps(field, next);
              }}
              onBlur={() => void persist()}
            />
            <Input
              value={item.text ?? ''}
              disabled={disabled}
              placeholder="Opis kroku"
              className="w-full min-w-0 @md/enrich:flex-1"
              onChange={(event) => {
                const next = [...safeItems];
                next[index] = { ...next[index], text: event.target.value };
                setSteps(field, next);
              }}
              onBlur={() => void persist()}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              className="self-end @md/enrich:self-auto"
              onClick={() => {
                setSteps(
                  field,
                  safeItems.filter((_, stepIndex) => stepIndex !== index)
                );
                void persist();
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Uproszczona instrukcja</Label>
        <Textarea
          value={simplifiedInstruction}
          disabled={disabled}
          placeholder="Krótki opis ćwiczenia dla pacjenta"
          onChange={(event) => setPath('simplified_instruction', event.target.value)}
          onBlur={() => void persist()}
          className="min-h-[70px]"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 @md/enrich:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Krótkie podsumowanie</Label>
          <Textarea
            value={preExercise?.quick_summary ?? ''}
            disabled={disabled}
            onChange={(event) => setPath('patient_instruction.pre_exercise.quick_summary', event.target.value)}
            onBlur={() => void persist()}
            className="min-h-[70px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Uwaga bezpieczeństwa</Label>
          <Textarea
            value={preExercise?.safety_note ?? ''}
            disabled={disabled}
            onChange={(event) => setPath('patient_instruction.pre_exercise.safety_note', event.target.value)}
            onBlur={() => void persist()}
            className="min-h-[70px]"
          />
        </div>
      </div>

      <ListEditor
        title="Co jest potrzebne"
        items={preExercise?.what_you_need ?? []}
        placeholder="np. Mata do ćwiczeń"
        addLabel="Dodaj element"
        disabled={disabled}
        onChange={(items) => setPath('patient_instruction.pre_exercise.what_you_need', items)}
        onBlur={() => void persist()}
      />

      {renderStepsEditor('Kroki wykonania', 'instruction_steps', preExercise?.instruction_steps)}
      {renderStepsEditor(
        'Kroki — wersja prosta',
        'instruction_steps_simple',
        preExercise?.instruction_steps_simple
      )}
      {renderStepsEditor(
        'Kroki — dla dziecka',
        'instruction_steps_child',
        preExercise?.instruction_steps_child
      )}
      {renderStepsEditor(
        'Kroki — wersja techniczna',
        'instruction_steps_technical',
        preExercise?.instruction_steps_technical
      )}
    </div>
  );
}
