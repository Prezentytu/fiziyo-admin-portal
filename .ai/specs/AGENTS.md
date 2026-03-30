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

### Po implementacji

1. **Zaktualizuj changelog** w specyfikacji:
   ```markdown
   ## Changelog
   
   ### {data}
   - {opis zmian}
   ```

2. **Zaktualizuj status** w README.md jeśli się zmienił

### Tworzenie nowej specyfikacji

Szablon:

```markdown
# {Tytuł}

## Cel biznesowy

{Dlaczego ta funkcjonalność istnieje}

## Architektura

{Jak jest zbudowana - komponenty, flow danych}

## Interfejsy

### GraphQL Queries/Mutations

{Definicje API}

### Komponenty

| Komponent | Lokalizacja | Opis |
|-----------|-------------|------|
| ... | ... | ... |

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
4. **Linkuj do kodu** - referencje do plików źródłowych

## Czego NIE robić

- Nie twórz specyfikacji dla trywialnych zmian (typo fix, refactor)
- Nie usuwaj specyfikacji - oznacz jako "Deprecated" w statusie
- Nie edytuj historycznych wpisów w changelog - tylko dodawaj nowe
