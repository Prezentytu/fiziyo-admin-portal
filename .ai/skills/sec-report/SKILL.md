---
name: sec-report
description: Paranoiczny audyt bezpieczenstwa PR/spec/diffa dla danych medycznych. Użyj gdy użytkownik prosi - zrób audyt bezpieczeństwa, sprawdź security tej zmiany, przeanalizuj zmiany w auth, sprawdź izolację tenantów, czy nie wycieka PII, zweryfikuj uprawnienia i tokeny, sprawdź RODO. OBOWIAZKOWY dla kazdej zmiany w auth, token-exchange lub permission przed merge. EN triggers - security review, auth diff audit, OWASP check, tenant isolation, PII leak. Wynik to raport w .ai/analysis z severity, hotspotami i planem mitygacji.
---

# Skill: Security Report (FiziYo)

Paranoiczna analiza bezpieczeństwa dla PR/spec/diff z naciskiem na dane medyczne.

## Scope

- OWASP Top 10 (najbardziej istotne dla web + GraphQL).
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
   - severity (Critical/High/Medium/Low),
   - scenariusz ataku,
   - rekomendację naprawy.
4. Wygeneruj raport:
   - `.ai/analysis/sec-report-YYYY-MM-DD-<slug>.md`
5. Dodaj sekcję:
   - `Next steps — go deeper`,
   - `Similar hotspots` (podobne miejsca w repo).

## Must-check list for FiziYo

- Czy pacjent nie może wejść na ścieżki admin?
- Czy token w cache jest wiązany z aktualnym userem?
- Czy każde zapytanie/mutacja tenantowa używa poprawnego `organizationId`?
- Czy logi i błędy nie ujawniają PII/tokenów?
