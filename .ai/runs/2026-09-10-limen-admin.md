# Usprawnienie pracy agentów w portalu na podstawie Limen

- Issue / spec: `.ai/specs/SPEC-019-2026-06-12-second-gen-skills-open-mercato.md`
- Owning repo: fiziyo-admin-portal
- Status runu: done
- Upoważnienie: polecenie Adama z 2026-09-10 — analiza Limen i ogólne poprawki cross-repo w repo adminów, bez commitowania.
- Writer: koordynator bieżącego zadania.
- Zakres: AGENTS, `.ai/docs/agent-rules.md`, `.ai/AI_ENGINEERING.md`, indeks skilli i `.cursor/rules/agentic-engineering.mdc`, workflow i szablon w `docs/architecture`, skille auto-implement/continue-run/implement-spec/code-review/check-and-commit, synchronizator i jego testy, komendy skills w package.json, SPEC-019/indeks, lessons, ten run i generowane kopie skilli.
- Wykluczenia: produkt, MediaGallery, GraphQL/DTO, auth/tenant, release/CI, sekrety, VISION, cudze zmiany; brak commit/push/PR/deploy.
- Acceptance: obie kopie zgodne ze źródłem bez usuwania obcych plików; wykrywanie driftu; wznowienie i handoff z dowodami per repo; przechodzą kontrole zmienionego narzędzia.

## Repo i baseline

- Portal: `/Users/adamjasinski/Documents/repos/fiziyo-admin-portal`, branch `main`, HEAD `bcdfb47380a4d72a875211cb1e103360db9f2827`.
- Zastane tracked zmiany: AGENTS, skille check-and-commit/code-review/spec-writing, specs AGENTS/README, MediaGallery. Zastane untracked: VISION, `.cursor/environment.json`, `.cursor/rules/00-vision-board.mdc`, `docs/architecture/cloud-agent-policy.md`.
- Przed zapisem porównanie hashy pierwotnych plików z `/tmp/fiziyo-admin-agent-improvements/baseline.json`; przy rozbieżności stop, bez nadpisania.
- Mobile: dostępne read-only jako kontekst i źródłowy BOARD. Doctor mobilnego runnera zgłasza zastany drift czterech kopii skilli. Nie uruchamiano taska portalu w mobilnym runnerze i nie naprawiano mobile w tym zakresie.
- Backend/mobile/E2E: brak zmian wykonawczych, ich testy nie są dowodem tego lokalnego narzędzia i nie są tu deklarowane jako wykonane.
- Instrukcje: root AGENTS, `.ai/specs/AGENTS.md`, istniejące skille implement-spec/code-review oraz źródłowy workflow mobile jako kontekst.

## Progress

- [x] Analiza struktury i historii Limen, porównanie z portalem.
- [x] Spec zakresu w istniejącym SPEC-019 i przygotowanie zmian w kopii roboczej.
- [x] Implementacja synchronizacji i 17 testów regresji przez osobnego agenta.
- [x] Niezależny review końcowego zakresu.
- [x] Zapis w repo i kontrole końcowe — kontynuacja: `.ai/runs/2026-09-14-agent-navigability.md`.

## Decyzje

- Bez nowego orchestratora, zależności i drugiej tablicy; rozszerzamy istniejące mechanizmy.
- Portal zachowuje `.ai/skills` jako źródło; lokalne mirrory są ignorowane w Git.
- Cross-repo snapshot to jawny protokół ręczny, nie deklarowana gwarancja runnera.
- Zmiany przygotowane w /tmp, ponieważ repo portalu jest poza writable roots tego zadania; zapis wymaga eskalacji sandboxa.

## Dowody

- Limen: `2807126f1eecd9d581b805e977512a05360610bf`, shallow ostatnie 25 commitów.
- Staging: `npm run skills:test` — 17/17 pass (Node fixtures); skills lint/sync/check — pass. Wyniki finalnego repo poniżej po zapisie.
- Reviewer: osobny subagent workflow_review, read-only, verdict `accept`; 17/17 testów potwierdzone niezależnie. Wykryty drift kopii po edycji skilli naprawiono przez sync; skills:check PASS.
- Kandydat źródłowy: SHA-256 `4493593b34cf6370d0614da3ab128b44c98d07f9cfb16868a8477b1888a09d5c` dla 18 zmienionych plików, bez tego runu i generowanych kopii. Algorytm: posortowane ścieżki, konkatenacja relativePath + NUL + content + NUL.

## Handoff

- Następny krok: zamknięte tu; dalsza nawigowalność w runie 2026-09-14.
- Transfer kodu: lokalny niezacommitowany checkout; sam branch main nie przenosi zmian.
- BOARD: istniejąca pozycja SPEC-001 w fizjo-app; dopisać wskaźnik do portalowego SPEC-019 po weryfikacji.

- Kontrola zapisu wykryła równoległą zmianę spec-writing (sekcja 3a) i trzech kopii Cursor. Pierwsza próba nic nie zapisała. Nową treść źródła zachowano; kopie odświeżono z aktualnego źródła.
