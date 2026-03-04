# Billing Details Module

## Cel biznesowy

Ujednolicić i uszczelnić proces rozliczeń organizacji przez zbieranie kompletnych danych firmy
(NIP, adres, IBAN, email do faktur), aby FiziYo mogło poprawnie wystawiać faktury oraz przygotować
organizację do wypłat.

Kluczowa decyzja: konfiguracja danych rozliczeniowych jest oddzielona od konfiguracji Stripe Connect.

## Architektura

### Zakres frontend

- `StripeAlertBanner` pokazuje priorytetowo konfigurację danych rozliczeniowych.
- `BillingDetailsDialog` obsługuje formularz create/update danych firmy.
- `BillingDetailsCard` prezentuje realne dane z API (bez mock NIP).
- Walidacja biznesowa NIP/IBAN działa po stronie frontendu (pre-validation UX).

### Zakres backend contract

- Query do odczytu danych rozliczeniowych per `organizationId`.
- Mutation do zapisu danych rozliczeniowych z walidacją i autoryzacją.
- Walidacja serwerowa musi powtarzać reguły biznesowe (NIP checksum + IBAN MOD-97).

## Interfejsy

### GraphQL Queries/Mutations

#### Query

```graphql
query GetBillingDetails($organizationId: String!) {
  billingDetails(organizationId: $organizationId) {
    companyName
    nip
    address
    postalCode
    city
    iban
    billingEmail
    isComplete
  }
}
```

#### Mutation

```graphql
mutation UpdateBillingDetails($organizationId: String!, $input: BillingDetailsInput!) {
  updateBillingDetails(organizationId: $organizationId, input: $input) {
    success
    message
    billingDetails {
      companyName
      nip
      address
      postalCode
      city
      iban
      billingEmail
      isComplete
    }
  }
}
```

### Komponenty

| Komponent            | Lokalizacja                                       | Opis                                                |
| -------------------- | ------------------------------------------------- | --------------------------------------------------- |
| BillingDetailsDialog | `src/components/billing/BillingDetailsDialog.tsx` | Formularz danych firmy z walidacją Zod              |
| StripeAlertBanner    | `src/components/finances/StripeAlertBanner.tsx`   | Baner alertowy z jasnym motywem i logiką priorytetu |
| BillingDetailsCard   | `src/components/billing/BillingDetailsCard.tsx`   | Widok danych do faktury + otwieranie dialogu edycji |

### Walidatory i typy

| Element                | Lokalizacja                          | Opis                                            |
| ---------------------- | ------------------------------------ | ----------------------------------------------- |
| `validateNIP()`        | `src/lib/validators/billing.ts`      | Walidacja checksum NIP (wagi 6,5,7,2,3,4,5,6,7) |
| `validateIban()`       | `src/lib/validators/billing.ts`      | Walidacja IBAN PL z MOD-97                      |
| `billingDetailsSchema` | `src/types/billing-details.types.ts` | Schemat formularza i reguły walidacji           |

## Data-testid

- `billing-details-dialog`
- `billing-details-company-name-input`
- `billing-details-nip-input`
- `billing-details-email-input`
- `billing-details-address-input`
- `billing-details-postal-code-input`
- `billing-details-city-input`
- `billing-details-iban-input`
- `billing-details-cancel-btn`
- `billing-details-submit-btn`
- `billing-details-edit-btn`
- `billing-details-add-btn`
- `finance-alert-configure-btn`
- `finance-alert-dismiss-btn`

## Test plan

### Unit tests (frontend)

- `src/lib/validators/__tests__/billing.test.ts`
  - poprawne i błędne NIP
  - poprawne i błędne IBAN
  - walidacja schemy Zod (missing fields, postal code, email)

### Integration checks (manual)

- Banner na `/finances`:
  - brak danych rozliczeniowych -> CTA otwiera dialog
  - komplet danych rozliczeniowych + brak Stripe -> CTA kieruje do Stripe
- `/finances/invoices`:
  - karta danych do faktury pokazuje dane z API
  - edycja przez dialog aktualizuje kartę

## Ryzyka i decyzje

- Backend może jeszcze nie wystawiać `billingDetails` / `updateBillingDetails`; frontend jest gotowy kontraktowo.
- Docelowo walidacja backendowa jest obowiązkowa i stanowi źródło prawdy.
- Stripe Connect pozostaje niezależnym flow dotyczącym payouts, nie danych do faktury.

## Changelog

### 2026-03-04

- Utworzenie specyfikacji Billing Details.
- Zdefiniowanie kontraktu GraphQL dla odczytu i zapisu danych firmy.
- Dodanie planu testów unit i scenariuszy integracyjnych.
