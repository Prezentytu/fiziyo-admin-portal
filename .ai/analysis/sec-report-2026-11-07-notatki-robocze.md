# Sec report: sekcja „Notatki robocze (tylko FiziYo)” w panelu

Kandydat: gałąź `claude/notatki-robocze` od `origin/main` fb14c778. Zakres: `InternalNotesPanel` (widok ćwiczenia i `VerificationWorkspace`), `GET_EXERCISE_INTERNAL_NOTES_QUERY`, `UPDATE_EXERCISE_INTERNAL_NOTES_MUTATION`. Backend i autoryzacja pola: `fizjo-app/.ai/analysis/sec-report-2026-11-07-notatki-robocze.md`.

## Ryzyka

### P0 poza panelem: o widoczności decyduje backend

- Panel tylko odzwierciedla `canReviewExercises` (ContentManager, SiteSuperAdmin z `useSystemRole`). Ukryta sekcja nie jest uprawnieniem: backend zwraca `internalNotes: null` każdej innej roli, a `exerciseByIdForAdmin` i `updateExerciseField` odrzucają wywołującego bez `ReviewExercises`.

### P2: zapytanie o notatki wychodzi tylko dla zespołu FiziYo

- `useQuery` ma `skip: !canReviewExercises`, więc fizjoterapeuta i owner nie wysyłają zapytania (test `InternalNotesPanel.test.tsx`). Wspólne fragmenty (`EXERCISE_FULL_FRAGMENT`, `ADMIN_EXERCISE_FRAGMENT`) nie dostały pola, więc listy i zestawy gabinetu go nie pobierają.
- Tor weryfikacji organizacyjnej (owner/admin gabinetu w `VerificationWorkspace`) nie renderuje sekcji (test w `VerificationWorkspace.organization.test.tsx`).

## Must-check

- Pacjent na ścieżkach admin/therapist: nie dotyczy panelu.
- Token w cache: bez zmian.
- `organizationId`: zapytanie po id ćwiczenia przez `exerciseByIdForAdmin` (backoffice, bez tenantu z założenia), tylko dla ról systemowych.
- Logi i błędy bez PII: komponent nie loguje treści; błąd zapisu pokazuje tylko „Nie zapisano notatek”.

## Similar hotspots

- `notes` („Notatki wewnętrzne”) widzi każdy fizjoterapeuta i trafia do playera pacjenta. Do osobnej decyzji.

## Next steps — go deeper

- Po wdrożeniu backendu na DEV: konto ContentManager zapisuje notatkę w widoku ćwiczenia i widzi ją w weryfikacji; konto fizjoterapeuty nie widzi sekcji, a `exerciseById { internalNotes }` zwraca `null`.
