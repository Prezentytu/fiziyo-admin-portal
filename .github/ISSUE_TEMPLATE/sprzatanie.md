---
name: Sprzątanie (stary tor z warunkiem usunięcia)
about: Kod, dane, flaga albo dokument, których nie dało się usunąć w tym PR. Zgłoszenie mówi, kiedy wolno je skasować i jak to sprawdzić.
title: "[sprzątanie] <co usunąć> w ≤70 znakach"
labels: sprzatanie
---

<!-- Przegląd tygodniowy uruchamia „Jak sprawdzić” i dopisuje wynik z datą. Gdy nie wiadomo, czy coś jest używane,
najpierw pomiar (log, licznik), potem kasowanie. Bez danych pacjentów i klientów. -->

## Co usunąć

<!-- Pliki, endpointy, kolumny, flagi, testy, dokumenty. -->

## Dlaczego zostało

<!-- PR, który zostawił stary tor, i powód (np. stare buildy w sklepie, dane do migracji). -->

## Gotowe, gdy

<!-- Jedno sprawdzalne zdanie, np. „0 wywołań starego endpointu przez 14 dni” albo „minimalna wersja aplikacji ≥ X”. -->

## Jak sprawdzić

```
<komenda albo zapytanie, które daje odpowiedź tak/nie>
```

## Ryzyko usunięcia

<!-- Drzwi: dwukierunkowe (cofnięcie revertem) czy jednokierunkowe (dane, sklep). Jednokierunkowe = needs-adam. -->
