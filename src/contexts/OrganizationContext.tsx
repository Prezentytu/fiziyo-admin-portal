'use client';

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import { toast } from 'sonner';
import { GET_USER_ORGANIZATIONS_QUERY } from '@/graphql/queries/users.queries';
import { SET_DEFAULT_ORGANIZATION_MUTATION } from '@/graphql/mutations/users.mutations';
import { tokenExchangeService } from '@/services/tokenExchangeService';
import { getBackendToken, saveBackendToken, clearBackendToken } from '@/lib/tokenCache';
import { LAST_ORGANIZATION_KEY } from '@/lib/auth/userBrowserState';
import { decodeJwtPayload } from '@/lib/auth/jwtClaims';
import { restartSubscriptionConnection } from '@/graphql/links/wsLink';
import type { UserOrganizationWithRole, UserOrganizationsResponse } from '@/types/apollo';

// ========================================
// Types
// ========================================

interface OrganizationContextValue {
  /** Currently active organization */
  currentOrganization: UserOrganizationWithRole | null;
  /** All organizations user belongs to */
  organizations: UserOrganizationWithRole[];
  /** Loading initial data */
  isLoading: boolean;
  /** Switching organization in progress */
  isSwitching: boolean;
  /** Switch to a different organization */
  switchOrganization: (organizationId: string) => Promise<void>;
  /**
   * Make a newly created or joined organization active. Unlike `switchOrganization` it does not need the
   * organization in `organizations` yet, shows no toast and rethrows, so the caller reports failure.
   */
  enterOrganization: (organizationId: string) => Promise<void>;
  /** Refresh organizations list */
  refreshOrganizations: () => void;
  /** Whether user has multiple organizations */
  hasMultipleOrganizations: boolean;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

function organizationIdFromToken(token: string | null): string | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  const organizationId = payload?.organization_id ?? payload?.OrganizationId;
  return typeof organizationId === 'string' && organizationId ? organizationId : null;
}

// ========================================
// Local Storage Keys
// ========================================

const LAST_ORG_KEY = LAST_ORGANIZATION_KEY;

function getLastOrganizationId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(LAST_ORG_KEY);
  } catch {
    return null;
  }
}

function setLastOrganizationId(orgId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_ORG_KEY, orgId);
  } catch {
    // Ignore localStorage errors
  }
}

// ========================================
// Provider Component
// ========================================

interface OrganizationProviderProps {
  children: React.ReactNode;
  skipOrganizationsQuery?: boolean;
}

/**
 * The current organization is picked in an effect after the query resolves, so for one render
 * the query is done but nothing is selected yet. Treat that gap as loading, otherwise role guards
 * see "no role" and redirect on a hard refresh.
 */
export function isOrganizationContextLoading(
  queryLoading: boolean,
  organizationCount: number,
  hasCurrentOrganization: boolean
): boolean {
  return queryLoading || (organizationCount > 0 && !hasCurrentOrganization);
}

