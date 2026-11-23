# AGENTS.md — Pacjenci

## Zakres

Moduł pacjentów: lista, profil, przypisania zestawów, status Premium.

## Kluczowe wzorce

### Lista pacjentów

- Lista z wyszukiwaniem
- Status Premium (badge, usePatientPremium hook)
- Kolumna "Przypisane zestawy" lub link do przypisań

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
- `exerciseOverrides` to jeden dokument na całe przypisanie. Zapis nakłada zmianę na `fetchCurrentAssignmentOverrides` (odczyt tuż przed zapisem, `no-cache`), nigdy na `assignment.exerciseOverrides` z otwarcia ekranu, i idzie jednym zapisem na akcję (#244). Zapis wysyła wersję z tego odczytu (`overridesVersionVariables`); backend odmawia kodem `EXERCISE_OVERRIDES_CONFLICT`, gdy ktoś zapisał w międzyczasie, a ekran pokazuje `EXERCISE_OVERRIDES_CONFLICT_MESSAGE` i odświeża plan zamiast ponawiać (fizjo-app#509).
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
