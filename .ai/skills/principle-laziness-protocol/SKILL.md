---
name: principle-laziness-protocol
description: 'Stosuj przy sizingu diffa, refaktorze albo pokusie nowej warstwy. Najmniejsza zmiana i kasowanie przed dodawaniem. EN - laziness protocol, smallest diff, prefer deletion.'
---

# Laziness protocol

> **Synchronizacja:** źródło w `fizjo-app/.agents/skills/principle-laziness-protocol/SKILL.md`. Przy zmianie zaktualizuj oba repozytoria.

Cel to ten sam skutek przy mniejszej ilości kodu.

- Najpierw szukaj usunięcia, potem dodawania.
- Hierarchia wywołań ma zostać płaska: więcej niż trzy pliki, żeby odpowiedzieć na jedno pytanie, to sygnał do spłaszczenia.
- Jedną decyzję trzymaj w jednym miejscu i przekazuj wynik, nie powtarzaj wyboru.
- Nie przeciągaj sygnału przez typy, schematy i pipeline, jeśli jest krótsza ścieżka.
- Test: gdyby człowiek męczył się z utrzymaniem, rozwiązanie jest złe.

Przykład z `lessons.md`: gdy CI łapie kontrakt nieobsługiwanej funkcji, wycofaj martwe operacje. Nie implementuj domeny tylko po to, żeby suite była zielona.
