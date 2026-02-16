# SPEC-004: Exercise Sets Module

## Cel biznesowy

Moduł zestawów ćwiczeń pozwala fizjoterapeutom grupować ćwiczenia w logiczne zestawy z określoną częstotliwością i kolejnością. Zestawy mogą być przypisywane pacjentom, duplikowane i generowane przez AI.

## Architektura

### Komponenty UI (14)

| Komponent                 | Odpowiedzialność                                   |
| ------------------------- | -------------------------------------------------- |
| `CreateSetWizard`         | Wielokrokowy wizard tworzenia zestawu              |
| `SetForm`                 | Formularz edycji zestawu                           |
| `SetDialog`               | Dialog szczegółów zestawu                          |
| `SetCard`                 | Karta zestawu w liście                             |
| `SetThumbnail`            | Miniaturka zestawu                                 |
| `EditExerciseInSetDialog` | Edycja parametrów ćwiczenia w zestawie             |
| `AddExerciseToSetDialog`  | Dodawanie ćwiczenia do zestawu                     |
| `FrequencyPicker`         | Wybór częstotliwości (dni tygodnia, razy dziennie) |
| `SetFilters`              | Filtrowanie zestawów                               |
| `SetQuickStats`           | Statystyki zestawu (ćwiczenia, czas, przypisania)  |
| `AISetGenerator`          | Generowanie zestawu przez AI                       |
| `GeneratePDFDialog`       | Eksport zestawu do PDF                             |

### Interfejsy API (GraphQL)

**Queries:**

- `GET_EXERCISE_SETS_QUERY` - lista zestawów
- `GET_EXERCISE_SET_BY_ID_QUERY` - zestaw z ćwiczeniami
- `GET_ORGANIZATION_EXERCISE_SETS_QUERY` - zestawy organizacji
- `GET_PATIENT_EXERCISE_SETS_QUERY` - zestawy pacjenta
- `GET_EXERCISE_SET_WITH_ASSIGNMENTS_QUERY` - zestaw z przypisaniami
- `GET_EXERCISE_SET_MAPPINGS_BY_SET_QUERY` - mapowania w zestawie

**Mutations:**

- CRUD: `CREATE_EXERCISE_SET_MUTATION`, `UPDATE_EXERCISE_SET_MUTATION`, `DELETE_EXERCISE_SET_MUTATION`, `DUPLICATE_EXERCISE_SET_MUTATION`
- Mappings: `ADD_EXERCISE_TO_EXERCISE_SET_MUTATION`, `UPDATE_EXERCISE_IN_SET_MUTATION`, `REMOVE_EXERCISE_FROM_SET_MUTATION`
- Assignments: `ASSIGN_EXERCISE_SET_TO_PATIENT_MUTATION`, `UPDATE_EXERCISE_SET_ASSIGNMENT_MUTATION`, `REMOVE_EXERCISE_SET_ASSIGNMENT_MUTATION`
- Settings: `UPDATE_EXERCISE_SET_FREQUENCY_MUTATION`, `UPDATE_PATIENT_EXERCISE_OVERRIDES_MUTATION`

### Kluczowe typy danych

- `ExerciseSet` - id, name, description, organizationId, isActive, isTemplate, frequency, exerciseMappings[], patientAssignments[]
- `ExerciseSetMapping` - id, exerciseSetId, exerciseId, order, sets, reps, duration, restSets, restReps, executionTime, tempo, notes, customName, customDescription, load, side, preparationTime
- `PatientAssignment` - id, exerciseSetId, userId, assignedById, status, startDate, endDate, frequency, exerciseOverrides
- `Frequency` - timesPerDay, timesPerWeek, breakBetweenSets, weekday booleans (monday-sunday)

### Data-testid

Prefiks: `set-`

- `set-card-{id}`
- `set-form-submit-btn`
- `set-wizard-next-btn`
- `set-frequency-picker`
- `set-add-exercise-btn`

## Changelog

### 2026-02-16

- Utworzenie specyfikacji na podstawie istniejącej implementacji
