# Billing Widget - Pay-as-you-go

## Cel biznesowy

Widget finansowy dla modelu rozliczeniowego "Pay-as-you-go":
- **Gabinet płaci**: 15 PLN za każdego aktywnego pacjenta Premium w miesiącu
- **Aktywacja**: Fizjoterapeuta ręcznie aktywuje dostęp Premium w panelu
- **Widoczność**: Widget widoczny TYLKO dla Owner i Admin

## Psychologia nazewnictwa

✅ **Używamy neutralnego języka B2B:**
- "Należność" / "Opłata licencyjna"
- "Aktywne licencje" / "Aktywni Pacjenci Premium"

❌ **NIE używamy:**
- "Koszt" - brzmi negatywnie

## Architektura

### Warianty widgetu

| Wariant | Lokalizacja | Użycie |
|---------|-------------|--------|
| `compact` | Dashboard | Kompaktowa karta w sekcji głównej |
| `full` | `/billing` | Pełny panel ze szczegółami |

## Komponenty

| Komponent | Lokalizacja | Opis |
|-----------|-------------|------|
| BillingSummaryWidget | `src/components/billing/BillingSummaryWidget.tsx` | Widget podsumowania |
| TherapistBillingTable | `src/components/billing/TherapistBillingTable.tsx` | Tabela z podziałem na terapeutów |

## Interfejsy

### GraphQL Query

```graphql
query GetCurrentBillingStatus($organizationId: String!) {
  currentBillingStatus(organizationId: $organizationId) {
    organizationId
    billingPeriodStart
    billingPeriodEnd
    totalActivePatients
    pricePerPatient
    estimatedTotalAmount
    currency
    therapistBreakdown {
      therapistId
      therapistName
      therapistEmail
      therapistImage
      activePatientsCount
      estimatedAmount
    }
  }
}
```

### TypeScript Types

```typescript
interface CurrentBillingStatus {
  organizationId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  totalActivePatients: number;
  pricePerPatient: number;
  estimatedTotalAmount: number;
  currency: string;
  therapistBreakdown: TherapistBillingStats[];
}

interface TherapistBillingStats {
  therapistId: string;
  therapistName?: string;
  therapistEmail?: string;
  therapistImage?: string;
  activePatientsCount: number;
  estimatedAmount: number;
}
```

### Props

```typescript
interface BillingSummaryWidgetProps {
  variant: "compact" | "full";
  organizationId?: string;
  className?: string;
}

interface TherapistBillingTableProps {
  organizationId?: string;
  className?: string;
}
```

## Kontrola dostępu

- `canViewBilling`: `true` dla Owner i Admin
- Dashboard: Widget warunkowany przez `canViewBilling`
- Billing Page: Zabezpieczona `<AccessGuard requiredAccess="admin">`
- Sidebar: Link "Rozliczenia" w grupie `adminOnly: true`

## Data-testid

```
billing-summary-widget
billing-active-patients-count
billing-estimated-amount
billing-details-btn

billing-therapist-table
billing-therapist-search-input
billing-therapist-row-{therapistId}
```

## Design

- Gradient accent bar: `h-1 bg-gradient-to-r from-primary to-emerald-600`
- Karty z `backdrop-blur-sm`
- Tabular nums: `tabular-nums`
- Primary color dla należności (pozytywne skojarzenie)

## Integracja

### Dashboard

```tsx
{canViewBilling && organizationId && (
  <BillingSummaryWidget
    variant="compact"
    organizationId={organizationId}
  />
)}
```

### Billing Page

```tsx
<BillingSummaryWidget variant="full" organizationId={organizationId} />
<TherapistBillingTable organizationId={organizationId} />
```

## Notatki

- Należność jest **estymowana** - może się zmienić do końca miesiąca
- Widget **NIE** jest widoczny dla roli `therapist`
- Cena 15 PLN może być hardcoded lub pobrana z backendu (`pricePerPatient`)

## Changelog

### 2026-02-04
- Migracja dokumentacji do formatu SPEC
- Utworzenie specyfikacji na podstawie `docs/billing-widget-readme.md`
