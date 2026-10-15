# AGENTS.md — Assignment Wizard

## Zakres

Wizard personalizacji i przypisania zestawu pacjentowi. Flow działa w trybie always-fork: każde przypisanie tworzy nowy plan pacjenta (`PATIENT_PLAN`) i dopiero ten byt jest przypisywany pacjentowi/pacjentom.

## Aktualna architektura flow

Kroki są dynamiczne zależnie od punktu wejścia:

- `from-set` (detal zestawu): `customize-set -> select-patients -> schedule`
- `from-patient` z preselected pacjentem i bez preselected zestawu: `select-set -> customize-set -> schedule`
- `from-patient` bez preselected pacjenta (dashboard): `select-set -> customize-set -> select-patients -> schedule`
- Edycja planu: `customize-set -> schedule`.
- Etykiety kroków (design v4): Zestaw, Plan, Pacjenci, Harmonogram. Podsumowanie (`SummaryStep layout="aside"`) jest boczną kolumną kroku `schedule`, nie osobnym krokiem. Przyciski: „Dalej”, na kroku pacjentów „Dalej · N wybranych”, na końcu „Utwórz plan i przypisz” / „Zapisz zmiany”.

`customize-set` jest zawsze obecny i nie jest opcjonalny.

## Model danych i intencja UX

- Użytkownik wybiera zestaw źródłowy (lub tworzy od zera).
- Użytkownik personalizuje nazwę planu i **wszystkie** parametry ćwiczenia (`cardSurface="patientPlan"`).
- Dawkowanie (sets/reps/tempo/load/…) → mapping `PATIENT_PLAN`.
- side / ROM / difficulty / opisy / audioCue / enrichment → JSON `exerciseOverrides` po `assign` (SPEC-021/024).
- Seed z zestawu źródłowego: `seedBuilderParamsFromMapping` (w tym `mapping.overridesJson` + `enrichment` z TEMPLATE — SPEC-023/024).
- Instrukcje dla pacjenta edytuj w karcie (`ExercisePatientContentFields`) — nie klonuj sekcji enrichment lokalnie.
- Nie pokazuj sekcji „Odziedziczone z ćwiczenia” w `customize-set` — tam wszystko jest edytowalne.
- Podczas `submit` zawsze tworzymy nowy `ExerciseSet(kind: PATIENT_PLAN)` i dopiero ten nowy plan przypisujemy pacjentom.
- Opcjonalny toggle zapisuje dodatkową, osobną kopię jako zestaw organizacji (`TEMPLATE + ORG_PRIVATE`) bez relacji do pacjentów. Ta kopia TEMPLATE też musi dostać `overridesJson` (strona/ROM/treść) — `exerciseOverrides` dotyczy tylko planu pacjenta.
- Copy w UI musi jasno rozróżniać:
  - `zestaw źródłowy/szablon`
  - `plan pacjenta` (wynik personalizacji)

## Kluczowe wzorce

### Template vs Draft Mode

- **Source Set Mode**: wybrany zestaw jako źródło, personalizacja przed utworzeniem planu pacjenta.
- **Draft Mode**: pełna edycja planu pacjenta (CRUD ćwiczeń + parametry + nazwa).

### Phantom Set

Przycisk "Stwórz nowy" inicjuje nowy plan w wizardze bez opuszczania flow przypisania.

### Rapid Builder

Wyszukiwarka + Enter dodaje ćwiczenia do planu pacjenta.

## Punkty wejścia

| Miejsce                                | Tryb         | Predefiniowane |
| -------------------------------------- | ------------ | -------------- |
| Strona pacjenta → "Przypisz zestaw"    | from-patient | Pacjent        |
| Strona zestawu → "Przypisz pacjentowi" | from-set     | Zestaw         |
| Dashboard → "Przypisz zestaw"          | from-patient | Nic            |

## Struktura folderu

- `utils/assignmentWizardUtils.ts` — `canProceed` i logika przejść
- `utils/selectSetStepUtils.ts` — filtrowanie/sortowanie w kroku wyboru zestawu
- `types.ts` — domena + `getWizardSteps`
- komponenty kroków i dialogi sukcesu obok siebie w `src/features/assignment/`

## Komponenty

- `AssignmentWizard.tsx` — kontener i orkiestracja
- `SelectSetStep.tsx` — wybór zestawu źródłowego
- `CustomizeSetStep.tsx` — personalizacja planu pacjenta
- `SelectPatientsStep.tsx` — wybór pacjentów
- `ScheduleStep.tsx` — harmonogram
- `SummaryStep.tsx` — podsumowanie i potwierdzenie
- `AssignmentSuccessDialog.tsx` — sukces + QR/PDF

## Referencje

- Specyfikacja: [SPEC-001 Assignment Wizard](../../../.ai/specs/SPEC-001-2026-02-04-assignment-wizard.md)
- Dokumentacja: `docs/assignment-wizard-overview.md`
- Mapa data-testid: `docs/testing/data-testid-map.md`

Skrót zapisu na ostatnim kroku (`schedule`) to `Cmd`/`Ctrl`+`Enter`. Sam `Enter` zostaje przy kontrolkach Harmonogramu (dni, +/− sesji, przełącznik szablonu).

## Konwencje data-testid

Prefiks: `assignment-`, `set-`
Przykłady: `assign-wizard`, `assign-summary-submit-btn`, `wizard-plan-name-input`, `set-rapid-builder-search`

## Teksty a E2E

Nazwy przycisków kreatora są lokatorami w `fiziyo-tests` (`PatientAssignmentPage`, specy MTB). Zmiana etykiety = równoległy PR w `fiziyo-tests`, który najpierw akceptuje obie wersje (`.ai/lessons.md`, 2026-10-15).
