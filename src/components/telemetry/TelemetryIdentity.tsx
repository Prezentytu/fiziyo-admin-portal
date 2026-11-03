'use client';

import { useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { decodeJwtPayload } from '@/lib/auth/jwtClaims';
import { identifyTelemetryUser } from '@/lib/telemetry/client';
import { useTelemetryConsent } from '@/lib/telemetry/useTelemetryConsent';
import { getBackendToken } from '@/lib/tokenCache';

/** Links events to our internal user id (`sub` of the backend JWT) once consent is granted. */
export function TelemetryIdentity() {
  const { currentOrganization } = useOrganization();
  const { consent } = useTelemetryConsent();
  const organizationId = currentOrganization?.organizationId ?? null;
  const role = currentOrganization?.role ?? null;

  useEffect(() => {
    if (consent !== 'granted' || !organizationId) {
      return;
    }
    const token = getBackendToken();
    const userId = token ? decodeJwtPayload(token)?.sub : null;
    if (typeof userId !== 'string' || !userId) {
      return;
    }
    identifyTelemetryUser({ userId, role, organizationId });
  }, [consent, organizationId, role]);

  return null;
}
