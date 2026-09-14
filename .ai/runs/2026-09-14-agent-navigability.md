# Repo gotowe pod zespół botów

- Issue / spec: `.ai/specs/SPEC-019-2026-06-12-second-gen-skills-open-mercato.md`
- Owning repo: fiziyo-admin-portal
- Status runu: done
- Upoważnienie: polecenie Adama z 2026-09-14 — wdrożyć plan `chore/agent-navigability`,
  w tym commity i push brancha; bez tworzenia PR.
- Writer: koordynator bieżącego zadania.
- Dozwolone pliki: warstwa agentowa, skrypty, guide'y AGENTS, lekcje, SPEC frontmatter,
  JoinOrganizationDialog, otypowanie `any` w pięciu plikach, typy GraphQL.
- Wykluczenia: rozbicie god-files, codegen GraphQL, Prettier na TS, agent-ops,
  sekrety, merge, produkcja.
- Acceptance: branch `chore/agent-navigability` z commitami C1–C6 i F1–F9;
  `agent:check`, `agent:test` i `validate` przechodzą.

## Repo i baseline

- Portal: `fiziyo-admin-portal`, branch `chore/agent-navigability` od `origin/main` `6576c4f`.
- Instrukcje: root AGENTS, cloud-agent-policy, skill create-agents-md.
- Zastane zmiany: zapisane w C1–C6; MediaGallery osobno.
- Wymagany zakres i kontrole: `skills:*`, `agent:check`, `agent:test`, eslint scripts, `validate`.
- Dostępność: available.

## Progress

- [x] C1–C6 — dirty tree w atomowych commitach
- [x] F1 — kotwice polityki, hook, automacje 06/07
- [x] F2 — agent:check/test w CI
- [x] F3 — untrack kopii `.cursor/skills`
- [x] F4 — BUGBOT i jeden głos review
- [x] F5 — jeden format runu
- [x] F6 — frontmatter i indeks speców
- [x] F7 — lessons, AGENTS, README, STRUCTURE
- [x] F8 — guide'y organization/finances/graphql
- [x] F9 — useLazyQuery i otypowanie `any`
- [x] Walidacja, reviewer, push

## Decyzje

- Bez drugiej tablicy i bez `agent:export`. Manifest portalu to `.ai/agent-adapter.json`.
- Hook klienta nie zastępuje agent-ops.

## Dowody

- Kandydat: `e8a8816` + follow-up testid QR na `SelectTrigger`.
- Kontrola: `skills:lint/sync/check` OK; `agent:check` OK; `agent:test` 47 pass;
  `eslint scripts --max-warnings 0` OK; `npm run validate` OK (lint, testids,
  tsc, 582 testy, build).
- Reviewer: PASS `e8a8816a6cac0afaac9d2dce20e441b318c2cac5` (subagent
  `98971e9a-20a0-4607-ba71-7d419be8f0d3`).

## Handoff

- Następny krok: człowiek otwiera draft PR; agent nie tworzy PR.
- Blokady: brak.
- Transfer kodu: branch `chore/agent-navigability`.
- BOARD: SPEC-001 | fiziyo-admin-portal | `.ai/runs/2026-09-14-agent-navigability.md`
