---
name: qa-scenarios
description: Raport QA z scenariuszami P0/P1/P2 dla okna zmian przed release. Użyj gdy użytkownik prosi - przygotuj scenariusze QA, co przetestować ręcznie przed release, zrób checklistę testów manualnych, plan regresji dla ostatnich zmian, co sprawdzić przed wydaniem, ścieżki klikania do weryfikacji. EN triggers - release QA plan, regression scenarios, click-path checklist, pre-release testing. Wynik to raport w .ai/analysis z click-pathami, priorytetami i rekomendacja GO/NO-GO.
---

# Skill: QA Scenarios

Generuje ludzki raport QA dla okna zmian przed release.

## Workflow

1. Zidentyfikuj okno zmian:
   - od ostatniego release lub wskazanego commit range.
2. Grupuj zmiany na obszary domenowe:
   - exercises, exercise-sets, patients, assignment, billing, auth.
3. Twórz scenariusze testowe:
   - **P0**: krytyczne flow blokujące release,
   - **P1**: wysokie ryzyko regresji,
   - **P2**: rozszerzone sanity i UX.
4. Dla każdego scenariusza zapisz:
   - click-path,
   - oczekiwany rezultat,
   - punkty weryfikacji i dane testowe.
5. Zapisz raport:
   - `.ai/analysis/qa-scenarios-YYYY-MM-DD-<slug>.md`

## Output quality bar

- Scenariusze są wykonywalne bez doprecyzowania.
- Priorytet P0 obejmuje auth, assignment i flow krytyczne biznesowo.
- Raport kończy się sekcją "Release recommendation" (GO / CONDITIONAL / NO-GO).
