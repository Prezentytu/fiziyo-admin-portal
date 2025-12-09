// Common Apollo response types

export interface UserByClerkIdResponse {
  userByClerkId?: {
    id: string;
    clerkId?: string;
    fullname?: string;
    email?: string;
    image?: string;
    organizationIds?: string[];
    personalData?: {
      firstName?: string;
      lastName?: string;
    };
    contactData?: {
      phone?: string;
      address?: string;
    };
  };
}

export interface UserByIdResponse {
  userById?: {
    id: string;
    clerkId?: string;
    fullname?: string;
    email?: string;
    image?: string;
    creationTime?: string;
    isShadowUser?: boolean;
    organizationIds?: string[];
    personalData?: {
      firstName?: string;
      lastName?: string;
    };
    contactData?: {
      phone?: string;
      address?: string;
    };
  };
}

export interface OrganizationExercisesResponse {
  organizationExercises?: Array<{
    id: string;
    name: string;
    description?: string;
    type?: string;
    sets?: number;
    reps?: number;
    duration?: number;
    exerciseSide?: string;
    imageUrl?: string;
    images?: string[];
    isActive?: boolean;
    mainTags?: string[];
    additionalTags?: string[];
  }>;
}

export interface OrganizationExerciseSetsResponse {
  exerciseSets?: Array<{
    id: string;
    name: string;
    description?: string;
    isActive?: boolean;
    isTemplate?: boolean;
    exerciseMappings?: Array<{
      id: string;
      exerciseId: string;
      order?: number;
      exercise?: {
        id: string;
        name: string;
        imageUrl?: string;
        images?: string[];
      };
    }>;
    patientAssignments?: Array<{ id: string }>;
  }>;
}

export interface TherapistPatientsResponse {
  therapistPatients?: Array<{
    id: string;
    therapistId: string;
    patientId: string;
    status?: string;
    contextLabel?: string;
    contextColor?: string;
    patient?: {
      id: string;
      fullname?: string;
      email?: string;
      image?: string;
      isShadowUser?: boolean;
      personalData?: {
        firstName?: string;
        lastName?: string;
      };
      contactData?: {
        phone?: string;
        address?: string;
      };
    };
  }>;
}

export interface ExerciseTagsResponse {
  exerciseTags?: Array<{
    id: string;
    name: string;
    color: string;
    description?: string;
    icon?: string;
    isMain?: boolean;
    isGlobal?: boolean;
    categoryId?: string;
    categoryIds?: string[];
    popularity?: number;
  }>;
}

export interface TagCategoriesResponse {
  tagsByOrganizationId?: Array<{
    id: string;
    name: string;
    color: string;
    description?: string;
    icon?: string;
  }>;
}

export interface OrganizationByIdResponse {
  organizationById?: {
    id: string;
    name: string;
    description?: string;
    logoUrl?: string;
    isActive?: boolean;
    creationTime?: string;
    subscriptionPlan?: string;
  };
}

export interface OrganizationMembersResponse {
  organizationMembers?: Array<{
    id: string;
    userId: string;
    organizationId: string;
    role: string;
    status?: string;
    joinedAt?: string;
    user?: {
      id: string;
      fullname?: string;
      email?: string;
      image?: string;
    };
  }>;
}

export interface OrganizationClinicsResponse {
  organizationClinics?: Array<{
    id: string;
    name: string;
    address?: string;
    contactInfo?: string;
    isActive?: boolean;
  }>;
}

export interface UserOrganizationsResponse {
  userOrganizations?: Array<{
    organizationId: string;
    organizationName?: string;
    role: string;
    joinedAt?: string;
  }>;
}

export interface ExerciseByIdResponse {
  exerciseById?: {
    id: string;
    name: string;
    description?: string;
    type?: string;
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
    videoUrl?: string;
    notes?: string;
    mainTags?: string[];
    additionalTags?: string[];
    isActive?: boolean;
  };
}

export interface PatientAssignmentsResponse {
  patientAssignments?: Array<{
    id: string;
    userId: string;
    exerciseSetId?: string;
    exerciseId?: string;
    status?: string;
    assignedAt?: string;
    startDate?: string;
    endDate?: string;
    completionCount?: number;
    exerciseSet?: {
      id: string;
      name: string;
      description?: string;
      exerciseMappings?: Array<{ id: string }>;
    };
  }>;
}

