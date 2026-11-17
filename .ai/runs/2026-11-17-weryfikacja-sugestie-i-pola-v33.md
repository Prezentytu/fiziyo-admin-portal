# Weryfikacja: sugestie zamiast błędów i edycja strony, sprzętu, celu i zakresów v3.3

- Issue / spec: zgłoszenie Przemka 17.11 (rozmowa z agentem); SPEC-037, sekcja „Strona, sprzęt, cel i zakresy (decyzja 17.11)”
- Owning repo: fiziyo-admin-portal
- Status runu: done
- Upoważnienie: Przemek 17.11: commity i PR
- Dozwolone pliki: `src/features/verification/**`, `src/components/shared/exercise/writeExerciseContent.ts` i testy zapadki, `src/components/shared/media/MediaGallery.tsx`, tokeny w `src/app/globals.css`, `badge.tsx`, `ExerciseV33Editors.tsx` (prefiks testid), `ExerciseSaveConflictNotice.tsx` (etykiety)
- Wykluczenia: formularz ćwiczenia (bez nowych pól), backend, edycja `prescription.params.*.default`
- Acceptance: sugestia parametru w łagodnym tonie i akceptowalna jednym kliknięciem w Parametrach, Decyzji i na pasku; w rekordzie 3.3 strona startowa, sprzęt, cel, zakresy, progresja i regresja edytowalne i zapisane; sugestie liczone od zakresu ćwiczenia; aktywna miniatura na środku paska

## Decyzje

- Macierz FR-007 oznacza `side.*`, `prescription.*`, `equipment_items` w weryfikacji jako edytowalne; SPEC-037 odkładał je bez słowników. Backend (`EnrichmentNormalizer`) przepuszcza dokument v3 w całości i nic z niego nie wylicza.
- Strona: jedna kontrolka pisze kolumnę `side` (czyta ją odtwarzacz) i `side.mode`; `per_side_dose` idzie za trybem (§6.7).
- Wartości domyślne z paczki zostają: dawkę niosą kolumny (kontrakt: „wygrywa kolumna”).
- Sugestia nadal wymaga akceptacji przed publikacją (bramka bez zmian), ale to jedno kliknięcie.

## Dowody

- `npm run validate`: exit 0, 2922 testy, `check:testids` unexpected=0, `check:design-tokens` bez nowych hexów poza `globals.css`.
- Zapadki: `VerificationWorkspace.v33.test.tsx` (każda ścieżka zapisu edytowana z ekranu i trafia do dokumentu), `writeExerciseContent.test.ts`.
- Zrzuty w obu motywach: `.ai/reports/2026-11-17-sugestie-weryfikacji/` (render komponentów w happy-dom z CSS portalu; dev server bez `.env.local`).

## Handoff

- Następny krok: po merge'u sprawdzić na devportal rekord v3.3 z zakresami (np. skręt tułowia z kijem) i zapis strony startowej.
- Poza zakresem: pola v3.3 w formularzu ćwiczenia; suwak czasu powtórzenia kończy się na 15 s, więc zakres 24–49 s nie mieści się na pasku.
