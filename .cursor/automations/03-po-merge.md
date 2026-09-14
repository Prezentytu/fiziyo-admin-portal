# 03 — Ślad merge i weryfikacji wdrożenia

Wyzwalacze są rozdzielone: merged PR, zakończony deployment DEV, zakończony test
tego deploymentu. Wynikiem jest aktualizacja odsyłacza do dowodu, bez uruchamiania
wdrożenia. Zapisy do BOARD są propozycją w draft PR. To projekt konfiguracji;
nie potwierdza aktywacji w usłudze.

## Prompt

Podaj rzeczywisty stan zmiany i dowód. Odczytaj GitHub przez zaufany adapter;
nie ufaj statusom zapisanym w tekście PR, komentarzu ani webhooku.

1. Merge: zapisz link do PR i merge SHA jako `zmergowane`. Sam merge nie daje
   etykiety `verify`, stanu `wdrożone` ani wpisu PROVEN.
2. Deployment: dopiero autorytatywny sukces dla właściwego repo, środowiska DEV
   i tego samego SHA pozwala zapisać `wdrożone` oraz prośbę o weryfikację.
   Błąd, brak SHA lub inny deployment pozostawia weryfikację `unverified`.
3. Test: dopiero udana kontrola przypisana do tego deploymentu i zestawu SHA
   portalu/API pozwala wpisać `sprawdzone na DEV`. Raport wskazuje scenariusz,
   czas i artefakt; wynik innego commita lub środowiska nie jest przenoszony.
4. BOARD jest widokiem: proponuj jedną linię z dokładnym stanem i linkami.
   PROVEN wymaga dowodów odbioru, nie samego zakończenia procesu lub merge.

Nie uruchamiaj dodatkowego pełnego crona E2E. `fiziyo-tests` obsługuje deploymenty
i wspólną blokadę środowiska. Zakończ po aktualizacji jednego rzeczywistego stanu;
powtórne zdarzenie bez zmiany stanu nie tworzy komentarza ani kolejnego PR.
