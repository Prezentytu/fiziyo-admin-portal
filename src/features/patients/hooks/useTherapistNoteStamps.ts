import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_PATIENT_THERAPIST_NOTE_STAMPS_QUERY } from '@/graphql/queries/patientAssignments.queries';
import {
  buildTherapistNoteStampIndex,
  type RawTherapistNoteStampRow,
  type TherapistNoteStampIndex,
} from '../utils/therapistNoteReadStatus';

interface NoteStampsData {
  patientAssignments: (RawTherapistNoteStampRow | null)[] | null;
}

interface NotesSource {
  readonly id: string;
  readonly notes?: string | null;
  readonly exerciseSet?: { readonly exerciseMappings?: readonly { readonly id: string; readonly notes?: string | null }[] } | null;
}

/**
 * Znaczniki „pacjent przeczytał” dla planów pacjenta (S-01 R3). Pobierane osobno od listy planów, a odświeżane, gdy
 * zmieni się tekst którejkolwiek uwagi, bo zapis uwagi przesuwa `notesUpdatedAt` i stary znacznik byłby nieprawdziwy.
 */
export function useTherapistNoteStamps(userId: string, assignments: readonly NotesSource[]): TherapistNoteStampIndex {
  const { data, refetch } = useQuery<NoteStampsData>(GET_PATIENT_THERAPIST_NOTE_STAMPS_QUERY, {
    variables: { userId },
    skip: !userId,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const notesSignature = useMemo(
    () =>
      JSON.stringify(
        assignments.map((assignment) => [
          assignment.id,
          assignment.notes ?? null,
          (assignment.exerciseSet?.exerciseMappings ?? []).map((mapping) => [mapping.id, mapping.notes ?? null]),
        ])
      ),
    [assignments]
  );
  const previousSignature = useRef(notesSignature);
  useEffect(() => {
    if (previousSignature.current === notesSignature) return;
    previousSignature.current = notesSignature;
    void refetch();
  }, [notesSignature, refetch]);

  return useMemo(() => buildTherapistNoteStampIndex(data?.patientAssignments), [data?.patientAssignments]);
}
