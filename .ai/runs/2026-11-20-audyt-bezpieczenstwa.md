# Pełny audyt bezpieczeństwa panelu i poprawki

- Issue / spec: polecenie Adama w sesji 2026-11-20 („duży audyt security … zaimplementuj poprawki”, skill `sec-report`)
- Owning repo: fiziyo-admin-portal
- Status runu: review
- Upoważnienie: audyt + poprawki w repo; commit/push/PR tylko za osobną zgodą
- Writer: koordynator (sesja główna); audytorzy read-only
- Dozwolone pliki: `src/**`, testy, `next.config.ts`, `eslint.config.mjs`, `.ai/analysis/sec-report-2026-11-20-audyt-panelu.md`, `.ai/lessons.md`, ten run
- Wykluczenia: kontrakt GraphQL, polityka autoryzacji (lista tras publicznych), env i sekrety, pipeline release (Ask First); backend `fizjo-app` (tylko odczyt)
- Acceptance: raport z severity i obiema sekcjami końcowymi; każda poprawka logiki z testem, który padał przed zmianą; `npm run validate` zielony

## Repo i baseline

- Branch `fix/audyt-bezpieczenstwa-2026-11-20` od `origin/main` 114e23b7, bez upstreamu, bez commitów
- Zastane zmiany: nieśledzony `.claude/launch.json` (nie z tego zadania)

## Progress

- [x] Matcher `src/proxy.ts` (E5)
- [x] Odbiór raportów pięciu audytorów (auth, API, tenant, klient, konfiguracja)
- [x] Route handlery: exercise-reports (B1–B3, B5, B6), feedback (B7–B11, D8), image-proxy (B14, B15)
- [x] Zmiana osoby w karcie: `useAppSignOut` wszędzie + lint, reset w `ApolloWrapper`, koszyk per organizacja, restart WS (A2/C1, A3, C3, C5/D1, D3)
- [x] Token zgodny z wybraną organizacją (C4), dekodowanie base64url (A7), `X-XSS-Protection: 0` (E7), `noopener` (D7)
- [x] Raport `.ai/analysis/sec-report-2026-11-20-audyt-panelu.md`, lekcje
- [x] Niezależne review (principal-review): FAIL z 2 blokującymi (token recenzenta bez odświeżenia, brak testów podpięcia) i uwagami; poprawione z testami padającymi przed poprawką
- [x] `npm run validate` po poprawkach z review (2026-11-22): zielony; pierwszy przebieg miał 5 timeoutów testów spoza zmiany pod obciążeniem, osobno 24/24

## Decyzje

- A1 bez poprawki w tej gałęzi: backend odrzuca `organizationId` spoza tokenu (`RequireScopedOrganizationAccess`), więc to błąd funkcjonalny, nie wyciek; osobna jednostka.
- Pozycje CI, ruleset, sekrety i env (E1–E3, E8–E10) oraz produktowe (B4, A5, D6, D9, A4) czekają na Adama.

## Dowody

- Incydent 2026-11-22: kopia zapasowa nadpisała `src/app/api/exercise-reports/route.ts` treścią image-proxy (dwa pliki `route.ts` w jednym katalogu kopii). Odtworzone z HEAD i diffu z review; różnica względem diffu to tylko poprawka `displayName`.
- Review delty (principal-review): PASS.

- Testy padające na 114e23b7: proxy-policy 4/20, exercise-reports 8/8, feedback 5/5, image-proxy 2/3, jwtClaims 2/3, useAppSignOut, exerciseBuilderOrganization 2/2, enterOrganization (nowy przypadek).

## Handoff

- Następny krok: zgoda Adama na commit i PR (repo publiczne), decyzje z tabeli „Otwarte: decyzja Adama” w raporcie.
