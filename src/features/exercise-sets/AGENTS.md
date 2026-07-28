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
| `Load`              | ExerciseLoad?  | Obciążenie (kg-only + legacy)        | Obciążenie             |
| `Notes`             | string?        | Notatka                              | Notatka                |
| `CustomName`        | string? (200)  | Własna nazwa                         | Własna nazwa           |
| `CustomDescription` | string? (4000) | Własny opis                          | Własny opis            |
| `Side`              | ExerciseSide?  | Brak w mutacji mappingu — inherited  | Strona ciała           |
| `PreparationTime`   | decimal?       | Nadpisanie na mappingu (GraphQL)     | Czas przygotowania     |

## Schemat: ExerciseSet

`Id, Name, Description, OrganizationId, IsActive, IsTemplate, Frequency { TimesPerDay, TimesPerWeek, BreakBetweenSets, Monday-Sunday }, ExerciseMappings[], PatientAssignments[]`

## Schemat: PatientAssignment

`Id, ExerciseSetId, UserId, AssignedById, Status, StartDate, EndDate, Frequency`

## Kluczowe komponenty

- `CreateSetWizard.tsx` — pełny kreator zestawu (composer)
- `ExerciseBuilderSidebar` / `CreateSetDialog` — szybki kreator z listy ćwiczeń (ten sam write-path)
- `components/SetNameField.tsx` + `SetDescriptionCollapsible.tsx` — wspólne pola metadanych (nazwa+AI, opis)
- `utils/createSetSubmit.ts` — kanoniczny write-path `createExerciseSet` + `addExerciseToSet` (TEMPLATE + frequency)
- `ExerciseSetBuilder.tsx` — builder współdzielony (shared)
- `EditExerciseInSetDialog.tsx` — edycja ćwiczenia w zestawie
- Assignment customize: `CustomizeSetStep` + `ExerciseSetBuilder` / `ExerciseExecutionCard` (nie legacy CustomizeExercisesStep)

## Tworzenie zestawu (kanoniczny kontrakt)

- Zawsze `kind: TEMPLATE`, `templateSource: ORGANIZATION_PRIVATE`, `isTemplate: true`
- Zawsze wysyłaj domyślny `frequency` (elastyczny 3×/tydzień) przez `buildCreateTemplateSetVariables`
- Mappingi: pełny payload + dual-write load przez `buildExerciseLoadMutationVars`
- UI karty ćwiczenia: wyłącznie `ExerciseExecutionCard` (bez lokalnych klonów / `layoutVariant`)
- Po utworzeniu z sidebara: zostań w kontekście listy + toast z akcją „Zobacz zestaw” (bez auto-redirect)

## ExerciseLoad (kg-only, SPEC-003)

JSONB na mappingu: preferuj `loadWeightKg` + `loadSource` (`manual` | `converted` | `unknown`).
Legacy `type/value/unit/text` nadal w mutacjach (dual-write). Helper: `src/utils/exerciseLoadMutation.ts`.

## Hierarchia pól (nadpisywalne)

**SSOT:** `src/components/shared/exercise/fieldContract.ts` (`surfaces: ['mapping']`).

TIER 1: Serie, Powtórzenia, Czas powtórzenia
TIER 2: Przerwa między seriami, Obciążenie
TIER 3: Notatka, Tempo, Czas przygotowania
TIER 4: Przerwa między powt., Czas serii (`duration`), Własna nazwa/opis

`Side`, `rangeOfMotion`, `difficultyLevel` na mappingu są **inherited/none** (readonly z szablonu — brak argumentu w mutacji mappingu). Pokazuj wartości + link „Edytuj w ćwiczeniu”, nie input.
Precedencja odczytu: `resolveEffectiveExerciseParams` (override > mapping > szablon).

## Referencje

- Schemat Exercise: `src/features/exercises/AGENTS.md`
- Field contract: `src/components/shared/exercise/fieldContract.ts`
- Assignment Wizard: `src/features/assignment/AGENTS.md`
- ExerciseSetBuilder: `src/components/shared/ExerciseSetBuilder.tsx`

## Konwencje data-testid

Prefiks: `set-`
Przykłady: `set-form-name-input`, `set-create-wizard`, `set-exercise-row-{id}`, `set-edit-exercise-dialog`
