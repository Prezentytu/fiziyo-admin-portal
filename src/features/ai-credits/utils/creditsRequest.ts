import { z } from 'zod';

import type { AICreditRequest, AICreditRequestPayload } from '@/graphql/types';

export const LOW_CREDITS_THRESHOLD = 0.8;
export const DEFAULT_REQUESTED_CREDITS = 500;
export const MAX_REQUESTED_CREDITS = 10000;
export const MAX_REQUEST_NOTE_LENGTH = 500;
export const RECENT_REQUESTS_LIMIT = 5;

export const CREDITS_REQUEST_OPEN_EVENT = 'ai-credits-request-open';

/** Ta sama pula co pasek w sidebarze: limit miesięczny plus addon. */
export interface CreditsUsage {
  totalLimit: number;
  totalRemaining: number;
}

export type CreditsLevel = 'ok' | 'low' | 'exhausted';

/** Pula wyczerpana, gdy nic nie zostało; ostrzeżenie, gdy zostało najwyżej 20% całej puli (jak pasek). */
export function creditsLevel(usage: CreditsUsage): CreditsLevel {
  if (usage.totalRemaining <= 0) return 'exhausted';
  if (usage.totalLimit > 0 && (usage.totalLimit - usage.totalRemaining) / usage.totalLimit >= LOW_CREDITS_THRESHOLD)
    return 'low';
  return 'ok';
}

const KNOWN_STATUSES: readonly string[] = ['pending', 'approved', 'rejected'] satisfies AICreditRequest['status'][];

/** Granica: prośby o statusie, którego panel nie zna, pomijamy zamiast pokazać pustą etykietę. */
export function normalizeCreditRequests(
  requests: readonly AICreditRequestPayload[] | undefined
): AICreditRequest[] | undefined {
  return requests?.filter((request): request is AICreditRequest => KNOWN_STATUSES.includes(request.status));
}

export type CreditsRequestControl = 'none' | 'request' | 'pending';

/** Owner i Admin: przycisk albo informacja o otwartej prośbie. Inne role: nic. */
export function creditsRequestControl(
  canRequest: boolean,
  requests: readonly Pick<AICreditRequest, 'status'>[] | undefined
): CreditsRequestControl {
  if (!canRequest) return 'none';
  return requests?.some((request) => request.status === 'pending') ? 'pending' : 'request';
}

export function recentRequests(requests: readonly AICreditRequest[] | undefined): AICreditRequest[] {
  return [...(requests ?? [])]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, RECENT_REQUESTS_LIMIT);
}

export const REQUEST_STATUS_LABELS: Record<AICreditRequest['status'], string> = {
  pending: 'Czeka na odpowiedź',
  approved: 'Przyznano',
  rejected: 'Odrzucono',
};

export const creditsRequestSchema = z.object({
  requestedCredits: z
    .number({ error: 'Podaj liczbę kredytów' })
    .int('Podaj liczbę całkowitą')
    .min(1, 'Minimum to 1 kredyt')
    .max(MAX_REQUESTED_CREDITS, `Maksimum to ${MAX_REQUESTED_CREDITS} kredytów`),
  message: z.string().trim().max(MAX_REQUEST_NOTE_LENGTH, 'Uzasadnienie jest za długie'),
});

export type CreditsRequestFormValues = z.infer<typeof creditsRequestSchema>;
