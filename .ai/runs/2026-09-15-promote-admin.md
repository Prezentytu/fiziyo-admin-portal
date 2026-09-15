# Promote admin z repo, nie z UI Vercel

- Issue / spec: SPEC-028 (`in-progress` — live Vercel unverified)
- Owning repo: fiziyo-admin-portal
- Status runu: ready-for-review
- Upoważnienie: prośba o Promote w repo; bez uruchomienia PROD w tej sesji
- Writer: cursor-agent
- Dozwolone pliki: spec 028, `promote.yml`, `scripts/promote-admin.*`, docs release/E2E/README, adapter, lessons, BOARD
- Wykluczenia: sekrety, prawdziwy Promote, zmiana ustawień Vercel, rollback workflow
- Acceptance: workflow tylko `workflow_dispatch` na main; Preview nie aliasuje; `agent:test` zielone

## Progress

- [x] Spec + planner (rebuild vs alias)
- [x] Workflow + runbook
- [x] `node --test scripts/promote-admin.test.mjs` + `agent:check`
- [ ] Sekrety Vercel i pierwszy ręczny run (Adam)

## BOARD

- SPEC-028 | fiziyo-admin-portal | sekrety Vercel + pierwszy ręczny run
