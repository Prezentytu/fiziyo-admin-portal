'use client';

import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';

import { useOrganization } from '@/contexts/OrganizationContext';
import { CREATE_ORGANIZATION_MUTATION } from '@/graphql/mutations/organizations.mutations';
import type { CreateOrganizationResponse } from '@/graphql/types';
import type { CreateOrganizationVariables } from './createOrganizationForm';

export type CreateOrganizationOutcome =
  | { status: 'entered'; organizationName: string }
  /** Created on the backend, but switching to it failed: retrying the create would make a duplicate. */
  | { status: 'created'; organizationName: string }
  | { status: 'failed' }
  | { status: 'busy' };

/** Creates an organization owned by the caller and makes it the active one. */
export function useCreateOrganization() {
  const { enterOrganization, refreshOrganizations } = useOrganization();
  const [createOrganization] = useMutation<CreateOrganizationResponse, CreateOrganizationVariables>(
    CREATE_ORGANIZATION_MUTATION
  );
  const inFlight = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createAndEnter = useCallback(
    async (variables: CreateOrganizationVariables): Promise<CreateOrganizationOutcome> => {
      // The mutation is not idempotent; a ref closes the gap before `isSubmitting` re-renders the button.
      if (inFlight.current) return { status: 'busy' };
      inFlight.current = true;
      setIsSubmitting(true);

      try {
        let created: CreateOrganizationResponse['createOrganization'] | undefined;
        try {
          const result = await createOrganization({ variables });
          created = result.data?.createOrganization;
        } catch (error) {
          console.error('[CreateOrganization] Create failed:', error);
          return { status: 'failed' };
        }
        if (!created) return { status: 'failed' };

        try {
          await enterOrganization(created.id);
          return { status: 'entered', organizationName: created.name };
        } catch (error) {
          console.error('[CreateOrganization] Switch to the new organization failed:', error);
          refreshOrganizations();
          return { status: 'created', organizationName: created.name };
        }
      } finally {
        inFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [createOrganization, enterOrganization, refreshOrganizations]
  );

  return { createAndEnter, isSubmitting };
}
