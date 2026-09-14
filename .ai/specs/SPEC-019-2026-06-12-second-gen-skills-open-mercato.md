---
spec: SPEC-019
repo: fiziyo-admin-portal
issues: []
prs: []
board: SPEC-001
---

# Second Gen Skills Open-Mercato

## Cel biznesowy

Podnieść ekosystem skilli FiziYo z poziomu dokumentacyjnego na wykonywalny model open-mercato:

- skille mają wykonywać pracę i raportować mierzalny efekt,
- agent ma trafniej dobierać skill po trigger words,
- długie runy mają być resumowalne,
- obszary krytyczne (UI zdrowie i security) mają formalne raporty.

## Architektura

Nowa warstwa skilli opiera się na czterech filarach:

1. **Execution skills**: `ui-guardian`, `sec-report`, `qa-scenarios`, `auto-implement`.
2. **Routing skills**: `help`, `continue-run`, `skill-creator`.
3. **Governance**: `.ai/skills/manifest.json` + `skills:lint` + walidacja frontmatter.
4. **Artifacts**: raporty w `.ai/reports/`, analizy w `.ai/analysis/`, runy w `.ai/runs/`.

## UI/UX Wireframes

Nie dotyczy (zmiana procesowo-infrastrukturalna dla agentów i repo governance).

## Interfejsy

### GraphQL Queries/Mutations

Brak zmian kontraktów GraphQL.

### GraphQL Contracts

Brak zmian kontraktowych.

### Komponenty

| Komponent         | Lokalizacja                      | Opis                                          |
| ----------------- | -------------------------------- | --------------------------------------------- |
| Skills manifest   | `.ai/skills/manifest.json`       | Źródło prawdy tierów i listy skilli           |
| Skills sync/lint  | `scripts/sync-cursor-skills.mjs` | Walidacja frontmatter + dryf manifestu + sync |
| UI health scanner | `scripts/ui-health-check.sh`     | Metryki UI i raport delta                     |
| CI gate           | `.github/workflows/ci.yml`       | Wymusza `skills:lint` na PR                   |

## Data-testid

Brak nowych elementów UI.

## Risk Assessment

| Ryzyko                                     | Wplyw                                          | Mitigacja                                             |
| ------------------------------------------ | ---------------------------------------------- | ----------------------------------------------------- |
| Dryf między katalogami skilli a manifestem | Agent używa niepełnych instrukcji              | `skills:lint` failuje CI przy dryfie                  |
| Zbyt ogólne opisy skilli                   | Słaby auto-trigger i błędny dobór skilla       | Wymóg trigger words PL+EN w `description`             |
| Brak egzekwowania security review auth     | Ryzyko regresji dostępu/PII                    | Reguła w `AGENTS.md` + skill `sec-report`             |
| Brak widoczności trendu jakości UI         | Powrót hardcoded kolorów i regresje theme-safe | `ui-health-check.sh` + raporty delta w `.ai/reports/` |

## Integration Test Coverage

| Scenariusz                                              | Typ testu     | Priorytet |
| ------------------------------------------------------- | ------------- | --------- |
| `npm run skills:lint` przechodzi dla spójnego manifestu | Tooling/CI    | High      |
| `npm run skills:sync` kopiuje wszystkie skill dirs      | Tooling/CI    | High      |
| `bash scripts/ui-health-check.sh` tworzy raport i deltę | Tooling smoke | Medium    |

## Verification plan

- Uruchomić `npm run skills:lint`.
- Uruchomić `npm run skills:sync`.
- Uruchomić `bash scripts/ui-health-check.sh`.
- Uruchomić `npm run lint && npm run test:run`.

## Changelog

### 2026-06-12

- Utworzenie specyfikacji drugiej generacji skilli.
- Dodanie manifestu skilli, linta i rozszerzenia sync skilli.
- Dodanie skilli: `ui-guardian`, `skill-creator`, `auto-implement`, `continue-run`, `help`, `sec-report`, `qa-scenarios`.
- Dodanie katalogów artefaktów `.ai/runs/`, `.ai/reports/`, `.ai/analysis/`.

### 2026-09-10 — usprawnienie workflow na podstawie Limen (bez commita)

Zakres upoważniony w bieżącym zadaniu: ogólne usprawnienia pracy agentów cross-repo
w portalu, bez commitowania. Zachowujemy wcześniejsze zmiany lokalne, domenowe
AGENTS, źródłową VISION/BOARD i istniejący system speców. Nie zmieniamy API,
auth, produktu, pipeline release ani globalnej konfiguracji narzędzi.

## Adaptacja Limen — źródła i decyzje

