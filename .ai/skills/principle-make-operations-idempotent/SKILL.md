---
name: principle-make-operations-idempotent
description: 'Stosuj przy mutacji, imporcie, retry i pętli, która może paść w połowie. Ten sam stan końcowy niezależnie od częściowego przebiegu. EN - make operations idempotent, safe retry.'
---

# Make operations idempotent

> **Synchronizacja:** źródło w `fizjo-app/.ai/skills/principle-make-operations-idempotent/SKILL.md`. Przy zmianie zaktualizuj oba repozytoria.

Komenda, import i retry zbiegają do tego samego stanu, nawet gdy poprzedni przebieg urwał się w środku.

- Klucz idempotencji wiążesz z tożsamością z tokenu, nie z tym, co klient przysłał „dla wygody”.
- Porównujesz zapisane pola domenowe, nie surową serializację grafu, który normalizuje kolekcje.
- Ponowny import scala po stabilnym id albo nazwie, zamiast dublować.
- Spóźniona odpowiedź po zmianie konta nie nadpisuje nowej sesji.

Przykład z `lessons.md`: mutacje progresu wiążą `userId` z tokenem i mają idempotencję. Import research i bundle są idempotentne po stabilnym id. Retry notatki porównuje pola domenowe, nie dump EF.
