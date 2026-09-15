# Release admin — DEV automatycznie, PROD z Actions

`main` jest trunkiem. Merge wdraża tylko DEV. Produkcja to ręczny workflow
w tym repo, nie klik w Vercel.

| Środowisko | URL | Skąd |
| ---------- | --- | ---- |
| Preview PR | `*.vercel.app` | każdy PR |
| DEV | `https://devportal.fiziyo.pl` | merge do `main` |
| PROD | `https://portal.fiziyo.pl` | Actions → **Promote admin** |

Preview nie jest shared DEV. `NEXT_PUBLIC_*` są utrwalone w buildzie — Promote
**nigdy** nie aliasuje deploymentu Preview (Clerk/API DEV) na domenę produkcji.
Preview zawsze dostaje nowy build `target: production`.

Gałąź `dev` nie jest w pociągu (D-09-06-b). `vercel.json` wyłącza jej deploye.
Workflow `pin-devportal.yml` przy `deployment_status` przestawia alias
`devportal.fiziyo.pl` na Preview z `main` i nie aliasuje leftover `dev`.
`e2e-trigger` odmawia certyfikatu, gdy live SHA nie należy do `main`.
Wymaga tych samych sekretów Vercel co Promote (`VERCEL_TOKEN`, `VERCEL_PROJECT_ID`).

## DEV

1. Zmerguj PR do `main`.
2. Poczekaj na Vercel i nagłówki `/sign-in`: `x-fiziyo-admin-sha` = merge SHA,
   `x-fiziyo-api-origin` = `https://fizjo-app-api.azurewebsites.net`.
3. `e2e-trigger` odpalą `E2E Dev Full` po zgodnej tożsamości.

## PROD

1. GitHub → Actions → **Promote admin** → Branch: **main**.
2. `sha` puste = czubek `main`, albo pełne 40 znaków już widocznych na DEV.
3. Opcjonalnie `deployment_id` (`dpl_…`) **już zbudowanej produkcji** tego SHA
   — wtedy tylko alias, bez przebudowy.
4. `override_reason` (≥8 znaków) pomija wyłącznie kontrolę live DEV; nie omija
   SHA na main ani tożsamości po Promote na `portal.fiziyo.pl`.

Po sukcesie `e2e-trigger` powinien odpalić `prod-safe` na Production.

### Sekrety (nie commituj)

Repo albo GitHub Environment `production`:

- `VERCEL_TOKEN` — token z prawem deploy/promote projektu
- `VERCEL_PROJECT_ID` — `prj_…`
- `VERCEL_TEAM_ID` — opcjonalnie `team_…`

Zmienna repo (opcjonalna): `VERCEL_PROJECT_NAME` (domyślnie `fiziyo-admin-portal`).

Na GitHub Free dla prywatnego repo Environment nie daje twardej ochrony.
Uruchomienie Promote to decyzja Adama. Agenty nie wołają tego workflow
(`scripts/agent-guard.mjs`).

## Rollback

W tym etapie nie ma osobnego `Rollback admin`. Cofnięcie: Promote admin z
`deployment_id` poprzedniego **produkcyjnego** `dpl_…` tego samego projektu.

## Kolejność z API

Kanoniczny pociąg: `fizjo-app/docs/release-train.md`. Panel po Promote backend,
zanim `prod-safe`. Ten dokument nie wdraża API ani mobile.
