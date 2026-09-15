export function getTimerModeLabel(isTimeBased: boolean): string {
  return isTimeBased ? 'Timer w aplikacji' : 'Timer wyłączony';
}

export function getTimerModeDescription(isTimeBased: boolean): string {
  return isTimeBased
    ? 'Czas powtórzenia ma wartość, więc aplikacja pacjenta odlicza sekundy przy każdym powtórzeniu.'
    : 'Czas powtórzenia jest pusty, więc pacjent ćwiczy bez odliczania sekund. Wpisz sekundy w polu Czas powtórzenia, aby włączyć timer.';
}
