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
  description?: string;
  type: string;
  sets?: number;
  reps?: number;
  duration?: number;
  restSets?: number;
  restReps?: number;
  preparationTime?: number;
  executionTime?: number;
  exerciseSide?: string;
  imageUrl?: string;
  images?: string[];
  gifUrl?: string;
  videoUrl?: string;
  notes?: string;
  mainTags?: string[];
  additionalTags?: string[];
  scope?: string;
  isActive: boolean;
  isGlobal?: boolean;
  isPublicTemplate?: boolean;
  createdById?: string;
  organizationId?: string;
  ownerId?: string;
  creationTime?: string;
}

export interface OrganizationExercisesResponse {
  organizationExercises: Exercise[];
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
  notes?: string;
  customName?: string;
  customDescription?: string;
  exercise?: {
    id: string;
    name: string;
    imageUrl?: string;
    images?: string[];
    type?: string;
    exerciseSide?: string;
    description?: string;
    notes?: string;
    videoUrl?: string;
    preparationTime?: number;
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
