# Resumowalne runy (.ai/runs)

Ten katalog trzyma plany runów, które można wznowić po przerwaniu pracy.

## Konwencja nazw

- `YYYY-MM-DD-<slug>.md`

## Wymagany format

Każdy run MUSI zawierać:

1. `## Context`
2. `## Goal`
3. `## Plan`
4. `## Progress` (parsowalna checklista)
5. `## Validation`
6. `## Notes`

## Format sekcji Progress

Używaj dokładnie:

- `- [ ] 1.1 opis kroku`
- `- [x] 1.1 opis kroku (commit: <sha>)`

`continue-run` wznawia od pierwszego niezaznaczonego punktu.
