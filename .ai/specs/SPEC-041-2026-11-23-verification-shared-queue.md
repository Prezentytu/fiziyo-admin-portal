---
spec: SPEC-041
repo: fiziyo-admin-portal
issues: []
prs: [360, 361, 'fizjo-app#722']
board: Trello 248 + zlecenie Adama 23.11.2026
---

# Zespołowa weryfikacja katalogu: kto co sprawdza, przydział i pętla poprawek

## Cel biznesowy

Zespół FiziYo (dziś 4 osoby z `ReviewExercises`) ma sprawnie przejrzeć, poprawić i zaakceptować setki zaimportowanych ćwiczeń kolejki globalnej (PROD 23.11.2026: 179 „Do sprawdzenia”, wszystkie systemowe, od dwóch autorów-importerów). Podział „jeden od najnowszych, drugi od najstarszych” był obejściem braku narzędzi, nie wymaganiem. Potrzebne są:

1. **Przydział do konkretnej osoby, masowo.** Zaznaczam ćwiczenia (albo „następne N w kolejności listy”) i daję je sobie albo koledze.
2. **Widać, kto co weryfikuje.** Na liście przy ćwiczeniu, w filtrze po osobie i w podsumowaniu zespołu: ile kto ma do sprawdzenia, ile czeka u niego na poprawki, ile zrobił dziś.
3. **Czytelna pętla poprawek.** Ćwiczenie odesłane do poprawek wewnętrznych ma własne oznaczenie i zakładkę, a po poprawieniu wraca jednym kliknięciem do sprawdzenia z plakietką „Poprawione, sprawdź”.

Miara: liczba kliknięć od „mam 100 ćwiczeń dla kolegi” do „kolega widzi je u siebie” (zaznacz stronę albo wybierz N, wybierz osobę, potwierdź) oraz brak ćwiczeń, które utknęły w poprawkach bez drogi powrotu.

## Ścieżka

```
Do sprawdzenia ──(uwagi → „Do poprawek wewnętrznych”)──► Poprawki wewnętrzne („Czeka na poprawki”)
      ▲                                                          │
      └──────(„Oznacz jako poprawione” → plakietka „Poprawione, sprawdź”)┘
      │
      ├──► Opublikowane (etapy przechodzą)
      ├──► Wycofane (duplikat)
      └──► Do poprawy (odesłane do autora; dla importów rzadkie)
```

Każde ćwiczenie w „Do sprawdzenia” i „Poprawkach wewnętrznych” ma najwyżej jedną osobę („Weryfikuje: …”). Przydział nie zmienia statusu.

## Architektura

Tylko kolejka globalna (`ContentManager`, `SiteSuperAdmin`). Kolejki organizacji nie mają przydziału: to zmiana polityki autoryzacji z `sec-report`, poza zakresem. Bez nowych wartości `ContentStatus` (enum czyta mobile); stany pętli poprawek to `InternalFixStatus` (`None` / `Waiting` / `Fixed`).

