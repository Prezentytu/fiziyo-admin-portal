---
name: spec-writing
description: Tworzenie i aktualizacja specyfikacji w .ai/specs w modelu spec-first. Użyj gdy użytkownik prosi - napisz spec, utwórz specyfikację, udokumentuj nową funkcjonalność, zaktualizuj SPEC po zmianach, opisz architekturę przed kodowaniem, dodaj changelog do specyfikacji. EN triggers - create specification, update spec, architecture proposal, feature design doc. Wynik to plik SPEC z architektura, kontraktami GraphQL, ryzykami, planem testow i wpisem w indeksie README.
---

# Skill: Pisanie specyfikacji FiziYo

## Opis

Użyj tego skilla gdy tworzysz lub aktualizujesz specyfikacje w `.ai/specs/`. Specyfikacje są źródłem prawdy dla architektury i decyzji projektowych.

## Kiedy używać

- Implementujesz nową funkcjonalność (3+ kroki, decyzje architektoniczne)
- Nie ma jeszcze specyfikacji dla modułu
- Aktualizujesz istniejącą specyfikację po zmianach
- Planujesz refaktor z wpływem na wiele plików

## Workflow

### 1. Sprawdź istniejące specyfikacje

```
ls .ai/specs/
```

Szukaj plików `SPEC-*-{nazwa}.md`. Przeczytaj [.ai/specs/README.md](../../specs/README.md) dla indeksu.

### 2. Określ numer kolejny

Najwyższy numer w README + 1. Format: `SPEC-{003}-{YYYY-MM-DD}-{tytul-kebab-case}.md`

### 3. Utwórz plik specyfikacji

Użyj szablonu poniżej. Wypełnij wszystkie sekcje. Zacznij od frontmattera (`spec`, `repo`, `issues`, `prs: []`, `board`) — patrz `.ai/specs/README.md` „Metadane i dowody”. Jeśli spec wynika z issue (`from-przemek`, `from-sync`), wpisz numer w `issues` i cytat zgłoszenia ≤25 słów w celu biznesowym. Nie wklejaj kodu poza SDL kontraktu; załączniki jako snapshot w `.ai/specs/assets/SPEC-0xx/`.

### 3a. Spec z issue `from-przemek` / `from-sync` / `feature`

Przeczytaj issue i tylko wskazany fragment notatki (w chmurze masz wyłącznie treść issue — nie proś o transkrypt). Wynik to `draft` z sekcją **Pytania otwarte** i sekcją **Wpływ** (ile minut/kliknięć oszczędza fizjoterapeucie; czy podnosi regularność ćwiczeń pacjenta — miary z `.ai/VISION.md`). Budowa jest decyzją Adama — nie przechodź do implementacji w tym samym zleceniu.

### 4. Zaktualizuj indeks

Dodaj wiersz do tabeli w `.ai/specs/README.md`.

### 5. Po implementacji — aktualizuj changelog

```markdown
## Changelog

### YYYY-MM-DD

- Opis zmian
```

### 6. Uzupełnij sekcję ryzyk i testów integracyjnych

- Dodaj **Risk Assessment** (scenariusze awarii, wplyw, mitygacje).
- Dodaj **Integration Test Coverage** (minimum: happy path + edge case + regresja krytyczna).
- Dla zmian API dopisz kontrakty GraphQL i scenariusze walidacji bledow.

## Szablon specyfikacji

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

{Dlaczego ta funkcjonalność istnieje — problem użytkownika, wartość biznesowa; cytat issue ≤25 słów, jeśli jest}

## Architektura

{Jak jest zbudowana — diagram, flow danych, komponenty}

{Diagram mermaid jeśli pomocny}

## UI/UX Wireframes

{Opis przeplywu ekranow, sekcji i kluczowych interakcji; opcjonalnie szkic w formie listy lub mermaid}

## Interfejsy

### GraphQL Queries/Mutations

{Definicje API — nazwy, parametry, typy zwracane}

### GraphQL Contracts

{Kontrakt danych: pola wymagane, pola opcjonalne, kompatybilnosc wsteczna, deprecacje}

### Komponenty

| Komponent | Lokalizacja        | Opis |
| --------- | ------------------ | ---- |
| ...       | src/components/... | ...  |

## Data-testid

{Lista identyfikatorów dla testów E2E — format: [moduł]-[komponent]-[element]}

## Risk Assessment

| Ryzyko | Wplyw | Mitigacja |
| ------ | ----- | --------- |
| ...    | ...   | ...       |

## Integration Test Coverage

| Scenariusz         | Typ testu    | Priorytet |
| ------------------ | ------------ | --------- |
| Happy path         | Integracyjny | High      |
| Edge case          | Integracyjny | Medium    |
| Regresja krytyczna | Integracyjny | High      |

## Changelog

### YYYY-MM-DD

- Utworzenie specyfikacji
```

## Zasady

- **Spec-first** — specyfikacja PRZED implementacją
- **Dokumentuj decyzje** — dlaczego, nie tylko co
- **Nie dla trywialnych zmian** — typo fix, drobny refactor nie wymaga SPEC
- **Nie usuwaj** — oznacz jako "Deprecated" w statusie zamiast usuwać
- **Risk-first** — przy zmianach wielowarstwowych zawsze opisz ryzyka i plan rollback
- **Test-first coverage** — scenariusze integracyjne wpisz do spec PRZED kodowaniem

## Przykłady

- [SPEC-001 Assignment Wizard](../../specs/SPEC-001-2026-02-04-assignment-wizard.md)
- [SPEC-002 Billing Widget](../../specs/SPEC-002-2026-02-04-billing-widget.md)
