---
name: principle-subtract-before-you-add
description: 'Stosuj przy dodawaniu, wycofaniu albo refaktorze. Najpierw zdejmij martwy ciężar, potem buduj na prostszym. EN - subtract before you add, migrate callers then delete.'
---

# Subtract before you add

> **Synchronizacja:** źródło w `fizjo-app/.agents/skills/principle-subtract-before-you-add/SKILL.md`. Przy zmianie zaktualizuj oba repozytoria.

Najpierw usuń martwy kod, zbędne walidatory i puste referencje. Potem buduj na tym, co zostało.

- Funkcja wycofana znika razem z logiką, kontraktem i konsumentami, także inline query i refetch. Zwracanie `null` / `unlimited` zostawia pułapkę.
- Callerów migrujesz i kasujesz stare API w tej samej fali. Warstwa kompatybilności „na chwilę” zostaje na zawsze.
- Dane historyczne ruszasz osobną, zatwierdzoną migracją — to nie jest ta sama fala co kasowanie kodu.

Wyjątek FiziYo: kontrakt GraphQL używany cross-repo zostaje additive-first (`BACKWARD_COMPATIBILITY.md`). Najpierw Ask First. Deprecacja pola nie jest cichym usunięciem w tym samym PR.

Przykład z `lessons.md`: gdy funkcja spadła, usuwamy logikę, kontrakty i konsumentów, zamiast zostawiać resolver, który udaje, że nic nie było.
