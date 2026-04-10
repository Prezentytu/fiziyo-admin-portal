# E2E Cross-Repo Pipeline (fiziyo-admin + fiziyo-tests)

Ten runbook opisuje docelowy model dla `dev`, `preview` i `prod`, tak aby:

- PR byl blokowany przez smoke E2E,
- release na `prod` przechodzil tylko po zielonym full E2E na `dev`,
- preview auth dzialal stabilnie bez oslabiania security produkcji.

## Architektura

- `fiziyo-admin` deployuje na Vercel.
- Po `deployment_status=success` workflow [`e2e-trigger.yml`](../../.github/workflows/e2e-trigger.yml) wysyla `repository_dispatch` do `fiziyo-tests`.
- `fiziyo-tests`:
  - [`e2e-dev.yml`](../../../fiziyo-tests/.github/workflows/e2e-dev.yml) obsluguje `e2e-dev-run` (preview/dev),
  - [`e2e-prod.yml`](../../../fiziyo-tests/.github/workflows/e2e-prod.yml) obsluguje `e2e-prod-run` (production),
  - oba wrappery uruchamiaja wspolny reusable core [`e2e.yml`](../../../fiziyo-tests/.github/workflows/e2e.yml).
- Wynik wraca jako commit status `E2E Tests (Playwright)` do commita w `fiziyo-admin`.

## Docelowy model srodowisk

- `prod app` (`https://portal.fiziyo.pl`) -> `prod Clerk`
- `dev app` (`https://dev.portal.fiziyo.pl`) -> `dev Clerk`
- `preview` (`https://*.vercel.app`) -> `dev Clerk`

Preview nie powinien korzystac z `prod Clerk`.

## Clerk preview redirects - konfiguracja w kodzie

W tym projekcie allowlista redirect origins jest ustawiana przez `ClerkProvider`, nie przez zakladke `Paths` w dashboardzie Clerk.

Plik: [`src/app/layout.tsx`](../../src/app/layout.tsx)

Env odpowiedzialne za konfiguracje:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_DEV_APP_URL`
- `NEXT_PUBLIC_ENABLE_CLERK_PREVIEW_REDIRECTS`

Zasada:

- ustaw `NEXT_PUBLIC_ENABLE_CLERK_PREVIEW_REDIRECTS=true` tylko tam, gdzie aplikacja uzywa `dev Clerk`,
- na produkcji utrzymuj `NEXT_PUBLIC_ENABLE_CLERK_PREVIEW_REDIRECTS=false`.

## Wymagane sekrety i zmienne

### Repo `fiziyo-admin-portal`

Secrets:

- `E2E_DISPATCH_PAT` - token do wysylania dispatch eventow do repo `fiziyo-tests`

Repository variables (opcjonalne):

- `E2E_TESTS_REPO_OWNER` (domyslnie owner biezacego repo)
- `E2E_TESTS_REPO_NAME` (domyslnie `fiziyo-tests`)

### Repo `fiziyo-tests`

Secrets:

- `USER_EMAIL_DEV`
- `USER_PASSWORD_DEV`
- `USER_DISPLAY_NAME_DEV`
- `USER_EMAIL_PROD`
- `USER_PASSWORD_PROD`
- `USER_DISPLAY_NAME_PROD`
- `ADMIN_STATUS_PAT` - token do ustawiania commit statusu w `fiziyo-admin-portal`

## Branch protection (hard gates)

W `fiziyo-admin-portal` ustaw required checks dla `dev` i `main`:

- `CI`
- `E2E Tests (Playwright)`

To jest twarda blokada merge'a na PR.

## Release policy (super-startup mode)

1. PR -> `CI` + Vercel Preview + smoke E2E musza byc zielone.
2. Merge.
3. Deploy na `dev`.
4. Full E2E na `dev` musi byc zielone.
5. Dopiero wtedy promo na `prod`.
6. Po deployu na `prod` odpal smoke sanity check.

`prod smoke` jest sanity checkiem po wdrozeniu, a nie glownym gate'em.

## Dispatch routing

- `Production` -> `event_type=e2e-prod-run`, `project=smoke-tests`
- `Preview` -> `event_type=e2e-dev-run`, `project=smoke-tests`
- pozostale (`Development`) -> `event_type=e2e-dev-run`, `project=all`

## Konfiguracja Vercel - krok po kroku

### Preview environment

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` -> klucz z `dev Clerk`
- `CLERK_SECRET_KEY` -> klucz z `dev Clerk`
- `NEXT_PUBLIC_API_URL` -> dev backend
- `NEXT_PUBLIC_APP_URL=https://portal.fiziyo.pl`
- `NEXT_PUBLIC_DEV_APP_URL=https://dev.portal.fiziyo.pl`
- `NEXT_PUBLIC_ENABLE_CLERK_PREVIEW_REDIRECTS=true`

### Development environment

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` -> `dev Clerk`
- `CLERK_SECRET_KEY` -> `dev Clerk`
- `NEXT_PUBLIC_API_URL` -> dev backend
- `NEXT_PUBLIC_ENABLE_CLERK_PREVIEW_REDIRECTS=true`

### Production environment

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` -> `prod Clerk`
- `CLERK_SECRET_KEY` -> `prod Clerk`
- `NEXT_PUBLIC_API_URL` -> prod backend
- `NEXT_PUBLIC_ENABLE_CLERK_PREVIEW_REDIRECTS=false`

## Runbook onboarding (checklista)

- [ ] Ustaw env vars Vercel dla Preview/Development/Production zgodnie z tym dokumentem
- [ ] Dodaj sekrety w `fiziyo-admin-portal` i `fiziyo-tests`
- [ ] Ustaw branch protection (`CI` + `E2E Tests (Playwright)`) na `dev` i `main`
- [ ] Zweryfikuj pierwszy przeplyw: `PR -> Preview -> Smoke -> Merge -> Dev full E2E -> Prod smoke`
