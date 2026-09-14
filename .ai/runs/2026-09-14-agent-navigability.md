# Repo gotowe pod zespół botów

- Issue / spec: `.ai/specs/SPEC-019-2026-06-12-second-gen-skills-open-mercato.md`
- Owning repo: fiziyo-admin-portal
- Status runu: working
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
- [ ] F5 — jeden format runu
- [ ] F6 — frontmatter i indeks speców
- [ ] F7 — lessons, AGENTS, README, STRUCTURE
- [ ] F8 — guide'y organization/finances/graphql
- [ ] F9 — useLazyQuery i otypowanie `any`
- [ ] Walidacja, reviewer, push

## Decyzje

- Bez drugiej tablicy i bez `agent:export`. Manifest portalu to `.ai/agent-adapter.json`.
- Hook klienta nie zastępuje agent-ops.

## Dowody

- Kandydat: uzupełniane po ostatniej kontroli.
- Kontrola: po F9 `npm run agent:check`, `npm run agent:test`, `npm run validate`.
- Reviewer: subagent przed pushem.

## Handoff

- Następny krok: dokończyć F5–F9 i wypchnąć branch.
- Blokady: brak.
- Transfer kodu: ten sam checkout.
- BOARD: SPEC-001 | fiziyo-admin-portal | `.ai/runs/2026-09-14-agent-navigability.md`
