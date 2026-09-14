---
name: principle-never-block-on-the-human
description: "Stosuj, gdy kusi pytanie 'czy zrobić X' przy odwracalnej pracy. Fakt obserwowalny sprawdzasz, nie pytasz. Granica to Ask First i akcje nieodwracalne. EN - never block on the human, prototype instead of asking."
---

# Never block on the human

> **Synchronizacja:** źródło w `fizjo-app/.agents/skills/principle-never-block-on-the-human/SKILL.md`. Przy zmianie zaktualizuj oba repozytoria.

Nadzór jest asynchroniczny. Wykonanie nie czeka na potwierdzenie odwracalnej pracy.

- Jeśli odpowiedź jest faktem obserwowalnym (zachowanie, timing, layout, wynik), nie pytaj. Uruchom, zrób prototyp, pokaż wynik.
- Pytanie zostaw na preferencję produktu albo rozwidlenie, którego żaden eksperyment nie rozstrzygnie.
- Zrób, pokaż, niech człowiek skoryguje po fakcie.

Granica FiziYo, bez zmian:

- Ask First: kontrakt GraphQL/DTO cross-repo, auth/role/token-exchange/tenant, release/deploy, sekrety, `.env`, usuwanie plików.
- Nieodwracalne: force-push, merge, Promote, PROD, wiadomość do klienta, kasowanie danych.
- Kierunek produktu zostaje Adama. Wykonanie nie blokuje się na „czy mam w ogóle zacząć odwracalny krok”.
