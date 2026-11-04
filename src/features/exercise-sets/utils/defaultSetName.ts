import { format } from 'date-fns';

/**
 * Nazwa, od której startuje kreator zestawu. Zestaw trafia do katalogu, a jego nazwa do planu
 * w aplikacji i PDF, więc nie niesie imienia ani nazwiska pacjenta: o tym mówi przypisanie.
 */
export function defaultSetName(options: { forPatient: boolean; today?: Date }): string {
  return options.forPatient ? `Nowy zestaw · ${format(options.today ?? new Date(), 'dd.MM')}` : '';
}
