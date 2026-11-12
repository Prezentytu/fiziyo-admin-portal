# Przypisanie zestawu (Assignment Wizard)

## Rola

Fizjoterapeuta wybiera szablon albo składa plan od zera, personalizuje każdą pozycję i przypisuje plan pacjentowi z harmonogramem. Każde przypisanie tworzy nowy plan pacjenta (`PATIENT_PLAN`), a szablon zostaje nietknięty (`src/features/assignment/AGENTS.md`, always-fork). To rdzeń usługi gabinetu: pacjent ćwiczy w aplikacji dokładnie to, co tu zatwierdzono, w tej samej kolejności i z tą samą liczbą.

## Jak dotrzeć

- Konta: terapeuta `fizjoterapeuta-bot`, pacjenci `pacjent-bot-1` i `pacjent-bot-2` (tenant A); do granicy tenantu `fizjoterapeuta-bot-b` i `pacjent-bot-b-1`. Tylko dane syntetyczne.
- Wejścia: karta pacjenta `src/app/(dashboard)/patients/[id]/page.tsx` („Przypisz zestaw”), detal zestawu `src/app/(dashboard)/exercise-sets/[id]/page.tsx` („Przypisz pacjentowi”), pulpit `src/app/(dashboard)/page.tsx` w widoku klasycznym.
- Kreator `src/features/assignment/AssignmentWizard.tsx`, seed z szablonu `src/features/assignment/utils/seedBuilderParamsFromMapping.ts`, delty nadpisań `src/features/assignment/utils/buildAssignmentOverrideDeltas.ts`, kolejność `src/features/assignment/utils/sortMappingsByOrder.ts`.
- Druga połowa w aplikacji i backendzie: `fizjo-app:docs/funkcje/przypisanie-zestawu.md`.

## Jak sprawdzić

- Testy: `src/features/assignment/utils/__tests__/sortMappingsByOrder.test.ts`, `src/features/assignment/utils/__tests__/buildAssignmentOverrideDeltas.test.ts`, `src/features/assignment/utils/__tests__/seedBuilderParamsFromMapping.test.ts`, `src/features/assignment/utils/__tests__/buildExerciseSetFromBuilder.test.ts`, `src/features/assignment/utils/__tests__/mergeAssignmentOverridesOnEdit.test.ts`, `src/features/assignment/utils/__tests__/assignmentPlanDecision.test.ts`, `src/features/assignment/CustomizeSetStep.test.tsx`.
- E2E w `fiziyo-tests:TEST_PLAN.md`: CROSS02 (panel przypisuje szablon z dwoma ćwiczeniami, iOS widzi tę samą kolejność). ID AS01 i AS02 są tam dwa razy: w `logged-tests` to wejście do kreatora z pulpitu i akcja na karcie pacjenta, w pilocie MTB to fork szablonu na plan (AS01) i dziedziczenie `executionTime` i `preparationTime` przy personalizacji (AS02, oczekiwany fail).
- Ręcznie: szablon z dwoma ćwiczeniami, przypisanie bez zmian, odczyt planu pacjenta po `order`; potem jedna zmieniona liczba serii i porównanie w panelu i w aplikacji; potem edycja planu i sprawdzenie, że nadpisania nie znikają.
- Porażka: inna kolejność w planie niż w szablonie, szablon zmieniony po przypisaniu, nieruszone pole zapisane jako nadpisanie, dane pacjenta innego tenantu na liście wyboru.

## Uważaj na

- Kolejność: API nie gwarantuje kolejności mappingów, a kreator zapisuje `order` z indeksu buildera. Od 93af7ace wybór szablonu sortuje kopię po `order` (`src/features/assignment/AssignmentWizard.tsx:408` → `buildBuilderStateFromMappings`, `src/features/assignment/utils/seedBuilderParamsFromMapping.ts:121`), tak samo wejścia w liniach 316, 356, 845 i 856. Opis błędu w `fiziyo-tests:docs/bugs/CROSS02-assignment-order.md` dotyczy portalu sprzed poprawki (SHA `5c53971d`).
- Kolejność nadpisań: przypisanie (`exerciseOverrides`), potem `overridesJson` mappingu, potem kolumny mappingu, potem katalog (`AGENTS.md`, „Słownik”; `src/components/shared/exercise/resolveEffectiveExerciseParams.ts`). Serie i powtórzenia idą na mapping planu, strona, ROM, treści i `enrichment` w `exerciseOverrides` (`src/features/assignment/AGENTS.md`).
- Puste nadpisania z szablonu: pozycja zapisywała `''` i `UNKNOWN` dla nieruszonych pól; poprawione w fccc7b0d (PR #211, merge 66ddc7ea), a aplikacja odczytuje je tak samo od a2209be6 (`fizjo-app:docs/funkcje/przypisanie-zestawu.md`).
- AS02 jest w planie oczekiwanym failem z powodem „seed gubi `executionTime` i `preparationTime`”, ale seed na `main` przenosi oba pola (`src/features/assignment/utils/seedBuilderParamsFromMapping.ts:39` i `:76`). Czy AS02 dalej pada na DEV: niepotwierdzone.
- Kreator ma własny zapis pozycji z `??` i jawne zero zachowuje (`src/features/assignment/AssignmentWizard.tsx:1142`), w przeciwieństwie do [kompozytora](kompozytor-zestawu.md) i [czatu](czat-ai.md). Dwa zapisy tej samej encji rozjadą się przy następnej zmianie pola.
- Etykiety przycisków kreatora są lokatorami w `fiziyo-tests`; zmiana etykiety to równoległy PR tam (`src/features/assignment/AGENTS.md`, „Teksty a E2E”).
