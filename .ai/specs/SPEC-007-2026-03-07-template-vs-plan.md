# Template vs Plan - Rozdzielenie szablonow i planow pacjenta

## Cel biznesowy

Obecny model `ExerciseSet` miesza trzy rozne intencje:

- szablony FiziYo (biblioteka centralna),
- szablony organizacji/terapeuty,
- plany pacjenta tworzone podczas przypisania.

To powoduje niejednoznacznosc UX i ryzyko bledow domenowych (np. plan pacjenta widoczny jako zwykly szablon).
Celem jest pelne rozdzielenie tych bytow na poziomie backendu, GraphQL i UI, przy zachowaniu kompatybilnosci
z obecnym kontraktem (`isTemplate`).

## Architektura

### Model domenowy (docelowy)

- `ExerciseSetKind`: `TEMPLATE | PATIENT_PLAN`
- `ExerciseSetTemplateSource`: `FIZIYO_VERIFIED | ORG_PRIVATE | null`
- `sourceExerciseSetId?: string` (sledzenie pochodzenia planu/szablonu)

Zasady:

- `kind = TEMPLATE` trafia do biblioteki zestawow.
- `kind = PATIENT_PLAN` trafia do osobnego filtra planow pacjentow.
- Zmiana kolejnosci, skladu cwiczen lub tozsamosci planu oznacza plan spersonalizowany.
- Zapis "Zapisz ten zestaw cwiczen jako moj szablon" tworzy `TEMPLATE + ORG_PRIVATE`.

### Decyzja wykonania assignment (hybrid mode)

Wizard wybiera jedna z dwoch sciezek:

1. `assign existing template`
   - bez tworzenia nowego `ExerciseSet`
   - przypisanie bezposrednio do `selectedSet.id`
   - roznice zapisywane jako assignment-level customization (`PatientAssignment.exerciseOverrides`)
   - dozwolone tylko dla zmian harmonogramu i parametrow wykonania istniejacych cwiczen

2. `create personalized plan`
   - tworzenie `ExerciseSet(kind: PATIENT_PLAN)` + mapowania + przypisanie
   - uruchamiane dla zmian strukturalnych i tozsamosciowych:
     - reorder/add/remove cwiczen
     - zmiana nazwy planu
     - zmiana nazwy/opisu cwiczenia
     - zapis kopii jako `mój szablon`

### Workflow publikacji templatek FiziYo

1. Terapeuta tworzy `ORG_PRIVATE TEMPLATE`.
2. Opcjonalnie wysyla do review.
3. Rola administracyjna publikuje jako `FIZIYO_VERIFIED TEMPLATE`.

W pierwszym etapie nie kopiujemy calego shadow draft flow cwiczen 1:1; wdrazamy prostszy lifecycle dedykowany templatekom zestawow.

### Kompatybilnosc wsteczna

- `isTemplate` zostaje tymczasowo utrzymane jako compatibility layer.
- Mapowanie przejsciowe:
  - `isTemplate = true` <-> `kind = TEMPLATE`
  - `isTemplate = false` <-> `kind = PATIENT_PLAN`
- Migracja additive-first: nowe pola dodajemy bez usuwania starych.

## UI/UX Wireframes

### Assignment Wizard

- Toggle "Zapisz ten zestaw cwiczen jako moj szablon":
  - widoczny obok CTA "Dalej: Pacjenci",
  - widoczny na podsumowaniu,
  - oba miejsca kontroluja ten sam stan.
- Toggle nigdy nie sugeruje publikacji do biblioteki FiziYo (to osobny flow review).

### Lista zestawow

Filtry w kolejnosci:

1. `Szablony FiziYo`
2. `Moje szablony`
3. `Ostatnio uzywane`
4. `Plany pacjentow` (ostatni filtr)

## Interfejsy

### GraphQL Queries/Mutations

Backend (`fizjo-app/backend`):

- rozszerzenie `ExerciseSet` o:
  - `kind`,
  - `templateSource`,
  - `sourceExerciseSetId`
- rozszerzenie mutacji:
  - `createExerciseSet(...)` o pola klasyfikacji,
  - `duplicateExerciseSet(...)` z zachowaniem semantyki typu,
  - mutacje review/publikacji templatek (etap 2).
