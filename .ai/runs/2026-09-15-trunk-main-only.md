# Trunk tylko `main` — leftover `dev` poza pociągiem

- Issue / spec: SPEC-026 (changelog), D-09-06-b
- Owning repo: fiziyo-admin-portal
- Status runu: verified-local
- Upoważnienie: „wywaliłem dev z procesu — napraw to na stałe”
- Writer: cursor-agent
- Dozwolone pliki: CI/E2E trigger, vercel.json, agent:check, docs release/E2E/CONTRIBUTING, SPEC-026, lessons, adapter
- Wykluczenia: sekrety, usuwanie remote `dev`, Promote, zmiana Clerk/PROD
- Acceptance: `agent:check` + `dispatch.test` + `check-trunk-main` blokują powrót gałęzi `dev`; DEV certyfikat tylko z dedykowanego URL i SHA na `main`

## Progress

- [x] Lock w repo (vercel.json, trigger, pin-devportal, docs, agent:check)
- [x] Niezależny check (`check-trunk-main`, `pin-devportal-domain`, vitest dispatch 9/9, `agent:check`)
- [ ] Pierwszy zielony pin na żywym Vercel (sekret `VERCEL_TOKEN`)

## BOARD

Proponowana linia PROVEN: trunk lock portalu — leftover `dev` nie wdraża DEV.
