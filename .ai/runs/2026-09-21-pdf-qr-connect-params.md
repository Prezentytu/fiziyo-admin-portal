# PDF QR: tylko connect URL z trzema id

- Issue / spec: [fiziyo-admin-portal#83](https://github.com/Prezentytu/fiziyo-admin-portal/pull/83); analiza `.ai/analysis/2026-09-19-k01-pdf-qr.md`
- Owning repo: fiziyo-admin-portal
- Status runu: done (kandydat na #83; merge zablokowany do dowodu `/connect` + landing)

- Upoważnienie: Adam (czat 2026-09-21) — kontynuacja draft PR #83; bez landing, bez auth, bez deployu
- Writer: cloud agent
- Dozwolone pliki: `src/lib/patientJoinUrl.ts`, `src/lib/__tests__/patientJoinUrl.test.ts`, `src/features/exercise-sets/GeneratePDFDialog.tsx`, `src/features/exercise-sets/GeneratePDFDialog.test.tsx`, `src/app/(dashboard)/patients/[id]/page.tsx`, `docs/testing/data-testid-map.md`, `.ai/lessons.md`, `.ai/runs/2026-09-21-pdf-qr-connect-params.md`
- Wykluczenia: GraphQL, auth, landing, fizjo-app, token invite, merge, PROD
- Acceptance: PDF QR koduje `https://fiziyo.pl/start?patient=&org=&therapist=` albo nie ma QR; test UI ładuje payload; patient/org w URL nie jest autoryzacją

## Repo i baseline

- Repo / checkout / branch / HEAD: fiziyo-admin-portal / `cursor/k01-pdf-qr-a18f` / `400b353430d4c232e9741a4d24828cdf56988aa6` przed tą poprawką
- Instrukcje: `AGENTS.md`, `src/features/patients/AGENTS.md`, `src/features/exercise-sets/AGENTS.md`, `.ai/skills/check-and-commit`, `.ai/skills/smart-test`
- Zastane zmiany: czysty checkout gałęzi #83
- Wymagany zakres i kontrole: vitest helper + GeneratePDFDialog; potem lint/type-check/testids na zmienionych plikach; `npm run validate` raz na commicie
- Dostępność: available

## Progress

- [x] Wymagaj therapist w `buildPatientConnectUrl`
- [x] GeneratePDFDialog nie koduje gołego `/start`
- [x] Caller karty pacjenta przekazuje `patient.id` i `therapistId`
- [x] Testy helpera i GeneratePDFDialog (15 passed)
- [x] `npm run validate` na `732c103` — 130 files / 650 tests, build OK

## Decyzje

- Connect QR wymaga trzech id, bo `fizjo-app` `parseConnectUrl` odrzuca niepełny link. Token invite bez zmian.
- Landing i test `/connect` poza tym runem.

- Kandydat: fiziyo-admin-portal `cursor/k01-pdf-qr-a18f` `732c103848e506f884c2c0552b119d521e045bd2` (czyste drzewo po commicie)
- Kontrola: 2026-09-21 `npm run validate` exit 0; vitest 650 passed; next build Turbopack compiled
