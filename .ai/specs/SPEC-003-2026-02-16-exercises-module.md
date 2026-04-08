# SPEC-003: Exercises Module

## Cel biznesowy

Moduł ćwiczeń jest centralnym elementem FiziYo Admin. Umożliwia fizjoterapeutom tworzenie, edytowanie, tagowanie i organizowanie ćwiczeń rehabilitacyjnych, które następnie są przypisywane pacjentom.

## Zasady copy vs edit (2026-03-08)

- `GLOBAL/FiziYo`:
  - Oryginał pozostaje read-only.
  - Akcja edycji uruchamia flow "Utwórz kopię do edycji".
  - Po utworzeniu kopii użytkownik przechodzi do detalu nowej kopii.
- `ORGANIZATION/PERSONAL`:
  - Edycja działa in-place przez `UPDATE_EXERCISE_MUTATION`.
  - Formularz edycji musi przekazywać `name` do payloadu update.
- Jawna akcja `Duplikuj` pozostaje dostępna niezależnie od trybu.

## Strategia nazewnictwa kopii

- Dla nazwy bazowej `<nazwaBazowa>`:
  - pierwsza kopia: `Kopia <nazwaBazowa>`
  - kolejne: `Kopia 2 <nazwaBazowa>`, `Kopia 3 <nazwaBazowa>`, ...
- Numeracja dotyczy tylko kopii tej samej nazwy bazowej.
- System usuwa prefiks copy z nazwy źródła przed liczeniem kolejnej kopii (np. duplikacja `Kopia 2 X` bazuje na `X`).

## Sortowanie listy ćwiczeń

- Lista w zakładce `Ćwiczenia` ma sortowanie malejące po dacie utworzenia (najnowsze pierwsze).
- Priorytet pola daty:
  1. `createdAt` (aktualne pole API)
  2. `creationTime` (fallback dla starszych rekordów/aliasów)

## Kontrakt prezentacji szczegółów (2026-04-07)

Wszystkie powierzchnie UI wyświetlające szczegóły ćwiczenia muszą korzystać ze wspólnego kontraktu prezentacji pól.

### Powierzchnie objęte standaryzacją

- `app/(dashboard)/exercises/[id]/page.tsx` (detal ćwiczenia)
- `features/exercises/ExerciseCard.tsx` (karta listy/grid)
- `components/shared/exercise/ExerciseExecutionCard.tsx` (widok współdzielony)
- `features/assignment/ExerciseDetailsDialog.tsx` i widoki assignment korzystające ze shared card
- `features/patients/ExercisePreviewDrawer.tsx`
- `features/verification/ExerciseDetailsPanel.tsx`

### Kanoniczna kolejność pól

1. **Dawkowanie**: `Serie`, `Powtórzenia`, `Czas powtórzenia`, `Czas serii`
2. **Wykonanie**: `Przerwa między seriami`, `Przerwa między powt.`, `Czas przygotowania`, `Tempo`, `Obciążenie`, `Strona ciała`, `Zakres ruchu (ROM)`, `Poziom trudności`
3. **Treść**: `Opis dla pacjenta`, `Opis kliniczny`, `Polecenia audio`, `Notatki`

### Zasady etykiet

- Etykiety czasu i przerw muszą być precyzyjne:
  - `Czas powtórzenia` (`executionTime`) — główny parametr wejściowy timera
  - `Czas serii` (`duration`) — pole time-based; w kreatorze może być prezentowane jako wartość wyliczana
  - `Przerwa między seriami` (`restSets`)
  - `Przerwa między powt.` (`restReps`)
- Nie używamy ogólnych etykiet typu `Czas` lub `Przerwa` bez doprecyzowania.
- Nie eksponujemy terapeucie pojęcia „typ ćwiczenia” jako głównego parametru semantycznego; timer wynika z `executionTime`.

### Polityka pustych stanów

- Dla widoków szczegółowych (`full`) pole jest zawsze renderowane w kanonicznej kolejności.
- Brak wartości nie ukrywa pola; renderujemy placeholder:
  - `Nie ustawiono` dla treści opisowych,
  - `—` dla liczb i wartości technicznych.
- Dla widoków kompaktowych (`compact`/`readable`) dopuszcza się gęstszy layout, ale bez zmiany kolejności logicznej i bez zmiany znaczenia pól.

### Tymczasowa polityka tagów

- Tagi ćwiczeń (`mainTags`, `additionalTags`) pozostają w modelu danych i API.
- W warstwie UI są tymczasowo ukryte na wszystkich objętych powierzchniach, aby utrzymać maksymalną spójność i zmniejszyć szum poznawczy.
- To decyzja prezentacyjna (UI-only), bez zmian kontraktów GraphQL.

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

### 2026-04-08

- Zaktualizowano semantykę dawkowania: `Czas powtórzenia` jest głównym parametrem wejściowym, a `Czas serii` opisano jako pole time-based / computed display w kreatorze.
- Doprecyzowano zasady etykiet czasowych pod kątem spójności create/edit/detail.
- Dodano odwołanie do `SPEC-012` jako single source of truth dla modelu `sets × reps × executionTime` oraz roli `duration` jako override time-based.

### 2026-04-07

- Dodano kanoniczny kontrakt prezentacji szczegółów ćwiczenia (zakres powierzchni, kolejność pól, polityka pustych stanów).
- Doprecyzowano precyzyjne etykiety czasów i przerw (`Czas serii` vs `Czas powtórzenia`).
- Dodano decyzję produktową o tymczasowym ukryciu tagów w UI bez zmian w modelu danych.

### 2026-03-08

- Ujednolicono semantykę edycji i kopiowania: `GLOBAL` tworzy kopię do edycji, `ORGANIZATION` edytuje in-place.
- Dodano zasady auto-nawigacji po utworzeniu kopii (przejście do nowego detalu).
- Dodano politykę nazewnictwa kopii: `Kopia`, `Kopia 2`, `Kopia 3`...
- Doprecyzowano sortowanie listy ćwiczeń jako newest-first oparte o `createdAt`.

### 2026-02-16

- Utworzenie specyfikacji na podstawie istniejącej implementacji
