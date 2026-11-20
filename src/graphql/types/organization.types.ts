/** Response of `CREATE_ORGANIZATION_MUTATION`; the caller becomes the organization's owner. */
export interface CreateOrganizationResponse {
  createOrganization: {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    logoUrl: string | null;
    allowPersonalExercises: boolean;
    sharedExercisesByDefault: boolean;
    creationTime: string;
  };
}
