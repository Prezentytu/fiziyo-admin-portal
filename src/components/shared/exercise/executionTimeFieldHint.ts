export function getExecutionTimeFieldHint(isTimeBased: boolean): string {
  return isTimeBased
    ? 'Timer w aplikacji pacjenta jest włączony. Wyczyść to pole, aby ćwiczyć bez odliczania.'
    : 'Wpisz sekundy tutaj, aby aplikacja pacjenta odliczała czas powtórzenia. Puste pole = bez odliczania.';
}
