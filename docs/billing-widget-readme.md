# Billing Widget Pay-as-you-go - Dokumentacja

## Przegląd

Implementacja widgetu finansowego dla nowego modelu rozliczeniowego "Pay-as-you-go" w aplikacji FiziYo Admin.

## Model biznesowy

- **Gabinet płaci**: 15 PLN za każdego aktywnego pacjenta Premium w miesiącu
- **Aktywacja**: Fizjoterapeuta ręcznie aktywuje dostęp Premium w panelu
- **Widoczność**: Widget widoczny **TYLKO dla właścicieli (Owner) i administratorów (Admin)**

### Psychologia nazewnictwa

✅ **Używamy neutralnego języka B2B:**
- "Należność" / "Opłata licencyjna"
- "Aktywne licencje" / "Aktywni Pacjenci Premium"

❌ **NIE używamy:**
- "Koszt" - brzmi negatywnie, depresyjnie

## Komponenty

### 1. BillingSummaryWidget

**Lokalizacja**: `src/components/billing/BillingSummaryWidget.tsx`

**Warianty**:
- `compact` - Kompaktowa karta na głównym dashboardzie
- `full` - Pełny panel na stronie `/billing`

**Props**:
```typescript
interface BillingSummaryWidgetProps {
  variant: "compact" | "full";
  organizationId?: string;
  className?: string;
}
```

**Funkcje**:
- Wyświetla liczbę aktywnych pacjentów Premium
- Pokazuje należność (liczba × cena = suma)
- Przycisk do szczegółów (tylko w wariancie compact)
- Estymacja z okresem rozliczeniowym

### 2. TherapistBillingTable

**Lokalizacja**: `src/components/billing/TherapistBillingTable.tsx`

**Props**:
```typescript
interface TherapistBillingTableProps {
  organizationId?: string;
  className?: string;
}
```

**Funkcje**:
- Tabela z podziałem należności na terapeutów
- Wyszukiwanie po nazwisku/emailu
- Sortowanie po liczbie aktywacji (domyślnie malejąco)
- Wyświetla łączną należność

## GraphQL

### Query

**Lokalizacja**: `src/graphql/queries/billing.queries.ts`

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

### Typy

**Lokalizacja**: `src/types/apollo.ts`

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

## Integracje

### Dashboard (`src/app/(dashboard)/page.tsx`)

Widget compact pojawia się po sekcji "Quick Actions", tylko dla Owner/Admin:

```tsx
{canViewBilling && organizationId && (
  <BillingSummaryWidget
    variant="compact"
    organizationId={organizationId}
  />
)}
```

### Billing Page (`src/app/(dashboard)/billing/page.tsx`)

Na górze strony, przed istniejącymi sekcjami:

```tsx
<BillingSummaryWidget variant="full" organizationId={organizationId} />
<TherapistBillingTable organizationId={organizationId} />
```

## Kontrola dostępu

Wykorzystuje istniejący system ról (`useRoleAccess`):

- **canViewBilling**: `true` dla Owner i Admin
- **Dashboard**: Widget warunkowany przez `canViewBilling`
- **Billing Page**: Zabezpieczona `<AccessGuard requiredAccess="admin">`
- **Sidebar**: Link "Rozliczenia" w grupie `adminOnly: true`

## Data-testid

Dla testów E2E:

```typescript
// BillingSummaryWidget
"billing-summary-widget"
"billing-active-patients-count"
"billing-estimated-amount"
"billing-details-btn"

// TherapistBillingTable
"billing-therapist-table"
"billing-therapist-search-input"
`billing-therapist-row-${therapistId}`
```

## Design

- Gradient accent bar: `h-1 bg-gradient-to-r from-primary to-emerald-600`
- Karty z subtelnym `backdrop-blur-sm`
- Tabular nums dla liczb: `tabular-nums`
- Primary color dla należności (pozytywne skojarzenie)

## Backend Requirements

Backend musi implementować resolver `currentBillingStatus` zwracający:
- Licznik aktywnych pacjentów Premium (`premiumActiveUntil` w bieżącym miesiącu)
- Cenę za pacjenta (15 PLN)
- Podział na terapeutów
- Okres rozliczeniowy (start/end)

## Przykład użycia

```tsx
import { BillingSummaryWidget, TherapistBillingTable } from "@/components/billing";

// Compact widget na dashboardzie
<BillingSummaryWidget 
  variant="compact" 
  organizationId={organizationId} 
/>

// Full widget + tabela na stronie billing
<BillingSummaryWidget 
  variant="full" 
  organizationId={organizationId} 
/>
<TherapistBillingTable organizationId={organizationId} />
```

## Notatki

- Należność jest **estymowana** - może się zmienić do końca miesiąca
- Widget **NIE** jest widoczny dla fizjoterapeutów (rola: therapist)
- Cena 15 PLN może być hardcoded lub pobrana z backendu (`pricePerPatient`)
