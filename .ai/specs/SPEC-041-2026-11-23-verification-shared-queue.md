---
spec: SPEC-041
repo: fiziyo-admin-portal
issues: []
prs: []
board: Trello 248 + zlecenie Adama 23.11.2026
---

# Wspólna kolejka weryfikacji dla dwóch weryfikatorów

## Cel biznesowy

Adam i drugi weryfikator mają około 1000 ćwiczeń w kolejce globalnej. Dzielą ją z dwóch końców: Adam od najnowszych, kolega od najstarszych, po 10–100 ćwiczeń dziennie. Lista, zaznaczanie wielu ćwiczeń, „Przypisz do mnie” i filtr „Moje” już istnieją (Trello 248, PR #348). Brakowało czterech rzeczy:

- lista nie pamiętała, z którego końca weryfikator pracuje: każde wejście bez linku zaczynało od domyślnej kolejności;
- branie dziennej porcji wymagało zaznaczania ćwiczeń jedno po drugim albo stronami, bez gwarancji, że dwie osoby nie wezmą tego samego;
- „Następne” w detalu mogło trafić na ćwiczenie wzięte przez kolegę;
- nie było widać, ile jest moich, ile jeszcze wolnych i ile zrobiłem dziś.

## Architektura

Tylko kolejka globalna (`ContentManager`). Kolejki organizacji nie mają przypisań; dodanie ich zmienia politykę autoryzacji i wymaga `sec-report`, więc jest poza zakresem.

1. **Zapamiętana kolejka (panel, bez API).** `src/features/verification/utils/queuePreferences.ts` trzyma w `localStorage` (`fizyo_verification_queue`) kolejność i filtr przypisania z ostatniej zmiany na liście. Wejście na `/verification` bez `sort` i `assignee` w linku przywraca je; link z jawnym parametrem wygrywa. Zakres dat nie jest zapamiętywany: zapomniany filtr dat chowałby resztę kolejki.
2. **„Weź N” (backend + panel).** Mutacja `claimNextExercisesForReview` bierze następne N niczyich ćwiczeń z „Do sprawdzenia” w kolejności i wyszukiwaniu, które weryfikator widzi. Zapis jest warunkowy (`UPDATE … WHERE ReviewAssigneeId IS NULL`), więc dwie osoby klikające naraz dostają rozłączne ćwiczenia; przegrane miejsca zastępują kolejne ćwiczenia z kolejki (do 3 prób). Ten sam zapis warunkowy dostało `assignExercisesForReview`, które wcześniej czytało i zapisywało osobno.
3. **Kolejka „Moje i wolne” (`assignee: "available"`).** Lista i nawigator pokazują ćwiczenia moje i niczyje, bez wziętych przez kolegę. Starszy backend traktuje nieznaną wartość jak „Wszystkie”.
4. **Postęp dnia.** `VerificationStats` dostaje `assignedToMe`, `unassignedPending` i `decidedTodayByMe` (ostatnia decyzja albo archiwizacja pytającego od północy Europe/Warsaw; liczy ćwiczenia, nie kliknięcia).

### Kolejność wdrożenia

- PR A (panel, punkt 1) nie zależy od API.
- PR backendu w `fizjo-app` (punkty 2–4, additive).
- PR B (panel, UI punktów 2–4) dopiero po wdrożeniu backendu na DEV: pole dodane w panelu musi istnieć we wdrożonym API.

### Poza zakresem i decyzje otwarte

- **Zawieszone przypisania.** Nikt nie zdejmie cudzego przypisania; ćwiczenia wzięte przez osobę, która przestała pracować, zostają u niej. Decyzja Adama: limit trzymanych ćwiczeń, „Przejmij” z potwierdzeniem albo wygasanie po X dniach.
- Automatyczne branie ćwiczenia przy otwarciu detalu: odrzucone, bo przeglądanie zabierałoby ćwiczenia z kolejki kolegi.

## Interfejsy

### GraphQL (fizjo-app, additive)

```graphql
type ClaimNextExercisesForReviewResult {
  claimedExerciseIds: [String!]!
  assignedToMe: Int!
}

claimNextExercisesForReview(count: Int! sort: VerificationQueueSort! = NEWEST search: String dateFrom: DateTime dateTo: DateTime): ClaimNextExercisesForReviewResult!

type VerificationStats {
  # …dotychczasowe pola
  assignedToMe: Int!
  unassignedPending: Int!
  decidedTodayByMe: Int!
}
```

`count` od 1 do 100. `verificationQueuePage` i `verificationQueueNavigator` przyjmują `assignee: "available"`.

### Komponenty

| Komponent          | Lokalizacja                                           | Opis                                        |
| ------------------ | ----------------------------------------------------- | ------------------------------------------- |
| `queuePreferences` | `src/features/verification/utils/queuePreferences.ts` | odczyt, zapis i reguła przywrócenia kolejki |
| Lista globalna     | `src/app/(dashboard)/verification/page.tsx`           | przywrócenie i zapis przy zmianie           |

## Data-testid

Bez zmian w PR A. PR B dopisze swoje identyfikatory tutaj i w `docs/testing/data-testid-map.md`.

## Verification plan

- Vitest: `utils/__tests__/queuePreferences.test.ts` (zapis, uszkodzony zapis, niedostępna pamięć, pierwszeństwo linku).
- Backend: `ExerciseReviewNoteTests` (dwa końce kolejki, „Moje i wolne”, liczniki dnia, północ Europe/Warsaw) oraz dwa testy na prawdziwym PostgreSQL z równoległymi żądaniami (`scripts/rehearse-database.sh`).
- E2E (`fiziyo-tests`, po PR B): weryfikator A bierze 10 od najnowszych, B 10 od najstarszych, listy „Moje” są rozłączne.

## Changelog

### 2026-11-23

- Utworzenie specyfikacji; PR A: zapamiętana kolejka weryfikatora.
