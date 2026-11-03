# Adapter pracy agentów

`.ai/agent-adapter.json` wskazuje lokalne instrukcje, źródło skilli i rzeczywiste
komendy kontroli. `node scripts/check-agent-adapter.mjs` sprawdza ich dostępność;
nie wykonuje poleceń i nie potwierdza uprawnień SaaS. Parser task-card korzysta
z tego manifestu. Brak adaptera jest błędem; nie ma fallbacku do `.ai/agent-workflow.json`.

Wspólne pliki są kopiowane z fizjo-app. Skille i ich synchronizacja pozostają
zgodne z konwencją właściciela repo. Nie zakładaj dostępności mobilnego runnera
`npm run agent` w portalu lub tests; korzystaj z lokalnego workflow zadania.

Ten manifest nie nadaje uprawnień i nie uruchamia agentów; pracę zleca Adam.
Grok otrzymuje wyłącznie pakiet kontekstu i konto Issues, bez kodu FiziYo,
sekretów Cursor, sesji administratora i danych pacjentów. Hooki to dodatkowa
kontrola klienta, nie granica praw. Brak serwerowych reguł oznacza brak aktywacji.

E2E pozostaje sterowane wdrożeniem, DEV full / PROD prod-safe. Nie dodajemy
crona pełnego E2E. Eksploracja wymaga wspólnego lease środowiska z fiziyo-tests
oraz dwóch syntetycznych tenantów; do provisioning pozostaje unverified.
