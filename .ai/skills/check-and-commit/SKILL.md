---
name: check-and-commit
description: Quality gate przed commitem z walidacją proporcjonalną do zakresu zmian. Użyj gdy użytkownik prosi - domknij zadanie, sprawdź przed commitem, zrób commit, przygotuj zmiany do commita, zweryfikuj czy można mergować, odpal walidację, sprawdź czy wszystko przechodzi. EN triggers - finalize task, quality gate, check before commit, prepare commit, verify merge readiness. Wynik to dobrany zestaw komend walidacyjnych i checklist release-safe przed commitem.
---

# check-and-commit

## Kiedy używać

- Gdy kończysz zadanie i chcesz domknąć quality gate przed commitem.
- Gdy zakres zmian jest mieszany (UI + logika + kontrakty) i trzeba dobrać minimalny zestaw komend.

## Kroki

1. Oceń obszar zmian (`git diff --name-only`) i dobierz walidację:
   - lekki zakres: `npm run lint` + testy modułowe,
   - średni zakres: `npm run lint && npm run type-check && npm run test:run`,
   - duży zakres: `npm run validate`.
2. Potwierdź brak nowych regresji i linter errors w zmienionych plikach.
3. Przygotuj commit message zgodny z conventional commits i zakresem domenowym.
4. Przed commitem sprawdź, czy nie dodano sekretów oraz czy `data-testid`/kontrakty nie zostały przypadkowo naruszone.
