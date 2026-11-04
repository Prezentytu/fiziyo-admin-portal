# AI w obu wejściach edycji ćwiczenia

- Ticket: https://trello.com/c/ixFy6UjN (skrzynka fbwlwthfu0dwa).
- Owning repo: fiziyo-admin-portal.
- Status: working, review pending.
- Upoważnienie: Adam 2026-11-04 zlecił implementację kart Czeka na start w osobnych PRach; koordynator przydzielił istniejącą akcję AI w obu edytorach.
- Writer: portal_responsive (osobny worktree).
- Zakres: ExerciseEditor.tsx, test zachowania, lessons.
- Wykluczenia: kontrakt, auth, kredyty, backend, deploy, PROD.
- Acceptance: akcja AI dostępna bez dodatkowych props w detalu i dialogu, używa aktualnego szkicu, chroni wpisane treści i wymaga ręcznego zapisu.
- Baseline: origin/main 9eff13fa, codex/fix-exercise-ai-edit, czyste drzewo.
- Dowód różnicujący: test na baseline pada (brak przycisku AI); po zmianie 2 testy przechodzą na Node 24.
- UI: /private/tmp/fiziyo-ai-edit-evidence/{before,after}-{light,dark}.png, rzeczywisty edytor i tokeny CSS, syntetyczny fixture i stub AI; nie jest to E2E zalogowanego portalu.
- Następny krok: validate na czystym kandydacie i niezależny reviewer; potem draft PR.
