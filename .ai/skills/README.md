# AI Agent Skills

Umiejętności (skills) to specjalistyczne przewodniki dla AI agentów pracujących nad projektem FiziYo Admin. Każdy skill opisuje konkretny typ zadania i jak je wykonać.

## Dostępne skills

| Skill                                             | Opis                                                   | Kiedy używać                                         |
| ------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| [spec-writing](spec-writing/SKILL.md)             | Tworzenie/aktualizacja specyfikacji                    | Gdy potrzebna dokumentacja architektury i kontraktów |
| [pre-implement-spec](pre-implement-spec/SKILL.md) | Audyt gotowości specyfikacji                           | Przed kodowaniem dużych zmian                        |
| [implement-spec](implement-spec/SKILL.md)         | Wdrażanie spec fazami                                  | Implementacja wieloetapowa                           |
| [code-review](code-review/SKILL.md)               | Review jakości i ryzyk                                 | Audyt PR/diffa                                       |
| [integration-tests](integration-tests/SKILL.md)   | Testy regresyjne i integracyjne                        | Po zmianach funkcjonalnych                           |
| [smart-test](smart-test/SKILL.md)                 | Minimalny zestaw testów pod diff                       | Szybki feedback loop                                 |
| [check-and-commit](check-and-commit/SKILL.md)     | Quality gate przed commitem                            | Domknięcie zadania                                   |
| [root-cause](root-cause/SKILL.md)                 | Analiza przyczyny źródłowej                            | Debug regresji/incydentu                             |
| [product-designer](product-designer/SKILL.md)     | Premium UI/UX + accessibility                          | Redesign, audit UI, theme-safe                       |
| [ui-guardian](ui-guardian/SKILL.md)               | Wykonywalny guardian UI + metryki                      | Skan tokenów, migracja theme-safe, raport delta      |
| [sec-report](sec-report/SKILL.md)                 | Audyt bezpieczeństwa (OWASP + RODO + tenant isolation) | Zmiany auth/token/permission, review PR              |
| [qa-scenarios](qa-scenarios/SKILL.md)             | Raport QA P0/P1/P2                                     | Okno zmian przed release                             |
| [auto-implement](auto-implement/SKILL.md)         | Autonomiczna implementacja runu                        | Realizacja planu krok po kroku                       |
| [continue-run](continue-run/SKILL.md)             | Wznowienie przerwanego runu                            | Kontynuacja checklisty `.ai/runs/`                   |
| [help](help/SKILL.md)                             | Nawigator "jaki skill teraz?"                          | Gdy potrzebna decyzja o następnym kroku              |
| [skill-creator](skill-creator/SKILL.md)           | Scaffold nowego skilla                                 | Dodawanie nowych skilli zgodnych z konwencją FiziYo  |
| [create-agents-md](create-agents-md/SKILL.md)     | Tworzenie AGENTS.md modułu                             | Standaryzacja instrukcji agentowych i Task Routera   |

## Dokumentacja ekosystemowa (.ai/)

Oprócz skills, folder `.ai/` zawiera dokumentację kontekstową:

| Plik                                  | Opis                                                        |
| ------------------------------------- | ----------------------------------------------------------- |
| [ECOSYSTEM.md](../ECOSYSTEM.md)       | Mapa cross-repo: admin ↔ mobile ↔ backend, GraphQL contract |
| [DOMAIN_MODEL.md](../DOMAIN_MODEL.md) | Encje, enumy, relacje, JSONB — szybka referencja            |
| [DATA_FLOWS.md](../DATA_FLOWS.md)     | Kluczowe flow biznesowe z diagramami                        |
| [lessons.md](../lessons.md)           | Dziennik wniosków z pracy AI                                |
| [specs/](../specs/README.md)          | Specyfikacje modułów (aktualny indeks w README)             |

## Integracja z Cursor

Skille projektowe sa udostepnione Cursorowi przez `.cursor/skills/` jako projektowy punkt odkrywania.
Canonical source pozostaje w `.ai/skills/`, a workflow agentow jest spinany przez `AGENTS.md` oraz `.cursor/rules/*.mdc`.

### Source of truth

- Edytuj skille tylko w `.ai/skills/`.
- Trzymaj listę skilli w `.ai/skills/manifest.json` (tier `core` i `process`).
- Frontmatter każdego `SKILL.md` musi mieć `name` i auto-trigger `description` (PL+EN).
- Uruchamiaj `npm run skills:lint` aby wykryć dryf manifestu i brakujące frontmatter.
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
