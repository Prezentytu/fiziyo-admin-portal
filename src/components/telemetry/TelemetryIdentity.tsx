'use client';

import { useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { decodeJwtPayload } from '@/lib/auth/jwtClaims';
import { setTelemetryUser } from '@/lib/telemetry/client';
import { getBackendToken } from '@/lib/tokenCache';

/** Binds telemetry and its consent to the signed-in person (`sub` of the backend JWT). */
export function TelemetryIdentity() {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organizationId ?? null;
  const role = currentOrganization?.role ?? null;

  useEffect(() => {
    if (!organizationId) {
      return;
    }
    const token = getBackendToken();
    const userId = token ? decodeJwtPayload(token)?.sub : null;
    if (typeof userId !== 'string' || !userId) {
      return;
    }
    setTelemetryUser({ userId, role, organizationId });
  }, [organizationId, role]);

  return null;
}
