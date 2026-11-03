---
spec: SPEC-033
repo: fiziyo-admin-portal
issues: [T-0005]
prs: []
board:
---

# Biblioteka ćwiczeń stronami z serwera

## Cel biznesowy

T-0005: „w widoku cwiczen nie ma stronicowania - co moze utrudniac poruszanie sie i ładowanie duzej liczby”. Konto z 5000 ćwiczeń pobierało całą bibliotekę z `ExerciseFullFragment` (dziesiątki MB z `enrichmentData`) przy każdym wejściu na listę i po każdej zmianie, a filtrowało, sortowało i liczyło zakładki w przeglądarce.

## Architektura

- API (`fizjo-app`, additive): `availableExercisesPage` zwraca jedną stronę z tą samą widocznością co `availableExercises` (wspólne `ExerciseQuery.FilterAvailableForOrganizationAsync`). Zakładka, wyszukiwanie, sortowanie, strona i liczniki zakładek liczy SQL.
- Panel: `/exercises` woła tylko `GET_AVAILABLE_EXERCISES_PAGE_QUERY`. Filtr, fraza, strona i rozmiar strony są w URL (`exerciseLibraryUrlState`), więc powrót z ćwiczenia wraca na tę samą stronę. Fraza trafia do URL po 300 ms, a zmiana filtra, frazy albo rozmiaru wraca na stronę 1. Poprzednia strona zostaje na ekranie podczas ładowania następnej.
- Wybory ćwiczeń (nowy zestaw, dodanie do zestawu, edycja zestawu, kreator przypisania, dodanie ćwiczenia pacjentowi, czat) wołają `GET_AVAILABLE_EXERCISES_PICKER_QUERY`: cała biblioteka bez `enrichmentData`, więc wyszukiwanie i filtry dalej działają w przeglądarce. Treść wybranych ćwiczeń doczytuje `useExercisePickerLibrary` (`GET_EXERCISE_ENRICHMENT_QUERY`, zawsze z sieci, ponownie po zmianie `updatedAt`), a treść z mappingów zestawu jest znana od razu. Zapisy odświeżają obie listy przez `EXERCISE_LIBRARY_REFETCH_QUERIES` (tylko aktywne query); realtime też, łącznie z usunięciem.
- Popularność w builderze liczy `GET_ORGANIZATION_EXERCISE_USAGE_QUERY` (same `exerciseId` mappingów), nie pełna lista zestawów z treścią ćwiczeń.

### Decyzje

- Wyszukiwanie w SQL odwzorowuje dotychczasowe wyszukiwanie panelu: tokeny AND, bez wielkości liter i polskich znaków (`lower` + `replace`, bez rozszerzenia `unaccent` i bez migracji), po nazwie, opisach, aliasach i nazwach tagów. Ranga: początek nazwy, nazwa, tagi i aliasy, opisy; potem najnowsze, na końcu `id`, żeby strony były stabilne.
- Liczniki zakładek nie zależą od frazy (jak przed zmianą). „Wyniki: X z Y” pokazuje trafienia frazy względem wszystkich.
- Rozmiary strony 24, 48 i 96 (siatka 3 kolumny). Domyślne wartości nie trafiają do URL.
- Treść ćwiczenia (`enrichmentData`) w parametrach buildera: `undefined` znaczy „nie pobrano”, `null` znaczy „brak treści”. Różnica treści do zapisu liczy się tylko, gdy obie strony są pobrane (`resolveParamsEnrichmentDelta`); bez treści ćwiczenia parametry trzymają samo odziedziczone nadpisanie (`enrichmentOverride`) i zapisują je bez zmian. Karta jest tylko do odczytu, a zapis zablokowany, dopóki treść wybranych ćwiczeń nie przyjdzie (`ensureDetailsReady`), więc terapeuta nigdy nie edytuje ani nie zapisuje pustej treści zamiast prawdziwej.

## Interfejsy

### GraphQL Queries/Mutations

```graphql
availableExercisesPage(organizationId: String!, tab: ExerciseLibraryTab! = ALL, search: String, page: Int! = 1, pageSize: Int! = 24): AvailableExercisesPage!
enum ExerciseLibraryTab { ALL ORGANIZATION FIZIYO NEEDS_CHANGES }
type AvailableExercisesPage { items totalCount page pageSize totalPages hasPreviousPage hasNextPage counts { all organization fiziyo needsChanges } }
```

### Komponenty

| Komponent                 | Lokalizacja                                               | Opis                                                        |
| ------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| `ListPagination`          | `src/components/shared/ListPagination.tsx`                | Stopka listy stronicowanej przez API, test ID przez prefiks |
| `exerciseLibraryUrlState` | `src/features/exercises/utils/exerciseLibraryUrlState.ts` | Stan listy w URL i mapowanie filtra na `ExerciseLibraryTab` |

## Verification plan

- Backend: `ExerciseLibraryQueryTests` (strona, zakładki i liczniki, wyszukiwanie bez polskich znaków przez tag i alias, ranga, widoczność z bramką weryfikacji, inna organizacja).
- Panel: `exerciseLibraryUrlState.test.ts`, `useRealtimeExercises.test.ts` (usunięcie odświeża stronę).
- E2E (`fiziyo-tests`, `exercises.spec.ts`): istniejące E01–E07 bez zmian lokatorów; nowe test ID `exercise-pagination-prev`, `exercise-pagination-next`, `exercise-pagination-indicator`, `exercise-pagination-summary`, `exercise-page-size-select` do scenariusza przejścia na stronę 2 i powrotu z ćwiczenia.

## Changelog

### 2026-10-31

- Wybory ćwiczeń na lekkiej liście z doczytaniem treści wybranych; ręczne mapowania w dialogach zestawu i kreatorze przypisania przestały gubić `enrichmentData`, a zapis edycji zestawu i przypisania nie zamraża już całej treści w nadpisaniach.
- Pierwsza wersja: `availableExercisesPage` w API i lista `/exercises` stronami z serwera; zastępuje stronicowanie w przeglądarce z #135 i render partiami z #138 na tej liście.
