# .ai/specs/assets — załączniki speców jako snapshot

Jeden podfolder na spec: `assets/SPEC-0xx/` (np. `assets/SPEC-038/tempo-phase-indicator.png`). Trafiają tu obrazy, zrzuty ekranów z **kont testowych DEV**, eksporty (JSON, SDL), szkice.

Dlaczego snapshot, nie link: Google Doc, Loom, Figma i czat zmieniają się lub znikają; spec ma być czytelny za rok bez dostępu do niczego poza repo.

Zasady:

- Nazwy plików kebab-case, z sensem (`patient-today-section.png`, nie `screenshot-3.png`).
- Obrazy ≤ 500 KB (skaluj / kompresuj); nagrania nie tu — GIF ≤ 2 MB albo opis kroków.
- Zero danych pacjentów, adresów e-mail, tokenów w pasku adresu. Zrzuty tylko z kont testowych (`fizjo-app/docs/testing/agent-access.md` §2).
- Spec odwołuje się względną ścieżką: `![…](assets/SPEC-038/tempo-phase-indicator.png)`.
- Spec `deprecated` → jego assets zostają (historia), nie usuwamy.