export function OrganizationProvider({ children, skipOrganizationsQuery = false }: OrganizationProviderProps) {
  const apolloClient = useApolloClient();
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  // Fetch user organizations
  const {
    data,
    loading: isLoading,
    error: queryError,
    refetch,
  } = useQuery<UserOrganizationsResponse>(GET_USER_ORGANIZATIONS_QUERY, {
    fetchPolicy: 'cache-and-network',
    skip: skipOrganizationsQuery,
  });

  // Log query errors
  useEffect(() => {
    if (queryError) {
      console.error('[OrganizationContext] Error fetching organizations:', queryError);
    }
  }, [queryError]);

  // Mutation to set default organization
  const [setDefaultOrganization] = useMutation(SET_DEFAULT_ORGANIZATION_MUTATION);

  const organizations = useMemo(() => data?.userOrganizations || [], [data?.userOrganizations]);

  const hasMultipleOrganizations = organizations.length > 1;

  // Determine current organization from JWT or localStorage
  useEffect(() => {
    if (organizations.length === 0) return;

    // Try to get organization from cached token
    const tokenOrgId = organizationIdFromToken(getBackendToken());
    if (tokenOrgId && organizations.some((o) => o.organizationId === tokenOrgId)) {
      setCurrentOrgId(tokenOrgId);
      setLastOrganizationId(tokenOrgId);
      return;
    }

    // Try localStorage
    const lastOrgId = getLastOrganizationId();
    if (lastOrgId && organizations.some((o) => o.organizationId === lastOrgId)) {
      setCurrentOrgId(lastOrgId);
      return;
    }

    // Default to first organization
    if (organizations[0]) {
      setCurrentOrgId(organizations[0].organizationId);
      setLastOrganizationId(organizations[0].organizationId);
    }
  }, [organizations]);

  const currentOrganization = useMemo(
    () => organizations.find((o) => o.organizationId === currentOrgId) || null,
    [organizations, currentOrgId]
  );

  const enterOrganization = useCallback(
    async (organizationId: string) => {
      const currentToken = getBackendToken();
      if (!currentToken) {
        throw new Error('Brak tokenu autoryzacji');
      }

      try {
        const response = await tokenExchangeService.changeOrganization(currentToken, organizationId);
        saveBackendToken(response.access_token);
        // The subscription socket is still authenticated with the previous organization's token.
        restartSubscriptionConnection();
      } catch (error) {
        if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
          clearBackendToken();
        }
        throw error;
      }

      setDefaultOrganization({
        variables: { organizationId },
      }).catch((err) => {
        console.warn('[OrganizationContext] Failed to update default org:', err);
      });

      setCurrentOrgId(organizationId);
      setLastOrganizationId(organizationId);

      // Refetches every active query, `GetUserOrganizations` included, under the new organization.
      // The switch is done once the token is saved; a query that fails to refetch is not a failed switch.
      await apolloClient.resetStore().catch((err: unknown) => {
        console.warn('[OrganizationContext] Refetch after organization change failed:', err);
        // Without the new organization in the list the context stays loading; retry just the list.
        refetch().catch(() => undefined);
      });
    },
    [apolloClient, setDefaultOrganization, refetch]
  );

  // The screen must not show an organization other than the one the backend token was issued for:
  // falling back to the last or first organization exchanges the token for it.
  // One attempt per organization so a failing exchange cannot loop.
  const realignedOrgIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentOrgId || realignedOrgIdRef.current === currentOrgId) return;
    const tokenOrgId = organizationIdFromToken(getBackendToken());
    if (!tokenOrgId || tokenOrgId === currentOrgId) return;
    realignedOrgIdRef.current = currentOrgId;
    enterOrganization(currentOrgId).catch((err: unknown) => {
      console.warn('[OrganizationContext] Token does not match the selected organization:', err);
    });
  }, [currentOrgId, enterOrganization]);

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      if (organizationId === currentOrgId) return;

      const targetOrg = organizations.find((o) => o.organizationId === organizationId);
      if (!targetOrg) {
        toast.error('Nie znaleziono organizacji');
        return;
      }

      setIsSwitching(true);

      try {
        await enterOrganization(organizationId);
        toast.success(`Przełączono na ${targetOrg.organizationName}`, {
          description: getRoleLabel(targetOrg.role),
          duration: 3000,
        });
      } catch (error) {
        console.error('[OrganizationContext] Switch failed:', error);
        toast.error('Nie udało się przełączyć organizacji', {
          description: error instanceof Error ? error.message : 'Spróbuj ponownie',
        });
      } finally {
        setIsSwitching(false);
      }
    },
    [currentOrgId, organizations, enterOrganization]
  );

  const refreshOrganizations = useCallback(() => {
    void refetch().catch(() => undefined);
  }, [refetch]);

  const value = useMemo<OrganizationContextValue>(
    () => ({
      currentOrganization,
      organizations,
      isLoading: isOrganizationContextLoading(isLoading, organizations.length, currentOrganization !== null),
      isSwitching,
      switchOrganization,
      enterOrganization,
      refreshOrganizations,
      hasMultipleOrganizations,
    }),
    [
      currentOrganization,
      organizations,
      isLoading,
      isSwitching,
      switchOrganization,
      enterOrganization,
      refreshOrganizations,
      hasMultipleOrganizations,
    ]
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

// ========================================
// Hook
// ========================================

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

// ========================================
// Helpers
// ========================================

function getRoleLabel(role: string): string {
  const roleLabels: Record<string, string> = {
    OWNER: 'Właściciel',
    owner: 'Właściciel',
    ADMIN: 'Administrator',
    admin: 'Administrator',
    THERAPIST: 'Fizjoterapeuta',
    therapist: 'Fizjoterapeuta',
    member: 'Członek',
    STAFF: 'Personel',
    staff: 'Personel',
  };
  return roleLabels[role] || role;
}
