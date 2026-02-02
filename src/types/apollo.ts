// Apollo GraphQL Response Types
// Types for GraphQL query responses based on actual schema

// ========================================
// User Types
// ========================================

export interface PersonalData {
  firstName?: string;
  lastName?: string;
}

export interface ContactData {
  phone?: string;
  address?: string;
}

export interface User {
  id: string;
  clerkId?: string;
  email: string;
  fullname?: string;
  username?: string;
  image?: string;
  isActive: boolean;
  isShadowUser?: boolean;
  hasPassword?: boolean;
  organizationIds?: string[];
  systemRole?: string;
  defaultOrganizationId?: string;
  creationTime?: string;
  personalData?: PersonalData;
  contactData?: ContactData;
}

export interface UserByClerkIdResponse {
  userByClerkId: User | null;
}

export interface UserByIdResponse {
  userById: User | null;
}

// ========================================
// Organization Types
// ========================================

export interface Organization {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  logoUrl?: string;
  subscriptionPlan?: string;
  subscriptionExpiresAt?: string;
  allowPersonalExercises?: boolean;
  sharedExercisesByDefault?: boolean;
  autoSyncExampleExercises?: boolean;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  creationTime?: string;
  updatedAt?: string;
}

export interface OrganizationByIdResponse {
  organizationById: Organization | null;
}

// ========================================
// Organization Plan & Subscription Types
// ========================================

export interface PlanLimits {
  maxExercises?: number;
  maxPatients?: number;
  maxTherapists?: number;
  maxClinics?: number;
  allowQRCodes?: boolean;
  allowReports?: boolean;
  allowCustomBranding?: boolean;
  allowSMSReminders?: boolean;
}

export interface PlanPricing {
  monthlyPrice?: number;
  annualPrice?: number;
}

export interface PlanUsage {
  exercises: number;
  patients: number;
  therapists: number;
}

export interface OrganizationPlan {
  currentPlan: string;
  expiresAt?: string;
  limits?: PlanLimits;
  pricing?: PlanPricing;
  currentUsage?: PlanUsage;
}

export interface CurrentOrganizationPlanResponse {
  currentOrganizationPlan: OrganizationPlan | null;
}

export interface UserOrganizationWithRole {
  organizationId: string;
  organizationName: string;
  logoUrl?: string;
  role: string;
  joinedAt?: string;
}

export interface UserOrganizationsResponse {
  userOrganizations: UserOrganizationWithRole[];
}

// ========================================
// Organization Members Types
// ========================================

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  status?: string;
  joinedAt?: string;
  clinicIds?: string[];
  user?: {
    id: string;
    fullname?: string;
    email: string;
    image?: string;
  };
}

export interface OrganizationMembersResponse {
  organizationMembers: OrganizationMember[];
}

// ========================================
// Clinic Types
// ========================================

export interface Clinic {
  id: string;
  name: string;
  address?: string;
  contactInfo?: string;
  isActive: boolean;
  organizationId: string;
}

export interface OrganizationClinicsResponse {
  organizationClinics: Clinic[];
}

// ========================================
// Exercise Types
// ========================================

export interface Exercise {
  id: string;
  name: string;
  // Opisy
  patientDescription?: string;
  clinicalDescription?: string;
  audioCue?: string;
  notes?: string;
  // Parametry wykonania
  type: string;
  side?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultDuration?: number;
  defaultExecutionTime?: number;
  defaultRestBetweenSets?: number;
  defaultRestBetweenReps?: number;
  preparationTime?: number;
  tempo?: string;
  // Media
  imageUrl?: string;
  thumbnailUrl?: string;
  images?: string[];
  gifUrl?: string;
  videoUrl?: string;
  // Status i widoczność
  scope?: string;
  status?: string;
  isActive: boolean;
  isPublicTemplate?: boolean;
  isSystem?: boolean;
  isSystemExample?: boolean;
  adminReviewNotes?: string;
  // Tagi
  mainTags?: string[];
  additionalTags?: string[];
  // Progresja
  progressionFamilyId?: string;
  difficultyLevel?: string;
  // Metadane
  createdById?: string;
  contributorId?: string;
  organizationId?: string;
  createdAt?: string;
  updatedAt?: string;

  // Global submission tracking (nowy model weryfikacji)
  globalSubmissionId?: string;
  sourceOrganizationExerciseId?: string;
  submittedToGlobalAt?: string;

  // Legacy aliasy (dla kompatybilności wstecznej)
  description?: string;
  exerciseSide?: string;
  executionTime?: number;
  sets?: number;
  reps?: number;
  duration?: number;
  restSets?: number;
  restReps?: number;
  creationTime?: string;
  isGlobal?: boolean;
  ownerId?: string;
}

