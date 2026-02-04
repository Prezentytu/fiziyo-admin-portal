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

| Nr | Tytuł | Opis | Status |
|----|-------|------|--------|
| 001 | [Assignment Wizard](SPEC-001-2026-02-04-assignment-wizard.md) | Wizard przypisywania zestawów ćwiczeń pacjentom | Aktywny |
| 002 | [Billing Widget](SPEC-002-2026-02-04-billing-widget.md) | Widget rozliczeniowy Pay-as-you-go | Aktywny |

## Dla AI Agentów

Przed implementacją nowych funkcjonalności:
1. Sprawdź czy istnieje specyfikacja w tym folderze
2. Jeśli nie - utwórz nową specyfikację przed kodowaniem
3. Po zmianach - zaktualizuj changelog w specyfikacji

Zobacz [AGENTS.md](AGENTS.md) dla szczegółowych instrukcji.
