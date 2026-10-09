import { gql } from '@apollo/client';

// ========================================
// Revenue Share Queries - Dashboard zarobków
// ========================================

/**
 * Query do pobierania zarobków organizacji (Revenue Share dashboard)
 */
export const GET_ORGANIZATION_EARNINGS_QUERY = gql`
  query GetOrganizationEarnings($organizationId: String!) {
    organizationEarnings(organizationId: $organizationId) {
      organizationId
      monthlyEarnings
      totalEarnings
      pendingEarnings
      estimatedMonthlyRevenue
      activeSubscribers
      churnedThisMonth
      commissionRate
      commissionTier
      nextTierThreshold
      progressToNextTier
      isPartner
      currency
      hasStripeConnect
      stripeOnboardingComplete
    }
  }
`;

/**
 * Query do pobierania informacji o tierze prowizji
 */
export const GET_COMMISSION_TIER_INFO_QUERY = gql`
  query GetCommissionTierInfo($organizationId: String!) {
    commissionTierInfo(organizationId: $organizationId) {
      tier
      tierName
      commissionRate
      activeSubscribers
      nextTierThreshold
      progressToNextTier
      nextTierRate
      isPartner
    }
  }
`;

/**
 * Query do pobierania statusu Stripe Connect
 */
export const GET_STRIPE_CONNECT_STATUS_QUERY = gql`
  query GetStripeConnectStatus($organizationId: String!) {
    stripeConnectStatus(organizationId: $organizationId) {
      organizationId
      hasConnectedAccount
      accountId
      onboardingComplete
      chargesEnabled
      payoutsEnabled
      detailsSubmitted
      availableBalance
      pendingBalance
    }
  }
`;

/**
 * Query do pobierania miesięcznego podsumowania zarobków (dla wykresu)
 */
export const GET_MONTHLY_EARNINGS_SUMMARY_QUERY = gql`
  query GetMonthlyEarningsSummary($organizationId: String!, $months: Int) {
    monthlyEarningsSummary(organizationId: $organizationId, months: $months) {
      year
      month
      earnings
      subscriberCount
    }
  }
`;

/**
 * Query do pobierania historii transakcji Revenue Share
 */
export const GET_REVENUE_HISTORY_QUERY = gql`
  query GetRevenueHistory($organizationId: String!, $limit: Int, $offset: Int, $type: RevenueTransactionType) {
    revenueHistory(organizationId: $organizationId, limit: $limit, offset: $offset, type: $type) {
      id
      organizationId
      patientSubscriptionId
      patientUserId
      type
      grossAmount
      netAmount
      commissionRate
      commissionAmount
      currency
      stripePaymentIntentId
      stripeTransferId
      stripeInvoiceId
      status
      description
      createdAt
      processedAt
      patientUser {
        id
        fullname
        email
        image
      }
    }
  }
`;

/**
 * Query do pobierania linków zaproszeniowych pacjentów
 */
export const GET_PATIENT_INVITE_LINKS_QUERY = gql`
  query GetPatientInviteLinks($organizationId: String!, $status: String, $limit: Int) {
    patientInviteLinks(organizationId: $organizationId, status: $status, limit: $limit) {
      id
      token
      organizationId
      invitedById
      patientEmail
      patientPhone
      patientName
      status
      createdAt
      expiresAt
      usedAt
      linkType
      notes
      invitedBy {
        id
        fullname
        email
        image
      }
    }
  }
`;
