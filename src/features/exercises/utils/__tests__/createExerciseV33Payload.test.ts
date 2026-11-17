// Błąd P-5 (lab 15.11.2026): ćwiczenie utworzone w portalu powstaje w starym formacie. Kreator ręczny
// („LAB ręczne: wspięcia…”) zapisał SchemaVersion NULL i w ogóle bez enrichmentData — opis i sprzęt poszły tylko
// do starych kolumn; zapis treści z AI / czatu daje `{ $schema: fiziyo-exercise-v3, patient.steps }` bez
// `schemaVersion`, więc rekord nigdy nie staje się 3.3. Decyzja właściciela D-11 (10.11): nowy rekord od razu
// w nowej schemie, bez projekcji do starych pól. Backend wyprowadza SchemaVersion z otrzymanego dokumentu,
// więc poprawka należy do ładunku z portalu.
import { describe, expect, it, vi } from 'vitest';

import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { buildChatExerciseEnrichment } from '@/features/ai-view/utils/chatExerciseDraft';
import { buildCreateExerciseVariables } from '../buildCreateExerciseVariables';
import { createExerciseSubmit } from '../createExerciseSubmit';
import { mergeAiEnrichment } from '../aiFullExercise';

type Doc = Record<string, unknown> & {
  schemaVersion?: string;
  patient?: { steps?: string[]; summary?: string };
  equipment_items?: Array<{ label?: string }>;
};

/** Ostatni dokument treści, który portal wysłał (w create albo w następującym po nim updateExercise). */
async function submitAndCollect(draft: Parameters<typeof createExerciseSubmit>[0]['draft'], enrichment: ExerciseEnrichmentData) {
  const createExercise = vi.fn().mockResolvedValue({ data: { createExercise: { id: 'ex-new' } } });
  const updateExercise = vi.fn().mockResolvedValue({});
  await createExerciseSubmit({ organizationId: 'org-1', draft, enrichment, createExercise, updateExercise });
  const createVariables = createExercise.mock.calls[0][0].variables;
  const sentJson = [
    createVariables.enrichmentDataJson,
    ...updateExercise.mock.calls.map((call) => call[0].variables.enrichmentDataJson),
  ].filter((json): json is string => typeof json === 'string');
  const lastDocument = sentJson.length > 0 ? (JSON.parse(sentJson[sentJson.length - 1]) as Doc) : null;
  return { createVariables, lastDocument };
}

const manualDraft = {
  name: 'LAB ręczne: wspięcia na palce',
  patientDescription: 'Stań przy ścianie. Wspnij się na palce i powoli opuść pięty.',
  equipment: 'ściana',
  sets: 2,
  reps: 12,
};

describe('nowe ćwiczenie z portalu od razu w 3.3 (P-5)', () => {
  it('kreator ręczny bez treści rozszerzonej: wysyła dokument z `schemaVersion: "3.3"`', async () => {
    const { lastDocument } = await submitAndCollect(manualDraft, {});
    expect(lastDocument).not.toBeNull();
    expect(lastDocument?.schemaVersion).toBe('3.3');
  });

  it('kreator ręczny: sprzęt trafia do `equipment_items`, nie do kolumny `equipment`', async () => {
    const { createVariables, lastDocument } = await submitAndCollect(manualDraft, {});
    expect(lastDocument?.equipment_items?.map((item) => item.label)).toEqual(['ściana']);
    expect(createVariables.equipment).toBeNull();
  });

  it('kreator ręczny: opis dla pacjenta trafia do dokumentu (`patient`), nie do kolumny opisu', async () => {
    const { createVariables, lastDocument } = await submitAndCollect(manualDraft, {});
    expect(JSON.stringify(lastDocument?.patient ?? {})).toContain('Wspnij się na palce');
    expect(createVariables.description ?? '').toBe('');
  });

  it('kreator z wpisanymi krokami: dokument ma `schemaVersion: "3.3"` i kroki w `patient.steps`', async () => {
    const steps = ['Stań przy ścianie.', 'Wspnij się na palce.', 'Powoli opuść pięty.'];
    const { lastDocument } = await submitAndCollect({ name: 'Wspięcia' }, { patient: { steps } });
    expect(lastDocument?.schemaVersion).toBe('3.3');
    expect(lastDocument?.patient?.steps).toEqual(steps);
  });

  it('kreator z treścią z `/api/ai/generate-enrichment`: zapisany dokument ma `schemaVersion: "3.3"`', async () => {
    // Odpowiedź AI w kształcie v3 bez wersji, jak zwraca ją dziś endpoint.
    const aiData: ExerciseEnrichmentData = {
      $schema: 'fiziyo-exercise-v3',
      patient: { summary: 'Wspięcia na palce przy ścianie.', steps: ['Stań przy ścianie.', 'Wspnij się na palce.'] },
      safety: { stop_if: 'Ostry ból łydki.' },
    };
    const { next } = mergeAiEnrichment({}, aiData);
    const { lastDocument } = await submitAndCollect({ name: 'Wspięcia (AI)' }, next);
    expect(lastDocument?.schemaVersion).toBe('3.3');
  });

  it('czat „Utwórz ćwiczenie”: enrichmentDataJson ma `schemaVersion: "3.3"`, opis nie idzie do kolumny', () => {
    const variables = buildCreateExerciseVariables({
      organizationId: 'org-1',
      draft: {
        name: 'Wspięcia z czatu',
        patientDescription: 'Wspięcia na palce przy ścianie.',
        enrichmentData: buildChatExerciseEnrichment({
          steps: 'Stań przy ścianie.\nWspnij się na palce.',
          cues: 'Powoli w dół.',
          mistakes: 'Odrywanie pięt za szybko → schodź powoli',
          stopIf: 'Ból łydki',
        }),
      },
    });
    const document = JSON.parse(variables.enrichmentDataJson ?? 'null') as Doc | null;
    expect(document?.schemaVersion).toBe('3.3');
    expect(document?.patient?.steps).toEqual(['Stań przy ścianie.', 'Wspnij się na palce.']);
    expect(JSON.stringify(document)).toContain('Odrywanie pięt za szybko');
    expect(JSON.stringify(document)).toContain('Ból łydki');
    expect(variables.description ?? '').toBe('');
  });
});
