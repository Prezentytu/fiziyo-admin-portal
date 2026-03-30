# Wytyczne testowania — FiziYo Admin

Dokument dla zespołu i agentów: kiedy i jak pisać testy, żeby wiedzieć, kiedy coś przestaje działać.

## Zasady ogólne

- **Logika biznesowa** (filtry, reguły widoczności, walidacja) — testy jednostkowe obowiązkowe. Wyciągaj czyste funkcje do modułów pomocniczych i testuj je (Vitest).
- **Przed merge / PR**: uruchom `npm run test:run` oraz `npm run lint`. W opisie PR podaj, jakie testy wykonałeś (np. „testy jednostkowe teamSectionUtils, lint, build”).
- **Nowe funkcje (3+ kroki)**: zgodnie z workflow spec-first; przy implementacji dopisz testy do nowej logiki.

## Stack testowy

- **Runner**: Vitest 4 (`npm run test`, `npm run test:run`, `npm run test:coverage`).
- **Środowisko**: happy-dom, setup: `vitest.setup.ts` (jest-dom dla matcherów).
- **Lokalizacja testów**: pliki `*.test.ts` / `*.test.tsx` obok kodu lub w `__tests__/`. Konfiguracja: `vitest.config.ts` (include: `src/**/*.test.{ts,tsx}`).

## Jak pisać testy jednostkowe (tech lead)

1. **Wyciągnij logikę do funkcji czystych** — np. filtry ról, sprawdzanie uprawnień, normalizacja danych. Eksportuj z modułu (np. `teamSectionUtils.ts`).
2. **Testuj jedno zachowanie na test** — jedna asercja lub jeden scenariusz w `it()`. Nazwy: „returns true for owner when filter is therapist”, „for filter admin passes only owner and admin”.
3. **Granice i edge case’y** — puste dane, wielkość liter, nieznane role. Dzięki temu refaktory i zmiany w UI nie zepsują logiki bez sygnału z testów.
4. **Nie testuj szczegółów UI w testach jednostkowych** — komponenty React można testować integracyjnie (np. React Testing Library) osobno; w pierwszej kolejności pokrywaj logikę.

## Przykład (organizacja / TeamSection)

- Moduł: `src/components/organization/teamSectionUtils.ts` — eksportuje `isStaffRole`, `passesRoleFilter`.
- Test: `src/components/organization/teamSectionUtils.test.ts` — testy dla filtrów „all”, „admin”, „therapist” (w tym owner w filtrze fizjoterapeuci).

## Komendy

- `npm run test` — watch mode.
- `npm run test:run` — jednorazowe uruchomienie.
- `npm run test:coverage` — raport pokrycia.
- `npm run validate` — lint + type-check + test:run + build.

## Dla agentów

- Przy zmianie logiki filtra, uprawnień lub warunków renderowania: dodać lub zaktualizować testy jednostkowe dla tej logiki.
- Po zakończeniu zadań: w podsumowaniu podać, że uruchomiono `npm run test:run` i `npm run lint` (lub `npm run validate`).
