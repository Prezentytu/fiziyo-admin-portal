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