- rozszerzenie query/listingu o bezpieczne filtry:
  - template'y FiziYo,
  - template'y organizacji,
  - plany pacjentow.

Admin (`fiziyo-admin`) i mobile (`fizjo-app`) aktualizuja query/mutation oraz typy o nowe pola.

### GraphQL Contracts

- Additive-first: bez usuwania aktualnych pol.
- `isTemplate` oznaczamy jako pole przejsciowe do deprecacji.
- Wymagane zachowanie backward compatibility dla:
  - panelu admin,
  - aplikacji mobilnej,
  - testow automatycznych.

### Komponenty

| Komponent / warstwa | Lokalizacja                                                                                        | Opis                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Assignment Wizard   | `src/features/assignment/AssignmentWizard.tsx`                                                     | Sterowanie `saveAsTemplate` i tworzeniem planu/szablonu |
| Schedule step       | `src/features/assignment/ScheduleStep.tsx`                                                         | Toggle przy CTA                                         |
| Summary step        | `src/features/assignment/SummaryStep.tsx`                                                          | Finalny toggle i podsumowanie intencji zapisu           |
| Sets list           | `src/app/(dashboard)/exercise-sets/page.tsx`                                                       | Nowe filtry i separacja template vs patient plan        |
| Backend model       | `backend/FizjoApp.Api/Models/ExerciseSet.cs`                                                       | Nowe pola klasyfikacji                                  |
| Backend resolvers   | `backend/FizjoApp.Api/Types/ExerciseMutation.cs` / `ExerciseSetQuery.cs` / `TherapistsMutation.cs` | Rozszerzenie kontraktu i flow przypisania               |

## Data-testid

- `assign-schedule-save-template-toggle`
- `assign-schedule-save-template-label`
- `assign-summary-save-template-toggle`
- `assign-summary-save-template-label`
- `set-filter-fiziyo-templates-btn`
- `set-filter-my-templates-btn`
- `set-filter-patient-plans-btn`

## Risk Assessment

| Ryzyko                                           | Wplyw  | Mitigacja                                                          |
| ------------------------------------------------ | ------ | ------------------------------------------------------------------ |
| Zlamanie kontraktu GraphQL dla mobile/admin      | Wysoki | Additive-first, utrzymanie `isTemplate`, rollout etapowy           |
| Bledna migracja starych rekordow                 | Wysoki | Backfill + walidacja danych + telemetry checks                     |
| Wyciek planow pacjentow do biblioteki szablonow  | Wysoki | Twarde filtry po `kind` po stronie backendu i UI                   |
| Mylenie zapisu "moj szablon" z publikacja FiziYo | Sredni | Osobne UI flow, osobne mutacje review/publish                      |
| Brak deployu backendu po zmianie modelu          | Wysoki | Jawny checklist: migracja, db update, restart API, manualny deploy |

## Integration Test Coverage

| Scenariusz                                                                 | Typ testu    | Priorytet |
| -------------------------------------------------------------------------- | ------------ | --------- |
| Utworzenie planu pacjenta bez zapisu szablonu                              | Integracyjny | High      |
| Utworzenie planu pacjenta + zapis `ORG_PRIVATE TEMPLATE`                   | Integracyjny | High      |
| Filtry listy: FiziYo templates / moje templates / plany spersonalizowane   | Integracyjny | High      |
| Przypisanie do szablonu przy zmianie tylko parametrow i harmonogramu       | Integracyjny | High      |
| Materializacja `PATIENT_PLAN` przy zmianach strukturalnych/tozsamosciowych | Integracyjny | High      |
| Backward compatibility `isTemplate` dla starych rekordow                   | Integracyjny | High      |
| Review flow: `ORG_PRIVATE -> FIZIYO_VERIFIED`                              | Integracyjny | Medium    |

## Changelog

### 2026-03-07

- Utworzenie specyfikacji rozdzielenia `template vs patient plan`.
- Dodanie modelu docelowego z klasyfikacja i pochodzeniem zestawow.
- Dodanie planu migracji additive-first i zakresu cross-repo (admin/mobile/backend).
- Dodanie hybrydowej decyzji assignment (`reuse template` vs `materialize PATIENT_PLAN`) oraz zasad progu forkowania.
