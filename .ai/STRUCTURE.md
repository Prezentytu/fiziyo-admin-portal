# Struktura folderów modułów i komponentów

Dokument opisuje, jak układać pliki w modułach funkcyjnych (np. Assignment Wizard, Exercise Sets). Wzorzec jest inspirowany [Open Mercato](https://github.com/open-mercato/open-mercato) (moduły w `packages/core/src/modules/<module>/` z podziałem na `utils/`, `components/`, `__tests__`).

## Zasady ogólne

- **Jeden folder = jeden obszar funkcjonalny** (np. `src/features/assignment/`, `src/features/exercise-sets/`).
- **Logika biznesowa** (filtry, walidacja, sortowanie) trafia do **utils**; komponenty tylko orkiestrują i renderują.
- **Testy jednostkowe** do logiki: w `utils/__tests__/` (obok kodu) lub `*.test.ts` obok pliku źródłowego — zgodnie z konwencją modułu.
- **Typy i stałe domenowe** (np. `WizardStep`, `getWizardSteps`) mogą zostać w pliku `types.ts` w korzeniu modułu, jeśli używane są wszędzie.

## Struktura src/ (po restrukturyzacji)

- **src/features/** — moduły domenowe: assignment, exercises, exercise-sets, patients, verification, import. Każdy ma utils/, index.ts, AGENTS.md; komponenty i typy w korzeniu lub podkatalogach.
- **src/components/** — komponenty współdzielone: shared, ui, layout oraz auth, organization, settings, finances, clinical, chat, pdf, exercise-builder.
- **src/graphql/**, **src/lib/**, **src/hooks/**, **src/services/**, **src/types/**, **src/contexts/**, **src/utils/** — bez zmian.

## Zalecana struktura modułu (wzorzec: assignment)

```
src/features/<moduł>/
├── AGENTS.md                 # Opcjonalnie: guide dla agentów (zakres, komponenty, data-testid)
├── index.ts                  # Eksporty publiczne modułu
├── types.ts                  # Typy domenowe + ewentualnie funkcje czyste (np. getWizardSteps)
├── types.test.ts             # Testy do types.ts (obok pliku)
│
├── utils/                    # Logika czysta: filtry, walidacja, sortowanie, formatowanie
│   ├── <nazwa>Utils.ts       # np. assignmentWizardUtils.ts, selectSetStepUtils.ts
│   └── __tests__/
│       ├── <nazwa>Utils.test.ts
│       └── ...
│
├── <Komponent>.tsx           # Komponenty UI
├── <Komponent>.test.tsx      # Testy komponentów (obok pliku)
├── <ViewModel>.ts            # Opcjonalnie: view modele / mappery (np. exerciseDetailsViewModel)
└── <ViewModel>.test.ts
```

### Kiedy dodać plik do `utils/`

- **Tak**: funkcje czyste zależne tylko od argumentów (filtrowanie list, walidacja kroków, sortowanie, formatowanie tekstu).
- **Nie**: hooki React, komponenty, wywołania API, rzeczy zależne od `useState`/`useEffect` — te zostają w komponentach lub hooks/.

### Kiedy test w `utils/__tests__/`, a kiedy obok pliku

- **utils/**tests**/** — testy do plików z folderu `utils/`. Vitest i tak wykrywa `src/**/*.test.{ts,tsx}`, więc `utils/__tests__/*.test.ts` są uruchamiane.
- **Obok pliku** — `types.test.ts` obok `types.ts`, `ExerciseDetailsDialog.test.tsx` obok `ExerciseDetailsDialog.tsx`. Spójne z `docs/testing/testing-guidelines.md` („pliki \*.test.ts obok kodu lub w **tests**”).

## Konwencje nazewnictwa

| Element                | Konwencja                    | Przykład                                            |
| ---------------------- | ---------------------------- | --------------------------------------------------- |
| Folder utils           | `utils/`                     | `assignment/utils/`                                 |
| Plik util              | camelCase + Utils / opis     | `assignmentWizardUtils.ts`, `selectSetStepUtils.ts` |
| Folder testów do utils | `utils/__tests__/`           | `assignment/utils/__tests__/`                       |
| Test do utila          | nazwa pliku + `.test.ts`     | `assignmentWizardUtils.test.ts`                     |
| Typy domenowe          | `types.ts` w korzeniu modułu | `features/assignment/types.ts`                      |

## Referencje

- **Testowanie**: `docs/testing/testing-guidelines.md` — logika biznesowa w helperach, testy jednostkowe obowiązkowe.
- **Open Mercato (moduł customers)**: `packages/core/src/modules/customers/` — struktura z `utils/`, `utils/__tests__/`, `components/`, `AGENTS.md`.
- **Moduł wzorcowy w FiziYo**: `src/features/assignment/` — zgodny z powyższym wzorcem.

## Dla agentów AI

Przy dodawaniu nowej logiki w module:

1. Jeśli to **funkcja czysta** (filtr, walidacja, sort, format) → dodać w `utils/<nazwa>Utils.ts` (lub nowy plik w `utils/`) i test w `utils/__tests__/<nazwa>Utils.test.ts`.
2. Jeśli to **typ lub stała domenowa** używana w wielu miejscach → rozważyć `types.ts` w korzeniu modułu.
3. **Nie** wrzucać nowych utilsów w korzeń modułu obok komponentów — trzymać je w `utils/`.
4. Przed zakończeniem: uruchomić `npm run test:run` i `npm run lint`.
