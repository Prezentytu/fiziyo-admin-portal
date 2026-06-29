---
name: continue-run
description: Wznowienie przerwanego runu implementacyjnego z .ai/runs. Użyj gdy użytkownik prosi - wznów run, kontynuuj przerwaną pracę, dokończ plan, wróć do checklisty, kontynuuj implementację z poprzedniej sesji, dokończ co zostało. EN triggers - continue previous run, resume interrupted plan, finish unfinished checklist. Wynik to wykonanie kolejnych krokow od pierwszego niezaznaczonego punktu sekcji Progress z aktualizacja statusu.
---

# Skill: Continue Run

Wznawia przerwany run implementacyjny.

## Workflow

1. Otwórz plan runu z `.ai/runs/`.
2. Znajdź pierwszy niezaznaczony punkt w `## Progress`.
3. Wykonaj tylko bieżący krok.
4. Po zakończeniu:
   - oznacz krok jako wykonany,
   - dopisz SHA commita (jeśli commit był częścią kroku).
5. Powtarzaj aż checklista będzie kompletna.

## Output

- Aktualny status runu: `% completed`.
- Lista następnych kroków.
- Informacja o blockerach, jeśli występują.
