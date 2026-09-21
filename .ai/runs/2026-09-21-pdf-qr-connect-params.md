# PDF QR: tylko connect URL z trzema id

- Issue / spec: [fiziyo-admin-portal#83](https://github.com/Prezentytu/fiziyo-admin-portal/pull/83); analiza `.ai/analysis/2026-09-19-k01-pdf-qr.md`
- Owning repo: fiziyo-admin-portal
- Status runu: done (kandydat na #83; merge zablokowany do dowodu `/connect` + landing)

- Upoważnienie: Adam (czat 2026-09-21) — kontynuacja draft PR #83; bez landing, bez auth, bez deployu, bez nowych botów
- Writer: cloud agent
- Dozwolone pliki: `src/lib/patientJoinUrl.ts`, `src/lib/__tests__/patientJoinUrl.test.ts`, `src/features/exercise-sets/GeneratePDFDialog.tsx`, `src/features/exercise-sets/GeneratePDFDialog.test.tsx`, `src/features/assignment/AssignmentSuccessDialog.tsx`, `src/features/assignment/AssignmentSuccessDialog.test.tsx`, `src/features/patients/PatientQRCodeDialog.tsx`, `src/features/patients/PatientQRCodeDialog.test.tsx`, `src/components/finances/PatientInviteDialog.tsx`, `src/components/finances/PatientInviteDialog.test.tsx`, `src/app/(dashboard)/patients/[id]/page.tsx`, `docs/testing/data-testid-map.md`, `.ai/lessons.md`, `.ai/runs/2026-09-21-pdf-qr-connect-params.md`
- Wykluczenia: GraphQL, auth, landing, fizjo-app, zmiana kontraktu token vs connect, merge, PROD, nowe PR-y/boty
- Acceptance: connect QR koduje `https://fiziyo.pl/start?patient=&org=&therapist=` albo pokazuje unavailable (nie spinner); test UI ładuje payload; patient/org w URL nie jest autoryzacją

## Repo i baseline

- Repo / checkout / branch / HEAD: fiziyo-admin-portal / `cursor/k01-pdf-qr-a18f` / `e9ae75041315ab6d4835d47e0810af3689ec10e0` przed poprawką spinnera
- Instrukcje: `AGENTS.md`, `src/features/assignment/AGENTS.md`, `src/features/patients/AGENTS.md`, `src/features/exercise-sets/AGENTS.md`, `.ai/skills/check-and-commit`, `.ai/skills/smart-test`
- Zastane zmiany: czysty checkout gałęzi #83 po helperze PDF
- Wymagany zakres i kontrole: vitest dialogów QR; potem `npm run validate` raz na commicie
- Dostępność: available

## Progress

- [x] Wymagaj therapist w `buildPatientConnectUrl`
- [x] GeneratePDFDialog nie koduje gołego `/start`
- [x] Caller karty pacjenta przekazuje `patient.id` i `therapistId`
- [x] Testy helpera i GeneratePDFDialog
- [x] `npm run validate` na `732c103` — 130 files / 650 tests, build OK
- [x] AssignmentSuccessDialog / PatientQRCodeDialog: unavailable zamiast spinnera
- [x] Testy payloadu tych dialogów
- [x] `npm run validate` na `873bf3b` — 132 files / 654 tests, build OK

## Decyzje

- Connect QR wymaga trzech id, bo `fizjo-app` `parseConnectUrl` odrzuca niepełny link. Token invite bez zmian.
- P1 HTTPS `/start` 404 i parse `fiziyo://` zostają poza tym PR (landing + mobile). Nie wracamy do `fiziyo://` w QR.
- Landing i test `/connect` poza tym runem.

## Dowody

- Kandydat: fiziyo-admin-portal `cursor/k01-pdf-qr-a18f` `873bf3b48768019e438fb47142be075f8dc3218e`
- Kontrola: 2026-09-21 `npm run validate` exit 0 na `873bf3b`; vitest 654 passed; next build Turbopack compiled

## Handoff

- Następny krok: Adam zleca test `fiziyo://connect` na DEV (fizjo-app); landing tylko jeśli connect działa
- Blokady: brak dowodu, że pacjent przechodzi `/connect`; landing nie ruszany
- BOARD: K01-PDF-QR | fiziyo-admin-portal | PDF/dialog QR tylko z patient+org+therapist, bez fałszywego spinnera
