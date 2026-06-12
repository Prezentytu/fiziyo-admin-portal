---
name: ui-guardian
description: Wykonywalny guardian UI z metrykami i raportem delty. Użyj gdy użytkownik prosi - zrób audyt UI, sprawdź zdrowie UI, zmigruj hardcoded kolory na tokeny, popraw dark mode, sprawdź theme-safe, policz braki data-testid, skan kolorów, zaplanuj migrację design systemu, oceń jakość UI przed release. EN triggers - UI audit, ui health check, design token migration, theme-safe cleanup, hardcoded color scan, design-system compliance, dark mode fix. Wynik to raport z deltą w .ai/reports oraz plan migracji ze score.
---

# Skill: UI Guardian (FiziYo)

Wykonywalny guardian UI inspirowany open-mercato. Skill mierzy zdrowie UI, planuje migrację i raportuje deltę.

## Capabilities

- **ANALYZE**: skanuj moduł pod hardcoded bazowe kolory i ryzyka theme-safe.
- **PLAN**: przygotuj plan migracji z estymacją ryzyka i kolejności.
- **MIGRATE**: wykonuj kontrolowane replace zgodnie z mapowaniem tokenów.
- **REVIEW**: oceń wynik (score 0-10) pod kątem czytelności light/dark i zgodności z regułami.
- **REPORT**: generuj raport metryk i deltę do `.ai/reports/`.

## Kiedy używać

- Użytkownik zgłasza redesign, migration tokenów albo problemy z dark mode.
- W PR pojawiają się hardcoded klasy `zinc|gray|slate|white|black`.
- Przed wydaniem chcesz ocenić trend jakości UI.

## Workflow

1. Uruchom health-check:
   - `bash scripts/ui-health-check.sh`
2. Odczytaj mapowanie tokenów:
   - `references/token-mapping.md`
3. Dla wskazanego obszaru przygotuj plan migracji:
   - lista plików,
   - priorytet ryzyk (wysoki/średni/niski),
   - estymacja wpływu.
4. Wykonaj migrację additive-first (bez mieszania refaktoru logiki biznesowej).
5. Policz score po migracji:
   - 10: brak naruszeń theme-safe, spójne tokeny, poprawny kontrast,
   - 7-9: drobne wyjątki bez regresji UX,
   - <7: wymagana kolejna iteracja.
6. Zapisz wynik:
   - aktualny raport w `.ai/reports/ui-health-YYYY-MM-DD.txt`,
   - krótki komentarz "co poprawiono i co zostało".

## Guardrails

- Nie usuwaj `data-testid`.
- Nie wprowadzaj nowych hardcoded baz kolorów.
- Każdy edytowany UI musi działać w light/dark.
- Po migracji uruchom minimum: `npm run lint` i `npm run test:run`.
