# Wybieraki ćwiczeń na liście stronicowanej

- Issue / spec: SPEC-033 (sekcja wybieraków), prośba Przemka z 12.11.2026: wybieraki pobierają listę z limitem 5000 i przy pełnej puli ją utną
- Owning repo: fiziyo-admin-portal
- Status runu: working
- Upoważnienie: Przemek w czacie, 12.11.2026: „Tak, spec i kod”, commit, push i szkic PR w zakresie zadania
- Writer: Claude Code (sesja lokalna)
- Dozwolone pliki: `src/hooks/useExercisePicker*.ts`, `src/hooks/useDebouncedValue.ts`, `src/utils/exercisePickerPages.ts`, `src/graphql/queries/exercises.queries.ts`, `src/components/shared/ExerciseSetBuilder*`, `src/features/exercise-sets/{CreateSetWizard,AddExerciseToSetDialog,EditExerciseSetFullDialog}.tsx`, `src/features/assignment/{AssignmentWizard,CustomizeSetStep}*`, `src/features/patients/AddExerciseToPatientDialog.tsx`, SPEC-033
- Wykluczenia: czat (`ai-view`), podpowiedzi nazw w imporcie i kreatorze ćwiczenia, zmiana API
- Acceptance: każde ćwiczenie z puli większej niż 5000 da się znaleźć i dodać w każdym wybieraku; wybrane ćwiczenia zapisują się z treścią jak dotąd

## Repo i baseline

- Repo / checkout / branch / HEAD: worktree `fiziyo-admin-portal-wt-picker-paged`, `feat/wybieraki-lista-stronicowana` od `origin/main`
- Dostępność: available

## Progress

- [x] Zapytania stron i rekordów po id, hooki `useExercisePickerPages` i `useExercisePickerLibrary`
- [x] `ExerciseSetBuilder` na `library` ze stron, wywołujący przepięci
- [x] Testy jednostkowe hooków i buildera
- [ ] `npm run validate`, sprawdzenie na DEV po wdrożeniu

## Decyzje

- Bez zmiany kontraktu: `availableExercisesPage` i `exerciseById` (szczegóły w SPEC-033).
- Popularne idą przez `availableExercises` zawężone do id (reguła widoczności biblioteki), nie przez `exerciseById`: po review 12.11 rekord ukryty w bibliotece nie może być oferowany do dodania.

## Handoff

- Następny krok: przegląd PR i E2E Dev Full po merge'u
