---
name: check-and-commit
description: Quality gate przed commitem z walidacją proporcjonalną do zakresu zmian. Użyj gdy użytkownik prosi - domknij zadanie, sprawdź przed commitem, zrób commit, przygotuj zmiany do commita, zweryfikuj czy można mergować, odpal walidację, sprawdź czy wszystko przechodzi. EN triggers - finalize task, quality gate, check before commit, prepare commit, verify merge readiness. Wynik to dobrany zestaw komend walidacyjnych i checklist release-safe przed commitem.
---

# check-and-commit

## Kiedy używać

- Gdy kończysz zadanie i chcesz domknąć quality gate przed commitem.
- Gdy zakres zmian jest mieszany (UI + logika + kontrakty) i trzeba dobrać minimalny zestaw komend.

## Kroki

1. Oceń staged, unstaged i nowe pliki względem baseline; dobierz jeden pakiet z `AGENTS.md` (Validation Commands). Dla samego workflow użyj kontroli skilli i skryptów. Nie powtarzaj pełnych kontroli przez `validate`.
2. Potwierdź brak nowych regresji i linter errors w zmienionych plikach.
3. Commit przygotuj wyłącznie na polecenie użytkownika; samo domknięcie quality gate nie upoważnia do stagingu, commita, push, PR ani deploy. Jeśli upoważniony, użyj conventional commits. Temat mówi, co zmienia się dla terapeuty albo systemu, nie co zrobiłeś w gicie; przed commitem przeczytaj `git log --format=%s -10`. Dobrze: `fix(assignment): szybkie przypisanie zestawu startuje z parametrów zestawu, nie z domyślnych`. Źle: `chore(ui): hashe commitów w runie uwag z demo po rebase` (opisuje stan gałęzi, a nie zmianę) albo `fix(exercises): poprawki review listy ćwiczeń stronami` (nie mówi, co poprawiono).
4. Przed commitem sprawdź, czy nie dodano sekretów oraz czy `data-testid`/kontrakty nie zostały przypadkowo naruszone.
5. Dowody w specu: do dotkniętego `SPEC-0xx` dopisz changelog `### YYYY-MM-DD — #PR|hash`; po merge numer PR do frontmattera `prs`. Issue zamykaj przez `Closes #N` w opisie PR. W opisie PR podaj ticket Skrzynki (`T-00nn`) albo `BW-FZ-n`, jeśli praca z nich wynika.
