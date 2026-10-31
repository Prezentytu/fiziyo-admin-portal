import { NAVIGATE_ROUTES, type ChatViewSpec } from './viewSpec';

interface ReplyTextContext {
  patientName?: (patientId: string) => string | undefined;
  setName?: (setId: string) => string | undefined;
}

/**
 * The sentence above a card when it came from rules (no model text). Written without gendered
 * past forms ("znalazłem"), so it reads the same whoever the therapist imagines on the other side.
 */
export function describeSpec(spec: ChatViewSpec, context: ReplyTextContext = {}): string {
  const patient = 'patientId' in spec && spec.patientId ? context.patientName?.(spec.patientId) : undefined;
  switch (spec.component) {
    case 'SetDraft': {
      const set = spec.setId ? context.setName?.(spec.setId) : undefined;
      if (set) {
        return patient
          ? `W katalogu jest zestaw „${set}”. Zmień, co trzeba, a potem ustalimy harmonogram dla: ${patient}.`
          : `W katalogu jest zestaw „${set}”. Zmień, co trzeba, i wybierz pacjenta.`;
      }
      if (!spec.setId && spec.exerciseIds.length === 0) {
        return patient
          ? `Nowy zestaw dla: ${patient}. Dodaj ćwiczenia z katalogu.`
          : 'Nowy zestaw bez pacjenta. Dodaj ćwiczenia z katalogu, a potem zapisz go w katalogu gabinetu.';
      }
      return patient
        ? `Proponuję te ćwiczenia z katalogu dla: ${patient}. Zamień albo usuń, co nie pasuje.`
        : 'Proponuję te ćwiczenia z katalogu. Zamień albo usuń, co nie pasuje.';
    }
    case 'AssignSummary':
      return patient ? `Zestaw jest gotowy do przypisania: ${patient}.` : 'Zestaw jest gotowy do przypisania.';
    case 'ExerciseResults':
      return spec.query ? `Ćwiczenia z katalogu dla: „${spec.query}”.` : 'Ćwiczenia z katalogu.';
    case 'PatientPeek':
      if (spec.filter === 'inactive')
        return 'Ci pacjenci ostatnio nie ćwiczą. Możesz im przypomnieć jednym kliknięciem.';
      return patient ? `Tak wygląda teraz plan: ${patient}.` : 'Tak wygląda teraz plan pacjenta.';
    case 'Navigate':
      if (spec.route === 'patient-new') return 'Uzupełnij dane, a dodam pacjenta.';
      return `Otwieram: ${NAVIGATE_ROUTES[spec.route].label}.`;
    case 'Clarify':
      return spec.question;
    case 'AddPatient':
      return spec.name ? `Uzupełnij dane, a dodam pacjenta: ${spec.name}.` : 'Uzupełnij dane, a dodam pacjenta.';
    case 'CreateExercise':
      return 'Opisz ćwiczenie i ustaw podstawowe parametry, a dodam je do katalogu gabinetu.';
  }
}
