---
name: principle-sequence-verifiable-units
description: 'Stosuj przy wielkroku, migracji, sweepie i układaniu commitów albo PR. Każda jednostka kończy się sprawdzeniem, zanim zacznie się następna. EN - sequence verifiable units, check before next step.'
---

# Sequence verifiable units

> **Synchronizacja:** źródło w `fizjo-app/.agents/skills/principle-sequence-verifiable-units/SKILL.md`. Przy zmianie zaktualizuj oba repozytoria.

Praca wielokrokowa idzie małymi jednostkami. Każda kończy się stanem, który da się sprawdzić. Kolejność dostawy ma sama się tłumaczyć recenzentowi.

- Zanim ruszysz, zapisz warunek końca jako predykat, nie jako hasło.
- Wąski test zachowania po jednostce. Pełny pas raz, na czystym commicie kandydata.
- Checkpoint nie odświeża starych wyników. Zmiana HEAD albo dirty diff unieważnia dowód.
- Nie zbieraj wszystkich sprawdzeń na koniec fali.

Pasuje do `npm run agent:check` i do `verify:fast` w trakcie, `validate` na końcu.

Przykład z `lessons.md`: przy wznowieniu zadania porównujesz repo, branch, HEAD i dirty diff. Checkpoint nie zamienia starych testów w aktualne.
