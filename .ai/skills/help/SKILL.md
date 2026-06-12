---
name: help
description: Nawigator workflow - rekomenduje nastepny skill na podstawie stanu repo. Użyj gdy użytkownik pyta - co dalej, jaki skill teraz, od czego zacząć, co powinienem teraz zrobić, jak ugryźć to zadanie, którego skilla użyć, pomóż mi wybrać następny krok. EN triggers - what next, which skill to use, workflow navigation, help navigator. Wynik to rekomendacja skilla glownego i zapasowego z uzasadnieniem oraz 2 konkretne nastepne kroki.
---

# Skill: Help Navigator

Nawigator "co teraz?" dla ekosystemu skilli FiziYo.

## Input signals

- `git status` i zakres zmienionych plików,
- obecność/stan specyfikacji w `.ai/specs/`,
- status testów/lintu/CI,
- etap pracy (planowanie, implementacja, review, release).

## Decision map

- Brak spec przy dużej zmianie -> `spec-writing`.
- Spec istnieje, kod jeszcze nie -> `pre-implement-spec`.
- Trwa implementacja -> `implement-spec` lub `auto-implement`.
- Potrzebna walidacja -> `smart-test` / `integration-tests` / `check-and-commit`.
- Zmiany auth/permission -> `sec-report`.
- Duży zakres UI -> `ui-guardian`.

## Output format

- Rekomendowany skill (1 główny + 1 zapasowy).
- Krótkie uzasadnienie (2-3 zdania).
- Następne 2 konkretne kroki wykonawcze.
