# Resumowalne runy (`.ai/runs`)

Ten katalog trzyma jeden plik stanu na zadanie. Nie duplikuj specu ani historii czatu.

## Konwencja nazw

- `YYYY-MM-DD-<slug>.md`

## Format

Użyj [docs/architecture/agent-run-template.md](../../docs/architecture/agent-run-template.md).
Wymagane bloki: status runu, upoważnienie, baseline, Progress, Decyzje, Dowody, Handoff.

Nie migruj automatycznie starszych runów. Przy wznowieniu uzupełnij brakujący
baseline po odczycie Gita.

## Wznowienie

Skill `continue-run` najpierw porównuje repo, branch, HEAD i dirty diff z zapisem.
Nie wznawia od pierwszego niezaznaczonego checkboxa, dopóki kandydat się zgadza.

Status runu: `working` | `blocked` | `ready-for-review` | `done`.
`done` nie oznacza commita, merge ani wdrożenia.
