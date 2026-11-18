import { resolvePlayerHintRotation } from '@/utils/playerHintChunks';

/**
 * Kopia `fizjo-app` `utils/playerPhaseHints.ts` (zmieniaj oba razem).
 *
 * Wskazówki na karcie playera: katalog ogólnych podpowiedzi i wybór wskazówki w danej sekundzie fazy.
 * Czysta logika bez Reacta, żeby ten sam wybór liczyły hook `usePhaseHint` i scenariusz playera
 * (`utils/playerScript.ts`), z którego portal odtwarza widok pacjenta.
 */
export type PlayerPhaseKind = 'prepare' | 'work' | 'rest';

/** Ogólne podpowiedzi, gdy ćwiczenie nie ma własnych wskazówek na daną fazę. */
export const PLAYER_HINTS: Record<PlayerPhaseKind, readonly string[]> = {
  prepare: ['Ustaw pozycję wyjściową', 'Przygotuj się'],
  work: ['Zachowaj zalecone tempo', 'Wykonuj ruch zgodnie z instrukcją', 'Ćwicz w zaleconym zakresie'],
  rest: ['Rozluźnij mięśnie', 'Spokojny oddech', 'Przygotuj się do kolejnej serii'],
};

/** Co ile sekund zmienia się wskazówka w fazie. */
export const PLAYER_HINT_ROTATE_EVERY_SEC = 6;

/** Pierwsza wskazówka przygotowania przed prawą stroną ćwiczenia „na każdą stronę”. */
export const RIGHT_SIDE_PREPARATION_HINT = 'Lewa strona zrobiona. Teraz prawa strona.';

/** Wskazówka w liczeniu powtórzeń, zanim pacjent odhaczy pierwsze powtórzenie serii. */
export const REPS_PLAYER_START_HINT = 'Zacznij serię albo zakończ ją przyciskiem ✓';

export interface SelectPhaseHintOptions {
  readonly rotateEverySec?: number;
  readonly hints?: readonly string[];
  /** Długość fazy; gdy faza nie zdąży pokazać wszystkich części, wskazówki rotują w całości. */
  readonly phaseDurationSec?: number;
}

/** Lista, z której rotuje faza: własne wskazówki ćwiczenia, a bez nich ogólne, z długimi pociętymi na części. */
export function resolvePhaseHintRotation(
  phase: PlayerPhaseKind,
  options: SelectPhaseHintOptions = {}
): readonly string[] {
  const step = resolveRotateStep(options.rotateEverySec);
  const source = options.hints && options.hints.length > 0 ? options.hints : PLAYER_HINTS[phase];
  return source ? resolvePlayerHintRotation(source, step, options.phaseDurationSec) : [];
}

/** Wskazówka widoczna po `phaseElapsedSec` sekundach fazy. */
export function selectPhaseHint(
  phase: PlayerPhaseKind,
  phaseElapsedSec: number,
  options: SelectPhaseHintOptions = {}
): string {
  return pickRotatingHint(resolvePhaseHintRotation(phase, options), phaseElapsedSec, options.rotateEverySec);
}

/** Wybór z gotowej listy rotacji; hook trzyma listę w `useMemo`, więc liczy ją osobno. */
export function pickRotatingHint(hints: readonly string[], phaseElapsedSec: number, rotateEverySec?: number): string {
  if (hints.length === 0) return '';
  const step = resolveRotateStep(rotateEverySec);
  const elapsed = Number.isFinite(phaseElapsedSec) ? Math.max(0, phaseElapsedSec) : 0;
  return hints[Math.floor(elapsed / step) % hints.length];
}

function resolveRotateStep(rotateEverySec: number | undefined): number {
  const value = rotateEverySec ?? PLAYER_HINT_ROTATE_EVERY_SEC;
  return value > 0 ? value : PLAYER_HINT_ROTATE_EVERY_SEC;
}
