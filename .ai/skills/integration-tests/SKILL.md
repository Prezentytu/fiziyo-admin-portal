---
name: integration-tests
description: Orkiestracja testow regresyjnych i integracyjnych po zmianach funkcjonalnych. Użyj gdy użytkownik prosi - napisz testy do tej zmiany, dodaj test regresyjny, pokryj bugfix testem, sprawdź czy nic się nie zepsuło, zaproponuj testy po wdrożeniu, zabezpiecz zmianę logiki testami. EN triggers - regression tests, integration coverage, bugfix validation, test after change. Wynik to plan testow proporcjonalny do ryzyka, napisane testy i raport co uruchomiono.
---

# Skill: Integration Tests (FiziYo)

Ten skill definiuje workflow testowy po zmianach w kodzie.

## Kiedy uzyc

- Bugfix z ryzykiem regresji.
- Zmiana logiki biznesowej (filtry, warunki widocznosci, walidacja).
- Zmiana flow formularza lub dialogu.
- Implementacja funkcji ze specyfikacji.

## Zasady nadrzedne

- Test ma udowodnic, ze stary blad byl reprodukowalny i zostal naprawiony.
- Dla zmian logiki biznesowej test jednostkowy jest obowiazkowy.
- Zakres testow ma byc proporcjonalny do ryzyka (nie testuj wszystkiego, testuj to co krytyczne).

## Workflow

### 1) Zmapuj ryzyko zmiany

Okresl:

- co moglo sie zepsuc,
- jakie flow uzytkownika jest krytyczne,
- czy zmiana dotyka kontraktu (GraphQL / typy / test IDs).

### 2) Dobierz typ testu

- **Unit (Vitest)**: czysta logika, helpery, walidatory, mapery.
- **Component test**: zachowanie pojedynczego komponentu i interakcji.
- **Regression test**: test reprodukujacy historyczny bug.
- **Contract check**: dla zmian danych i typow zwiazanych z GraphQL.

### 3) Napisz test

- Umiesc test blisko kodu (`*.test.ts` / `*.test.tsx` lub `utils/__tests__/`).
- Nazwij przypadek po zachowaniu, nie po implementacji.
- Pokryj minimum:
  - happy path,
  - kluczowy edge case,
  - scenariusz regresyjny (jesli to bugfix).

### 4) Uruchom i zweryfikuj

Minimum:

- `npm run test:run`
- `npm run lint`

Dla zmian szerokich:

- `npm run validate`

### 5) Raport testowy do usera

Podaj:

- jakie testy dodano/zmieniono,
- co uruchomiono,
- czy jest residual risk.

## Bugfix checklist (required)

- [ ] Czy istnieje reprodukcja bledu w tescie?
- [ ] Czy test failowal przed fixem?
- [ ] Czy test przechodzi po fixie?
- [ ] Czy dodano zabezpieczenie edge case?

## Heurystyki praktyczne

- Gdy zmieniasz warunki w `if`/filtrowaniu, dodaj testy graniczne.
- Gdy zmieniasz UI akcji krytycznej, sprawdz `data-testid` i flow klawiatury.
- Gdy dotykasz kontraktu GraphQL, sprawdz zgodnosc z `BACKWARD_COMPATIBILITY.md`.
