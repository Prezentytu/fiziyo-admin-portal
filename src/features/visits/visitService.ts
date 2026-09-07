import { getBackendToken } from '@/lib/tokenCache';

export interface VisitNote { subjective: string; objective: string; assessment: string; plan: string }
export interface VisitExercise {
  exerciseId: string | null; name: string; sets: number | null; reps: number | null;
  duration: number | null; frequency: string | null; sourceQuote: string;
}
export interface VisitDraft {
  note: VisitNote;
  instructions: { text: string; sourceQuote: string }[];
  exercises: VisitExercise[];
  evidence: { section: keyof VisitNote; sourceQuote: string }[];
  missingInformation: string[];
  requiresReview: true;
}
export async function visitRequest<T>(endpoint: 'visit-draft' | 'visit-note', body: unknown, signal?: AbortSignal): Promise<T> {
  const token = getBackendToken();
  if (!token) throw new Error('Sesja wygasła. Zaloguj się ponownie.');
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/ai/${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body), signal,
  });
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: 'Sprawdź treść wizyty. Transkrypt musi mieć od 20 do 40 000 znaków.',
      401: 'Sesja wygasła. Odśwież stronę i zaloguj się ponownie.',
      403: 'Brak dostępu do tego pacjenta w wybranym gabinecie.',
      409: 'Ta wizyta została już zapisana z inną treścią. Sprawdź notatki pacjenta.',
      429: 'Asystent jest chwilowo zajęty. Spróbuj ponownie za chwilę.',
      502: 'Nie udało się przygotować wiarygodnego szkicu. Transkrypt został zachowany — spróbuj ponownie.',
    };
    throw new Error(messages[response.status] || 'Operacja nie powiodła się. Spróbuj ponownie.');
  }
  return response.json() as Promise<T>;
}
