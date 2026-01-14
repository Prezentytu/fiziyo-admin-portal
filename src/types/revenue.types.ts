// ========================================
// Revenue Share Types - Dashboard zarobków
// ========================================

/**
 * Tier prowizji organizacji
 * - START: 0-49 pacjentów = 40%
 * - PRO: 50-99 pacjentów = 45%
 * - EXPERT: 100-299 pacjentów = 50%
 * - ELITE: 300+ pacjentów = 60%
 * - PARTNER: Stała prowizja z kodu partnerskiego
 */
export type CommissionTier = "START" | "PRO" | "EXPERT" | "ELITE" | "PARTNER";

/**
 * Status subskrypcji pacjenta
 */
export type PatientSubscriptionStatus =
  | "Active"
  | "PastDue"
  | "Canceled"
  | "Paused"
  | "Trialing"
  | "Incomplete"
  | "Expired";

/**
 * Typ transakcji Revenue Share
 */
export type RevenueTransactionType = "PatientPayment" | "Commission" | "Payout";

/**
 * Status linku zaproszeniowego
 */
export type InviteLinkStatus = "pending" | "used" | "expired";

/**
 * Typ linku zaproszeniowego
 */
export type InviteLinkType = "email" | "sms" | "qr";

// ========================================
// Główne interfejsy
// ========================================

/**
 * Dashboard zarobków organizacji
 */
export interface OrganizationEarnings {
  organizationId: string;
  monthlyEarnings: number;
  totalEarnings: number;
  pendingEarnings: number;
  estimatedMonthlyRevenue: number;
  activeSubscribers: number;
  churnedThisMonth: number;
  commissionRate: number;
  commissionTier: CommissionTier;
  nextTierThreshold?: number;
  progressToNextTier?: number;
  isPartner: boolean;
  currency: string;
  hasStripeConnect: boolean;
  stripeOnboardingComplete: boolean;
}

/**
 * Informacje o tierze prowizji (dla gamifikacji UI)
 */
export interface CommissionTierInfo {
  tier: CommissionTier;
  tierName: string;
  commissionRate: number;
  activeSubscribers: number;
  nextTierThreshold?: number;
  progressToNextTier?: number;
  nextTierRate?: number;
  isPartner: boolean;
}

/**
 * Status Stripe Connect organizacji
 */
export interface StripeConnectStatus {
  organizationId: string;
  hasConnectedAccount: boolean;
  accountId?: string;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  availableBalance: number;
  pendingBalance: number;
}

/**
 * Link zaproszeniowy dla pacjenta (Web-First flow)
 */
export interface PatientInviteLink {
  id: string;
  token: string;
  organizationId: string;
  invitedById: string;
  patientEmail?: string;
  patientPhone?: string;
  patientName?: string;
  status: InviteLinkStatus;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  linkType: InviteLinkType;
  notes?: string;
  invitedBy?: {
    id: string;
    fullname: string;
    email: string;
    image?: string;
  };
}

/**
 * Subskrypcja pacjenta (B2C)
 */
export interface PatientSubscription {
  id: string;
  patientUserId: string;
  attributionOrganizationId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId?: string;
  status: PatientSubscriptionStatus;
  monthlyPrice: number;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt?: string;
  cancellationReason?: string;
  trialEndsAt?: string;
  createdAt: string;
  updatedAt: string;
  patientUser?: {
    id: string;
    fullname: string;
    email: string;
    image?: string;
  };
}

/**
 * Miesięczne podsumowanie zarobków (dla wykresu)
 */
export interface MonthlyEarningsSummary {
  year: number;
  month: number;
  earnings: number;
  subscriberCount: number;
}

/**
 * Transakcja Revenue Share
 */
export interface RevenueTransaction {
  id: string;
  organizationId: string;
  patientSubscriptionId?: string;
  patientUserId?: string;
  type: RevenueTransactionType;
  grossAmount: number;
  netAmount: number;
  commissionRate: number;
  commissionAmount?: number;
  currency: string;
  stripePaymentIntentId?: string;
  stripeTransferId?: string;
  stripeInvoiceId?: string;
  status: string;
  description: string;
  createdAt: string;
  processedAt?: string;
  patientUser?: {
    id: string;
    fullname: string;
    email: string;
    image?: string;
  };
}

/**
 * Kod partnerski
 */
export interface PartnershipCode {
  id: string;
  code: string;
  commissionRate: number;
  isActive: boolean;
  maxUses?: number;
  usedCount: number;
  description?: string;
  createdById: string;
  createdAt: string;
  expiresAt?: string;
}

// ========================================
// Response types dla mutations
// ========================================

/**
 * Wynik inicjalizacji Stripe Connect onboarding
 */
export interface StripeConnectOnboardingResult {
  success: boolean;
  onboardingUrl?: string;
  accountId?: string;
  message?: string;
}

/**
 * Wynik tworzenia linku zaproszeniowego
 */
export interface CreatePatientInviteLinkResult {
  success: boolean;
  fullUrl?: string;
  token?: string;
  inviteLink?: PatientInviteLink;
}

/**
 * Wynik aktywacji kodu partnerskiego
 */
export interface RedeemPartnerCodeResult {
  success: boolean;
  message?: string;
  commissionRate?: number;
}

/**
 * Wynik anulowania subskrypcji
 */
export interface CancelSubscriptionResult {
  success: boolean;
  message?: string;
}

/**
 * Wynik ustawienia prowizji (Site Admin)
 */
export interface SetCommissionResult {
  success: boolean;
  organizationId?: string;
  commissionRate?: number;
  message?: string;
}

// ========================================
// Tier configuration (dla UI)
// ========================================

/**
 * Konfiguracja tierów prowizji
 */
export const COMMISSION_TIERS = {
  START: {
    name: "START",
    rate: 0.4,
    minSubscribers: 0,
    maxSubscribers: 49,
    color: "zinc",
    gradientFrom: "from-zinc-500",
    gradientTo: "to-zinc-600",
  },
  PRO: {
    name: "PRO",
    rate: 0.45,
    minSubscribers: 50,
    maxSubscribers: 99,
    color: "amber",
    gradientFrom: "from-amber-500",
    gradientTo: "to-orange-600",
  },
  EXPERT: {
    name: "EXPERT",
    rate: 0.5,
    minSubscribers: 100,
    maxSubscribers: 299,
    color: "emerald",
    gradientFrom: "from-emerald-500",
    gradientTo: "to-green-600",
  },
  ELITE: {
    name: "ELITE",
    rate: 0.6,
    minSubscribers: 300,
    maxSubscribers: null,
    color: "violet",
    gradientFrom: "from-violet-500",
    gradientTo: "to-purple-600",
  },
  PARTNER: {
    name: "PARTNER",
    rate: null, // Variable
    minSubscribers: null,
    maxSubscribers: null,
    color: "primary",
    gradientFrom: "from-primary",
    gradientTo: "to-emerald-600",
  },
} as const;

/**
 * Helper do formatowania kwoty
 */
export function formatCurrency(
  amount: number,
  currency: string = "PLN"
): string {
  return amount.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " " + currency;
}

/**
 * Helper do formatowania procentu
 */
export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

/**
 * Helper do pobierania konfiguracji tieru
 */
export function getTierConfig(tier: CommissionTier) {
  return COMMISSION_TIERS[tier];
}
