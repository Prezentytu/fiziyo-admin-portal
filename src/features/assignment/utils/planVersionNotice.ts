/**
 * Wersje planu pacjenta (FR-008, decyzja 15.11). Postęp pacjenta zeruje tylko świadome odnowienie
 * („Rozpocznij plan od nowa”); każda inna zmiana jest korektą i zachowuje to, co pacjent już zrobił.
 */
export const PLAN_EDIT_CORRECTION_SUMMARY =
  'Korekta: postęp pacjenta zostaje. Zrobione ćwiczenia zostają zrobione, nowe są do zrobienia.';

export const PLAN_EDIT_RESTART_SUMMARY =
  'Odnowienie: postęp pacjenta liczy się od zera. Jeśli pacjent ćwiczył już dziś, nowy plan zacznie się od jutra.';

export const PLAN_RESTART_STARTS_TODAY = 'Plan rozpoczęty od nowa: postęp pacjenta liczy się od dziś.';

export const PLAN_RESTART_STARTS_TOMORROW =
  'Pacjent ćwiczył już dziś, więc plan rozpocznie się od nowa jutro.';

export function planEditSummary(restartPlan: boolean): string {
  return restartPlan ? PLAN_EDIT_RESTART_SUMMARY : PLAN_EDIT_CORRECTION_SUMMARY;
}

/** Opis do komunikatu po odnowieniu planu. */
export function planRestartNotice(startsTomorrow: boolean): string {
  return startsTomorrow ? PLAN_RESTART_STARTS_TOMORROW : PLAN_RESTART_STARTS_TODAY;
}

export interface PlanEditToast {
  kind: 'success' | 'warning';
  title: string;
  description?: string;
}

/**
 * Jeden komunikat po zapisie edycji planu. `restart`: `null`, gdy fizjoterapeuta nie prosił o odnowienie;
 * `'failed'`, gdy odnowienie się nie udało (wtedy samo ostrzeżenie, bez zielonego sukcesu, który by je zakrył).
 */
export function planEditToast(restart: { startsTomorrow: boolean } | 'failed' | null): PlanEditToast {
  if (restart === 'failed') {
    return {
      kind: 'warning',
      title: 'Zmiany zapisane, ale nie udało się rozpocząć planu od nowa',
      description: 'Postęp pacjenta liczy się jak dotąd. Otwórz edycję planu i spróbuj ponownie.',
    };
  }
  return {
    kind: 'success',
    title: 'Plan zaktualizowany',
    ...(restart ? { description: planRestartNotice(restart.startsTomorrow) } : {}),
  };
}
