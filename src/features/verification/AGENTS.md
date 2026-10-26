# AGENTS.md — Verification

## Zakres

Moduł obsługuje dwa niezależne tory:

- **Global verification** (rola systemowa `ContentManager`)
- **Organization verification** (rola organizacyjna `Owner/Admin`)

## Zasady implementacyjne

1. **Additive-first**: nie zmieniaj semantyki globalnego flow przy zmianach organizacyjnych.
2. **Status split**:
   - global: `status` / `ContentStatus`
   - organization: `organizationVerificationStatus`
3. **RBAC split**:
   - global queue/detal tylko dla ról systemowych
   - organization queue/detal tylko dla `canManageOrganization`
4. **Gate-aware UX**: jeśli `requireOrganizationVerification=true`, UI assignment/exercises musi respektować blokady backendu.

## Kluczowe ścieżki

- Lista global: `src/app/(dashboard)/verification/page.tsx`
- Detal global: `src/app/(dashboard)/verification/[id]/page.tsx` → `VerificationWorkspace.tsx` + `stages/` (5 etapów, SPEC-030)
- Lista org: `src/app/(dashboard)/organization/verification/page.tsx`
- Detal org: `src/app/(dashboard)/organization/verification/[id]/page.tsx`
- Shared UI: `src/features/verification/VerificationStatsCards.tsx`, `VerificationTaskCard.tsx`
- Utils: `src/features/verification/utils/`

## GraphQL contracts

- Query global: `GET_VERIFICATION_QUEUE_PAGE_QUERY`, `GET_VERIFICATION_QUEUE_NAVIGATOR_QUERY`, `GET_VERIFICATION_STATS_QUERY`
- Query org: `GET_ORGANIZATION_VERIFICATION_STATS_QUERY`, `GET_ORGANIZATION_VERIFICATION_QUEUE_PAGE_QUERY`, `GET_ORGANIZATION_VERIFICATION_QUEUE_NAVIGATOR_QUERY`
- Mutacje org: `SUBMIT_FOR_ORGANIZATION_REVIEW_MUTATION`, `APPROVE_ORGANIZATION_EXERCISE_MUTATION`, `REQUEST_ORGANIZATION_EXERCISE_CHANGES_MUTATION`, `ARCHIVE_ORGANIZATION_EXERCISE_MUTATION`

## Weryfikacja globalna: etapy (SPEC-030)

- Ocena parametrów tylko w `utils/parameterRules.ts` (limity, typowe zakresy, czas całego ćwiczenia); nie licz progów w komponentach.
- Publikacja tylko, gdy `computeVerificationStages(...).canPublish`; ekran globalny nie ma „Odrzuć” (wyjścia: publikacja, odłożenie, duplikat).
- `patient.step_images` i `patient.cue_phases` to addytywne klucze enrichment v3; po usunięciu kroku/wskazówki przesuwaj indeksy helperami z `utils/stepMedia.ts`.
- Copy bez słowa „kliniczny”; pole `clinicalDescription` = „Opis dla fizjoterapeuty”.

## Test checklist

- State machine transitions (org i global) mają pokrycie testami utili.
- Routing list/detail zachowuje query params paginacji.
- RBAC odcina nieuprawnione wejście do route-level pages.
