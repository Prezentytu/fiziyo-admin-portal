# Review Checklist (FiziYo)

## Critical

- Brak `any` (dopuszczalne tylko `unknown` + type guard).
- Brak `data-testid` na elementach interaktywnych.
- Brak walidacji wejscia przez `zod` tam, gdzie dane pochodza od uzytkownika.
- Uzycie `useLazyQuery` zamiast `useQuery` + `skip`.
- Potencjalny wyciek danych wrazliwych (tokeny, credentials, nadmiarowe bledy auth).

## High

- Brak `"use client"` w komponentach klienckich.
- Hardcoded kolory bazowe bez tokenow semantycznych.
- Brak obslugi skrotow w dialogach (`Cmd/Ctrl+Enter`, `Escape`).
- Brak zgodnosci struktury i nazewnictwa z AGENTS.md.

## Medium

- Brak domyslnych wartosci formularza.
- Nieoptymalna konfiguracja `fetchPolicy`.
- Powielanie komponentow zamiast reuzycia `@/components/ui` i `@/components/shared`.
- Brak testow dla zmienionej logiki biznesowej (filtry, walidacje, widocznosc).

## Low

- Niespojny styl kodu i nazewnictwa.
- Czytelnosc: dlugie funkcje, zbyt wiele odpowiedzialnosci w jednym komponencie.

## Backward Compatibility (GraphQL + TS)

- Nie usuwaj ani nie zmieniaj semantyki istniejacych pol i enumow bez planu migracji.
- Zmiany kontraktowe oznaczaj jako additive-first (najpierw nowe pola, potem deprecacja starych).
- Pilnuj zgodnosci typow frontend-backend dla wejsc/wyjsc operacji GraphQL.
- Przy zmianie nazwy pola dodaj okres przejsciowy i aktualizacje wszystkich query/mutation.
- Sprawdz zgodnosc z `BACKWARD_COMPATIBILITY.md` przed finalnym werdyktem review.

## Testing Gate

- Dla logiki biznesowej: testy jednostkowe sa obowiazkowe.
- Dla zmian UI krytycznych flow: dodaj test regresyjny (minimum happy path + edge case).
- Kazda poprawka buga powinna miec test, ktory reprodukuje stary problem.
