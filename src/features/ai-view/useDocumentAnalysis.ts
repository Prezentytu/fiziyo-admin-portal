'use client';

import { useCallback } from 'react';
import { useApolloClient } from '@apollo/client/react';

import { GET_AVAILABLE_EXERCISES_PICKER_QUERY } from '@/graphql/queries/exercises.queries';
import { documentImportService } from '@/services/documentImportService';
import { useChatActions } from './ChatSessionContext';
import type { AssistantReply } from './useChatThread';
import { toDocumentItems } from './utils/documentItems';
import type { DocumentItem } from './utils/chatCards';
import type { SearchableExercise } from './utils/exerciseLookup';

export const DOCUMENT_ACCEPT = documentImportService.getSupportedFormats().join(',');
export const MIN_NOTE_LENGTH = 20;

function describeResult(items: readonly DocumentItem[]): string {
  if (items.length === 0) return 'Nie widzę w tym ćwiczeń. Napisz, co pacjent ma ćwiczyć, a ułożę zestaw.';
  const matched = items.filter((item) => item.matchedExerciseId).length;
  const uncertain = items.filter((item) => !item.matchedExerciseId && item.suggestedExerciseId).length;
  if (matched === items.length) return `Wszystkie ${items.length} pozycje są w katalogu. Ułożę z nich zestaw.`;
  const check = uncertain > 0 ? ` Do sprawdzenia: ${uncertain}, potwierdź albo utwórz nowe.` : '';
  return `Pozycji: ${items.length}, w katalogu: ${matched}.${check} Brakujące możesz dodać jako nowe ćwiczenia.`;
}

/**
 * Document or visit note → exercises found in it (the import's analysis and catalog matching),
 * as a card in the thread. Costs AI credits like the import screen.
 */
export function useDocumentAnalysis() {
  const { runTask, refetchCredits, organizationId } = useChatActions();
  const client = useApolloClient();

  // The chat's own search checks what the import did not match ("brak w katalogu" for a plain
  // bridge made duplicates); the same cached picker query as the set card.
  const loadCatalog = useCallback(async (): Promise<SearchableExercise[]> => {
    try {
      const { data } = await client.query<{ availableExercises?: SearchableExercise[] }>({
        query: GET_AVAILABLE_EXERCISES_PICKER_QUERY,
        variables: { organizationId },
      });
      return data?.availableExercises ?? [];
    } catch {
      return [];
    }
  }, [client, organizationId]);

  const analyzeFile = useCallback(
    (file: File, patientId?: string) =>
      runTask(
        'Przeanalizuj dokument',
        async (signal): Promise<AssistantReply> => {
          if (!documentImportService.isFormatSupported(file)) {
            throw new Error('Tego formatu nie odczytam. Obsługuję PDF, Excel, CSV i TXT.');
          }
          if (!documentImportService.isFileSizeValid(file)) {
            throw new Error(`Plik jest za duży (limit ${documentImportService.getMaxFileSizeMB()} MB).`);
          }
          const [analysis, catalog] = await Promise.all([
            documentImportService.analyzeDocument(file, patientId, undefined, signal),
            loadCatalog(),
          ]);
          const items = toDocumentItems(analysis, catalog);
          refetchCredits();
          return {
            text: describeResult(items),
            spec: { component: 'DocumentResult', fileName: file.name, items, patientId },
          };
        },
        file.name
      ),
    [loadCatalog, refetchCredits, runTask]
  );

  const analyzeNote = useCallback(
    (note: string, patientId?: string) => {
      const text = note.trim();
      if (text.length < MIN_NOTE_LENGTH) return Promise.resolve(false);
      return runTask(text.length > 160 ? `${text.slice(0, 157)}…` : text, async (signal): Promise<AssistantReply> => {
        const [analysis, catalog] = await Promise.all([
          documentImportService.analyzeText(text, patientId, undefined, signal),
          loadCatalog(),
        ]);
        const items = toDocumentItems(analysis, catalog);
        refetchCredits();
        return {
          text: describeResult(items),
          spec: { component: 'DocumentResult', fileName: 'Notatka z wizyty', items, patientId },
        };
      });
    },
    [loadCatalog, refetchCredits, runTask]
  );

  return { analyzeFile, analyzeNote };
}
