# Run: Naprawa synchronizacji parametrów fizjo → pacjent

## Goal

Cztery defekty (klucz override admin↔mobile, gubienie pól, wipe/shadow przy Edytuj plan, brak realtime per-pacjent) naprawione w admin + mobile + backend.

## Progress

- [x] 0.1 Dowód rozjazdu kluczy (test regresyjny + analiza kodu)
- [x] 1.1 Mobile: transformExerciseMapping + applyExerciseOverrides + fragment + write path
- [x] 2.1 Admin: merge override w wizardzie, dialog, quick-update
- [x] 3.1 AddExerciseToPatientDialog → real mapping
- [x] 4.1 Backend realtime onMyAssignmentChanged
- [x] 5.1 Mobile focus refetch
- [x] 6.1 Backend hardening zapisu
- [x] 7.1 Guardraile (lessons, SPEC, fixture)

## Notes

Faza 0: brak dostępu do prod DB; rozjazd udowodniony kodem — `transformExerciseMapping` ustawia `id` z ćwiczenia, `applyExerciseOverrides` czyta `overrides[id]` → klucze panelu (`mapping.id`) nigdy nie trafiają. Dual-read wymagany.
