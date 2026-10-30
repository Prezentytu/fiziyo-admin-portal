'use client';

import { useMemo } from 'react';

import { useRoleAccess } from '@/hooks/useRoleAccess';
import { useSystemRole } from '@/hooks/useSystemRole';
import { getVerificationScopes, type VerificationScope } from '@/features/verification/utils/verificationScopes';

export function useVerificationScopes(): VerificationScope[] {
  const { canManageOrganization } = useRoleAccess();
  const { canReviewExercises, isSiteSuperAdmin } = useSystemRole();

  return useMemo(
    () => getVerificationScopes({ canManageOrganization, canReviewExercises, isSiteSuperAdmin }),
    [canManageOrganization, canReviewExercises, isSiteSuperAdmin]
  );
}