Odczyt 2026-09-10, repo [overment/limen](https://github.com/overment/limen),
snapshot `2807126f1eecd9d581b805e977512a05360610bf`. Analiza kodu i ostatnich
25 commitów (shallow clone); nie uruchamiano kodu referencyjnego.

Struktura rozdziela `src/commands` (narzędzie), `hook` (integracja klienta),
`templates` (role i instrukcje), `spec/features` (zadania, review, outcomes),
`spec/build.md` (priorytety) i lokalne `.limen/jobs` (stan procesu i artefakty).
Przydatna jest ta separacja odpowiedzialności, nie identyczne nazwy katalogów.

- [Role i koordynacja](https://github.com/overment/limen/blob/2807126f1eecd9d581b805e977512a05360610bf/templates/agents.md):
  koordynator zawęża zadanie, worker oddaje kandydata, reviewer wskazuje konkretne
  uwagi. U nas: runbook i obecne skille, jeden writer runu, oddzielny review.
- [Reviewer](https://github.com/overment/limen/blob/2807126f1eecd9d581b805e977512a05360610bf/templates/reviewer.md):
  review przypięty do kandydata oraz wcześniejszych uwag. U nas dodatkowo dirty
  fingerprint i nowe pliki, ponieważ użytkownik pracuje bez commitowania.
- [Workspace](https://github.com/overment/limen/blob/2807126f1eecd9d581b805e977512a05360610bf/templates/spec/workspace.md):
  jedno repo na job, wspólny cel ponad repo. U nas owning repo i osobne dowody
  portalu, mobile/backendu i E2E; jedna źródłowa tablica w mobile.
- [Zapis korekty F707](https://github.com/overment/limen/blob/2807126f1eecd9d581b805e977512a05360610bf/spec/features/done/2026-09/F707-herdr-limen-truthful-status/coordinator-findings-1.md):
  koordynator utrwalił reprodukcję przed poprawką. Historia potwierdza sekwencję
  `bc9476f` implementacja → `0fe00fa` findings → `839db44` poprawka → `2aedf0e`
  handoff → `756c747` merge → `ce2aea5` zapis wyniku. Autor Git to Adam
  Gospodarczyk; samo autorstwo commitów nie identyfikuje wykonującego agenta.

Ograniczenia porównania: aktualny BOARD Limen wskazuje review właściciela zamiast
obowiązkowego osobnego reviewera. Outcome F707 jawnie pozostawia pełną suite
nieukończoną; nie przenosimy tego jako zgody na pomijanie wymaganych kontroli FiziYo.
Dokumentacja workspace nie dowodzi rzeczywistego wdrożenia cross-repo w tym klonie.
Nie instalujemy Limen, nie kopiujemy trybu omijania uprawnień ani automatycznych
commitów, nie tworzymy drugiej kolejki zadań ani nowego orchestratora.

## Zakres wdrożenia 2026-09-10

1. Wspólny [workflow](../../docs/architecture/agent-workflow.md) oraz
   [szablon runu](../../docs/architecture/agent-run-template.md): ownership,
   baseline, handoff, blokady, dowody per repo i kandydat review.
2. Ukierunkowane zmiany AGENTS i skilli: retrieval przez rg, resume po sprawdzeniu
   Git, jawne upoważnienie do commitów, jeden pakiet walidacji bez duplikacji.
3. Naprawa istniejącego `sync-cursor-skills.mjs`: oba lokalne mirrory, preflight
   przed zapisem, bez usuwania, osobna kontrola zgodności `skills:check`.
   `skills:lint` pozostaje source-only, bo kopie nie są wersjonowane w Git.
4. Testy Node na tymczasowych fixture: oba cele, drift, idempotencja, zachowanie
   obcych plików, kolizje, symlinki i niepoprawne nazwy manifestu.

## Verification plan — zakres workflow 2026-09-10

- `npm run skills:test` (regresje synchronizacji, bez sieci).
- `npm run skills:lint`, `npm run skills:sync`, `npm run skills:check`.
- ESLint zmienionych skryptów z `--max-warnings 0`.
- Niezależny review diffa względem zastanych zmian, w tym linków i instrukcji.
- Wyniki i kandydat w `.ai/runs/2026-09-10-limen-admin.md`.
- Bez zmian produktu: testy UI/E2E nie dotyczą tego wycinka; pełne CI nadal wymagane
  przy przyszłym PR. Wykrywanie skilli w klientach i rzeczywisty handoff cross-repo
  wymagają pilota; testy plików nie dowodzą tych zachowań.

Ten plan zastępuje wcześniejszy Verification plan tylko dla opisanego wycinka
workflow; nie oznacza ponownej weryfikacji historycznego skanera UI ani całego SPEC-019.
