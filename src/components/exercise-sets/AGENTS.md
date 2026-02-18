# AGENTS.md — Zestawy ćwiczeń

## Zakres

Moduł zestawów ćwiczeń: tworzenie, edycja, ExerciseSetMapping, nadpisywanie parametrów na poziomie zestawu.

## Schemat: ExerciseSetMapping (Ćwiczenie w zestawie)

Mapowanie ćwiczenia do zestawu. Pola NULL = wartość z Exercise.

| Pole                | Typ            | Opis                                 | Label w UI             |
| ------------------- | -------------- | ------------------------------------ | ---------------------- |
| `Order`             | decimal?       | Kolejność                            | -                      |
| `Sets`              | decimal?       | Serie                                | Serie                  |
| `Reps`              | decimal?       | Powtórzenia                          | Powtórzenia            |
| `ExecutionTime`     | decimal?       | Czas powtórzenia (jeśli > 0 → timer) | Czas powtórzenia       |
| `RestSets`          | decimal?       | Przerwa między seriami               | Przerwa między seriami |
| `RestReps`          | decimal?       | Przerwa między powt.                 | Przerwa między powt.   |
| `Tempo`             | string?        | Tempo                                | Tempo                  |
| `Load`              | ExerciseLoad?  | Obciążenie                           | Obciążenie             |
| `Notes`             | string?        | Notatka                              | Notatka                |
| `CustomName`        | string? (200)  | Własna nazwa                         | Własna nazwa           |
| `CustomDescription` | string? (4000) | Własny opis                          | Własny opis            |
| `Side`              | ExerciseSide?  | **TODO: backend**                    | Strona ciała           |
| `PreparationTime`   | decimal?       | **TODO: backend**                    | Czas przygotowania     |

## Schemat: ExerciseSet

`Id, Name, Description, OrganizationId, IsActive, IsTemplate, Frequency { TimesPerDay, TimesPerWeek, BreakBetweenSets, Monday-Sunday }, ExerciseMappings[], PatientAssignments[]`

## Schemat: PatientAssignment

`Id, ExerciseSetId, UserId, AssignedById, Status, StartDate, EndDate, Frequency`

## Kluczowe komponenty

- `CreateSetWizard.tsx` — tworzenie zestawu
- `ExerciseSetBuilder.tsx` — builder współdzielony (shared)
- `EditExerciseInSetDialog.tsx` — edycja ćwiczenia w zestawie
- `CustomizeExercisesStep.tsx` — personalizacja w Assignment Wizard

## Hierarchia pól (nadpisywalne)

TIER 1: Serie, Powtórzenia, Czas powtórzenia
TIER 2: Przerwa między seriami, Obciążenie
TIER 3: Notatka, Strona, Tempo, Czas przygotowania
TIER 4: Przerwa między powt., Własna nazwa/opis

## Referencje

- Schemat Exercise: `src/components/exercises/AGENTS.md`
- Assignment Wizard: `src/components/assignment/AGENTS.md`
- ExerciseSetBuilder: `src/components/shared/ExerciseSetBuilder.tsx`

## Konwencje data-testid

Prefiks: `set-`
Przykłady: `set-form-name-input`, `set-create-wizard`, `set-exercise-row-{id}`, `set-edit-exercise-dialog`