export interface OrganizationExercisesResponse {
  organizationExercises: Exercise[];
}

export interface AvailableExercisesResponse {
  availableExercises: Exercise[];
}

export interface ExerciseByIdResponse {
  exerciseById: Exercise | null;
}

// ========================================
// Exercise Set Types
// ========================================

export interface Frequency {
  timesPerDay?: number;
  timesPerWeek?: number;
  breakBetweenSets?: number;
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
  sunday?: boolean;
}

export interface ExerciseSetMapping {
  id: string;
  exerciseId: string;
  exerciseSetId?: string;
  order?: number;
  sets?: number;
  reps?: number;
  duration?: number;
  restSets?: number;
  restReps?: number;
  executionTime?: number;
  tempo?: string;
  notes?: string;
  customName?: string;
  customDescription?: string;
  exercise?: {
    id: string;
    name: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    images?: string[];
    type?: string;
    side?: string;
    patientDescription?: string;
    notes?: string;
    videoUrl?: string;
    preparationTime?: number;
    defaultExecutionTime?: number;
    defaultSets?: number;
    defaultReps?: number;
    defaultDuration?: number;
    defaultRestBetweenSets?: number;
    defaultRestBetweenReps?: number;
    scope?: string;
    status?: string;
    difficultyLevel?: string;
    // Legacy aliasy
    exerciseSide?: string;
    description?: string;
    executionTime?: number;
    sets?: number;
    reps?: number;
    duration?: number;
    restSets?: number;
    restReps?: number;
  };
}

export interface ExerciseSet {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
  isTemplate?: boolean;
  createdById?: string;
  organizationId?: string;
  creationTime?: string;
  frequency?: Frequency;
  exerciseMappings?: ExerciseSetMapping[];
  patientAssignments?: Array<{ id: string }>;
}

export interface OrganizationExerciseSetsResponse {
  exerciseSets: ExerciseSet[];
}

// ========================================
// Tag Types
// ========================================

export interface ExerciseTag {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  isGlobal?: boolean;
  isMain?: boolean;
  categoryId?: string;
  categoryIds?: string[];
  organizationId?: string;
  createdById?: string;
  creationTime?: string;
  popularity?: number;
}

export interface ExerciseTagsResponse {
  exerciseTags: ExerciseTag[];
}

export interface TagCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  organizationId?: string;
  createdById?: string;
  creationTime?: string;
}

export interface TagCategoriesResponse {
  tagsByOrganizationId: TagCategory[];
}

// ========================================
// Patient/Therapist Assignment Types
// ========================================

export interface TherapistPatientAssignment {
  id: string;
  therapistId: string;
  patientId: string;
  organizationId: string;
  assignedAt?: string;
  assignedById?: string;
  status?: string;
  notes?: string;
  contextType?: string;
  contextLabel?: string;
  contextColor?: string;
  relationType?: string;
  startDate?: string;
  endDate?: string;
  patient?: User;
  therapist?: {
    id: string;
    fullname?: string;
  };
}

export interface TherapistPatientsResponse {
  therapistPatients: TherapistPatientAssignment[];
}

// ========================================
// Organization Patients Types (Collaborative Care)
// ========================================

export interface OrganizationPatientDto {
  patient: User;
  therapist?: {
    id: string;
    fullname?: string;
    email?: string;
    image?: string;
  } | null;
  assignmentId?: string;
  assignmentStatus: string; // "assigned" | "unassigned"
  assignedAt?: string;
  contextLabel?: string;
  contextColor?: string;
  // Premium Access (Pay-as-you-go Billing)
  premiumValidUntil?: string;
  premiumActivatedAt?: string;
  premiumStatus?: 'FREE' | 'ACTIVE' | 'EXPIRED';
  // Activity Tracking
  lastActivity?: string;
}

export interface OrganizationPatientsResponse {
  organizationPatients: OrganizationPatientDto[];
}

// ========================================
// TakeOver Patient Types
// ========================================

export interface TakeOverPatientResult {
  success: boolean;
  requiresConfirmation: boolean;
  previousTherapist?: {
    id: string;
    fullname?: string;
    email?: string;
    image?: string;
  } | null;
  assignmentId?: string;
  message?: string;
}

export interface TakeOverPatientResponse {
  takeOverPatient: TakeOverPatientResult;
}

// ========================================
// Invitation Types
// ========================================

export interface InviterInfo {
  id: string;
  fullname?: string;
  email: string;
  image?: string;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  status: string;
  message?: string;
  invitationToken?: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  invitedBy?: InviterInfo;
  acceptedBy?: InviterInfo;
  organization?: {
    id: string;
    name: string;
    logoUrl?: string;
  };
}

