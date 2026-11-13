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
- Wybory ćwiczeń (nowy zestaw, dodanie do zestawu, edycja zestawu, kreator przypisania, dodanie ćwiczenia pacjentowi) przeglądają bibliotekę tymi samymi stronami z API (`GET_AVAILABLE_EXERCISES_PICKER_PAGE_QUERY`, lekki `ExercisePickerFragment`, 50 na stronę): fraza (po 300 ms), zakładka „Wszystkie / Moje / FiziYo” i kolejność liczy SQL, „Pokaż więcej” dokłada następną stronę. Pełna lista ucinała się na bezpieczniku `availableExercises` (`take` 5000), więc przy pełnej puli część ćwiczeń była niewidoczna i nie dało się ich wybrać. `useExercisePickerLibrary` trzyma stan listy i zwraca `exercises`, czyli każdy znany rekord: widziany na dowolnej stronie (zostaje po zmianie frazy), wybrany (`detailExerciseIds`: rekord i treść `GET_EXERCISE_PICKER_DETAILS_QUERY`, zawsze z sieci, ponownie po zmianie `updatedAt`), pokazany bez edycji (`recordExerciseIds`, np. ćwiczenia już w zestawie) i popularny (`GET_EXERCISE_PICKER_RECORD_QUERY`). Wywołujący szukają wybranych ćwiczeń w `exercises`, a `ExerciseSetBuilder` dostaje osobno `library` (id na stronie, popularne, liczniki, fraza, zakładka). Czat (`ai-view`) zostaje na pełnej liście `GET_AVAILABLE_EXERCISES_PICKER_QUERY`. Zapisy odświeżają listy przez `EXERCISE_LIBRARY_REFETCH_QUERIES` (tylko aktywne query, czyli ostatnio wczytaną stronę wybieraka); realtime też, łącznie z usunięciem.
- Popularność w builderze liczy `GET_ORGANIZATION_EXERCISE_USAGE_QUERY` (same `exerciseId` mappingów), nie pełna lista zestawów z treścią ćwiczeń. „Popularne” to dziesięć najczęściej używanych ćwiczeń, które biblioteka nadal pokazuje: hook pyta o 30 najczęściej używanych listę `availableExercises` zawężoną do ich id (`GET_VISIBLE_EXERCISE_PICKER_RECORDS_QUERY`, ta sama reguła widoczności co lista stronicowana), więc nie zależą od wczytanych stron, a ćwiczenie ukryte w bibliotece (cofnięte z publikacji, za bramką weryfikacji organizacji, demo bez dostępu) nie jest oferowane do dodania. `exerciseById` nie stosuje reguły widoczności biblioteki, więc służy wyłącznie rekordom już obecnym w zestawie; rekord znany tylko po id nigdy nie trafia na listę ani do „Popularnych”.

### Decyzje

- Wyszukiwanie w SQL odwzorowuje dotychczasowe wyszukiwanie panelu: tokeny AND, bez wielkości liter i polskich znaków (`lower` + `replace`, bez rozszerzenia `unaccent` i bez migracji), po nazwie, opisach, aliasach i nazwach tagów. Ranga: początek nazwy, nazwa, tagi i aliasy, opisy; potem najnowsze, na końcu `id`, żeby strony były stabilne.
- Liczniki zakładek nie zależą od frazy (jak przed zmianą). „Wyniki: X z Y” pokazuje trafienia frazy względem wszystkich.
- Rozmiary strony 24, 48 i 96 (siatka 3 kolumny). Domyślne wartości nie trafiają do URL.
- Wybierak bez nowego kontraktu: `availableExercisesPage` i `exerciseById` już istnieją. Rekordy spoza stron idą osobnym `exerciseById` na ćwiczenie (zestaw z 20 ćwiczeniami to do 20 równoległych lekkich zapytań przy otwarciu edycji). Filtr `where: { id: { in } }` na `availableExercises` działa po `Take` bezpiecznika (5000 po nazwie), dlatego zapytanie „Popularnych” bierze dwa okna (`skip: 0` i `skip: 5000`) i pokrywa 10 000 widocznych ćwiczeń; rekord spoza okien po prostu nie pojawia się w „Popularnych” (dalej jest na liście i w wyszukiwarce). Wybrane ćwiczenie, którego `exerciseById` nie zwraca (zasięg `Personal`), hook doczytuje tym samym zapytaniem z treścią. Docelowo: argument `ids` na `availableExercisesPage` w API (osobna zmiana), który zastąpi oba okna i zapytania po jednym id.
- Po zapisie ćwiczenia Apollo odświeża tylko ostatnio pytaną stronę; gdy wróci zmieniona, hook pyta ponownie także wcześniejsze strony. „Pokaż więcej” po błędzie sieci ponawia tę samą stronę.
- Zapis w wybieraku czeka (`ensureDetailsReady`), aż każde wybrane ćwiczenie ma rekord i treść; ćwiczenie, którego nie da się wczytać, blokuje zapis z komunikatem i ponowieniem, jak wcześniej treść.
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
- Panel: `exerciseLibraryUrlState.test.ts`, `useRealtimeExercises.test.ts` (usunięcie odświeża stronę), wybieraki: `exercisePickerPages.test.ts`, `useExercisePickerPages.test.ts` (strona, „Pokaż więcej”, nowa fraza od strony 1), `useExercisePickerLibrary.test.ts` (wybrane spoza stron po id, zostają po zmianie frazy, popularne tylko z rekordów widocznych w bibliotece, pokazane bez blokady zapisu, zasięg `Personal`), `useExercisePickerPages.apollo.test.tsx` (prawdziwy klient Apollo: spóźniona odpowiedź na starszą frazę, błąd kolejnej strony, odświeżenie wcześniejszych stron po zapisie), `ExerciseSetBuilder.test.tsx`.
- E2E wybieraków (`fiziyo-tests`): lokatory bez zmian (`*-search-input`, `*-filter-*`, `*-picker-<id>`, `*-add-<id>`, `*-show-more-btn`, `add-exercise-search-input`); wynik wyszukiwania przychodzi po 300 ms i odpowiedzi API, więc testy czekają na element, nie na natychmiastowe filtrowanie.
- E2E (`fiziyo-tests`, `exercises.spec.ts`): istniejące E01–E07 bez zmian lokatorów; nowe test ID `exercise-pagination-prev`, `exercise-pagination-next`, `exercise-pagination-indicator`, `exercise-pagination-summary`, `exercise-page-size-select` do scenariusza przejścia na stronę 2 i powrotu z ćwiczenia.

## Changelog

### 2026-11-12

- Wybieraki ćwiczeń (zestawy, kreator przypisania, ćwiczenie pacjenta) przeglądają bibliotekę stronami z API zamiast pełnej listy ucinanej na 5000; wybrane i pokazane ćwiczenia spoza stron hook doczytuje po id, popularne przez regułę widoczności biblioteki.

### 2026-10-31

- Wybory ćwiczeń na lekkiej liście z doczytaniem treści wybranych; ręczne mapowania w dialogach zestawu i kreatorze przypisania przestały gubić `enrichmentData`, a zapis edycji zestawu i przypisania nie zamraża już całej treści w nadpisaniach.
- Pierwsza wersja: `availableExercisesPage` w API i lista `/exercises` stronami z serwera; zastępuje stronicowanie w przeglądarce z #135 i render partiami z #138 na tej liście.
