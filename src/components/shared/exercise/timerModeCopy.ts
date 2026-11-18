import type { FieldHelp } from '@/utils/fieldHelp';

export function getTimerModeLabel(isTimeBased: boolean): string {
  return isTimeBased ? 'Timer w aplikacji' : 'Timer wyłączony';
}

export function getTimerModeDescription(isTimeBased: boolean): FieldHelp {
  return isTimeBased
    ? {
        summary: 'Aplikacja pacjenta odlicza sekundy przy każdym powtórzeniu.',
        points: [{ term: 'Wyłączenie', text: 'wyczyść pole „Czas powtórzenia”.' }],
      }
    : {
        summary: 'Czas powtórzenia jest pusty, więc pacjent ćwiczy bez odliczania.',
        points: [{ term: 'Włączenie', text: 'wpisz sekundy w polu „Czas powtórzenia”.' }],
      };
}