export interface OrganizationInvitationsResponse {
  organizationInvitations: OrganizationInvitation[];
}

export interface InvitationStats {
  pending: number;
  accepted: number;
  expired: number;
  revoked: number;
  total: number;
}

export interface OrganizationInvitationStatsResponse {
  organizationInvitationStats: InvitationStats;
}

export interface GenerateInviteLinkResponse {
  generateInviteLink: OrganizationInvitation;
}

export interface ResendInvitationResponse {
  resendInvitation: OrganizationInvitation;
}

// ========================================
// Billing Types - Pay-as-you-go Model
// ========================================

export interface TherapistBillingStats {
  therapistId: string;
  therapistName?: string;
  therapistEmail?: string;
  therapistImage?: string;
  activePatientsCount: number;
  estimatedAmount: number;
}

export interface CurrentBillingStatus {
  organizationId: string;
  month: number;
  year: number;
  /** Liczba pacjentów którzy mieli aktywne Premium w tym miesiącu */
  activePatientsInMonth: number;
  /** Liczba pacjentów którzy mają aktywne Premium teraz */
  currentlyActivePremium: number;
  pricePerPatient: number;
  estimatedTotal: number;
  currency: string;
  partnerCode?: string;
  /** Podział na terapeutów - kto aktywował ilu pacjentów */
  therapistBreakdown: TherapistBillingStats[];
}

export interface GetCurrentBillingStatusResponse {
  currentBillingStatus: CurrentBillingStatus;
}

// ========================================
// Revenue Share Types (zarobki organizacji)
// ========================================

// Re-export types from revenue.types.ts for convenience
export type {
  CommissionTier,
  PatientSubscriptionStatus,
  RevenueTransactionType,
  InviteLinkStatus,
  InviteLinkType,
  OrganizationEarnings,
  CommissionTierInfo,
  StripeConnectStatus,
  PatientInviteLink,
  PatientSubscription,
  MonthlyEarningsSummary,
  RevenueTransaction,
  PartnershipCode,
  StripeConnectOnboardingResult,
  CreatePatientInviteLinkResult,
  RedeemPartnerCodeResult,
  CancelSubscriptionResult,
  SetCommissionResult,
} from "./revenue.types";

// Response types for GraphQL queries
export interface GetOrganizationEarningsResponse {
  organizationEarnings: import("./revenue.types").OrganizationEarnings;
}

export interface GetCommissionTierInfoResponse {
  commissionTierInfo: import("./revenue.types").CommissionTierInfo;
}

export interface GetStripeConnectStatusResponse {
  stripeConnectStatus: import("./revenue.types").StripeConnectStatus;
}

export interface GetMonthlyEarningsSummaryResponse {
  monthlyEarningsSummary: import("./revenue.types").MonthlyEarningsSummary[];
}

export interface GetRevenueHistoryResponse {
  revenueHistory: import("./revenue.types").RevenueTransaction[];
}

export interface GetPatientInviteLinksResponse {
  patientInviteLinks: import("./revenue.types").PatientInviteLink[];
}

export interface GetPatientSubscriptionsResponse {
  patientSubscriptions: import("./revenue.types").PatientSubscription[];
}

export interface GetAllPartnershipCodesResponse {
  allPartnershipCodes: import("./revenue.types").PartnershipCode[];
}

// Response types for GraphQL mutations
export interface InitiateStripeConnectOnboardingResponse {
  initiateStripeConnectOnboarding: import("./revenue.types").StripeConnectOnboardingResult;
}

export interface RefreshStripeConnectLinkResponse {
  refreshStripeConnectOnboardingLink: import("./revenue.types").StripeConnectOnboardingResult;
}

export interface CreatePatientInviteLinkResponse {
  createPatientInviteLink: import("./revenue.types").CreatePatientInviteLinkResult;
}

export interface CancelPatientInviteLinkResponse {
  cancelPatientInviteLink: boolean;
}

export interface RedeemPartnershipCodeResponse {
  redeemPartnershipCode: import("./revenue.types").RedeemPartnerCodeResult;
}

export interface CancelPatientSubscriptionResponse {
  cancelPatientSubscription: import("./revenue.types").CancelSubscriptionResult;
}

export interface SetOrganizationCommissionRateResponse {
  setOrganizationCommissionRate: import("./revenue.types").SetCommissionResult;
}

export interface CreatePartnershipCodeResponse {
  createPartnershipCode: import("./revenue.types").PartnershipCode;
}

export interface DeactivatePartnershipCodeResponse {
  deactivatePartnershipCode: boolean;
}
