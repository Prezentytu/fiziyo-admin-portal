import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { userId: 'user_a' as string | null | undefined, isLoaded: true },
  restartSubscriptionConnection: vi.fn(),
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => null, userId: mocks.auth.userId, isLoaded: mocks.auth.isLoaded }),
}));

vi.mock('@/graphql/links/wsLink', async () => {
  const { ApolloLink } = await import('@apollo/client');
  return {
    WsLinkFactory: class {
      create() {
        return ApolloLink.empty();
      }
    },
    restartSubscriptionConnection: mocks.restartSubscriptionConnection,
  };
});

import { getBackendToken, saveBackendToken } from '@/lib/tokenCache';
import { ApolloWrapper } from '../provider';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  mocks.restartSubscriptionConnection.mockClear();
  mocks.auth.userId = 'user_a';
});

function seedUserState() {
  saveBackendToken('token-of-a');
  localStorage.setItem('fizyo_last_organization_id', 'org-a');
  localStorage.setItem('fizyo_exercise_builder:org-a', '[{"id":"ex-private"}]');
}

describe('ApolloWrapper on a change of person', () => {
  it('drops the previous person state when another account takes over the tab', () => {
    const { rerender } = render(<ApolloWrapper>{null}</ApolloWrapper>);
    seedUserState();

    mocks.auth.userId = 'user_b';
    rerender(<ApolloWrapper>{null}</ApolloWrapper>);

    expect(getBackendToken()).toBeNull();
    expect(localStorage.getItem('fizyo_last_organization_id')).toBeNull();
    expect(localStorage.getItem('fizyo_exercise_builder:org-a')).toBeNull();
    expect(mocks.restartSubscriptionConnection).toHaveBeenCalledOnce();
  });

  it('drops it when the session ends without useAppSignOut (other tab, expiry)', () => {
    const { rerender } = render(<ApolloWrapper>{null}</ApolloWrapper>);
    seedUserState();

    mocks.auth.userId = null;
    rerender(<ApolloWrapper>{null}</ApolloWrapper>);

    expect(getBackendToken()).toBeNull();
    expect(localStorage.getItem('fizyo_last_organization_id')).toBeNull();
  });

  it('keeps the session of a person who signs in from a signed-out tab', () => {
    mocks.auth.userId = null;
    const { rerender } = render(<ApolloWrapper>{null}</ApolloWrapper>);

    mocks.auth.userId = 'user_a';
    seedUserState();
    rerender(<ApolloWrapper>{null}</ApolloWrapper>);

    expect(getBackendToken()).toBe('token-of-a');
    expect(mocks.restartSubscriptionConnection).not.toHaveBeenCalled();
  });
});
