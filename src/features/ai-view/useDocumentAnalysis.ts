'use client';

import { useCallback } from 'react';

import { documentImportService } from '@/services/documentImportService';
import { useChatActions } from './ChatSessionContext';
import type { AssistantReply } from './useChatThread';
import { toDocumentItems } from './utils/documentItems';
import type { DocumentItem } from './utils/chatCards';

export const DOCUMENT_ACCEPT = documentImportService.getSupportedFormats().join(',');
export const MIN_NOTE_LENGTH = 20;

function describeResult(items: readonly DocumentItem[]): string {
  if (items.length === 0) return 'Nie widzę w tym ćwiczeń. Napisz, co pacjent ma ćwiczyć, a ułożę zestaw.';
  const matched = items.filter((item) => item.matchedExerciseId).length;
  if (matched === items.length) return `Wszystkie ${items.length} pozycje są w katalogu. Ułożę z nich zestaw.`;
  return `Pozycji: ${items.length}, w katalogu: ${matched}. Brakujące możesz dodać jako nowe ćwiczenia.`;
}

/**
 * Document or visit note → exercises found in it (the import's analysis and catalog matching),
 * as a card in the thread. Costs AI credits like the import screen.
 */
export function useDocumentAnalysis() {
  const { runTask, refetchCredits } = useChatActions();

  const analyzeFile = useCallback(
    (file: File, patientId?: string) =>
      runTask(
        'Przeanalizuj dokument',
        async (): Promise<AssistantReply> => {
          if (!documentImportService.isFormatSupported(file)) {
            throw new Error('Tego formatu nie odczytam. Obsługuję PDF, Excel, CSV i TXT.');
          }
          if (!documentImportService.isFileSizeValid(file)) {
            throw new Error(`Plik jest za duży (limit ${documentImportService.getMaxFileSizeMB()} MB).`);
          }
          const items = toDocumentItems(await documentImportService.analyzeDocument(file, patientId));
          refetchCredits();
          return {
            text: describeResult(items),
            spec: { component: 'DocumentResult', fileName: file.name, items, patientId },
          };
        },
        file.name
      ),
    [refetchCredits, runTask]
  );

  const analyzeNote = useCallback(
    (note: string, patientId?: string) => {
      const text = note.trim();
      if (text.length < MIN_NOTE_LENGTH) return Promise.resolve(false);
      return runTask(text.length > 160 ? `${text.slice(0, 157)}…` : text, async (): Promise<AssistantReply> => {
        const items = toDocumentItems(await documentImportService.analyzeText(text, patientId));
        refetchCredits();
        return {
          text: describeResult(items),
          spec: { component: 'DocumentResult', fileName: 'Notatka z wizyty', items, patientId },
        };
      });
    },
    [refetchCredits, runTask]
  );

  return { analyzeFile, analyzeNote };
}
