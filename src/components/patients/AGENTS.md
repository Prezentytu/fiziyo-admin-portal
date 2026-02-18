# AGENTS.md — Pacjenci

## Zakres

Moduł pacjentów: lista, profil, przypisania zestawów, status Premium.

## Kluczowe wzorce

### Lista pacjentów

- DataTable z wyszukiwaniem
- Status Premium (badge, usePatientPremium hook)
- Kolumna "Przypisane zestawy" lub link do przypisań

### Punkt wejścia do Assignment Wizard

Ze strony pacjenta: przycisk "Przypisz zestaw" otwiera wizard z predefiniowanym pacjentem (tryb `from-patient`).

### Premium status

- Hook `usePatientPremium` — sprawdza status Premium
- Rozliczenia: 15 PLN/pacjent Premium/miesiąc (zgodnie z Billing Widget)

## Komponenty

- Lista: `app/(dashboard)/patients/`
- Hooks: `usePatientPremium.ts`

## Referencje

- Assignment Wizard: `src/components/assignment/AGENTS.md`
- Billing: `docs/billing-widget-readme.md`, SPEC-002

## Konwencje data-testid

Prefiks: `patient-`
Przykłady: `patient-list`, `patient-form-firstname-input`, `patient-assign-set-btn`, `patient-premium-badge`
