# Assignment Status Enum Alignment

## Cel biznesowy

Zapewnienie bezawaryjnej edycji planu pacjenta i zmiany statusu przypisania po migracji backendowego kontraktu GraphQL z `status: String` na `status: AssignmentStatus`. Celem jest usunięcie regresji produkcyjnej oraz utrzymanie kompatybilności cross-repo (admin + mobile).

## Architektura

Backend (`fizjo-app/backend`) przyjmuje teraz:

- `status: AssignmentStatus` (preferowany kanał),
- `statusLegacy: String` (fallback migracyjny).

Klienci (admin i mobile) muszą:

1. deklarować zmienną GraphQL `status` jako enum,
2. mapować status UI/DB (`active`, `paused`) do enum GraphQL (`ACTIVE`, `PAUSED`),
3. przesyłać `statusLegacy` jako kanał bezpieczeństwa w okresie przejściowym.

## UI/UX Wireframes

Brak zmian layoutu. Zmiana dotyczy wyłącznie warstwy kontraktu GraphQL i mapowania wartości statusów w istniejących akcjach:

- wstrzymanie/wznowienie przypisania z karty pacjenta,
- wstrzymanie/wznowienie przypisania z detalu zestawu,
- analogiczne akcje w mobile.

## Interfejsy

### GraphQL Queries/Mutations

#### Admin

- `UPDATE_EXERCISE_SET_ASSIGNMENT_MUTATION` (`src/graphql/mutations/exercises.mutations.ts`)
  - było: `$status: String`
  - jest: `$status: AssignmentStatus`, `$statusLegacy: String`

#### Mobile

- `UPDATE_EXERCISE_SET_ASSIGNMENT_MUTATION` (`fizjo-app/src/graphql/mutations/exercises.mutations.ts`)
  - było: `$status: String`
  - jest: `$status: AssignmentStatus`, `$statusLegacy: String`

### GraphQL Contracts

- **Nowy typ wejściowy**: enum `AssignmentStatus` po stronie argumentu `status`.
- **Backward compatibility**: `statusLegacy: String` utrzymany tymczasowo dla klientów, które jeszcze nie wysyłają enum.
- **Deprecation plan**:
  1. migracja admin + mobile na enum,
  2. monitorowanie braku użycia `statusLegacy`,
  3. usunięcie `statusLegacy` po potwierdzeniu pełnej migracji klientów.

### Komponenty

| Komponent                             | Lokalizacja                                                   | Opis                                                           |
| ------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| `PatientAssignmentCard`               | `src/features/patients/PatientAssignmentCard.tsx`             | Mapowanie statusu UI -> enum GraphQL w akcji pause/resume      |
| `ExerciseSet detail page`             | `src/app/(dashboard)/exercise-sets/[id]/page.tsx`             | Mapowanie statusu UI -> enum GraphQL w akcji pause/resume      |
| `statusUtils`                         | `src/utils/statusUtils.ts`                                    | Mappery `toGqlStatus` / `fromGqlStatus` i słownik statusów     |
| `useUpdatePatientAssignment` (mobile) | `fizjo-app/src/graphql/hooks/usePatientAssignments.ts`        | Typowanie `status` jako `AssignmentStatusGql` + `statusLegacy` |
| `AssignmentDetailsScreen` (mobile)    | `fizjo-app/app/(tabs)/therapist/patients/assignment/[id].tsx` | Wywołanie mutacji ze statusem enum i fallbackiem legacy        |
| `assignmentStatus` (mobile util)      | `fizjo-app/utils/assignmentStatus.ts`                         | Mapper `toGqlAssignmentStatus`                                 |

## Data-testid

Brak nowych `data-testid` (zmiana kontraktowa bez nowej interakcji UI).

## Risk Assessment

| Ryzyko                                               | Wplyw                                            | Mitigacja                                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Enum casing inny niż oczekiwany (`UPPER_SNAKE_CASE`) | Aktualizacja statusu nadal zwraca błąd walidacji | Utrzymać fallback `statusLegacy`, monitorować błędy i potwierdzić enum values przez introspekcję środowiska |
| Częściowa migracja tylko jednego klienta             | Regresja na drugim kliencie (admin/mobile)       | Wdrożenie równoległe w obu repo i wspólna checklista walidacji                                              |
| Przyszłe użycie surowych stringów statusu            | Powrót błędów kontraktowych                      | Centralizacja mapowania w helperach (`statusUtils`, `assignmentStatus`) i testy jednostkowe mapperów        |

## Integration Test Coverage

| Scenariusz                                                              | Typ testu                                      | Priorytet |
| ----------------------------------------------------------------------- | ---------------------------------------------- | --------- |
| Pause/resume przypisania wysyła enum GraphQL + legacy fallback          | Unit/integration (frontend mutation variables) | High      |
| Edycja harmonogramu bez statusu nie regresuje (status opcjonalny)       | Integration                                    | Medium    |
| Brak zgodności kontraktu (`String` vs enum) jest wykrywalny w walidacji | Regression                                     | High      |

## Changelog

### 2026-05-07

- Dodanie specyfikacji migracji `AssignmentStatus` dla mutacji `updateExerciseSetAssignment`.
- Udokumentowanie planu kompatybilności (`statusLegacy`) i kolejności deprecacji.
