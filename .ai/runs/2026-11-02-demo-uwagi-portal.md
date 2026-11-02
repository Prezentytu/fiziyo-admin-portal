# Uwagi z demo: portal fizjoterapeuty (punkty 12–28)

- Issue / spec: lista „Błędy UI do ręcznej weryfikacji” z demo (portal dev, punkty 12–28); bez ticketu Skrzynki
- Owning repo: fiziyo-admin-portal
- Status runu: review
- Upoważnienie: Adam, „przeanalizuj dokładnie i popraw w PR” (commit, push, draft PR; bez merge i deployu)
- Writer: Claude (sesja główna), rozpoznanie przez trzy agenty tylko do odczytu
- Dozwolone pliki: kod panelu dotknięty poniżej; bez `fizjo-app`, bez kontraktu GraphQL
- Wykluczenia: backend czatu i wyszukiwarki, zmiany domyślnych wartości produktu (21, 22 na 2 tygodnie), kontrakt notatki przypisania (23)
- Acceptance: każdy punkt ma werdykt (poprawione z commitem i testem, decyzja, backend, brak w kodzie)

## Repo i baseline

- Repo / branch / baseline: `fix/demo-uwagi-portal` od `origin/main` 35962d0
- Zastane zmiany: brak (poza nieśledzonym `.claude/`)
- Dostępność: DEV portal i konta testowe niedostępne z tej sesji, więc bez zrzutów

## Werdykty

| Punkt | Werdykt                                                                                                                                                                                                                                                                                       | Commit / gdzie   |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 12    | Poprawione. „Użyj tego” zamykało kreator z pominięciem potwierdzenia, a wyboru nikt nie odbierał. Teraz biblioteka otwiera wybrane ćwiczenie, a kreator przypisania dodaje je do planu                                                                                                        | 408a545          |
| 13    | Panel: lookup pacjenta pobiera tylko pola, których używa UI. Reszta jest po stronie backendu i idzie osobnym PR w `fizjo-app`                                                                                                                                                                 | ec82373          |
| 14    | Przyczyny w danych nie znaleziono: seedy, importer i import dokumentów zapisują sekundy. Usunięte dwie dziury w panelu: pole parametru doklejało cyfry („60” + „30” = 6030 s) i zapisywało wartość spoza zakresu, a tempo z literówką („30”, „20103”) liczyło się jako sekundy na powtórzenie | 114da44, a9814ca |
| 15    | Zgłoszone przez Przemka; na `main` są poprawki z #147 i #148. Do sprawdzenia na DEV po deployu                                                                                                                                                                                                | —                |
| 16    | Ścieżka z AI: decyzja w `fizjo-app` `ChatDispatchService.cs`. Ścieżka z reguł (`intentRouter.ts`) rozpoznaje „dodaj ćwiczenie” jako `CreateExercise`                                                                                                                                          | backend          |
| 17    | Czat ma tokeny jasnego motywu. Przyczyną jest domyślny `theme: 'dark'` w `AccessibilityContext.tsx:24`, a AGENTS.md każe zmieniać go tylko z osobnego issue                                                                                                                                   | decyzja          |
| 18    | Poprawione: zgłoszenie z samym krótkim komentarzem (było `min(12)` przy wyłączonym przycisku bez komunikatu). Załącznik nie był wymagany                                                                                                                                                      | d92f7d8          |
| 19    | Poprawione: czas planu od 60 min z godzinami, bez „NaN” i „Infinity”. Krok harmonogramu i panel podsumowania liczą czas z różnych override'ów, więc mogą się różnić                                                                                                                           | a9814ca          |
| 20    | Funkcji „sekwencja wideo / model ruchu” nie ma w żadnym repo (portal, `fizjo-app`, `fiziyo-*`). Potrzebny zrzut albo URL                                                                                                                                                                      | —                |
| 21    | Decyzja produktu (kanon `DefaultSets 3`, plan z czatu 4 tygodnie codziennie)                                                                                                                                                                                                                  | decyzja          |
| 22    | Poprawiona zgodność: start kreatora dawał 30 dni przy zaznaczonych „4 tygodniach” (28). Zmiana na 2 tygodnie to decyzja                                                                                                                                                                       | b76ba29          |
| 23    | Mutacja przypisania nie ma pola notatki, więc to zmiana kontraktu (Ask First). Kandydaci na „szybki panel”: karta zestawu w czacie i szybkie przypisanie z dashboardu                                                                                                                         | decyzja          |
| 24    | Poprawione: „Wyślij link” i „Pobierz PDF” na wierzchu, w „Więcej opcji” zostają druk i kod QR                                                                                                                                                                                                 | eb41309          |
| 25    | Poprawione: podpowiedzi przy seriach, powtórzeniach i czasie w kompaktowym i czytelnym kafelku oraz na kompaktowej liście ćwiczeń                                                                                                                                                             | 557dee6, bad100d |
| 26    | Obciążenie jest w podstawowych parametrach tylko jako kg, a zapis nadpisuje `loadType` na `weight`. Sprzęt jest tylko w enrichment                                                                                                                                                            | decyzja          |
| 27    | Backend: tagi z seedu mają `IsGlobal=false` i organizację seedującą, więc `LoadMatchingTagIdsAsync` odrzuca je dla innych organizacji; `Notes` nie są przeszukiwane                                                                                                                           | backend          |
| 28    | Zgłoszone; zmiana wyglądu ostrzeżenia to decyzja designu. Po 408a545 „Użyj tego” działa                                                                                                                                                                                                       | decyzja          |

## Znalezione poza listą

- Szybkie przypisanie z dashboardu i z listy zestawów obcinało mappingi, więc kreator startował z 3 serii i 60 s zamiast wartości zestawu (d527145).
- `CreateSetWizard` miał martwe auto-przypisanie bez wymaganych `startDate`, `endDate` i `frequency` (d65d6ea).
- `src/components/ui/sonner.tsx` ma `theme="dark"`, a `Toaster` stoi poza `AccessibilityProvider`. Nie poprawione, bo bez zrzutów nie potwierdzę skutku.
- `conversationStore.test.ts` pada lokalnie na Node 26: wbudowany `localStorage` zasłania jsdom. CI używa Node 20.

## Dowody

- Testy regresyjne pisane przed poprawką i sprawdzone jako czerwone bez niej: `reportExerciseSchema`, `users.queries`, `exerciseTime`, `exerciseExecutionCard.render`, `AssignmentSuccessDialog`.
- Nowe funkcje z testami: `numberFieldDraft`, `exerciseDialogSuccessRoute`, `scheduleUtils.getDefaultPlanEndDate`, `toPreselectedSet`.
- `npm run validate`: wynik w opisie PR.
- Reviewer: unverified.

## Handoff

- Następny krok: review PR, potem `E2E Dev Full` po merge'u i ręczne przejście punktów 12, 14, 18, 19, 24 i 25 na devportal w obu motywach.
- Blokady: decyzje 17, 21, 22, 23, 26 i 28; backend 13, 16 i 27; punkt 20 bez źródła.
