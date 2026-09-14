# Instrukcje dla AI Agentów - Specyfikacje

## Cel

Folder `.ai/specs/` zawiera specyfikacje funkcjonalności aplikacji FiziYo Admin.
Specyfikacje są źródłem prawdy dla architektury i decyzji projektowych.

## Workflow dla AI Agentów

### Przed implementacją

1. **Sprawdź istniejące specyfikacje**

   ```
   ls .ai/specs/
   ```

   Szukaj plików `SPEC-*-{nazwa-modułu}.md`

2. **Jeśli specyfikacja istnieje** - przeczytaj ją przed kodowaniem

3. **Jeśli specyfikacja nie istnieje** - utwórz nową:
   - Użyj kolejnego numeru (sprawdź najwyższy w README.md)
   - Format: `SPEC-{numer}-{YYYY-MM-DD}-{nazwa}.md`
   - Zaktualizuj tabelę w README.md
   - W nowej specyfikacji dodaj sekcję `## Verification plan` z:
     - testami jednostkowymi
     - scenariuszami E2E (w `fiziyo-tests`) dla ścieżek krytycznych

### Po implementacji

1. **Zaktualizuj changelog** w specyfikacji:

   ```markdown
   ## Changelog

   ### {data}

   - {opis zmian}
   ```

2. **Dopisz PR do frontmattera** `prs: [#N]` po merge; issue zamykaj przez `Closes #N` w PR
3. **Zaktualizuj status** w README.md jeśli się zmienił (słownik: `draft/approved/in-progress/implemented/verified/deprecated`)
4. **Po zamknięciu specyfikacji** przenieś ją do `.ai/specs/implemented/` (zachowując link w README)

### Tworzenie nowej specyfikacji

Szablon:

```markdown
---
spec: SPEC-0xx
repo: fiziyo-admin-portal
issues: []
prs: []
board:
---

# {Tytuł}

## Cel biznesowy

{Dlaczego ta funkcjonalność istnieje; jeśli spec wynika z issue — cytat zgłoszenia ≤25 słów + numer}

## Architektura

{Jak jest zbudowana - komponenty, flow danych}

## Interfejsy

### GraphQL Queries/Mutations

{Definicje API}

### Komponenty

| Komponent | Lokalizacja | Opis |
| --------- | ----------- | ---- |
| ...       | ...         | ...  |

## Data-testid

{Lista identyfikatorów dla testów E2E}

## Changelog

### {data utworzenia}

- Utworzenie specyfikacji
```

## Priorytety

1. **Spec-first development** - najpierw specyfikacja, potem kod
2. **Dokumentuj decyzje** - dlaczego, nie tylko co
3. **Aktualizuj changelog** - historia jest ważna
4. **Linkuj do kodu** - referencje do plików źródłowych i PR-ów; nie wklejaj kodu poza SDL kontraktu
5. **Załączniki jako snapshot** - `.ai/specs/assets/SPEC-0xx/`, nie linki do Google Doc / Loom

## Czego NIE robić

- Nie twórz specyfikacji dla trywialnych zmian (typo fix, refactor)
- Nie usuwaj specyfikacji - oznacz jako "Deprecated" w statusie
- Nie edytuj historycznych wpisów w changelog - tylko dodawaj nowe
