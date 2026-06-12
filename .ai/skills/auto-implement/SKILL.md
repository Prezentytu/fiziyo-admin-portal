---
name: auto-implement
description: Autonomiczna implementacja wieloetapowa z resumowalnym planem runu. Użyj gdy użytkownik prosi - wdróż plan, realizuj plan, zrób to autonomicznie krok po kroku, zaimplementuj całość fazami z commitami, przeprowadź run implementacyjny, wykonaj brief od początku do końca. EN triggers - autonomous implementation, phased delivery, step-by-step execution with commits, run from brief. Wynik to plan w .ai/runs z checklista Progress, commity per krok i validation gate na koncu.
---

# Skill: Auto Implement Run

Autonomiczna implementacja wieloetapowa z planem wznawialnym.

## Workflow

1. Przyjmij brief i utwórz plan runu w `.ai/runs/<date>-<slug>.md`.
2. Użyj sekcji `## Progress`:
   - `- [ ] 1.1 ...`
   - po wykonaniu kroku: `- [x] 1.1 ... (commit: <sha>)`
3. Pracuj fazami:
   - implementacja kroku,
   - testy kroku,
   - commit kroku.
4. Po każdej fazie przejdź gate jakości adekwatny do ryzyka.
5. Finalnie uruchom `npm run validate`.

## Guardrails

- Nie łącz wielu niepowiązanych zmian w jednym kroku.
- Nie pomijaj testów dla zmian logiki.
- Każdy run musi być możliwy do wznowienia przez `continue-run`.
