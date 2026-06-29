# Agent Operational Rules (Admin Portal)

Ten plik jest szczegółowym uzupełnieniem root `AGENTS.md`.

## Zakres

- Dotyczy całego repo `fiziyo-admin-portal`.
- Priorytet: `AGENTS.md` → modułowe `AGENTS.md` → `.cursor/rules/*.mdc`.

## Workflow operacyjny

1. **Task Router first**: znajdź wszystkie pasujące guide'y i przeczytaj je przed kodowaniem.
2. **Lessons-first**: przed implementacją sprawdź `.ai/lessons.md`.
3. **Spec-first**: dla zmian 3+ kroki lub architektonicznych sprawdź `.ai/specs/` i aktualizuj spec.
4. **Compatibility gate**: przy kontraktach czytaj `BACKWARD_COMPATIBILITY.md`.
5. **Verification**: uruchom odpowiednie komendy jakości.

## Conventions checklist

- TypeScript strict, bez `any`.
- GraphQL: `useQuery` + `skip`, bez `useLazyQuery`.
- UI: obowiązkowe `data-testid` dla elementów interaktywnych.
- Dialogi: `Cmd/Ctrl + Enter` dla głównego CTA, `Escape` do zamykania.
- Theme-safe: semantyczne tokeny, bez hardcoded baz kolorów.

## Recommended command bundles

```bash
# szybka walidacja po zmianach feature
npm run lint && npm run type-check && npm run test:run

# pełna walidacja przed domknięciem większego zakresu
npm run validate
```
