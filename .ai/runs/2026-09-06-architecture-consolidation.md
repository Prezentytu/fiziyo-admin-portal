# Konsolidacja architektury portalu

## Context

- Zakres: SPEC-026 — CI, auth, dead code, Apollo, PageShell, IA, perf, RSC, jakość
- Powód: audyt 2026-09-06 (~60 problemów)
- Wejście: plan audyt_i_konsolidacja_portalu + SPEC-026

## Goal

- CI zielone, fail-closed auth, jeden szkielet stron, spójna IA, lżejsze listy, RSC shell

## Plan

1. Faza 0: CI + security + tenant
2. Faza 1: martwy kod + deps + assety
3. Faza 2: Apollo + konteksty + invalidacja
4. Faza 3: Page primitives + stany + a11y/theme/testid
5. Faza 4: IA i copy
6. Faza 5: perf + RSC + rozbicie god-componentów
7. Faza 6: testy, CI, docs

## Progress

- [x] 0.1 SPEC-026 + indeks + run
- [x] 0.2 data-testid 48 + ActivityReport warning
- [x] 0.3 AuthLink/ErrorLink/useLazyQuery/webhook/.env.example
- [x] 0.4 Tenant query patientAssignments
- [x] 1.1 Usunięcie martwego kodu
- [x] 1.2 Deps, placeholder, allowlista, AGENTS
- [x] 2.1 typePolicies + HttpLink + ws dispose
- [x] 2.2 CurrentUserProvider + org z contextu
- [x] 2.3 invalidation + ErrorBoundary + any/logger
- [x] 3.1 PageShell/Header/Hero/StatTiles
- [x] 3.2 ErrorState + dialogi + SearchInput
- [x] 3.3 a11y + theme + testid
- [x] 4.1 navigation.config + copy
- [x] 5.1 fragmenty listowe + virtual + dynamic
- [x] 5.2 RSC shell + rozbicie wizardów + codegen
- [x] 6.1 testy + CI + docs + sec-report

## Validation

- [x] `npm run lint` (0 errors, no-console jako warn)
- [x] `npm run type-check`
- [x] `npm run check:testids` (0 unexpected, allowlista 0)
- [x] `npm run test:run` (118 files / 556 tests)
- [x] `npm run validate` (lint 0 errors, testids 0, tsc, 556 tests, build)

## Notes

- Decyzje: usuwamy martwy chat; SPEC-018 anulowane
- Ryzyka: DialogFooter, cache-and-network, usuwanie plików
- Parser testid: `scripts/lib/read-opening-tag.mjs` — nie ciąć na `=>`
- `getToken()` rethrow HTTP status
- Następne kroki: commity per faza po zielonym validate
