'use client';

import { addDays, startOfDay } from 'date-fns';
import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';

import { GET_THERAPIST_VISIT_NOTES_QUERY } from '@/graphql/queries/clinicalNotes.queries';
import { GET_ALL_PATIENT_ASSIGNMENTS_QUERY } from '@/graphql/queries/patientAssignments.queries';
import { useChatSession } from './ChatSessionContext';
import { buildTodayAgenda } from './utils/todayAgenda';

interface VisitNotesResponse {
  therapistClinicalNotes?: Array<{ id: string; patientId: string; visitDate: string; title?: string | null }>;
}

interface AssignmentsResponse {
  patientAssignments?: Array<{ userId: string; endDate?: string | null; status?: string | null }>;
}

function todayRange(now: Date): { from: string; to: string } {
  const start = startOfDay(now);
  const end = addDays(start, 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** "Dziś N wizyty · N sprawy" on the chat home; quiet (empty) when a query fails. */
export function useTodayAgenda() {
  const { organizationId, therapistId, patients } = useChatSession();
  const range = useMemo(() => todayRange(new Date()), []);

  const { data: notesData } = useQuery<VisitNotesResponse>(GET_THERAPIST_VISIT_NOTES_QUERY, {
    variables: { therapistId, organizationId, ...range },
    skip: !therapistId || !organizationId,
    errorPolicy: 'all',
  });
  const { data: assignmentsData } = useQuery<AssignmentsResponse>(GET_ALL_PATIENT_ASSIGNMENTS_QUERY, {
    skip: !therapistId,
    errorPolicy: 'all',
  });

  return useMemo(
    () =>
      buildTodayAgenda({
        therapistId,
        patients,
        notes: notesData?.therapistClinicalNotes ?? [],
        assignments: assignmentsData?.patientAssignments ?? [],
      }),
    [assignmentsData, notesData, patients, therapistId]
  );
}
