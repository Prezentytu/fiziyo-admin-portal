import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const clerk = vi.hoisted(() => ({
  userId: null as string | null,
  user: null as null | {
    id: string;
    firstName: string | null;
    lastName: string | null;
    primaryEmailAddress: { emailAddress: string } | null;
  },
}));

vi.mock('server-only', () => ({}));
vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: clerk.userId }),
  currentUser: async () => clerk.user,
}));

import { GET, PATCH, POST } from '../route';

const BASE = 'https://portal.fiziyo.pl/api/exercise-reports';

function signIn(id: string, email = `${id}@test.fiziyo.pl`) {
  clerk.userId = id;
  clerk.user = { id, firstName: 'Ola', lastName: 'Test', primaryEmailAddress: { emailAddress: email } };
}

function mockBackendRole(systemRole: string | null) {
  const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
    if (String(url).endsWith('/graphql')) {
      const body = JSON.parse(String(init?.body)) as { variables: { clerkId: string } };
      return Response.json({ data: { userByClerkId: { id: `db-${body.variables.clerkId}`, systemRole } } });
    }
    return new Response(null, { status: 204 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function request(method: string, body?: unknown, url = BASE) {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer backend-jwt' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const reportInput = {
  type: 'EXERCISE_REPORT',
  exerciseId: 'ex-1',
  exerciseName: 'Mostek',
  reasonCategory: 'WRONG_MEDIA',
  description: 'Zdjęcie pokazuje inne ćwiczenie',
  organizationId: 'org-a',
};

beforeEach(() => {
  (globalThis as { __exerciseReportStore?: unknown }).__exerciseReportStore = [];
  clerk.userId = null;
  clerk.user = null;
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.test');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('exercise reports route', () => {
  it('rejects every method without a Clerk session', async () => {
    mockBackendRole('CONTENT_MANAGER');
    expect((await GET(request('GET'))).status).toBe(401);
    expect((await POST(request('POST', reportInput))).status).toBe(401);
    expect((await PATCH(request('PATCH', { exerciseId: 'ex-1' }))).status).toBe(401);
  });

  it('takes the reporter from the session, not from the body', async () => {
    mockBackendRole(null);
    signIn('user_therapist');
    const response = await POST(
      request('POST', { ...reportInput, reportedBy: { userId: 'user_victim', email: 'victim@test.fiziyo.pl' } })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.report.reportedBy).toEqual({
      userId: 'user_therapist',
      email: 'user_therapist@test.fiziyo.pl',
      name: 'Ola Test',
    });
  });

  it('rejects a report without the exercise fields before storing it', async () => {
    mockBackendRole(null);
    signIn('user_therapist');
    const response = await POST(request('POST', { type: 'EXERCISE_REPORT', description: 'x' }));

    expect(response.status).toBe(400);
    expect((globalThis as { __exerciseReportStore?: unknown[] }).__exerciseReportStore).toHaveLength(0);
  });

  it('accepts optional exercise fields sent as null by GraphQL data', async () => {
    mockBackendRole(null);
    signIn('user_therapist');
    const response = await POST(
      request('POST', { ...reportInput, exerciseScope: null, exerciseStatus: null, organizationId: null, attachments: null })
    );

    expect(response.status).toBe(200);
  });

  it('hides the report list from a therapist without a review role', async () => {
    mockBackendRole(null);
    signIn('user_therapist');
    await POST(request('POST', reportInput));

    const response = await GET(request('GET'));
    expect(response.status).toBe(403);
  });

  it('shows the report list to a content manager confirmed by the backend', async () => {
    const fetchMock = mockBackendRole('CONTENT_MANAGER');
    signIn('user_therapist');
    await POST(request('POST', reportInput));
    signIn('user_reviewer');

    const response = await GET(request('GET'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.reports).toHaveLength(1);
    const roleCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/graphql'));
    expect(new Headers(roleCall?.[1]?.headers).get('Authorization')).toBe('Bearer backend-jwt');
    expect(JSON.parse(String(roleCall?.[1]?.body)).variables).toEqual({ clerkId: 'user_reviewer' });
  });

  it('does not let a therapist close reports', async () => {
    mockBackendRole(null);
    signIn('user_therapist');
    await POST(request('POST', reportInput));

    const response = await PATCH(request('PATCH', { exerciseId: 'ex-1', resolvedByUserId: 'user_reviewer' }));
    const store = (globalThis as { __exerciseReportStore?: { status: string }[] }).__exerciseReportStore;

    expect(response.status).toBe(403);
    expect(store?.[0]?.status).toBe('OPEN');
  });

  it('records the reviewer from the session when closing reports', async () => {
    mockBackendRole('SITE_SUPER_ADMIN');
    signIn('user_therapist');
    await POST(request('POST', reportInput));
    signIn('user_reviewer');

    const response = await PATCH(request('PATCH', { exerciseId: 'ex-1', resolvedByUserId: 'user_someone_else' }));
    const store = (globalThis as { __exerciseReportStore?: { status: string; resolvedByUserId?: string }[] })
      .__exerciseReportStore;

    expect(response.status).toBe(200);
    expect(store?.[0]).toMatchObject({ status: 'RESOLVED', resolvedByUserId: 'user_reviewer' });
  });

  it('sends Discord notifications without pinging anyone', async () => {
    vi.stubEnv('DISCORD_EXERCISE_REPORTS_WEBHOOK_URL', 'https://discord.test/webhook');
    const fetchMock = mockBackendRole(null);
    signIn('user_therapist');
    await POST(request('POST', { ...reportInput, exerciseName: '[Kliknij](https://evil.test) @everyone' }));

    const discordCall = fetchMock.mock.calls.find(([url]) => String(url) === 'https://discord.test/webhook');
    const payload = JSON.parse(String(discordCall?.[1]?.body));
    expect(payload.allowed_mentions).toEqual({ parse: [] });
    expect(JSON.stringify(payload)).not.toContain('](https://evil.test)');
  });
  it('accepts a set report with a patient whose name is missing', async () => {
    vi.stubEnv('DISCORD_EXERCISE_REPORTS_WEBHOOK_URL', 'https://discord.test/webhook');
    mockBackendRole(null);
    signIn('user_therapist');
    const response = await POST(
      request('POST', {
        message: 'Zestaw ma złą kolejność',
        exerciseSet: { id: 'set-1', name: 'Kolano', exercises: [{ id: 'm-1', name: '' }] },
        patients: [{ id: 'p-1', name: '' }],
        organizationId: 'org-a',
      })
    );

    expect(response.status).toBe(200);
  });
});
