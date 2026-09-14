---
name: principle-model-the-domain
description: 'Stosuj, gdy logika stanowa rozjeżdża się na ify albo to samo założenie o kształcie powtarza się w plikach. Zakoduj domenę w strukturze. EN - model the domain, named data shape first.'
---

# Model the domain

> **Synchronizacja:** źródło w `fizjo-app/.agents/skills/principle-model-the-domain/SKILL.md`. Przy zmianie zaktualizuj oba repozytoria.

Zanim napiszesz logikę, nazwij kształt danych. Potem dobierz strukturę: maszyna stanów, typ, tabela, reducer, kolekcja. Rozproszone `if` powielają to samo założenie i rozjeżdżają się przy pierwszej nowej kombinacji.

- Jedno pojęcie ma jednego właściciela. Dwa pola na ten sam fakt wymagają reguły pierwszeństwa, nie „kto ostatni zapisał”.
- Brak danych nie jest wartością domyślną domeny.
- To, co UI pokazuje w wielu widokach, liczy ten sam resolver końcowej dawki.

Przykład z `lessons.md`: `duration` i `executionTime` opisują ten sam czas — najpierw warstwa zalecenia, potem pole. Nowe `duration` nie może przegrać z odziedziczonym `executionTime`. Częstotliwość bez trybu nie oznacza codziennego treningu.
