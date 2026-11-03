import { z } from 'zod';

import { getBackendToken } from '@/lib/tokenCache';
import { triggerCreditsRefresh } from '@/lib/aiCreditsRefresh';
import { ChatDispatchError, type DispatchResult } from './utils/resolveReply';
import { parseDispatchReply } from './utils/viewSpec';

const DISPATCH_RESPONSE_SCHEMA = z.object({
  sessionId: z.string(),
  spec: z.unknown(),
  reply: z.string().nullish(),
  creditsUsed: z.number().nullish(),
});

/** REST `POST /api/chat/dispatch` (fizjo-app backend). The model returns a sentence and a card spec, never HTML. */
export async function dispatchChatMessage(
  message: string,
  sessionId?: string,
  signal?: AbortSignal
): Promise<DispatchResult> {
  const token = getBackendToken();
  if (!token) throw new ChatDispatchError('unauthorized', 'Brak tokenu autoryzacji.');

  let response: Response;
  try {
    response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/chat/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message, sessionId }),
      signal,
    });
  } catch {
    throw new ChatDispatchError('unavailable', 'Asystent AI jest niedostępny.');
  }

  if (response.status === 401 || response.status === 403) {
    throw new ChatDispatchError('unauthorized', 'Sesja wygasła.');
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const isCredits =
      typeof body === 'object' && body !== null && (body as { error?: unknown }).error === 'insufficient_credits';
    throw new ChatDispatchError(isCredits ? 'insufficient_credits' : 'unavailable', 'Asystent AI nie odpowiedział.');
  }

  const parsed = DISPATCH_RESPONSE_SCHEMA.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new ChatDispatchError('unavailable', 'Nieczytelna odpowiedź asystenta.');

  const creditsUsed = parsed.data.creditsUsed ?? 0;
  if (creditsUsed > 0) triggerCreditsRefresh();
  const reply = parseDispatchReply(parsed.data.spec, parsed.data.reply);
  return { sessionId: parsed.data.sessionId, text: reply.text, spec: reply.spec, creditsUsed };
}
