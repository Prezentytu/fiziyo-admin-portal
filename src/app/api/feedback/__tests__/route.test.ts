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

import { POST } from '../route';

const WEBHOOK = 'https://discord.test/feedback';
const PNG = 'data:image/png;base64,iVBORw0KGgo=';

const feedback = {
  type: 'bug',
  description: 'Lista pacjentów nie ładuje się po zmianie organizacji',
  url: 'https://portal.fiziyo.pl/patients?search=Kowalska#top',
  userId: 'user_victim',
  userEmail: 'victim@test.fiziyo.pl',
  userName: 'Ofiara',
  organizationId: 'org-a',
};

function request(body: unknown) {
  return new NextRequest('https://portal.fiziyo.pl/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.7, 10.0.0.1' },
    body: JSON.stringify(body),
  });
}

function mockFetch(backendStatus: number | 'offline') {
  const fetchMock = vi.fn(async (url: string | URL, _init?: RequestInit) => {
    if (String(url).endsWith('/api/feedback')) {
      if (backendStatus === 'offline') throw new TypeError('fetch failed');
      return Response.json({ success: backendStatus < 300 }, { status: backendStatus });
    }
    return new Response(null, { status: 204 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const discordCalls = (fetchMock: ReturnType<typeof mockFetch>) =>
  fetchMock.mock.calls.filter(([url]) => String(url) === WEBHOOK);

beforeEach(() => {
  clerk.userId = 'user_therapist';
  clerk.user = {
    id: 'user_therapist',
    firstName: 'Ola',
    lastName: null,
    primaryEmailAddress: { emailAddress: 'ola@test.fiziyo.pl' },
  };
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.test');
  vi.stubEnv('NEXT_PUBLIC_DISCORD_WEBHOOK_URL', WEBHOOK);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('feedback route', () => {
  it('rejects a request without a Clerk session', async () => {
    clerk.userId = null;
    clerk.user = null;
    const fetchMock = mockFetch(200);

    expect((await POST(request(feedback))).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the reporter from the session to the backend and drops the query from the URL', async () => {
    const fetchMock = mockFetch(200);
    await POST(request(feedback));

    const sent = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(sent).toMatchObject({ userId: 'user_therapist', userEmail: 'ola@test.fiziyo.pl', userName: 'Ola' });
    expect(sent.url).toBe('https://portal.fiziyo.pl/patients');
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('X-Forwarded-For')).toBe('203.0.113.7');
  });

  it('accepts optional fields sent as null', async () => {
    mockFetch(200);
    const response = await POST(request({ ...feedback, organizationId: null, userRole: null, images: null }));

    expect(response.status).toBe(200);
  });

  it('returns a backend rejection instead of posting straight to Discord', async () => {
    const fetchMock = mockFetch(429);
    const response = await POST(request(feedback));

    expect(response.status).toBe(429);
    expect(discordCalls(fetchMock)).toHaveLength(0);
  });

  it('falls back to Discord without mentions when the backend is offline', async () => {
    const fetchMock = mockFetch('offline');
    const response = await POST(request({ ...feedback, images: [PNG] }));

    expect(response.status).toBe(200);
    const calls = discordCalls(fetchMock);
    expect(calls).toHaveLength(2);
    expect(JSON.parse(String(calls[0]?.[1]?.body)).allowed_mentions).toEqual({ parse: [] });
    const imagePayload = JSON.parse(String((calls[1]?.[1]?.body as FormData).get('payload_json')));
    expect(imagePayload.allowed_mentions).toEqual({ parse: [] });
  });

  it('rejects more images than the form allows', async () => {
    const fetchMock = mockFetch('offline');
    const response = await POST(request({ ...feedback, images: Array.from({ length: 6 }, () => PNG) }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
