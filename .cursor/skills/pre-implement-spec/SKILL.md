---
name: pre-implement-spec
description: Analizuje specyfikacje przed kodowaniem, wykrywa luki, ryzyka i niespojnosci kontraktow. Uzyj przy przygotowaniu implementacji, estymacji ryzyka i ocenie gotowosci specyfikacji.
---

# Skill: Analiza spec przed implementacja (FiziYo)

Ten skill sluzy do przygotowania bezpiecznej implementacji jeszcze przed pierwsza zmiana w kodzie.

## Cel

- Wychwycic luki w specyfikacji.
- Ocenic ryzyko regresji.
- Potwierdzic zgodnosc z AGENTS.md i realnym kodem.

## Workflow

### 1) Load context

1. Przeczytaj spec z `.ai/specs/`.
2. Przeczytaj root `AGENTS.md` i pasujace AGENTS.md modulowe.
3. Przeczytaj `.ai/lessons.md`.
4. Zidentyfikuj obszary kodu, ktore spec dotyka bezposrednio.

### 2) Completeness check

Sprawdz, czy spec zawiera:

- cel biznesowy i scope,
- architekture i przeplyw danych,
- kontrakty GraphQL,
- plan testow (unit/integration),
- ryzyka i mitygacje,
- changelog.

Jesli sekcje sa niepelne, zglaszasz konkretne braki i ich wplyw.

### 3) Risk assessment

Dla kazdego kroku spec:

- oszacuj ryzyko techniczne (low/medium/high),
- okresl potencjalna regresje,
- zaproponuj mitygacje i test, ktory to pokrywa.

Szczegolnie sprawdz:

- breaking zmiany w typach i kontraktach GraphQL,
- zmiany warunkow biznesowych bez testow,
- zmiany UI bez strategii accessibility i dark/light.

### 4) AGENTS compliance

Zweryfikuj zgodnosc z zasadami projektu:

- brak `any`,
- `useQuery` + `skip`,
- `react-hook-form` + `zod`,
- `data-testid` na interaktywnych elementach,
- spec-first i aktualizacja lessons po korektach.

### 5) Readiness report

Wynik podaj jako raport:

- **Gotowe do implementacji** / **Wymaga poprawek spec**.
- Lista blockerow (critical/high).
- Lista rekomendowanych uzupelnien.
- Proponowany podzial implementacji na fazy.

## Output template

Uzyj formatu:

```markdown
# Pre-implementation review: <nazwa spec>

## Executive summary

- ...

## Blockers

- [Critical] ...

## Risks

| Obszar | Ryzyko | Poziom | Mitigacja |
| ------ | ------ | ------ | --------- |
| ...    | ...    | ...    | ...       |

## Missing sections in spec

- ...

## Suggested implementation phases

1. ...
2. ...
```
