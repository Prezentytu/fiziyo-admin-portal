# AGENTS.md — Ćwiczenia

## Zakres

Moduł szablonów ćwiczeń: formularz create/edit, lista, filtrowanie, hierarchia pól dawkowania.

## Schemat backendu: Exercise (C# .NET)

**WAŻNE**: Przy wyświetlaniu parametrów czasowych ZAWSZE używaj precyzyjnych nazw lub tooltipów. NIE używaj samego "Czas" - zawsze określaj który czas (np. "Czas serii", "Czas powtórzenia").

### Treść

| Pole                  | Typ            | Opis                                        |
| --------------------- | -------------- | ------------------------------------------- |
| `Name`                | string (200)   | Nazwa ćwiczenia                             |
| `PatientDescription`  | string? (4000) | Opis dla pacjenta (prosty język)            |
| `ClinicalDescription` | string? (4000) | Opis kliniczny (język medyczny, dla fizjo)  |
| `AudioCue`            | string? (200)  | Podpowiedź głosowa TTS (np. "Proste plecy") |
| `Notes`               | string?        | Notatki ogólne                              |

### Parametry wykonania

| Pole                   | Typ           | Opis                                                                                           | Label w UI         |
| ---------------------- | ------------- | ---------------------------------------------------------------------------------------------- | ------------------ |
| `Side`                 | ExerciseSide  | `None`, `Left`, `Right`, `Both`, `Alternating`                                                 | Strona ciała       |
| `PreparationTime`      | decimal       | Czas przygotowania przed ćwiczeniem (sekundy)                                                  | Czas przygotowania |
| `DefaultExecutionTime` | decimal?      | Czas wykonania JEDNEGO powtórzenia (sekundy). **Jeśli > 0, włącza timer w aplikacji pacjenta** | Czas powtórzenia   |
| `Tempo`                | string? (20)  | Tempo wykonania np. "3-0-1-0"                                                                  | Tempo              |
| `RangeOfMotion`        | string? (100) | Zakres ruchu (ROM)                                                                             | Zakres ruchu       |

### Dawkowanie (Presets)

| Pole                     | Typ           | Opis                               | Label w UI             | Default |
| ------------------------ | ------------- | ---------------------------------- | ---------------------- | ------- |
| `DefaultSets`            | decimal       | Domyślna liczba serii              | Serie                  | 3       |
| `DefaultReps`            | decimal?      | Domyślna liczba powtórzeń          | Powtórzenia            | 10      |
| `DefaultDuration`        | decimal?      | Czas serii dla ćwiczeń time-based  | Czas serii             | -       |
| `DefaultRestBetweenSets` | decimal       | Przerwa między SERIAMI (sekundy)   | Przerwa między seriami | 60      |
| `DefaultRestBetweenReps` | decimal       | Mikro-przerwa między POWTÓRZENIAMI | Przerwa między powt.   | 0       |
| `DefaultLoad`            | ExerciseLoad? | Domyślne obciążenie/opór           | Obciążenie             | -       |

### ExerciseLoad (Obciążenie)

| Pole    | Typ          | Opis                                    |
| ------- | ------------ | --------------------------------------- |
| `Type`  | string (20)  | `weight`, `band`, `bodyweight`, `other` |
| `Value` | decimal?     | Wartość liczbowa                        |
| `Unit`  | string? (10) | `kg`, `lbs`, `level`                    |
| `Text`  | string (100) | Tekst wyświetlany (np. "5 kg")          |

### Enumy

```
ExerciseType: Reps = 0, Time = 1  // DEPRECATED - używaj executionTime > 0
ExerciseSide: None = 0, Left = 1, Right = 2, Both = 3, Alternating = 4
ExerciseScope: Global, Organization, Personal
DifficultyLevel: Unknown = 0, Easy = 1, Medium = 2, Hard = 3, Expert = 4
```

## Hierarchia pól UI (od najważniejszych)

**TIER 1 - Zawsze widoczne:** Serie, Powtórzenia, Czas powtórzenia, Czas serii (wyliczany)

**TIER 2 - Często używane:** Przerwa między seriami, Obciążenie

**TIER 3 - Personalizacja:** Notatka, Strona ciała, Tempo, Czas przygotowania

**TIER 4 - Zaawansowane:** Przerwa między powt., Zakres ruchu, Własna nazwa/opis

## Precyzyjne labele (OBOWIĄZKOWE)

| ❌ Źle  | ✅ Dobrze                                     |
| ------- | --------------------------------------------- |
| Czas    | Czas serii / Czas powtórzenia                 |
| Przerwa | Przerwa między seriami / Przerwa między powt. |

## Model ćwiczenia - jeden typ, dynamiczny timer

```
Serie × Powtórzenia [× Czas powtórzenia]
```

- `executionTime` > 0 → timer w aplikacji pacjenta
- `executionTime` = 0/null → bez timera
- NIE eksponuj terapeucie „typu ćwiczenia” jako osobnej etykiety; UI ma pokazywać parametry wykonania, a semantyka timera wynika z `executionTime`
- W `CreateExerciseWizard` pole wejściowe TIER 1 to `Czas powtórzenia`; `Czas serii` jest pokazywany jako wartość wyliczana, a `duration` pozostaje w sekcji zaawansowanej dla ćwiczeń liczonych czasem.

Przykłady: `3 × 10`, `3 × 10 × 10s`, `3 × 1 × 30s`

## Referencje

- Główny formularz: `ExerciseForm.tsx`
- Lista: strona `app/(dashboard)/exercises/`
- GraphQL: `src/graphql/queries/`, `src/graphql/mutations/`
- Single source of truth dawkowania: `.ai/specs/SPEC-012-2026-04-08-exercise-dosage-model.md`

## Konwencje data-testid

Prefiks: `exercise-`
Przykłady: `exercise-form-submit-btn`, `exercise-form-name-input`, `exercise-card-{id}`
