'use client';

import { useCallback } from 'react';

import { useMeFeature } from '@/hooks/useMeFeature';

import { useChatSession } from './ChatSessionContext';

/** SPEC-052 flag from Ops; off hides every „Skanuj wizytę” entry point. */
export const SCAN_VISIT_FEATURE_FLAG = 'scanVisit';

/**
 * The three shortcuts of the design (BW-FZ-45): create a set, add a patient, scan a visit. Each
 * answers in the thread right away, without a model call, and brings the therapist back to chat.
 */
export function useChatShortcuts() {
  const { appendExchange, isReady, goHome } = useChatSession();
  const scanVisitEnabled = useMeFeature(SCAN_VISIT_FEATURE_FLAG);

  const createSet = useCallback(() => {
    appendExchange('Utwórz zestaw', {
      text: 'Napisz, dla kogo i na jaki problem, np. „Kowalski, kolano po ACL”, a zaproponuję ćwiczenia. Możesz też złożyć zestaw sam z katalogu.',
      spec: { component: 'SetDraft', exerciseIds: [] },
    });
    goHome();
  }, [appendExchange, goHome]);

  const addPatient = useCallback(() => {
    appendExchange('Dodaj pacjenta', { text: 'Uzupełnij dane, a dodam pacjenta.', spec: { component: 'AddPatient' } });
    goHome();
  }, [appendExchange, goHome]);

  const scanVisit = useCallback(() => {
    appendExchange('Skanuj wizytę', {
      text: 'Wklej albo podyktuj notatkę z wizyty, albo dodaj dokument z zaleceniami. Wyłuskam z nich ćwiczenia i ułożę zestaw.',
      spec: { component: 'ScanVisit' },
    });
    goHome();
  }, [appendExchange, goHome]);

  return { createSet, addPatient, scanVisit, scanVisitEnabled, isReady };
}
