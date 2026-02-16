# Skill: Code Review FiziYo

## Opis

Użyj tego skilla gdy wykonujesz code review kodu w projekcie FiziYo Admin. Zapewnia spójność z konwencjami projektu.

## Kiedy używać

- Przegląd PR przed merge
- Weryfikacja zmian wprowadzonych przez agenta
- Audyt istniejącego kodu
- Użytkownik prosi o "code review"

## Checklist code review

### TypeScript

- [ ] Brak `any` — używaj `unknown` + type guard
- [ ] Typy wyprowadzone z zod przez `z.infer<typeof schema>`
- [ ] Komponenty jako zwykłe funkcje (NIE `React.FC`)
- [ ] `"use client"` jako pierwsza linia w komponentach klienckich

### GraphQL / Apollo

- [ ] `useQuery` z `skip` zamiast `useLazyQuery`
- [ ] `fetchPolicy: "cache-first"` gdzie odpowiednie
- [ ] Zmienne zapytania walidowane (organizationId, etc.)

### Formularze

- [ ] react-hook-form + zod
- [ ] `zodResolver(schema)` w useForm
- [ ] Domyślne wartości dla wszystkich pól

### UI / Komponenty

- [ ] Każdy interaktywny element ma `data-testid`
- [ ] Dialogi: `Cmd/Ctrl+Enter` submit, `Escape` zamknięcie
- [ ] Preferuj `@/components/ui/` i `@/components/shared/`
- [ ] Zmienne CSS (Tailwind), nie hardcoded kolory

### Bezpieczeństwo

- [ ] Walidacja danych wejściowych (zod)
- [ ] Brak logowania credentials/tokenów
- [ ] Minimalne komunikaty błędów auth

### Konwencje nazewnictwa

- [ ] Komponenty: PascalCase
- [ ] Zapytania GraphQL: UPPER_SNAKE
- [ ] data-testid: `[moduł]-[komponent]-[element]-[akcja?]`

## Pytanie końcowe

**Czy senior developer zaakceptowałby ten kod?**

Jeśli nie — opisz co poprawić. Po korektach rozważ aktualizację `.ai/lessons.md` jeśli odkryto powtarzający się problem.
