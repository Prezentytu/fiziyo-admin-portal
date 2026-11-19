'use client';

import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ExerciseExecutionCardData } from '../types';
import { PatientPreviewTab } from './PatientPreviewTab';
import { buildPreviewGallery } from './previewGallery';

export type ExercisePreviewView = 'details' | 'patient';

export const PATIENT_VIEW_DIALOG_WIDTH = 'max-w-[1240px]';

export function toExercisePreviewView(value: string): ExercisePreviewView {
  return value === 'patient' ? 'patient' : 'details';
}

/** Zakładki „Szczegóły” i „Jak u pacjenta”, wspólne dla każdego podglądu ćwiczenia w portalu. */
export function PatientViewTabsList({ testIdPrefix }: Readonly<{ testIdPrefix: string }>) {
  return (
    <TabsList variant="underline" className="-mb-px">
      <TabsTrigger value="details" activeVariant="underline" data-testid={`${testIdPrefix}-tab-details`}>
        Szczegóły
      </TabsTrigger>
      <TabsTrigger value="patient" activeVariant="underline" data-testid={`${testIdPrefix}-tab-patient`}>
        Jak u pacjenta
      </TabsTrigger>
    </TabsList>
  );
}

/** Treść zakładki „Jak u pacjenta”; telefon montuje się dopiero po wejściu w zakładkę. */
export function PatientViewTabContent({
  exercise,
  view,
  testIdPrefix,
}: Readonly<{ exercise: ExerciseExecutionCardData; view: ExercisePreviewView; testIdPrefix: string }>) {
  return (
    <TabsContent value="patient" className="mt-0 min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {view === 'patient' ? (
        <PatientPreviewTab
          exercise={exercise}
          imageUrl={buildPreviewGallery(exercise)[0] ?? null}
          testIdPrefix={testIdPrefix}
        />
      ) : null}
    </TabsContent>
  );
}
