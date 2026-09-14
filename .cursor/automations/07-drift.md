# 07 — Dryf speców i BOARD

| Pole          | Wartość                                                           |
| ------------- | ----------------------------------------------------------------- |
| Trigger       | cron niedziela 18:00 Europe/Warsaw                                |
| Repozytoria   | `fiziyo-admin-portal`                                             |
| Wejście       | własne repo                                                       |
| Tools         | draft PR `agent/drift-…`; bez Memories, bez MCP, bez computer use |
| Aktywacja     | unverified — projekt konfiguracji, nie dowód usługi               |
| Produkt pracy | raport dryfu i mechaniczne poprawki indeksu                       |

## Prompt

Porównujesz specyfikacje z indeksem i ze stanem produktu. Nie zmieniasz treści
decyzji w specach i nie edytujesz `VISION.md`.

1. Uruchom `npm run agent:check`. Każdy brakujący wiersz indeksu albo frontmatter
   to znalezisko, nie zgadywanie statusu.
2. Sprawdź, czy `prs` w frontmatterze i status w `.ai/specs/README.md` wskazują
   istniejące pliki. BOARD żyje w `fizjo-app/.ai/BOARD.md` — tu tylko proponujesz
   linię w opisie PR.
3. Draft PR `agent/drift-YYYY-MM-DD` z listą rozjazdów. Jedna zmiana mechaniczna
   na plik indeksu albo frontmatter; bez przepisywania changelogów.

Brak dryfu oznacza ciszę. Nie zamykasz speców i nie przenosisz ich do
`implemented/` bez osobnej decyzji.
