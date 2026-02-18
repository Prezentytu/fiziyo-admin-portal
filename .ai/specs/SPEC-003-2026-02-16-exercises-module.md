# SPEC-003: Exercises Module

## Cel biznesowy

Moduł ćwiczeń jest centralnym elementem FiziYo Admin. Umożliwia fizjoterapeutom tworzenie, edytowanie, tagowanie i organizowanie ćwiczeń rehabilitacyjnych, które następnie są przypisywane pacjentom.

## Architektura

### Komponenty UI (16)

| Komponent                 | Odpowiedzialność                            |
| ------------------------- | ------------------------------------------- |
| `ExerciseForm`            | Główny formularz tworzenia/edycji ćwiczenia |
| `ExerciseCard`            | Karta ćwiczenia w liście/gridzie            |
| `ExerciseDialog`          | Dialog szczegółów ćwiczenia                 |
| `CreateExerciseWizard`    | Wizard tworzenia nowego ćwiczenia           |
| `MediaUploadSection`      | Upload obrazów i wideo                      |
| `ExerciseVoiceInput`      | Input głosowy (AI transkrypcja)             |
| `TagPicker`               | Wybór tagów z autocomplete                  |
| `TagCard`                 | Wyświetlanie tagu                           |
| `TagDialog`               | Tworzenie/edycja tagu                       |
| `QuickTemplates`          | Szybkie szablony ćwiczeń                    |
| `AIExerciseSuggestions`   | Sugestie AI na podstawie kontekstu          |
| `AddExerciseToSetsDialog` | Dodawanie ćwiczenia do zestawów             |
| `SubmitToGlobalDialog`    | Zgłaszanie ćwiczenia do globalnej bazy      |
| `FeedbackBanner`          | Banner z informacjami zwrotnymi             |

### Interfejsy API (GraphQL)

**Queries:**

- `GET_EXERCISES_QUERY` - lista ćwiczeń z filtrowaniem
- `GET_EXERCISES_FULL_QUERY` - pełne dane ćwiczeń
- `GET_EXERCISE_BY_ID_QUERY` - pojedyncze ćwiczenie
- `GET_ORGANIZATION_EXERCISES_QUERY` - ćwiczenia organizacji
- `GET_AVAILABLE_EXERCISES_QUERY` - dostępne ćwiczenia
- `GET_GLOBAL_EXERCISES_QUERY` - globalna baza ćwiczeń
- `GET_PUBLIC_TEMPLATE_EXERCISES_QUERY` - publiczne szablony
- `EXPORT_EXERCISES_TO_CSV_QUERY` - eksport CSV

**Mutations:**

- CRUD: `CREATE_EXERCISE_MUTATION`, `UPDATE_EXERCISE_MUTATION`, `DELETE_EXERCISE_MUTATION`
- Scope: `UPDATE_EXERCISE_SCOPE_MUTATION`
- Templates: `COPY_EXERCISE_TEMPLATE_MUTATION`, `PUBLISH_EXERCISE_AS_TEMPLATE_MUTATION`
- Global Review: `SUBMIT_TO_GLOBAL_REVIEW_MUTATION`, `RESUBMIT_FROM_ORIGINAL_MUTATION`, `WITHDRAW_FROM_REVIEW_MUTATION`
- Media: `UPLOAD_EXERCISE_IMAGE_MUTATION`, `DELETE_EXERCISE_IMAGE_MUTATION`
- Tags: `CREATE_EXERCISE_TAG_MUTATION`, `UPDATE_TAG_MUTATION`, `DELETE_TAG_MUTATION`, `ADD_TAG_TO_EXERCISE_MUTATION`, `REMOVE_TAG_FROM_EXERCISE_MUTATION`
- Import: `IMPORT_EXERCISES_FROM_CSV_MUTATION`, `SYNC_PUBLISHED_EXERCISES_MUTATION`

### Kluczowe typy danych

- `Exercise` - id, name, descriptions (patient/clinical), audio cue, notes; parametry domyślne (sets, reps, duration, executionTime, restBetweenSets/Reps, preparationTime, tempo, side); media (imageUrl, videoUrl, gifUrl, images); scope (PERSONAL/ORGANIZATION/GLOBAL); status (DRAFT/PENDING_REVIEW/CHANGES_REQUESTED/APPROVED/PUBLISHED/REJECTED); tags (mainTags, additionalTags)
- `ExerciseTag` - id, name, description, color, icon, isGlobal, isMain, categoryId
- `Frequency` - timesPerDay, timesPerWeek, breakBetweenSets, weekday booleans

### Data-testid

Prefiks: `exercise-`

- `exercise-form-submit-btn`
- `exercise-card-{id}`
- `exercise-dialog-edit-btn`
- `exercise-tag-picker`
- `exercise-voice-input-btn`

## Changelog

### 2026-02-16

- Utworzenie specyfikacji na podstawie istniejącej implementacji
