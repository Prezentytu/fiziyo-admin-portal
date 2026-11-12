# Kompozytor zestawu

## Rola

Fizjoterapeuta składa szablon zestawu z ćwiczeń katalogu i ustawia każdej pozycji podstawowe parametry (serie, powtórzenia, czas powtórzenia, przerwy, przygotowanie) oraz stronę ciała. Szablon jest źródłem planów pacjentów w [assignment-wizard](assignment-wizard.md), więc liczba wpisana tutaj trafia do playera pacjenta. Miarą jest czas złożenia zestawu i to, że czas pokazany w panelu zgadza się z czasem w aplikacji.

## Jak dotrzeć

- Konto `fizjoterapeuta-bot` (tenant A, owner). Tylko dane syntetyczne.
- Lista zestawów `src/app/(dashboard)/exercise-sets/page.tsx`, przycisk „Nowy zestaw” otwiera `src/features/exercise-sets/CreateSetWizard.tsx`. Szybka ścieżka z listy ćwiczeń: `src/components/exercise-builder/CreateSetDialog.tsx`. Edycja istniejącego szablonu: `src/app/(dashboard)/exercise-sets/[id]/page.tsx`.
- Builder współdzielony z kreatorem przypisania: `src/components/shared/ExerciseSetBuilder.tsx`. Zapis: `src/features/exercise-sets/utils/createSetSubmit.ts`.
- Odczyt parametrów jednym resolverem: `src/components/shared/exercise/resolveEffectiveExerciseParams.ts` z domyślnymi z `src/components/shared/exercise/exerciseParamDefaults.ts`; czas liczy `src/utils/exerciseTime.ts`.

## Jak sprawdzić

- Testy: `src/components/shared/ExerciseSetBuilder.test.tsx`, `src/features/exercise-sets/utils/createSetSubmit.test.ts`, `src/features/exercise-sets/utils/buildMappingOverridesFromParams.test.ts`, `src/components/exercise-builder/buildBuilderExerciseMapping.test.ts`, `src/components/shared/exercise/__tests__/resolveEffectiveExerciseParams.test.ts`, `src/components/shared/exercise/__tests__/crossViewParams.test.ts`, `src/components/shared/exercise/__tests__/exerciseParamDefaults.test.ts`, `src/utils/exerciseTime.test.ts`.
- E2E w `fiziyo-tests:TEST_PLAN.md`: ES08 (kompozytor tworzy szablon z jawnymi parametrami czasu i powtórzeń, planowany), ES09 (jawne zero w `restReps` mappingu, oczekiwany fail), ES01–ES05 i ES07 (lista, wyszukiwanie, filtry). ES09 uruchamiasz `RUN_MTB_PILOT=1` w `fiziyo-tests:tests/logged/exercise-sets/mtb-pilot.spec.ts`; przechwytuje wszystkie mutacje.
- Ręcznie: szablon z ćwiczeniem `both`, 2 serie, 1 powtórzenie po 20 s, przerwa 15 s, przygotowanie 15 s; panel ma pokazać 140 s, tyle samo co aplikacja (`fizjo-app:docs/testing/exercise-sides.md`). Potem pozycja z „Przerwa między powt.” ustawioną na 0 przy niezerowym katalogu i odczyt zapisanego mappingu.
- Porażka: inny czas w panelu niż w aplikacji dla tego samego przepisu, wpisane 0 zapisane jako brak liczby, strona pozycji zgubiona po zapisie.

## Uważaj na

- Jawne zero ginie przy zapisie: `toNullableNumber` to `value || null` (`src/features/exercise-sets/utils/createSetSubmit.ts:91`), więc 0 w `restReps`, `duration`, `preparationTime` i `executionTime` idzie jako `null`. To jest ES09. Test jednostkowy utrwala ten błąd: `src/features/exercise-sets/utils/createSetSubmit.test.ts:46` wysyła `restReps: 0` i oczekuje `null` w linii 63.
- `null` na mappingu znaczy „wartość z katalogu”: resolver bierze wtedy domyślną ćwiczenia (`src/components/shared/exercise/resolveEffectiveExerciseParams.ts:214`). Zgubione zero zamienia się więc w przerwę z katalogu, a aplikacja trzyma zero jako zero (`fizjo-app:docs/funkcje/strona-cwiczenia.md`).
- Tą samą funkcją zapisują `src/features/exercise-sets/CreateSetWizard.tsx`, `src/components/exercise-builder/CreateSetDialog.tsx` i czat (`src/features/ai-view/utils/sendPlan.ts:55`, [czat-ai](czat-ai.md)). Kreator przypisania ma własny zapis z `??` i zero zachowuje (`src/features/assignment/AssignmentWizard.tsx:1142`). Poprawka ma objąć wszystkich czterech wołających.
- Strona i reszta pól spoza kolumn idą tylko w `overridesJson`. Pozycja bez `overridesJson` gubi stronę (`.ai/lessons.md`, reguła egzekwowana `src/features/exercise-sets/utils/buildMappingOverridesFromParams.test.ts`).
- Nieruszone pola nie zapisują już pustych nadpisań (`''`, `UNKNOWN`), a stare rekordy z nimi są pomijane przy odczycie (fccc7b0d). `none` w stronie to wybór „Razem”, nie brak nadpisania.
- Jeden resolver parametrów z kanonem domyślnych (serie 3, przerwa 60, przerwa między powt. 0, przygotowanie 5): 27042e12. Łańcuch `a || b || 30` w widoku omija kanon (`src/features/exercise-sets/AGENTS.md`).
- Czas `both` liczy przygotowanie także przed prawą stroną każdej serii (418d8b49, `src/utils/exerciseTime.ts`). Panel liczy własną kopią wzoru z aplikacji, więc zmiana wzoru to zmiana w obu repo i w `fizjo-app:backend/FizjoApp.Api/Chat/ChatExerciseDoseMapper.cs`.
- `duration` to pole legacy (`DEPRECATED_FIELD_KEYS` w `src/components/shared/exercise/fieldContract.ts`): nie renderuj go jako pola, a zapisane REPS go nie liczą do czasu.
