# Lessons Learned

Dziennik wniosków z pracy AI agentów. Po każdej korekcie dodaj nowy wpis.

## Format wpisu

### YYYY-MM-DD - Krótki tytuł

- **Problem**: Co poszło nie tak
- **Przyczyna**: Dlaczego
- **Rozwiązanie**: Co naprawiono
- **Reguła**: Zasada do zapamiętania na przyszłość

## Wpisy

### 2026-03-03 - CTA "Wygeneruj nazwę AI" nie może otwierać innej funkcji

- **Problem**: Przycisk z etykietą generowania nazwy otwierał asystenta doboru ćwiczeń
- **Przyczyna**: Logika UI była podpięta do panelu `AISetGenerator`, mimo innej intencji akcji
- **Rozwiązanie**: W `CreateSetWizard` usunięto użycie asystenta i podpięto przycisk bezpośrednio pod `aiService.suggestSetName`
- **Reguła**: CTA musi wykonywać dokładnie obiecaną akcję; alternatywne flow wymagają osobnego, jednoznacznego przycisku

### 2026-03-03 - Przycisk AI uruchamiał panel przez bubbling

- **Problem**: Kliknięcie "Wygeneruj nazwę AI" otwierało panel boczny zamiast wykonać akcję generowania nazwy
- **Przyczyna**: Event z przycisku bąbelkował do rodzica, który miał własną akcję otwierania panelu
- **Rozwiązanie**: Dodano `stopPropagation()` dla `pointerdown` i `click` w przycisku AI oraz test regresyjny na brak propagacji
- **Reguła**: W osadzanych komponentach z lokalnymi CTA zawsze izoluj eventy (`pointerdown` + `click`) gdy rodzic może być triggerem nawigacji/panelu

### 2026-02-16 - Git pre-commit hook uruchamia ESLint na stale staged files

- **Problem**: Commit odrzucony mimo poprawionego kodu lokalnie
- **Przyczyna**: Pliki miały status `MM` w git (zmodyfikowane i staged + zmodyfikowane unstaged) — hook lintował starą wersję staged
- **Rozwiązanie**: Jawnie `git add` poprawionych plików przed commitem
- **Reguła**: Po naprawie błędów ESLint zawsze sprawdź `git status` i ponownie stage'uj zmodyfikowane pliki

### 2026-02-16 - ESLint na usuniętych plikach

- **Problem**: `git diff --staged --name-only` zwraca usunięte pliki, ESLint zgłasza "No files matching pattern"
- **Przyczyna**: `--name-only` bez filtra zwraca też pliki z operacją D (deleted)
- **Rozwiązanie**: Użyj `--diff-filter=ACMR` aby wykluczyć usunięte pliki
- **Reguła**: Zawsze filtruj usunięte pliki w poleceniach operujących na staged files

### 2026-02-16 - Synchronous setState w useEffect (React 19)

- **Problem**: ESLint `react-hooks/set-state-in-effect` blokuje build
- **Przyczyna**: React 19 strict mode traktuje synchroniczny setState w useEffect jako anti-pattern
- **Rozwiązanie**: (1) `queueMicrotask()` dla state syncing, (2) lazy `useState` initializer dla danych z localStorage, (3) `useMemo` dla derived state
- **Reguła**: Nigdy nie wywołuj setState synchronicznie w useEffect — użyj queueMicrotask, lazy init lub useMemo

### 2026-02-16 - Import @next/bundle-analyzer w next.config.ts

- **Problem**: TypeScript może nie rozpoznać default importu z @next/bundle-analyzer
- **Przyczyna**: Pakiet eksportuje CommonJS
- **Rozwiązanie**: `import bundleAnalyzer from "@next/bundle-analyzer"` z `esModuleInterop: true`
- **Reguła**: Sprawdź kompatybilność ESM/CJS przy dodawaniu pluginów Next.js

### 2026-03-04 - Rozdzielenie "danych do faktury" od Stripe Connect

- **Problem**: Baner finansowy komunikował tylko podłączenie konta bankowego, pomijając obowiązkowe dane firmy do fakturowania
- **Przyczyna**: Zmieszanie dwóch flow: payout onboarding (Stripe Connect) i billing identity (NIP/adres/IBAN/email)
- **Rozwiązanie**: Wprowadzono osobny flow `BillingDetails` (schema, walidatory, dialog, kontrakt GraphQL) i priorytet banera na dane rozliczeniowe
- **Reguła**: W obszarach płatności każdy etap (KYC/payout/faktura) musi mieć oddzielny komunikat i osobny stan ukończenia

<!-- Dodawaj nowe wpisy powyżej tej linii -->
