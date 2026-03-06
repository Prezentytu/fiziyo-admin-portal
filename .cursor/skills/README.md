# AI Agent Skills

Umiejętności (skills) to specjalistyczne przewodniki dla AI agentów pracujących nad projektem FiziYo Admin. Każdy skill opisuje konkretny typ zadania i jak je wykonać.

## Dostępne skills

| Skill                                         | Opis                              | Kiedy używać                                         |
| --------------------------------------------- | --------------------------------- | ---------------------------------------------------- |
| [spec-writing](spec-writing/SKILL.md)         | Jak pisać specyfikacje FiziYo     | Tworzenie/aktualizacja plików w `.ai/specs/`         |
| [code-review](code-review/SKILL.md)           | Code review w FiziYo              | Przegląd kodu przed merge, weryfikacja zmian         |
| [create-agents-md](create-agents-md/SKILL.md) | Jak tworzyć AGENTS.md dla modułów | Dodawanie nowego modułu/komponentu do Task Routera   |
| [product-designer](product-designer/SKILL.md) | Premium UI/UX dla MedTech SaaS    | Zadania UI/UX, redesign, audit designu i dostępności |
| [implement-spec](implement-spec/SKILL.md)     | Implementacja spec krok po kroku  | Wdrażanie złożonych funkcjonalności ze specyfikacji  |
| [pre-implement-spec](pre-implement-spec/SKILL.md) | Analiza gotowości specyfikacji | Ocena ryzyka i braków przed rozpoczęciem kodowania   |
| [integration-tests](integration-tests/SKILL.md) | Orkiestracja testów regresyjnych i integracyjnych | Bugfixy, zmiany logiki biznesowej, wdrożenia ze specyfikacji |

## Dokumentacja ekosystemowa (.ai/)

Oprócz skills, folder `.ai/` zawiera dokumentację kontekstową:

| Plik                                  | Opis                                                        |
| ------------------------------------- | ----------------------------------------------------------- |
| [ECOSYSTEM.md](../ECOSYSTEM.md)       | Mapa cross-repo: admin ↔ mobile ↔ backend, GraphQL contract |
| [DOMAIN_MODEL.md](../DOMAIN_MODEL.md) | Encje, enumy, relacje, JSONB — szybka referencja            |
| [DATA_FLOWS.md](../DATA_FLOWS.md)     | Kluczowe flow biznesowe z diagramami                        |
| [lessons.md](../lessons.md)           | Dziennik wniosków z pracy AI                                |
| [specs/](../specs/README.md)          | Specyfikacje modułów (SPEC-001…005)                         |

## Integracja z Cursor

Skille projektowe sa udostepnione Cursorowi przez `.cursor/skills/` jako projektowy punkt odkrywania.
Canonical source pozostaje w `.ai/skills/`, a workflow agentow jest spinany przez `AGENTS.md` oraz `.cursor/rules/*.mdc`.

### Source of truth

- Edytuj skille tylko w `.ai/skills/`.
- Synchronizuj warstwe Cursor poleceniem: `npm run skills:sync`.
- Nie utrzymuj recznie plikow w `.cursor/skills/` (to katalog generowany).

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
