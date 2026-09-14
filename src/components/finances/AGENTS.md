# AGENTS.md — Finanse i billing

## Zakres

Użyj `finances/` do stron `(dashboard)/finances` (portfel, Stripe, zaproszenia
pacjentów, wykresy). Użyj `src/components/billing/` do widgetu planu gabinetu
(SPEC-002): pasek statusu, KPI, faktury, tabela terapeutów.
Nie mieszaj tych dwóch drzew w jednym commicie bez powodu.

## MUST

- Billing widget i dane firmy tylko Owner/Admin.
- Nie pokazuj kwot, kodów rabatowych ani danych Stripe w logach i issue.
- Token kampanii / Stripe Connect nie daje prawa do merge ani PROD.
- Prefiks testid: `finance-` / `finances-` na stronach, `billing-` na widgecie.
- Theme-safe tokeny; stany Stripe jako badge, nie hardcoded `zinc`.
- Dialog zaproszenia pacjenta: `Escape`, `Cmd/Ctrl+Enter`, `justify-between`.

## Wzorce

- Strony finansów importują baryłki z obu katalogów. Sprawdź konsumenta
  przez `rg`, nie ufaj `index.ts`.
- `PatientInviteDialog` — jedyny dialog zaproszenia premium z tego folderu.
- `BillingSummaryWidget` — jedyny widget planu; nie klonuj go w `finances/`.

## Gdy dodajesz plik

1. Strona `(dashboard)/finances` → komponent w `finances/`.
2. Widget na dashboardzie / settings Owner → `billing/`.
3. Zmiana kontraktu rozliczeń = Ask First (cross-repo).

## Referencje

- SPEC-002, SPEC-006
- `docs/billing-widget-readme.md`
