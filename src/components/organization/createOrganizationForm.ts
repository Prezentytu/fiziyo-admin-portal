import * as z from 'zod';

/** Mirrors `[StringLength]` on `Organization.Name` and `Organization.Description` in fizjo-app/backend. */
export const ORGANIZATION_NAME_MAX_LENGTH = 100;
export const ORGANIZATION_DESCRIPTION_MAX_LENGTH = 300;

export const createOrganizationFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nazwa musi mieć co najmniej 2 znaki')
    .max(ORGANIZATION_NAME_MAX_LENGTH, `Nazwa może mieć najwyżej ${ORGANIZATION_NAME_MAX_LENGTH} znaków`),
  description: z
    .string()
    .trim()
    .max(ORGANIZATION_DESCRIPTION_MAX_LENGTH, `Opis może mieć najwyżej ${ORGANIZATION_DESCRIPTION_MAX_LENGTH} znaków`),
});

export type CreateOrganizationFormValues = z.input<typeof createOrganizationFormSchema>;

export interface CreateOrganizationVariables {
  name: string;
  description: string | null;
}

export function toCreateOrganizationVariables(values: CreateOrganizationFormValues): CreateOrganizationVariables {
  const parsed = createOrganizationFormSchema.parse(values);
  return { name: parsed.name, description: parsed.description || null };
}
