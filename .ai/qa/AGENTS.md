# AGENTS.md — QA Bridge (admin ↔ fiziyo-tests)

Instrukcje dla agentów przy planowaniu i implementacji testów E2E dla admin-portalu.

## Cel

`fiziyo-admin-portal` używa cross-repo E2E z repo `fiziyo-tests` (Playwright). Ten plik opisuje jak mapować zmiany produktu na scenariusze E2E bez zmiany release/deploy flow.

## Aktualny kontrakt E2E

- Projekty Playwright:
  - `smoke-tests` (public/auth/basic smoke)
  - `logged-tests` (scenariusze zalogowane)
- Trigger z admina: `repository_dispatch` (`e2e-dev-run`, `e2e-prod-run`).
- Lokatory preferowane: semantyczne (`getByRole`, `getByLabel`, `getByText`), `data-testid` tylko fallback.

## Luki pokrycia (stan bazowy)

- Assignment Wizard
- Import dokumentów
- Verification
- Billing (poza podstawowym smoke wejścia)

## Always

- Przy zmianach UX/flow w obszarach krytycznych dopisz propozycję scenariusza E2E w opisie PR/specyfikacji.
- Sprawdzaj, czy zmiana nie wymaga aktualizacji istniejących testów `smoke-tests`/`logged-tests`.
- Utrzymuj kompatybilność z aktualnym triggerem cross-repo (bez zmian deploy/release).

## Ask First

- Zanim zmienisz semantykę triggerów `repository_dispatch`.
- Zanim dodasz nowe wymagane status checks lub zmienisz politykę gate'ów release.
- Zanim przełączysz strategię lokatorów na `data-testid`-first.

## Never

- Nigdy nie zakładaj, że E2E jest uruchamiane lokalnie w tym repo.
- Nigdy nie usuwaj istniejących scenariuszy smoke bez replacementu.
- Nigdy nie rozjeżdżaj nazewnictwa scenariuszy z domeną (`assignment`, `import`, `verification`, `billing`).
