---
name: root-cause
description: Metodyczne debugowanie problemu do przyczyny źródłowej z regułą zapobiegawczą.
---

# root-cause

## Kiedy używać

- Gdy występuje błąd runtime, regresja testu albo niespójność cross-repo.
- Gdy fix „objawowy” kusi, ale trzeba usunąć prawdziwą przyczynę.

## Kroki

1. Zbierz dowód: log, stack trace, failing test, repro krok po kroku.
2. Odtwórz problem lokalnie i zawęź do minimalnego miejsca awarii.
3. Ustal przyczynę źródłową (kontrakt, dane, stan UI, cache, autoryzacja, migracja).
4. Wdroż fix source-level, a nie workaround.
5. Dodaj test/regułę, która wykryje ten sam błąd w przyszłości.
6. Dopisz wpis do `.ai/lessons.md` (Problem/Przyczyna/Rozwiązanie/Reguła).
