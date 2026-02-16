# Skill: Tworzenie AGENTS.md dla modułów

## Opis

Użyj tego skilla gdy dodajesz nowy moduł lub komponent do projektu i potrzebujesz utworzyć dedykowany plik AGENTS.md z wzorcami specyficznymi dla tego obszaru.

## Kiedy używać

- Tworzysz nowy duży moduł (np. nowa sekcja w components/)
- Istniejący moduł wymaga dokumentacji wzorców
- Task Router w głównym AGENTS.md wskazuje na nieistniejący plik

## Workflow

### 1. Określ lokalizację

Plik AGENTS.md powinien być w katalogu modułu, np.:

- `src/components/{nazwa-modułu}/AGENTS.md`
- `src/graphql/AGENTS.md`
- `src/hooks/AGENTS.md`

### 2. Utwórz plik AGENTS.md

Zawartość: 50-100 linii. Nie monolit — tylko wzorce specyficzne dla tego modułu.

### 3. Dodaj wpis do Task Routera

W głównym [AGENTS.md](../../../AGENTS.md) dodaj wiersz do tabeli Task Router:

```markdown
| {Zadanie} | `src/components/{moduł}/AGENTS.md` |
```

### 4. Opcjonalnie: CLAUDE.md

Dla kompatybilności z Claude Code możesz dodać `CLAUDE.md` jako alias:

```markdown
See [AGENTS.md](AGENTS.md)
```

## Szablon AGENTS.md modułu

```markdown
# AGENTS.md — {Nazwa modułu}

## Zakres

{Krótki opis — co ten moduł robi}

## Wzorce

### {Wzorzec 1}

{Opis, przykłady kodu}

### {Wzorzec 2}

{Opis, przykłady kodu}

## Referencje

- Specyfikacja: [SPEC-XXX](.ai/specs/SPEC-XXX-....md)
- Główne komponenty: `src/components/{moduł}/...`
- GraphQL: `src/graphql/queries/...`, `src/graphql/mutations/...`

## Konwencje data-testid

Prefiks: `{moduł}-`
Przykłady: `{moduł}-form-submit-btn`, `{moduł}-list-item-{id}`
```

## Zasady

- **Krótko** — 50-100 linii, nie powielaj treści z głównego AGENTS.md
- **Konkretnie** — wzorce z przykładami kodu
- **Linkuj** — do specyfikacji, komponentów, GraphQL
- **Domain-specific** — tylko to co dotyczy TEGO modułu
