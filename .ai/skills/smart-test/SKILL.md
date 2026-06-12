---
name: smart-test
description: Dobor minimalnego skutecznego zestawu testow do aktualnego diffa. Użyj gdy użytkownik prosi - jakie testy uruchomić, dobierz testy do zmiany, przetestuj szybko, nie chcę pełnego validate, które testy są potrzebne, skróć feedback loop. EN triggers - which tests to run, minimal regression scope, selective tests, fast feedback. Wynik to uzasadniony zestaw komend testowych proporcjonalny do ryzyka diffa.
---

# smart-test

## Kiedy używać

- Gdy chcesz skrócić feedback loop bez pomijania krytycznych testów.
- Gdy zmiana dotyka tylko wybranych modułów i nie wymaga pełnego `validate`.

## Strategia doboru testów

1. Zmapuj diff na moduły (`assignment`, `patients`, `verification`, `import`, `shared`).
2. Uruchom najpierw testy blisko zmiany:
   - `npm run test:run -- src/path/to/module`
3. Dla zmian kontraktowych lub cross-feature dołóż pełny `npm run test:run`.
4. Dla zmian build/tooling zawsze dołóż `npm run lint` i `npm run type-check`.
5. Jeśli dotykasz krytycznej ścieżki release, uruchom `npm run validate`.

## Wynik

- Raportuj, które testy uruchomiono i dlaczego ten zestaw był wystarczający.
