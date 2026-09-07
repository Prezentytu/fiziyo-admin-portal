# AGENTS.md — Pacjenci

## Zakres

Moduł pacjentów: lista, profil, przypisania zestawów, status Premium.

## Kluczowe wzorce

### Lista pacjentów

- `PageShell` + `PageHeader` + `PageHero` + `StatTiles` + `SearchInput`
- Karty pacjentów (nie tabela)
- Status Premium (badge, usePatientPremium hook)
- Link do przypisań / planów pacjenta

### Punkt wejścia do Assignment Wizard

Ze strony pacjenta: przycisk "Przypisz zestaw" otwiera wizard z predefiniowanym pacjentem (tryb `from-patient`).

### Premium status

- Hook `usePatientPremium` — sprawdza status Premium
- Rozliczenia: 15 PLN/pacjent Premium/miesiąc (zgodnie z Billing Widget)

### Effective display status przypisania

- Nie polegaj wyłącznie na `assignment.status`.
- Dla badge na karcie planu używaj resolvera:
  - `src/features/patients/utils/assignmentDisplayStatus.ts`
- Priorytet:
  1. `expired` lub `endDate < now` -> `Wygasł`
  2. `paused` -> `Wstrzymany`
  3. `completed` -> `Zakończony`
  4. `cancelled` -> `Anulowany`
  5. `endDate` blisko końca -> `Wygasa za X dni`
  6. `assigned/active/in_progress` -> `Aktywny`
- Sygnał Premium na karcie jest pomocniczy (`Brak Premium`) i nie zastępuje głównego statusu planu.

## Parametry ćwiczenia (override)

- Edycja / dodawanie ćwiczenia do planu: `EditExerciseOverrideDialog`, `AddExerciseToPatientDialog` — UI parametrów wyłącznie przez `ExerciseParametersFields` (`surface="patientOverride"`), nie lokalne siatki `+/-`.
- Write path: `exercisePersonalizationWriter` / `buildOverrideDelta` (bez zmian przy refaktorze UI).
- Spec unifikacji UI: `.ai/specs/SPEC-022-2026-07-28-unified-exercise-parameters.md`

## Komponenty

- Lista: `app/(dashboard)/patients/`
- Hooks: `usePatientPremium.ts`

## Referencje

- Assignment Wizard: `src/features/assignment/AGENTS.md`
- Billing: `docs/billing-widget-readme.md`, SPEC-002

## Konwencje data-testid

Prefiks: `patient-`
Przykłady: `patient-list`, `patient-form-firstname-input`, `patient-assign-set-btn`, `patient-premium-badge`
