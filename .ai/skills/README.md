# AI Agent Skills

Umiejętności (skills) to specjalistyczne przewodniki dla AI agentów pracujących nad projektem FiziYo Admin. Każdy skill opisuje konkretny typ zadania i jak je wykonać.

## Dostępne skills

| Skill                                         | Opis                              | Kiedy używać                                       |
| --------------------------------------------- | --------------------------------- | -------------------------------------------------- |
| [spec-writing](spec-writing/SKILL.md)         | Jak pisać specyfikacje FiziYo     | Tworzenie/aktualizacja plików w `.ai/specs/`       |
| [code-review](code-review/SKILL.md)           | Code review w FiziYo              | Przegląd kodu przed merge, weryfikacja zmian       |
| [create-agents-md](create-agents-md/SKILL.md) | Jak tworzyć AGENTS.md dla modułów | Dodawanie nowego modułu/komponentu do Task Routera |

## Struktura skilla

Każdy skill zawiera plik `SKILL.md` z:

- **description** — co skill robi i kiedy go użyć
- **instructions** — krok po kroku jak wykonać zadanie
- **templates** — szablony do kopiowania
- **references** — linki do istniejących przykładów

## Dodawanie nowego skilla

1. Utwórz folder `.ai/skills/{nazwa-skill}/`
2. Dodaj plik `SKILL.md` z instrukcjami
3. Zaktualizuj tę tabelę
4. Rozważ dodanie wpisu do Task Routera w głównym `AGENTS.md`
