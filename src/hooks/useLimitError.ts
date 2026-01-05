'use client';

import { useState, useCallback } from 'react';
import type { LimitType, LimitErrorInfo } from '@/components/shared/LimitReachedDialog';

// ========================================
// Types
// ========================================

interface GraphQLErrorExtensions {
  code?: string;
  limitType?: string;
  currentCount?: number;
  maxLimit?: number;
  plan?: string;
}

interface GraphQLErrorLike {
  message: string;
  extensions?: GraphQLErrorExtensions;
}

interface ApolloErrorLike {
  graphQLErrors?: GraphQLErrorLike[];
  message?: string;
}

// ========================================
// Constants
// ========================================

const LIMIT_ERROR_CODES = [
  'THERAPIST_LIMIT_REACHED',
  'PATIENT_LIMIT_REACHED',
  'EXERCISE_LIMIT_REACHED',
  'CLINIC_LIMIT_REACHED',
] as const;

const codeToLimitType: Record<string, LimitType> = {
  'THERAPIST_LIMIT_REACHED': 'therapists',
  'PATIENT_LIMIT_REACHED': 'patients',
  'EXERCISE_LIMIT_REACHED': 'exercises',
  'CLINIC_LIMIT_REACHED': 'clinics',
};

// ========================================
// Hook
// ========================================

/**
 * Hook do obsługi błędów limitów subskrypcji
 * Parsuje błędy GraphQL i wyciąga informacje o limicie
 */
export function useLimitError() {
  const [limitError, setLimitError] = useState<LimitErrorInfo | null>(null);

  /**
   * Sprawdza czy błąd jest błędem limitu i parsuje go
   * @param error - Apollo error lub unknown
   * @returns true jeśli był to błąd limitu
   */
  const handleError = useCallback((error: unknown): boolean => {
    // Check if error has graphQLErrors (Apollo error structure)
    const apolloError = error as ApolloErrorLike;
    if (!apolloError?.graphQLErrors || !Array.isArray(apolloError.graphQLErrors)) {
      return false;
    }

    const graphQLError = apolloError.graphQLErrors.find((e) => {
      const extensions = e.extensions as GraphQLErrorExtensions | undefined;
      const code = extensions?.code;
      return code && LIMIT_ERROR_CODES.includes(code as typeof LIMIT_ERROR_CODES[number]);
    });

    if (!graphQLError) {
      return false;
    }

    const extensions = graphQLError.extensions as GraphQLErrorExtensions;
    const code = extensions.code || '';
    const limitType = codeToLimitType[code] || (extensions.limitType as LimitType) || 'patients';

    setLimitError({
      type: limitType,
      currentCount: extensions.currentCount ?? 0,
      maxLimit: extensions.maxLimit ?? 0,
      plan: extensions.plan || 'Free',
    });

    return true;
  }, []);

  /**
   * Czyści błąd limitu
   */
  const clearError = useCallback(() => {
    setLimitError(null);
  }, []);

  /**
   * Sprawdza czy jest aktywny błąd limitu
   */
  const hasLimitError = limitError !== null;

  return {
    limitError,
    hasLimitError,
    handleError,
    clearError,
  };
}

/**
 * Helper do sprawdzania czy error jest błędem limitu bez state
 */
export function isLimitError(error: unknown): boolean {
  const apolloError = error as ApolloErrorLike;
  if (!apolloError?.graphQLErrors || !Array.isArray(apolloError.graphQLErrors)) {
    return false;
  }

  return apolloError.graphQLErrors.some((e) => {
    const extensions = e.extensions as GraphQLErrorExtensions | undefined;
    const code = extensions?.code;
    return code && LIMIT_ERROR_CODES.includes(code as typeof LIMIT_ERROR_CODES[number]);
  });
}
