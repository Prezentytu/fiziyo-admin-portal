# Specyfikacje Modułów FiziYo Admin

Ten folder zawiera specyfikacje architektury i funkcjonalności modułów aplikacji FiziYo Admin.

## Konwencje

### Nazewnictwo plików

Format: `SPEC-{numer}-{data}-{tytuł}.md`

Przykład: `SPEC-001-2026-02-04-assignment-wizard.md`

- **Numer**: Sekwencyjny identyfikator (001, 002, 003, ...)
- **Data**: Data utworzenia w formacie ISO (YYYY-MM-DD)
- **Tytuł**: Opisowy tytuł w kebab-case

### Struktura specyfikacji

Każda specyfikacja powinna zawierać:

1. **Cel biznesowy** - dlaczego ta funkcjonalność istnieje
2. **Architektura** - jak jest zbudowana
3. **Interfejsy API** - GraphQL queries/mutations
4. **Komponenty UI** - lista komponentów React
5. **Data-testid** - identyfikatory dla testów E2E
6. **Changelog** - historia zmian

### Cykl życia specyfikacji

- Aktywne/pracujące specyfikacje trzymamy w `.ai/specs/`.
- Specyfikacje zakończone i zweryfikowane przenosimy do `.ai/specs/implemented/`.
- Każda nowa specyfikacja musi zawierać sekcję `## Verification plan` (unit + E2E).

### Format Changelog

Każda specyfikacja powinna mieć sekcję Changelog na końcu:

```markdown
## Changelog

### 2026-02-04

- Utworzenie specyfikacji

### 2026-02-10

- Dodanie nowej funkcjonalności X
- Zmiana API Y
```

## Indeks specyfikacji

| Nr  | Tytuł                                                                                                 | Opis                                                         | Status  |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------- |
| 001 | [Assignment Wizard](SPEC-001-2026-02-04-assignment-wizard.md)                                         | Wizard przypisywania zestawów ćwiczeń pacjentom              | Aktywny |
| 002 | [Billing Widget](SPEC-002-2026-02-04-billing-widget.md)                                               | Widget rozliczeniowy Pay-as-you-go                           | Aktywny |
| 003 | [Exercises Module](SPEC-003-2026-02-16-exercises-module.md)                                           | Ćwiczenia — formularz, lista, filtrowanie                    | Aktywny |
| 004 | [Exercise Sets Module](SPEC-004-2026-02-16-exercise-sets-module.md)                                   | Zestawy ćwiczeń                                              | Aktywny |
| 005 | [Patients Module](SPEC-005-2026-02-16-patients-module.md)                                             | Pacjenci — lista, profil, przypisania                        | Aktywny |
| 006 | [Billing Details](SPEC-006-2026-03-04-billing-details.md)                                             | Dane firmy do fakturowania i rozliczeń                       | Aktywny |
| 007 | [Template vs Plan](SPEC-007-2026-03-07-template-vs-plan.md)                                           | Rozdzielenie szablonów i planów pacjenta                     | Aktywny |
| 008 | [Exercise Report Verification Flow](SPEC-008-2026-03-08-exercise-report-verification-flow.md)         | Zgłaszanie ćwiczeń do kolejki verification                   | Aktywny |
| 009 | [Organization Exercise Verification](SPEC-009-2026-05-25-organization-exercise-verification.md)       | Weryfikacja ćwiczeń na poziomie organizacji                  | Aktywny |
| 010 | [Import Module](SPEC-010-2026-03-08-import-module.md)                                                 | Import dokumentów (plik i plain text)                        | Aktywny |
| 011 | [Invite Flow Without Legacy Plan Limits](SPEC-011-2026-03-08-invite-flow-no-legacy-limits.md)         | Invite flow bez limitów starego modelu planów                | Aktywny |
| 012 | [Exercise Dosage Model](SPEC-012-2026-04-08-exercise-dosage-model.md)                                 | Single source of truth dla semantyki podstawowych parametrów | Aktywny |
| 013 | [Verification Dual-Track](SPEC-013-2026-05-26-verification-dual-track.md)                             | Dwa tory weryfikacji + cross-org dla super admin             | Aktywny |
| 014 | [Real-time Patient Assignment Sync](SPEC-014-2026-04-17-realtime-patient-sync.md)                     | Push admin->mobile przez GraphQL Subscriptions               | Aktywny |
| 015 | [Assignment Status Enum Alignment](SPEC-015-2026-05-07-assignment-status-enum-alignment.md)           | Migracja statusu assignment na enum GraphQL                  | Aktywny |
| 016 | [Admin Portal Access Control](SPEC-016-2026-05-14-admin-portal-access-control.md)                     | Blokada pacjentów w panelu fizjoterapeutów                   | Aktywny |
| 017 | [Assignment Display Status](SPEC-017-2026-05-26-assignment-display-status.md)                         | Dynamiczny status przypisania + sygnał Premium               | Aktywny |
| 019 | [Second Gen Skills Open-Mercato](SPEC-019-2026-06-12-second-gen-skills-open-mercato.md)               | Wykonywalne skille, manifest lint, runy i audyty             | Aktywny |
| 020 | [AI Image Generation](SPEC-020-2026-07-28-ai-image-generation.md)                                     | OpenRouter Image API + kaskada modeli + UX hook              | Aktywny |
| 021 | [Full Patient Personalization](SPEC-021-2026-07-28-full-patient-personalization.md)                   | Routing persystencji + pełna edycja przy assign do pacjenta  | Aktywny |
| 022 | [Unified Exercise Parameters](SPEC-022-2026-07-28-unified-exercise-parameters.md)                     | Jedna prezentacja parametrów + parytet treści create/edit    | Aktywny |
| 023 | [Mapping overridesJson + duration](SPEC-023-2026-07-28-mapping-overrides-and-duration-deprecation.md) | overridesJson na mappingu + wycofanie edycji duration        | Aktywny |
| 024 | [Enrichment personalization](SPEC-024-2026-07-28-enrichment-personalization.md)                       | Personalizacja kroków/cues/safety per pacjent i zestaw       | Aktywny |
| 025 | [Catalog bundle import](SPEC-025-2026-08-20-catalog-bundle-import.md)                                 | Import JSON katalogu w Ustawienia → Zaawansowane (każdy fizjo) | implemented |

## Planowane specyfikacje

Tworzone stopniowo, przy okazji pracy nad danym modułem:

| Nr      | Tytuł                    | Opis                      |
| ------- | ------------------------ | ------------------------- |
| ~~003~~ | ~~Exercises Module~~     | Przeniesione do aktywnych |
| ~~004~~ | ~~Exercise Sets Module~~ | Przeniesione do aktywnych |
| ~~005~~ | ~~Patients Module~~      | Przeniesione do aktywnych |
| ~~006~~ | ~~Organization Module~~  | Przeniesione do aktywnych |
| 018     | Chat/AI Module           | Chat AI, asystent         |
| ~~010~~ | ~~Import Module~~        | Przeniesione do aktywnych |
| ~~013~~ | ~~Settings Module~~      | Przeniesione do aktywnych |

## Dla AI Agentów

Przed implementacją nowych funkcjonalności:

1. Sprawdź czy istnieje specyfikacja w tym folderze
2. Jeśli nie - utwórz nową specyfikację przed kodowaniem
3. Po zmianach - zaktualizuj changelog w specyfikacji

Zobacz [AGENTS.md](AGENTS.md) dla szczegółowych instrukcji.
