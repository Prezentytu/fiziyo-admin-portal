---
name: continue-run
description: Wznowienie przerwanej pracy z .ai/runs po porównaniu zakresu i stanu Git. Użyj przy wznów run, kontynuuj implementację, dokończ poprzednią sesję; EN resume interrupted run. Wynik to kolejny zweryfikowany krok lub konkretna blokada.
---

# Continue Run

1. Odczytaj run i wskazany spec, potem [workflow](../../../docs/architecture/agent-workflow.md).
   Starszy run bez baseline uzupełnij po sprawdzeniu diffa; jego testy pozostają
   `unverified`, dopóki nie potwierdzisz, do jakiej wersji kodu się odnoszą.
2. Porównaj repo, branch, HEAD, staged/unstaged diff oraz treść nowych plików
   z zapisanym kandydatem. Sam SHA lub lista `git status` nie wystarczają dla dirty.
3. Wyjaśnij różnice przez diff i zachowaj cudze zmiany. Zmiana kodu/specu unieważnia
   dotyczące jej testy i review. Nowy scope wymaga oceny upoważnienia, nie checkboxa.
4. Dla cross-repo sprawdź każde wymagane repo. Jeśli go brak, zapisz blokadę
   tego zakresu; kontynuuj tylko niezależny, upoważniony wycinek lokalny.
5. Wykonaj następny krok, uruchom adekwatne kontrole i zapisz dowód dla aktualnego
   kandydata, decyzje oraz następną akcję. Nie przepisuj dawnych wyników jako nowych.
   Format runu: [agent-run-template.md](../../../docs/architecture/agent-run-template.md).
   Nie wznawiaj od pierwszego `- [ ]` bez porównania Gita.

Handoff przekazuje wskaźniki i sposób dostarczenia dirty kodu, nie historię czatu.
Nie commituj, nie pushuj, nie twórz PR ani nie wdrażaj bez upoważnienia.
