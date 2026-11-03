# AGENTS.md — Finanse i billing

## Zakres

`/finances` pokazuje, ile gabinet płaci FiziYo w tym miesiącu (`src/components/billing/`,
SPEC-002): należność, tabela terapeutów, dane do faktury. Stripe nie działa u żadnego
gabinetu; rozliczamy się zwykłą fakturą poza aplikacją, więc ta strona jest zawsze w menu
konta Owner/Admin. Użyj `finances/` do stron Stripe w `(dashboard)/finances/(stripe)`
(`/finances/earnings`, `/finances/payouts`: portfel, zaproszenia Premium, wykresy, wypłaty);
ich layout przekierowuje na `/finances`, dopóki `STRIPE_CONNECT_ROLLOUT` jest wyłączone.
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
- Plan gabinetu pokazują `BillingHeroCard` i `BillingStatusBar` z `billing/`; nie klonuj ich w `finances/`.

## Gdy dodajesz plik

1. Strona Stripe w `(dashboard)/finances/(stripe)` → komponent w `finances/`; rozliczenie z FiziYo → `billing/`.
2. Widget na dashboardzie / settings Owner → `billing/`.
3. Zmiana kontraktu rozliczeń = Ask First (cross-repo).

## Referencje

- SPEC-002, SPEC-006
- `docs/billing-widget-readme.md`
