---
title: Reużycie edytora ćwiczenia w centrum weryfikacji
source_plan: /Users/adamjasinski/.cursor/plans/verification-editor-reuse_3b85b082.plan.md
---

## Progress

- [x] 1. `useExerciseEditorForm`: tryb `autosave` (debounce), `flush()`, `markSaved()`, `replaceEnrichment()` — bez zmiany zachowania non-autosave (exercises/[id])
- [x] 2. `disabled` prop w `ExerciseParametersEditor` i sekcjach `ExerciseDetailSections`
- [x] 3. `ExerciseEditor` — wspólny komponent (sekcje + opcjonalne sloty: nazwa, AI-fill, JSON zaawansowane)
- [x] 4. `exercises/[id]/page.tsx` konsumuje `ExerciseEditor` (zero regresji UX)
- [x] 5. `computeVerificationCompletion` helper + test
- [x] 6. Collapsible media panel (localStorage) — wspólny wrapper
- [x] 7. Wire `/verification/[id]` na nowy edytor + autosave + flush przed approve/reject
- [x] 8. Wire `/organization/verification/[id]` na nowy edytor
- [x] 9. Wire `/verification/organizations/[id]` na nowy edytor
- [x] 10. Reconciliacja pól (side/difficulty/rangeOfMotion) — walidacja zgodności z DOMAIN_MODEL, bez zbędnych zmian
- [x] 11. Regeneracja testid-allowlist jeśli potrzebne
- [x] 12. Walidacja: type-check, lint, test:run, check:testids, build
- [x] 13. Zapytać o usunięcie `VerificationEditorPanel`/`EnrichmentEditor` (nie usuwać bez zgody) — zaakceptowane, usunięto oba pliki + `VerificationEditorPanel.test.tsx`, wyczyszczono eksport z `index.ts`, zregenerowano `testid-allowlist.json`

## Status: ukończono

Wszystkie 3 widoki weryfikacji (`/verification/[id]`, `/organization/verification/[id]`, `/verification/organizations/[id]`) oraz `exercises/[id]/page.tsx` korzystają teraz ze wspólnego `ExerciseEditor`. Walidacja końcowa: `type-check` ✓, `lint` ✓ (0 błędów), `test:run` ✓ (393/393), `check:testids` ✓ (788/788), `build` ✓.

## Decyzje

- Pola side/difficulty/rangeOfMotion: nowy `ExerciseParametersEditor` już poprawnie odzwierciedla `DOMAIN_MODEL.md` (rangeOfMotion = free text, difficulty bez `BEGINNER`, side lowercase znormalizowany). Stary `VerificationEditorPanel` miał błędny dropdown ROM i nieistniejący w backendzie poziom `BEGINNER` — zamiast "uzgadniać" wstecz, nowy edytor jest źródłem prawdy (panel do wycofania).
- Tagi (`mainTags`/`additionalTags`) pominięte w nowym edytorze — ukryte globalnie przez `HIDE_EXERCISE_TAGS = true`.
