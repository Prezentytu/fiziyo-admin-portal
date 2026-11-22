import 'server-only';

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { canReviewExercises, normalizeSystemRole } from '@/lib/auth/systemRole';
import type { ExerciseReportAuthor } from '@/types/exercise-report.types';

/**
 * Identity in route handlers comes from the Clerk session, never from the body.
 * The backoffice role lives only in the backend, so we ask it with the backend token from the header,
 * while `clerkId` comes from the session: a foreign token cannot change whom we ask about.
 */

type Denied = { ok: false; response: NextResponse };

const unauthorized = (): Denied => ({
  ok: false,
  response: NextResponse.json({ success: false, error: 'Wymagane logowanie' }, { status: 401 }),
});

const forbidden = (): Denied => ({
  ok: false,
  response: NextResponse.json({ success: false, error: 'Brak uprawnień' }, { status: 403 }),
});

export async function requireSessionAuthor(): Promise<{ ok: true; author: ExerciseReportAuthor } | Denied> {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!user || !email) return unauthorized();

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return { ok: true, author: { userId: user.id, email, ...(name ? { name } : {}) } };
}

const SYSTEM_ROLE_QUERY = `query RouteSystemRole($clerkId: String!) { userByClerkId(clerkId: $clerkId) { systemRole } }`;

async function fetchSystemRole(clerkId: string, authorization: string): Promise<string | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;

  try {
    const response = await fetch(`${apiUrl}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authorization },
      body: JSON.stringify({ query: SYSTEM_ROLE_QUERY, variables: { clerkId } }),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { data?: { userByClerkId?: { systemRole?: string | null } | null } };
    return json.data?.userByClerkId?.systemRole ?? null;
  } catch {
    return null;
  }
}

export async function requireExerciseReviewer(
  request: Request
): Promise<{ ok: true; clerkUserId: string } | Denied> {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return forbidden();

  const role = normalizeSystemRole(await fetchSystemRole(userId, authorization));
  if (!canReviewExercises(role)) return forbidden();

  return { ok: true, clerkUserId: userId };
}
