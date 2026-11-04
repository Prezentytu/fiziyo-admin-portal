---
name: sec-report
description: Paranoiczny audyt bezpieczeństwa PR/spec/diffa dla danych medycznych. Użyj gdy użytkownik prosi - zrób audyt bezpieczeństwa, sprawdź security tej zmiany, przeanalizuj zmiany w auth, sprawdź izolację tenantów, czy nie wycieka PII, zweryfikuj uprawnienia i tokeny, sprawdź RODO. OBOWIĄZKOWY dla każdej zmiany w auth, token-exchange lub permission przed merge. EN triggers - security review, auth diff audit, OWASP check, tenant isolation, PII leak. Wynik to raport w .ai/analysis z severity, hotspotami i planem mitygacji.
---

# Skill: Security Report

> **Kopia z kanonu:** `fizjo-app/.agents/skills/sec-report/SKILL.md` (origin/main). Nie edytuj tutaj: zmień w fizjo-app, potem `npm run principles:sync`.

Paranoiczna analiza bezpieczeństwa dla PR/spec/diff z naciskiem na dane medyczne i tenant isolation.

## Scope

- OWASP Top 10 (najbardziej istotne dla mobile, panelu web, GraphQL i backend API).
- RODO / PII leakage (logi, cache, telemetry, payloady).
- Tenant isolation (`organizationId` i guardy dostępu).
- Token exchange, role checks i permission gates.

## Workflow

1. Zbierz materiał wejściowy:
   - diff/PR/spec.
2. Oceń ryzyka według kategorii:
   - auth & session,
   - data access & tenant boundaries,
   - input validation,
   - secret exposure.
3. Dla każdego ryzyka podaj:
   - severity: P0 (wyciek albo obejście autoryzacji — naprawa i test w tym samym commicie), P1 (naprawa przed merge), P2 (ticket),
   - scenariusz ataku,
   - rekomendację naprawy.
4. Wygeneruj raport:
   - `.ai/analysis/sec-report-YYYY-MM-DD-<slug>.md`
5. Dodaj sekcję:
   - `Next steps — go deeper`,
   - `Similar hotspots` (podobne miejsca w repo).

## Must-check list for FiziYo (aplikacja, panel, backend)

- Czy pacjent nie może wejść na ścieżki admin/therapist?
- Czy token w cache jest wiązany z aktualnym userem i aktywną organizacją?
- Czy każde zapytanie/mutacja tenantowa używa poprawnego `organizationId`?
- Czy logi i błędy nie ujawniają PII/tokenów?
