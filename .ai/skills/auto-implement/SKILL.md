---
name: auto-implement
description: Autonomiczna realizacja wieloetapowego zadania z trwałym runem i dowodami. Użyj przy wdróż plan, wykonaj run, realizuj brief; EN autonomous implementation, phased delivery. Nie uruchamiaj dla prostego pytania lub literówki. Commit tylko na wyraźne polecenie.
---

# Auto Implement Run

1. Przeczytaj [workflow](../../../docs/architecture/agent-workflow.md). Ustal owning repo,
   cel i acceptance, sprawdź istniejący spec oraz lessons przez `rg`.
2. Zapisz jeden run `.ai/runs/<date>-<slug>.md` według
   [szablonu](../../../docs/architecture/agent-run-template.md). Zanotuj Git i cudze
   zmiany jako baseline; nie nadpisuj istniejącego runu.
3. Wykonuj wąskie kroki: implementacja, test zachowania, dowód, następny krok.
   W razie delegowania przekaż wskaźniki i rozłączny zakres plików; koordynator
   jest jedynym writerem runu. Procent checkboxów nie dowodzi acceptance.
4. Dla cross-repo zapisz osobny stan i wyniki każdego potrzebnego repo. Brak
   konsumenta/backendu/E2E oznacz jawnie, nie potwierdzaj ich testami portalu.
5. Przed zakończeniem dobierz jeden pakiet kontroli według workflow i uzyskaj
   niezależny review konkretnego kandydata. Zapisz ograniczenia i wskaźnik BOARD.
6. Przed przerwą zapisz handoff z następną akcją i tożsamością dirty zmian.
   Zwykłe wznowienie nie odświeża starych wyników testów.

Nie commituj, nie pushuj, nie twórz PR ani nie wdrażaj bez upoważnienia.
Run ani zakończenie procesu agenta nie zastępują zgody człowieka.
