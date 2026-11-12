# Tworzenie i edycja ćwiczenia

## Rola

Fizjoterapeuta dodaje ćwiczenie do biblioteki gabinetu albo poprawia istniejące: nazwę, opisy, kroki dla pacjenta, podstawowe parametry, stronę ciała, materiał. Z tej karty biorą domyślne wartości szablony i plany, więc zła liczba tutaj wraca w każdym nowym zestawie. Copilot proponuje szkic pól, a zapisuje fizjoterapeuta.

## Jak dotrzeć

- Konto `fizjoterapeuta-bot` (tenant A). Tylko dane syntetyczne.
- Edycja: strona `src/app/(dashboard)/exercises/[id]/page.tsx`, dialog `src/features/exercises/ExerciseDialog.tsx` i detal weryfikacji `src/features/verification/VerificationWorkspace.tsx`. Wszystkie trzy wołają `src/features/exercises/useExerciseEditorForm.ts`.
- Tworzenie: lista `src/app/(dashboard)/exercises/page.tsx`, kreator `src/features/exercises/CreateExerciseWizard.tsx` z własnym `useState` i `src/features/exercises/useEnrichmentDraft.ts`; zapis `src/features/exercises/utils/createExerciseSubmit.ts`.
- Pola i etykiety z jednego kontraktu: `src/components/shared/exercise/fieldContract.ts` i `src/components/shared/exercise/displayRegistry.ts`.

## Jak sprawdzić

- Testy: `src/features/exercises/__tests__/useExerciseEditorForm.test.ts`, `src/features/exercises/__tests__/exerciseEditorDuration.test.tsx`, `src/features/exercises/__tests__/exerciseContentSections.parity.test.tsx`, `src/features/exercises/__tests__/exerciseEditorAiFill.test.tsx`, `src/features/exercises/utils/__tests__/createExerciseSubmit.test.ts`, `src/features/exercises/utils/__tests__/buildCreateExerciseVariables.test.ts`, `src/features/exercises/utils/__tests__/aiFullExercise.test.ts`, `src/components/shared/exercise/__tests__/fieldContract.test.ts`, `src/components/shared/exercise/__tests__/parameterSurfaceParity.test.tsx`.
- E2E w `fiziyo-tests:TEST_PLAN.md`: E09 (kreator zapisuje osobne ćwiczenie i zachowuje instrukcje pacjenta, planowany), VER07–VER09 dla tego samego formularza w weryfikacji.
- Ręcznie: to samo pole (na przykład czas powtórzenia albo opór) ustaw raz w kreatorze, raz w edycji, i porównaj zapis. Ćwiczenie `both` z 20 s na powtórzenie: kafel czasu serii i całkowitego ma pokazać tę samą liczbę co aplikacja.
- Porażka: pole zapisuje się w jednej ścieżce, a w drugiej nie, kafel czasu da się edytować, zapis wysyła `duration`, w copy pojawia się słowo spoza słownika z `src/features/exercises/AGENTS.md`.

## Uważaj na

- Dwie ścieżki z osobnym stanem: kreator nie woła hooka edycji (`.ai/docs/dotknij-kazdej-powierzchni.md`, `src/features/exercises/CreateExerciseWizard.tsx:1000`). Nowe pole dotyka obu, jak opór i sprzęt w c8639d4b.
- `executionTime` to czas jednego powtórzenia i jedyne pole czasu do edycji; czas serii i całkowity są tylko do odczytu z `calculateExerciseTotalSeconds` w `src/utils/exerciseTime.ts`. `duration` jest legacy (`DEPRECATED_FIELD_KEYS` w `src/components/shared/exercise/fieldContract.ts`); kreator przestał go zapisywać w d8eaa354.
- Copy: „podstawowe parametry” albo nazwy pól, nigdy słowo z lewej kolumny tabeli „Precyzyjne labele” (`src/features/exercises/AGENTS.md`). Identyfikatory kodu jak `group: 'dosage'` mogą zostać.
- Typ i strona z GraphQL przychodzą wielkimi literami; normalizuj przez `src/utils/exerciseEnums.ts` (27042e12), nie przez `toLowerCase()` w widoku. Zgadywanie typu z `executionTime` tylko dla szkicu w kreatorze (`src/features/exercises/utils/inferExerciseType.ts`).
- AI całego ćwiczenia wypełnia tylko szkic z „Cofnij” i nie nadpisuje wartości wpisanych przez fizjoterapeutę (51311e22, `src/features/exercises/utils/aiFullExercise.ts`).
- Edycja to także weryfikacja: ten sam hook w `src/features/verification/VerificationWorkspace.tsx:259` ([weryfikacja-katalogu](weryfikacja-katalogu.md)). Katalog zasila domyślne pozycji w [kompozytorze](kompozytor-zestawu.md).
