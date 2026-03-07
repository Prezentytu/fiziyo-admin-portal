# AGENTS.md — Assignment Wizard

## Zakres

Wizard personalizacji i przypisania planu pacjenta. Flow zawsze kończy się utworzeniem nowego planu (kopii roboczej) i przypisaniem go pacjentowi/pacjentom.

## Aktualna architektura flow

Kroki są dynamiczne zależnie od punktu wejścia:

- `from-set` (detal zestawu): `customize-set -> select-patients -> schedule -> summary`
- `from-patient` z preselected pacjentem i bez preselected zestawu: `select-set -> customize-set -> schedule -> summary`
- `from-patient` bez preselected pacjenta (dashboard): `select-set -> customize-set -> select-patients -> schedule -> summary`

`customize-set` jest zawsze obecny i nie jest opcjonalny.

## Model danych i intencja UX

- Użytkownik wybiera zestaw źródłowy (lub tworzy od zera).
- Użytkownik personalizuje nazwę planu i ćwiczenia.
- Podczas `submit` tworzymy nowy `ExerciseSet` na bazie buildera i dopiero ten nowy plan przypisujemy pacjentom.
- Copy w UI musi jasno rozróżniać:
  - `zestaw źródłowy/szablon`
  - `plan pacjenta` (wynik personalizacji)

## Kluczowe wzorce

### Template vs Draft Mode

- **Template Mode**: wybrany zestaw jako źródło, ograniczona edycja, ochrona przed przypadkową zmianą szablonu.
- **Draft Mode**: pełna edycja planu pacjenta (CRUD ćwiczeń + parametry + nazwa).

### Phantom Set

Przycisk "Stwórz nowy" inicjuje nowy plan w wizardze bez opuszczania flow przypisania.

### Rapid Builder

Wyszukiwarka + Enter dodaje ćwiczenia do planu pacjenta.

## Punkty wejścia

| Miejsce                                    | Tryb         | Predefiniowane |
| ------------------------------------------ | ------------ | -------------- |
| Strona pacjenta → "Przypisz zestaw"        | from-patient | Pacjent        |
| Strona zestawu → "Personalizuj i przypisz" | from-set     | Zestaw         |
| Dashboard → "Przypisz zestaw"              | from-patient | Nic            |

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

## Konwencje data-testid

Prefiks: `assignment-`, `set-`
Przykłady: `assign-wizard`, `assign-summary-submit-btn`, `wizard-plan-name-input`, `set-rapid-builder-search`
