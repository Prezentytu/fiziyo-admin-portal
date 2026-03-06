---
name: create-agents-md
description: Tworzy lub aktualizuje pliki AGENTS.md dla modulow, z naciskiem na instrukcje operacyjne zamiast dokumentacji opisowej. Uzyj przy dodawaniu nowych modulow, porzadkowaniu Task Routera i standaryzacji reguł agentowych.
---

# Skill: Tworzenie AGENTS.md dla modułów

## Opis

Użyj tego skilla gdy dodajesz nowy moduł lub komponent do projektu i potrzebujesz utworzyć dedykowany plik AGENTS.md z wzorcami specyficznymi dla tego obszaru.

## Kluczowa zasada: Instrukcje, nie dokumentacja

**AGENTS.md to zbiór instrukcji dla agenta, nie dokumentacja produktu.** Każde zdanie mówi agentowi CO robić (tryb rozkazujący), a nie jak coś działa (opis).

### Anti-patterny

- ❌ "Moduł zapewnia listę pacjentów..." (opis) → ✅ "Użyj modułu do wyświetlenia listy pacjentów" (instrukcja)
- ❌ Akapity opisu → ✅ Listy numerowane z krokami
- ❌ Kolumny "Opis" / "Cel" w tabelach → ✅ Kolumny "Kiedy używać" / "Kiedy modyfikować"
- ❌ "Ten komponent służy do..." → ✅ "Użyj tego komponentu gdy..."

### Reguły treści

- Zacznij od czasowników w trybie rozkazującym: "Użyj", "Dodaj", "Utwórz", "Sprawdź"
- Wymagaj minimum 3-5 reguł MUST dla małych plików, 8+ dla dużych
- Preferuj listy punktowane i tabele nad akapitami
- Nie duplikuj treści z głównego AGENTS.md

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

Zawartość: 50-100 linii. Nie monolit — tylko wzorce specyficzne dla tego modułu. Pisz instrukcje, nie opisy.

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

{Użyj tego modułu gdy... — instrukcja, nie opis}

## Wzorce

### {Wzorzec 1}

{Użyj gdy... / Dodaj... / Sprawdź... — z przykładami kodu}

### {Wzorzec 2}

{Użyj gdy... — z przykładami kodu}

## Referencje

- Specyfikacja: [SPEC-XXX](.ai/specs/SPEC-XXX-....md)
- Główne komponenty: `src/components/{moduł}/...`
- GraphQL: `src/graphql/queries/...`, `src/graphql/mutations/...`

## Konwencje data-testid

Prefiks: `{moduł}-`
| Kiedy | Format |
|-------|--------|
| Formularz submit | `{moduł}-form-submit-btn` |
| Element listy | `{moduł}-list-item-{id}` |
```

- **Instrukcje** — każda linia mówi agentowi CO robić

## Zasady

- **Krótko** — 50-100 linii, nie powielaj treści z głównego AGENTS.md
- **Konkretnie** — wzorce z przykładami kodu
- **Linkuj** — do specyfikacji, komponentów, GraphQL
- **Domain-specific** — tylko to co dotyczy TEGO modułu
