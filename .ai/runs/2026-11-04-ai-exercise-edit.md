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
- Dowód różnicujący: test na baseline pada (brak przycisku AI); po zmianie testy przechodzą na Node 24. Niezależne review odtworzyło race odpowiedzi AI i Cofnij; dodatkowe scenariusze padały na 0625935, poprawka scala wynik z bieżącym szkicem i cofa tylko niezmienione wartości AI.
- UI: /private/tmp/fiziyo-ai-edit-evidence/{before,after}-{light,dark}.png, rzeczywisty edytor i tokeny CSS, syntetyczny fixture i stub AI; nie jest to E2E zalogowanego portalu.
- Review 2 odtworzyło usunięcie tekstu cue przy Cofnij po zmianie samej fazy. Test padał na ca79c5a8; tekst i fazy są teraz jedną jednostką cofania.
- Kontrole ca79c5a8: lint, guardy testid i tokenów, typecheck, 222 pliki/1214 testów passed. Build blocked: symlink node_modules poza root Turbopack, następny build fizycznych deps blocked: pobranie fontu Google. Dwie porażki blokują trzeci lokalny build/validate; build sprawdzi CI.
- Następny krok: kontrola dotkniętego zachowania i świeże niezależne review; potem draft PR i CI.
