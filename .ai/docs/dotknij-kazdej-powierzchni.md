# Dotknij każdej powierzchni

Najczęstszy defekt tutaj to zmiana, która działa w widoku, który sprawdziłeś, a brakuje jej gdzie indziej. Zanim powiesz „zrobione”, przejdź listę i napisz, które punkty dotyczyły zmiany:

- **Widoki tej samej encji.** Ćwiczenie ma dwie ścieżki z osobnym stanem. Edycja (strona ćwiczenia, dialog, workspace weryfikacji, kolejki weryfikacji organizacji) idzie przez `src/features/exercises/useExerciseEditorForm.ts`. Tworzenie idzie przez `CreateExerciseWizard` z własnym `useState` i `useEnrichmentDraft`; hooka edycji nie woła. Poprawka pola dotyka obu ścieżek; poprawka w jednym widoku to nie poprawka funkcji.
- **Role i tory.** Owner, admin, therapist, staff i backoffice widzą co innego; weryfikacja ma tor organizacyjny i globalny.
- **Mobile i backend.** Ta sama operacja zwykle istnieje w `fizjo-app`. Typy TS są duplikowane, nie generowane, więc zmiana schematu dotyczy obu klientów. JSONB (`ExerciseLoad`, enrichment) czyta inaczej formularz panelu i player mobile.
- **E2E.** Każdy element interaktywny ma `data-testid` według konwencji w [`docs/testing/data-testid-map.md`](../../docs/testing/data-testid-map.md) (format, prefiksy modułów, sufiksy); obecność pilnuje `npm run check:testids`. Test ID zmieniasz additive-first, z planem deprecacji. Zmiana roli, etykiety lub tekstu oznacza aktualizację Page Objectu i `TEST_PLAN.md` w `fiziyo-tests`.
- **Motyw i klawiatura.** Jasny i ciemny. Domyślny ma być jasny (DEC-20261020-01), ale `src/contexts/AccessibilityContext.tsx` ma jeszcze `theme: 'dark'`; domyślny zmieniasz tylko z osobnego issue. Dialog obsługuje `Cmd/Ctrl + Enter` dla głównej akcji i `Escape`.
- **Stany.** Ładowanie, pusto, błąd, paginacja. Selekcja masowa resetuje się przy zmianie filtra, wyszukiwania i strony. Jeśli dodajesz wejście (archiwizuj), dodaj wyjście (przywróć).
- **Dokumentacja.** Sprawdź, czy zmiana nie czyni nieprawdziwym `.ai/ECOSYSTEM.md`, `.ai/DATA_FLOWS.md`, `.ai/DOMAIN_MODEL.md`, specu albo modułowego `AGENTS.md`.