1. **Pamięć listy (panel, bez API, PR #360).** `utils/queuePreferences.ts` trzyma w `localStorage` (`fizyo_verification_queue:<id użytkownika>`) kolejność i filtr przypisania z ostatniej zmiany. Link z jawnym `sort` albo `assignee` wygrywa. Zakres dat nie jest zapamiętywany.
2. **Przydział do osoby (backend).** `assignExercisesForReview` dostaje `assigneeId` (domyślnie pytający) i `takeOver`. Osoba docelowa musi mieć `ReviewExercises`. Zapis warunkowy w jednym `UPDATE`:
   - bez `takeOver`: tylko wiersze niczyje, już tej osoby albo pytającego (oddaję swoje koledze); zdejmuję tylko swoje;
   - z `takeOver` (panel pyta o potwierdzenie): dowolne, także zdjęcie cudzego.
     Pominięte ćwiczenia wracają w `skippedExerciseIds`, panel proponuje „Przejmij N”.
3. **„Przydziel następne N” (backend).** `claimNextExercisesForReview` bierze N niczyich z „Do sprawdzenia” w kolejności, wyszukiwaniu i datach listy, dla `assigneeId` (domyślnie pytający). Dwie osoby klikające naraz dostają rozłączne ćwiczenia; przegrane miejsca zastępują kolejne (do 3 prób).
4. **Zespół (backend).** `verificationTeam`: każda aktywna osoba z `ReviewExercises` z `assignedPending`, `waitingFixes`, `decidedToday` (ostatnia decyzja albo archiwizacja od północy Europe/Warsaw) oraz `unassignedPending` kolejki. Zastępuje `verificationProgress` z pierwszej wersji #722 (niewydanej).
5. **Filtr po osobie.** `assignee` w `verificationQueuePage` i `verificationQueueNavigator` przyjmuje też `user:<id>` obok `all | mine | unassigned | available`. Starszy backend traktuje nieznaną wartość jak „Wszystkie”.
6. **Pętla poprawek.** Zakładka „Poprawki wewnętrzne” pokazuje tylko `Waiting` (wcześniej także `Fixed`, więc poprawione ćwiczenie było w dwóch zakładkach). „Oznacz jako poprawione” (`completeInternalExerciseFixes`, dotąd bez UI) w detalu i masowo w zakładce; ćwiczenie wraca do „Do sprawdzenia” z plakietką.

### Panel

- **Pasek zespołu** nad listą (zakładki „Do sprawdzenia” i „Poprawki wewnętrzne”): plakietka na osobę, „Ty” pierwszy, z liczbami „do sprawdzenia”, „w poprawkach” i „dziś”; kliknięcie liczby przełącza zakładkę i filtr na tę osobę. Pod spodem „Wolne: N” i „Przydziel następne dla [osoba] 10 | 25 | 50 | 100”; po przydziale lista pokazuje ćwiczenia tej osoby.
- **Pasek zaznaczenia:** „Przypisz do mnie” i „Zdejmij ze mnie” bez zmian (lokatory E2E), obok „Przypisz do…” z listą kolegów. Gdy część zaznaczonych ma ktoś inny, panel pyta „Przejąć N ćwiczeń?” i ponawia tylko pominięte z `takeOver`. W „Poprawkach wewnętrznych” dodatkowo „Oznacz jako poprawione” z wynikiem per ćwiczenie.
- **Detal:** „Przejmij” (z potwierdzeniem), gdy ćwiczenie sprawdza ktoś inny, i „Oznacz jako poprawione”, gdy czeka na poprawki.
- **Filtr przypisania:** Wszystkie / Moje / Moje i wolne / Nieprzypisane / każda osoba z zespołu.

### Poza zakresem i decyzje otwarte

- **Kto może przejmować.** Domyślnie każdy z `ReviewExercises`, zawsze z potwierdzeniem w panelu (odwracalne: przejęte można oddać). Alternatywa do decyzji Adama: tylko `SiteSuperAdmin`.
- **Publikacja ćwiczenia czekającego na poprawki.** Dziś możliwa (`canDecide` nie patrzy na `InternalFixStatus`). Zostaje; do decyzji.
- **Masowa publikacja.** Nie: kontrole etapów są tylko w panelu, backend ich nie zna.
- Historia „kto przydzielił, kto poprawił” w detalu (`exerciseHistory` istnieje, panel go nie czyta) i powiadomienie autora ćwiczenia globalnego o „Do poprawy”: następny krok.

## Interfejsy

### GraphQL (fizjo-app, additive)

```graphql
assignExercisesForReview(exerciseIds: [String!]! assign: Boolean! = true assigneeId: String takeOver: Boolean! = false): AssignExercisesForReviewResult!
claimNextExercisesForReview(count: Int! sort: VerificationQueueSort! = NEWEST search: String dateFrom: DateTime dateTo: DateTime assigneeId: String): ClaimNextExercisesForReviewResult!

type ClaimNextExercisesForReviewResult { claimedExerciseIds: [String!]!, assigneeTotal: Int! }

verificationTeam: VerificationTeam!
type VerificationTeam { members: [VerificationTeamMember!]!, unassignedPending: Int! }
type VerificationTeamMember { userId: String!, fullname: String!, isMe: Boolean!, assignedPending: Int!, waitingFixes: Int!, decidedToday: Int! }
```

`count` od 1 do 100, przypisanie do 200 naraz. `assignee: "available" | "user:<id>"` w kolejce i nawigatorze.

## Data-testid

- `verification-team-bar`, `verification-team-member-{userId}`, `verification-team-member-{userId}-{queue|fixes}`, `verification-team-free`
- `verification-claim-{10|25|50|100}`, `verification-claim-assignee`, `verification-claim-assignee-select`
- `verification-selection-assign-to`, `verification-selection-assign-{userId}`, `verification-selection-mark-fixed`; bez zmian `verification-selection-assign-btn`, `verification-selection-unassign-btn`
- `verification-assignee-available`, `verification-assignee-user:{userId}`
- Detal: `review-notes-takeover-btn`, `review-notes-mark-fixed-btn`; potwierdzenie przejęcia to wspólny `common-confirm-dialog`.

## Verification plan

- Vitest: `queuePreferences`, `claimQueue` (komunikaty), `reviewNotes` (parse filtra z `user:`).
- Backend `ExerciseReviewNoteTests`: przydział koledze, odmowa dla osoby bez `ReviewExercises`, bez `takeOver` cudze pominięte, z `takeOver` przejęte, „Przydziel następne” dla kolegi, filtr `user:<id>`, zespół i liczniki, „Poprawki wewnętrzne” bez `Fixed`. PostgreSQL (CI `migrations-postgres`): równoległe „Weź N” i przypisania.
- E2E (`fiziyo-tests`, po wdrożeniu na DEV): A przydziela 10 koledze B, B widzi je w „Moje”; A odsyła do poprawek, B oznacza poprawione, A widzi „Poprawione, sprawdź”.

## Changelog

### 2026-11-23

- Utworzenie; PR #360: pamięć listy per weryfikator.
- Przepisanie po uwadze Adama: dwa końce kolejki były obejściem, nie wymaganiem. Cel to przydział do osoby, widoczność zespołu i pętla poprawek; „Weź N od najnowszych” zastąpione przez „Przydziel następne N → osoba” w kolejności listy.
