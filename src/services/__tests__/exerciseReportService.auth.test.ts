import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setActiveBackendTokenSource } from '@/graphql/providers/activeBackendToken';
import { saveBackendToken } from '@/lib/tokenCache';
import { getExerciseReports, resolveExerciseReports } from '../exerciseReportService';

const authorizationOf = (fetchMock: ReturnType<typeof vi.fn>) =>
  new Headers((fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.headers).get('Authorization');

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  sessionStorage.clear();
  saveBackendToken('expired-cached-token');
  fetchMock = vi.fn(async () => Response.json({ success: true, reports: [] }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  setActiveBackendTokenSource(null);
  vi.unstubAllGlobals();
});

describe('exercise report service authorization', () => {
  it('lists reports with the refreshed backend token, not the cached one', async () => {
    setActiveBackendTokenSource(async () => 'fresh-token');
    await getExerciseReports({ exerciseId: 'ex-1' });

    expect(authorizationOf(fetchMock)).toBe('Bearer fresh-token');
  });

  it('resolves reports with the refreshed backend token', async () => {
    setActiveBackendTokenSource(async () => 'fresh-token');
    await resolveExerciseReports({ exerciseId: 'ex-1', resolvedByUserId: 'ignored-by-route' });

    expect(authorizationOf(fetchMock)).toBe('Bearer fresh-token');
  });
});
