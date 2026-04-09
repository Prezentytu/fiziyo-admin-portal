# Assignment Wizard - Personalizacja i przypisanie planu pacjenta

## Cel biznesowy

Wizard służy do szybkiego przygotowania i przypisania zestawu pacjentowi. Fizjoterapeuta zawsze tworzy plan pacjenta na bazie zestawu źródłowego.

**Efekt końcowy:** zawsze powstaje nowy plan pacjenta (`PATIENT_PLAN`) i przypisanie do wybranych pacjentów.

## Punkty wejścia

| Miejsce                                     | Tryb         | Co jest predefiniowane      |
| ------------------------------------------- | ------------ | --------------------------- |
| Strona pacjenta → "Personalizuj i przypisz" | from-patient | Pacjent jest już wybrany    |
| Strona zestawu → "Personalizuj i przypisz"  | from-set     | Zestaw źródłowy             |
| Dashboard → "Personalizuj i przypisz"       | from-patient | Nic nie jest predefiniowane |

## Architektura kroków (dynamiczna)

Wizard ma do 5 kroków, ale kolejność zależy od kontekstu wejścia:

- `from-set`: `customize-set -> select-patients -> schedule -> summary`
- `from-patient` (pacjent preselected): `select-set -> customize-set -> schedule -> summary`
- `from-patient` (dashboard, bez preselected): `select-set -> customize-set -> select-patients -> schedule -> summary`

`customize-set` jest zawsze obowiązkowy.

## Aktualny kontrakt UX

- CTA wejściowe musi komunikować intencję: personalizacja + przypisanie.
- W wizardze rozróżniamy:
  - **zestaw źródłowy/szablon**
  - **plan pacjenta** (nazwa edytowana przez użytkownika)
- CTA końcowe komunikuje dwie operacje: utworzenie planu i przypisanie.

## Zachowanie domenowe (source of truth)

W `handleSubmit`:

1. Zawsze tworzymy nowy `ExerciseSet(kind: PATIENT_PLAN)` na bazie aktualnego stanu buildera.
2. Dodajemy ćwiczenia do nowego planu pacjenta.
3. Przypisujemy nowy plan pacjentowi/pacjentom.
4. Opcjonalnie toggle „zapisz także jako zestaw organizacji” tworzy dodatkowy `TEMPLATE + ORG_PRIVATE` jako osobny byt reusable (bez pacjentów).

To zachowanie jest obowiązujące dla bieżącej implementacji.

## Kluczowe funkcjonalności

### Template vs Draft

- **Template Mode**: wybór zestawu źródłowego i bezpieczne przejście do personalizacji.
- **Draft Mode**: pełna edycja planu pacjenta (nazwa, ćwiczenia, parametry).

### Phantom Set

Szybkie rozpoczęcie planu bez wychodzenia z wizarda ("Stwórz nowy").

### Rapid Builder

Wyszukiwarka + Enter do szybkiego dodawania ćwiczeń.

## Komponenty

| Komponent               | Lokalizacja                                           | Rola                                 |
| ----------------------- | ----------------------------------------------------- | ------------------------------------ |
| AssignmentWizard        | `src/features/assignment/AssignmentWizard.tsx`        | Orkiestracja flow, submit i success  |
| SelectSetStep           | `src/features/assignment/SelectSetStep.tsx`           | Wybór zestawu źródłowego             |
| CustomizeSetStep        | `src/features/assignment/CustomizeSetStep.tsx`        | Personalizacja planu pacjenta        |
| SelectPatientsStep      | `src/features/assignment/SelectPatientsStep.tsx`      | Wybór pacjentów                      |
| ScheduleStep            | `src/features/assignment/ScheduleStep.tsx`            | Harmonogram                          |
| SummaryStep             | `src/features/assignment/SummaryStep.tsx`             | Podsumowanie przed utworzeniem planu |
| AssignmentSuccessDialog | `src/features/assignment/AssignmentSuccessDialog.tsx` | Potwierdzenie przypisania + QR/PDF   |

## Data-testid (kluczowe)

```
assign-wizard
assign-wizard-next-btn
assign-summary-submit-btn
wizard-plan-name-input
wizard-plan-name-ai-btn
assign-success-dialog
assign-success-close-btn
```

## Metryki sukcesu

| Metryka                                  | Cel            |
| ---------------------------------------- | -------------- |
| Czas od CTA do potwierdzenia przypisania | < 60 sekund    |
| Liczba nieporozumień dot. zmiany nazwy   | trend malejący |
| Błędy przypadkowej edycji szablonu       | 0              |

## Changelog

### 2026-03-07

- Aktualizacja specyfikacji do realnego flow `personalizacja planu -> przypisanie`.
- Doprecyzowanie kontraktu UX: użytkownik tworzy plan pacjenta na bazie zestawu źródłowego.
- Ujednolicenie nomenklatury (`plan pacjenta` vs `zestaw źródłowy`).

### 2026-03-18

- Aktualizacja spec do modelu always-fork: każde przypisanie tworzy `PATIENT_PLAN`.
- Doprecyzowanie toggle „zapisz także jako zestaw organizacji” jako osobnej kopii reusable bez pacjentów.

### 2026-02-21

- Krok 1 rozszerzony o podgląd szczegółów pojedynczego ćwiczenia w dialogu (opis, zdjęcia/wideo, parametry).

### 2026-02-04

- Migracja dokumentacji do formatu SPEC.
