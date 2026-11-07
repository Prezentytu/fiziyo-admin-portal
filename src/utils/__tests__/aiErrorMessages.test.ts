import { describe, expect, it } from 'vitest';
import { mapAiErrorResponse, nextAiCreditsResetDate } from '../aiErrorMessages';

const credits = JSON.stringify({ error: 'insufficient_credits', message: 'Pozostało: 0', remaining: 0, required: 1 });

describe('mapAiErrorResponse', () => {
  it('mówi, że pula kredytów się wyczerpała i kiedy się odnowi', () => {
    const result = mapAiErrorResponse(400, credits, new Date('2026-11-07T10:00:00Z'));

    expect(result).toEqual({
      kind: 'insufficient_credits',
      code: 'insufficient_credits',
      message: 'Miesięczna pula kredytów AI gabinetu się wyczerpała. Odnowi się 1\u00a0grudnia.',
    });
    expect(result?.message).not.toMatch(/chwilowo/);
  });

  it('w grudniu podaje odnowienie 1 stycznia', () => {
    expect(mapAiErrorResponse(400, credits, new Date('2026-12-31T22:30:00Z'))?.message).toContain('1\u00a0stycznia');
  });

  it('ostatni wieczór miesiąca w UTC (już 1 grudnia w Polsce) podaje odnowienie 1 grudnia', () => {
    expect(mapAiErrorResponse(400, credits, new Date('2026-11-30T23:30:00Z'))?.message).toBe(
      'Miesięczna pula kredytów AI gabinetu się wyczerpała. Odnowi się 1\u00a0grudnia.'
    );
  });

  it('gdy w puli coś zostało, ale za mało na akcję, mówi ile wymaga i ile zostało', () => {
    const body = JSON.stringify({ error: 'insufficient_credits', remaining: 3, required: 5 });

    const message = mapAiErrorResponse(400, body, new Date('2026-11-07T10:00:00Z'))?.message;

    expect(message).toBe(
      'Ta akcja wymaga 5\u00a0kredytów AI, w puli gabinetu zostały 3. Pula odnowi się 1\u00a0grudnia.'
    );
    expect(message).not.toMatch(/wyczerpała/);
  });

  it('rozpoznaje brak kredytów także dla 402 i 403', () => {
    expect(mapAiErrorResponse(402, credits)?.kind).toBe('insufficient_credits');
    expect(mapAiErrorResponse(403, credits)?.kind).toBe('insufficient_credits');
  });

  it('przekazuje komunikat backendu przy awarii dostawcy AI', () => {
    const body = JSON.stringify({ error: 'ai_provider_failure', message: 'Asystent AI nie odpowiada.' });

    expect(mapAiErrorResponse(502, body)).toEqual({
      kind: 'provider_failure',
      code: 'ai_provider_failure',
      message: 'Asystent AI nie odpowiada.',
    });
  });

  it('nie rozpoznaje innych błędów ani ciała, które nie jest JSON-em', () => {
    expect(mapAiErrorResponse(400, JSON.stringify({ error: 'invalid_input' }))).toBeNull();
    expect(mapAiErrorResponse(400, 'Bad Request')).toBeNull();
    expect(mapAiErrorResponse(500, credits)).toBeNull();
  });
});

describe('nextAiCreditsResetDate', () => {
  it('to pierwszy dzień następnego miesiąca w UTC, jak w AICreditsService', () => {
    expect(nextAiCreditsResetDate(new Date('2026-11-30T23:59:00Z')).toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });
});
