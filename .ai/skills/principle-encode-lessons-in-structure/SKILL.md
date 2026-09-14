---
name: principle-encode-lessons-in-structure
description: 'Stosuj, gdy tę samą instrukcję piszesz drugi raz. Zamknij ją w teście, lincie, hooku albo skrypcie, nie w kolejnej linijce tekstu. EN - encode lessons in structure, lint instead of prose.'
---

# Encode lessons in structure

> **Synchronizacja:** źródło w `fizjo-app/.ai/skills/principle-encode-lessons-in-structure/SKILL.md`. Przy zmianie zaktualizuj oba repozytoria.

Tekst łatwo przegapić. Mechanizm nie wymaga współpracy.

Gdy łapiesz się na powtórzeniu instrukcji:

1. Czy to może być lint, flaga, check w runtime albo skrypt?
2. Jeśli tak, zakoduj to i skasuj zdanie.
3. Jeśli wymaga osądu, zostaw zdanie i dodaj przykład trybu awarii.

Wybieraj najsilniejszy mechanizm, jaki sytuacja pozwala: stan niemożliwy do skompilowania, potem lint/CI, potem kanoniczny helper, potem check w runtime.

Jednorazowa korekta zostaje w `lessons.md`. Wzorzec wraca do skilla albo linta. Systemowy błąd wraca do zasady. „Będę pamiętać” nic nie zapisuje.

Przykład z `lessons.md`: dowód na brudnym drzewie jest `unverified`. To nie jest prośba w prozie — zapisuje to hook `record-check.mjs` do `.ai/runs/checks.jsonl`.
